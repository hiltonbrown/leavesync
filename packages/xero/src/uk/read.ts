import { log } from "@repo/observability/log";
import { keys } from "../../keys";
import { tryDecryptXeroToken } from "../crypto/tokens";
import { orgRateLimitKey, xeroFetch } from "../rate-limit/xero-fetch";
import type {
  XeroEmployee,
  XeroEmployeeMapFailure,
  XeroEmployeesFetchResult,
} from "../read/employees";
import { tryMapXeroEmployees } from "../read/employees";
import {
  type FetchLeaveApplicationStatusInput,
  mapXeroReadHttpError,
  readXeroPayload,
  unsupportedReadRegion,
  type XeroLeaveApplicationStatusResult,
} from "../read/leave-application-status";
import type {
  XeroTenantForWrite,
  XeroWriteError,
  XeroWriteResult,
} from "../write/types";

const XERO_DEFAULT_BASE_URL = "https://api.xero.com";
const XERO_PAGE_SIZE = 100;
const XERO_MAX_PAGES = 200;

export async function fetchEmployees(input: {
  xeroTenant: XeroTenantForWrite;
}): Promise<XeroWriteResult<XeroEmployeesFetchResult>> {
  const tokenResult = resolveAccessToken(input.xeroTenant);
  if (!tokenResult.ok) {
    return tokenResult;
  }
  const decryptedAccessToken = tokenResult.token;

  try {
    const employees: XeroEmployee[] = [];
    const failures: XeroEmployeeMapFailure[] = [];
    const seenEmployeeIds: string[] = [];
    let rawItemCount = 0;
    let page = 1;
    let rawResponse: unknown = null;

    while (page <= XERO_MAX_PAGES) {
      const response = await xeroFetch({
        init: {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${decryptedAccessToken}`,
            "Xero-Tenant-Id": input.xeroTenant.xero_tenant_id,
          },
          method: "GET",
        },
        orgKey: orgRateLimitKey({
          clerkOrgId: input.xeroTenant.clerk_org_id,
          organisationId: input.xeroTenant.organisation_id,
        }),
        url: `${baseUrl()}/payroll.xro/2.0/employees?page=${page}`,
      });
      const rawPayload = await readXeroPayload(response);

      if (!response.ok) {
        return {
          error: mapXeroReadHttpError(response, rawPayload),
          ok: false,
        };
      }

      rawResponse ??= rawPayload;
      const mappedPage = tryMapXeroEmployees(rawPayload);
      if (!mappedPage.ok) {
        log.warn("Xero employee page could not be parsed", {
          clerkOrgId: input.xeroTenant.clerk_org_id,
          organisationId: input.xeroTenant.organisation_id,
          page,
        });
        return {
          ok: true,
          value: {
            complete: false,
            employees,
            failures,
            rawItemCount,
            rawResponse,
            seenEmployeeIds,
          },
        };
      }

      employees.push(...mappedPage.employees);
      failures.push(...mappedPage.failures);
      seenEmployeeIds.push(...mappedPage.seenEmployeeIds);
      rawItemCount += mappedPage.rawItemCount;

      if (mappedPage.rawItemCount < XERO_PAGE_SIZE) {
        return {
          ok: true,
          value: {
            complete: true,
            employees,
            failures,
            rawItemCount,
            rawResponse,
            seenEmployeeIds,
          },
        };
      }

      page += 1;
    }

    log.warn("Xero employee pagination exceeded the maximum page count", {
      clerkOrgId: input.xeroTenant.clerk_org_id,
      organisationId: input.xeroTenant.organisation_id,
      page: XERO_MAX_PAGES,
    });
    return {
      ok: true,
      value: {
        complete: false,
        employees,
        failures,
        rawItemCount,
        rawResponse,
        seenEmployeeIds,
      },
    };
  } catch (error) {
    return {
      error: {
        code: "network_error",
        message:
          error instanceof Error ? error.message : "Failed to reach Xero.",
      },
      ok: false,
    };
  }
}

export function fetchLeaveApplicationStatus(
  _input: FetchLeaveApplicationStatusInput
): Promise<XeroWriteResult<XeroLeaveApplicationStatusResult>> {
  return Promise.resolve(unsupportedReadRegion("UK"));
}

function baseUrl(): string {
  return keys().XERO_API_BASE_URL ?? XERO_DEFAULT_BASE_URL;
}

function resolveAccessToken(
  xeroTenant: XeroTenantForWrite
): { ok: true; token: string } | { ok: false; error: XeroWriteError } {
  const accessToken = xeroTenant.xero_connection.access_token_encrypted;
  const decrypted = tryDecryptXeroToken({
    authTag: xeroTenant.xero_connection.access_token_auth_tag ?? null,
    encrypted: accessToken,
    iv: xeroTenant.xero_connection.access_token_iv ?? null,
  });

  if (!decrypted.ok) {
    log.warn("Xero token decryption failed", {
      clerkOrgId: xeroTenant.clerk_org_id,
      organisationId: xeroTenant.organisation_id,
      reason: decrypted.reason,
    });
  }

  const decryptedAccessToken = decrypted.ok ? decrypted.token : "";

  if (!decryptedAccessToken || xeroTenant.xero_connection.revoked_at) {
    return {
      error: {
        code: "auth_error",
        message: "Xero credentials are missing or revoked.",
      },
      ok: false,
    };
  }

  return { ok: true, token: decryptedAccessToken };
}
