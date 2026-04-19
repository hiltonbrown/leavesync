import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Result } from "@repo/core";
import { database } from "@repo/database";
import { keys } from "../../keys";

const XERO_AUTHORISE_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";

interface OAuthStatePayload {
  clerkOrgId: string;
  organisationId: string;
  returnTo: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

interface ConnectionResponse {
  tenantId: string;
  tenantName: string;
}

export type XeroOAuthError =
  | { code: "invalid_state"; message: string }
  | { code: "oauth_not_configured"; message: string }
  | { code: "organisation_not_found"; message: string }
  | { code: "unknown_error"; message: string };

export function buildXeroOAuthStartUrl(input: {
  clerkOrgId: string;
  organisationId: string;
  returnTo?: string;
}): Result<{ redirectUrl: string }, XeroOAuthError> {
  const clientId = keys().XERO_CLIENT_ID;
  const clientSecret = keys().XERO_CLIENT_SECRET;
  if (!(clientId && clientSecret)) {
    return {
      ok: false,
      error: {
        code: "oauth_not_configured",
        message: "Xero OAuth is not configured for this environment.",
      },
    };
  }

  const redirectUri = callbackUrl();
  const state = signState({
    clerkOrgId: input.clerkOrgId,
    organisationId: input.organisationId,
    returnTo: input.returnTo ?? "/settings/integrations/xero",
  });

  const url = new URL(XERO_AUTHORISE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "offline_access");
  url.searchParams.set("state", state);

  return { ok: true, value: { redirectUrl: url.toString() } };
}

export async function completeXeroOAuth(input: {
  code: string;
  state: string;
}): Promise<Result<{ returnTo: string }, XeroOAuthError>> {
  const state = verifyState(input.state);
  if (!state.ok) {
    return state;
  }

  const organisation = await database.organisation.findFirst({
    where: {
      clerk_org_id: state.value.clerkOrgId,
      id: state.value.organisationId,
    },
    select: { country_code: true, id: true },
  });
  if (!organisation) {
    return {
      ok: false,
      error: {
        code: "organisation_not_found",
        message: "Organisation not found for Xero OAuth callback.",
      },
    };
  }

  const token = await exchangeToken({
    code: input.code,
    grantType: "authorization_code",
  });
  if (!token.ok) {
    return token;
  }

  const connections = await fetchConnections(token.value.access_token);
  if (!connections.ok) {
    return connections;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + token.value.expires_in * 1000);

  await database.$transaction(async (tx) => {
    const connection = await tx.xeroConnection.upsert({
      where: { organisation_id: organisation.id },
      create: {
        access_token_encrypted: token.value.access_token,
        clerk_org_id: state.value.clerkOrgId,
        expires_at: expiresAt,
        last_refreshed_at: now,
        organisation_id: organisation.id,
        refresh_token_encrypted: token.value.refresh_token,
        revoked_at: null,
      },
      update: {
        access_token_encrypted: token.value.access_token,
        expires_at: expiresAt,
        last_refreshed_at: now,
        refresh_token_encrypted: token.value.refresh_token,
        revoked_at: null,
      },
      select: { id: true },
    });

    const primaryConnection = connections.value[0];
    if (primaryConnection) {
      await tx.xeroTenant.upsert({
        where: { xero_connection_id: connection.id },
        create: {
          clerk_org_id: state.value.clerkOrgId,
          organisation_id: organisation.id,
          payroll_region: payrollRegionForCountry(organisation.country_code),
          tenant_name: primaryConnection.tenantName,
          xero_connection_id: connection.id,
          xero_tenant_id: primaryConnection.tenantId,
        },
        update: {
          payroll_region: payrollRegionForCountry(organisation.country_code),
          tenant_name: primaryConnection.tenantName,
          xero_tenant_id: primaryConnection.tenantId,
        },
      });
    }
  });

  return { ok: true, value: { returnTo: state.value.returnTo } };
}

export async function refreshXeroOAuthConnection(input: {
  clerkOrgId: string;
  connectionId: string;
  organisationId: string;
}): Promise<Result<{ refreshedAt: Date }, XeroOAuthError>> {
  const connection = await database.xeroConnection.findFirst({
    where: {
      clerk_org_id: input.clerkOrgId,
      id: input.connectionId,
      organisation_id: input.organisationId,
    },
    select: { refresh_token_encrypted: true },
  });
  if (!connection) {
    return {
      ok: false,
      error: {
        code: "organisation_not_found",
        message: "Xero connection not found.",
      },
    };
  }

  const token = await exchangeToken({
    grantType: "refresh_token",
    refreshToken: connection.refresh_token_encrypted,
  });
  if (!token.ok) {
    return token;
  }

  const refreshedAt = new Date();
  await database.xeroConnection.update({
    where: { id: input.connectionId },
    data: {
      access_token_encrypted: token.value.access_token,
      expires_at: new Date(
        refreshedAt.getTime() + token.value.expires_in * 1000
      ),
      last_refreshed_at: refreshedAt,
      refresh_token_encrypted: token.value.refresh_token,
      revoked_at: null,
    },
  });

  return { ok: true, value: { refreshedAt } };
}

export async function disconnectXeroOAuthConnection(input: {
  clerkOrgId: string;
  connectionId: string;
  destructive: boolean;
  organisationId: string;
}): Promise<Result<{ disconnected: true }, XeroOAuthError>> {
  const connection = await database.xeroConnection.findFirst({
    where: {
      clerk_org_id: input.clerkOrgId,
      id: input.connectionId,
      organisation_id: input.organisationId,
    },
    select: { id: true },
  });
  if (!connection) {
    return {
      ok: false,
      error: {
        code: "organisation_not_found",
        message: "Xero connection not found.",
      },
    };
  }

  await database.$transaction(async (tx) => {
    await tx.xeroConnection.update({
      where: { id: connection.id },
      data: { revoked_at: new Date() },
    });

    if (input.destructive) {
      await tx.person.updateMany({
        where: {
          clerk_org_id: input.clerkOrgId,
          organisation_id: input.organisationId,
        },
        data: { xero_employee_id: null },
      });
      await tx.availabilityRecord.updateMany({
        where: {
          clerk_org_id: input.clerkOrgId,
          organisation_id: input.organisationId,
          source_type: { in: ["xero", "xero_leave"] },
        },
        data: {
          archived_at: new Date(),
          publish_status: "archived",
        },
      });
    }
  });

  return { ok: true, value: { disconnected: true } };
}

async function exchangeToken(input: {
  code?: string;
  grantType: "authorization_code" | "refresh_token";
  refreshToken?: string;
}): Promise<Result<TokenResponse, XeroOAuthError>> {
  const clientId = keys().XERO_CLIENT_ID;
  const clientSecret = keys().XERO_CLIENT_SECRET;
  if (!(clientId && clientSecret)) {
    return {
      ok: false,
      error: {
        code: "oauth_not_configured",
        message: "Xero OAuth is not configured for this environment.",
      },
    };
  }

  const body = new URLSearchParams();
  body.set("grant_type", input.grantType);
  if (input.grantType === "authorization_code") {
    body.set("code", input.code ?? "");
    body.set("redirect_uri", callbackUrl());
  } else {
    body.set("refresh_token", input.refreshToken ?? "");
  }

  const response = await fetch(XERO_TOKEN_URL, {
    body,
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: "unknown_error",
        message: "Xero token exchange failed.",
      },
    };
  }

