import { auth, currentUser } from "@repo/auth/server";
import { listTenantSummaries } from "@repo/availability";
import { database } from "@repo/database";
import type { Metadata } from "next";
import { requirePageRole } from "@/lib/auth/require-page-role";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { IntegrationsClient } from "./integrations-client";

export const metadata: Metadata = {
  description: "Connect external services to extend LeaveSync.",
  title: "Integrations - Settings - LeaveSync",
};

interface IntegrationsPageProps {
  searchParams: Promise<{ org?: string }>;
}

const IntegrationsPage = async ({ searchParams }: IntegrationsPageProps) => {
  await requirePageRole("org:admin");

  const [{ orgRole }, user, { org }] = await Promise.all([
    auth(),
    currentUser(),
    searchParams,
  ]);
  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(org);
  const role = orgRole === "org:owner" ? "owner" : "admin";

  if (!user) {
    throw new Error("User not found.");
  }

  const [connection, summaries] = await Promise.all([
    database.xeroConnection.findFirst({
      where: {
        clerk_org_id: clerkOrgId,
        organisation_id: organisationId,
      },
      include: { xero_tenant: true },
    }),
    listTenantSummaries({
      actingRole: role,
      actingUserId: user.id,
      clerkOrgId,
      organisationId,
    }),
  ]);

  return (
    <IntegrationsClient
      summary={summaries.ok ? (summaries.value[0] ?? null) : null}
      xeroConnection={connection}
    />
  );
};

export default IntegrationsPage;
