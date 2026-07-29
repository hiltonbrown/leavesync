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

/**
 * Object-argument form of scopedQuery, for the common case where the caller
 * already holds a context object with clerkOrgId and organisationId.
 *
 * Parameters are plain strings by design. Every caller in this repository holds
 * plain strings at this point and would otherwise have to cast to the branded
 * ClerkOrgId and OrganisationId types, which provides no safety and violates
 * the repo's no-unjustified-cast rule. Use scopedQuery where branded values are
 * genuinely in hand.
 *
 * Usage:
 *   where: { ...scopedTo(input), id: recordId }
 */
export const scopedTo = (input: {
  clerkOrgId: string;
  organisationId: string;
}) => ({
  clerk_org_id: input.clerkOrgId,
  organisation_id: input.organisationId,
});