  const payload = (await response.json()) as Partial<TokenResponse>;
  if (
    !(payload.access_token && payload.refresh_token) ||
    typeof payload.expires_in !== "number"
  ) {
    return {
      ok: false,
      error: {
        code: "unknown_error",
        message: "Xero token response was invalid.",
      },
    };
  }

  return {
    ok: true,
    value: {
      access_token: payload.access_token,
      expires_in: payload.expires_in,
      refresh_token: payload.refresh_token,
    },
  };
}

async function fetchConnections(
  accessToken: string
): Promise<Result<ConnectionResponse[], XeroOAuthError>> {
  const response = await fetch(XERO_CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: "unknown_error",
        message: "Failed to load Xero tenants.",
      },
    };
  }

  const payload = (await response.json()) as Partial<ConnectionResponse>[];
  return {
    ok: true,
    value: payload
      .filter(
        (item): item is ConnectionResponse =>
          typeof item.tenantId === "string" &&
          typeof item.tenantName === "string"
      )
      .map((item) => ({
        tenantId: item.tenantId,
        tenantName: item.tenantName,
      })),
  };
}

function callbackUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL or NEXT_PUBLIC_APP_URL is required for Xero OAuth."
    );
  }
  return `${baseUrl}/api/xero/oauth/callback`;
}

function payrollRegionForCountry(countryCode: string): "AU" | "NZ" | "UK" {
  if (countryCode === "NZ") {
    return "NZ";
  }
  if (countryCode === "UK") {
    return "UK";
  }
  return "AU";
}

function signState(payload: OAuthStatePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", stateSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyState(value: string): Result<OAuthStatePayload, XeroOAuthError> {
  const [encoded, signature] = value.split(".");
  if (!(encoded && signature)) {
    return invalidState();
  }

  const expected = createHmac("sha256", stateSecret())
    .update(encoded)
    .digest("base64url");
  const matches =
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!matches) {
    return invalidState();
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<OAuthStatePayload>;
    if (
      typeof payload.clerkOrgId !== "string" ||
      typeof payload.organisationId !== "string" ||
      typeof payload.returnTo !== "string"
    ) {
      return invalidState();
    }
    return {
      ok: true,
      value: {
        clerkOrgId: payload.clerkOrgId,
        organisationId: payload.organisationId,
        returnTo: payload.returnTo,
      },
    };
  } catch {
    return invalidState();
  }
}

function invalidState(): Result<never, XeroOAuthError> {
  return {
    ok: false,
    error: {
      code: "invalid_state",
      message: "The Xero OAuth state was invalid.",
    },
  };
}

function stateSecret(): string {
  return keys().XERO_CLIENT_SECRET ?? "xero-oauth-state";
}
