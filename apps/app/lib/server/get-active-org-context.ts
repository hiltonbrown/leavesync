import "server-only";

import { requireOrg } from "@repo/auth/helpers";
import type { ClerkOrgId, OrganisationId, Result } from "@repo/core";
import { appError } from "@repo/core";
import { getOrganisationById } from "@repo/database/src/queries/organisations";

/**
 * Resolves the active organisation context from Clerk auth and validated params.
 * Must be called in server context only.
 *
 * Returns the clerk_org_id and organisation_id with full scope validation.
 * If organisation is missing or not accessible within the clerk_org_id boundary,
 * returns an error result.
 */
export async function getActiveOrgContext(organisationId: string): Promise<
  Result<{
    clerkOrgId: ClerkOrgId;
    organisationId: OrganisationId;
  }>
> {
  // Get authenticated Clerk Org ID
  let clerkOrgId: ClerkOrgId;
  try {
    clerkOrgId = (await requireOrg()) as ClerkOrgId;
  } catch {
    return {
      ok: false,
      error: appError(
        "unauthorised",
        "Not authenticated or no organisation selected"
      ),
    };
  }

  // Validate organisation exists and is within scope
  const orgResult = await getOrganisationById(
    clerkOrgId,
    organisationId as OrganisationId
  );

  if (!orgResult.ok) {
    if (orgResult.error.code === "not_found") {
      return {
        ok: false,
        error: appError(
          "not_found",
          "Organisation not found or not accessible in your context"
        ),
      };
    }
    return {
      ok: false,
      error: orgResult.error,
    };
  }

  return {
    ok: true,
    value: {
      clerkOrgId,
      organisationId: organisationId as OrganisationId,
    },
  };
}
