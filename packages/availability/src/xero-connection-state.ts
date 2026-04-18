import "server-only";

import type { ClerkOrgId, OrganisationId } from "@repo/core";
import { database, scopedQuery } from "@repo/database";
import { log } from "@repo/observability/log";

export interface XeroConnectionStateInput {
  clerkOrgId: string;
  organisationId: string;
}

export async function hasActiveXeroConnection({
  clerkOrgId,
  organisationId,
}: XeroConnectionStateInput): Promise<boolean> {
  try {
    const connection = await database.xeroConnection.findFirst({
      where: {
        ...scopedQuery(
          clerkOrgId as ClerkOrgId,
          organisationId as OrganisationId
        ),
        revoked_at: null,
        refresh_token_encrypted: { not: "" },
      },
      select: {
        id: true,
        xero_tenant: {
          select: {
            id: true,
            clerk_org_id: true,
            organisation_id: true,
          },
        },
      },
    });

    return Boolean(
      connection?.xero_tenant &&
        connection.xero_tenant.clerk_org_id === clerkOrgId &&
        connection.xero_tenant.organisation_id === organisationId
    );
  } catch (error) {
    log.error("Failed to resolve Xero connection state", {
      clerkOrgId,
      error,
      organisationId,
    });
    return false;
  }
}
