import "server-only";

import { requireOrg } from "@repo/auth/helpers";
import type { ClerkOrgId, OrganisationId } from "@repo/core";
import { listOrganisationsByClerkOrg } from "@repo/database/src/queries/organisations";
import { notFound } from "next/navigation";
import { ensureDefaultOrganisation } from "./ensure-default-organisation";
import { getActiveOrgContext } from "./get-active-org-context";

export interface ActiveOrgPageContext {
  clerkOrgId: ClerkOrgId;
  organisationId: OrganisationId;
  orgQueryValue: string | null;
  orgSource: "clerk_cookie" | "query";
}

export async function requireActiveOrgPageContext(
  org?: string
): Promise<ActiveOrgPageContext> {
  const orgQueryValue = normaliseOrgQueryValue(org);

  if (orgQueryValue) {
    const contextResult = await getActiveOrgContext(orgQueryValue);

    if (!contextResult.ok) {
      notFound();
    }

    return {
      ...contextResult.value,
      orgQueryValue,
      orgSource: "query",
    };
  }

  let clerkOrgId: ClerkOrgId;
  try {
    clerkOrgId = (await requireOrg()) as ClerkOrgId;
  } catch {
    notFound();
  }

  const orgResult = await listOrganisationsByClerkOrg(clerkOrgId);

  if (!orgResult.ok) {
    notFound();
  }

  const existingOrganisation = orgResult.value[0];
  const organisationId =
    existingOrganisation?.id ??
    (await ensureDefaultOrganisation(clerkOrgId)).organisationId;

  if (!organisationId) {
    notFound();
  }

  return {
    clerkOrgId,
    organisationId,
    orgQueryValue: null,
    orgSource: "clerk_cookie",
  };
}

function normaliseOrgQueryValue(org?: string): string | null {
  const trimmed = org?.trim();
  return trimmed ? trimmed : null;
}
