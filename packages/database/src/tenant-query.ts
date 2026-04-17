import type { ClerkOrgId, OrganisationId } from "@repo/core";

/**
 * Creates a scoped query filter that ensures all database queries
 * are filtered by both clerkOrgId and organisationId.
 *
 * Usage:
 *   where: { ...scopedQuery(clerkOrgId, organisationId), status: "active" }
 */
export const scopedQuery = (
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId
) => ({
  clerk_org_id: clerkOrgId,
  organisation_id: organisationId,
});

/**
 * Type helper for spreading scoped query results into where clauses.
 */
export type ScopedQueryResult = ReturnType<typeof scopedQuery>;
