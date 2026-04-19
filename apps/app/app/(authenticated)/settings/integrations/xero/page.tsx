import { auth, currentUser } from "@repo/auth/server";
import { listRuns, listTenantSummaries } from "@repo/availability";
import { database } from "@repo/database";
import type { Metadata } from "next";
import { requirePageRole } from "@/lib/auth/require-page-role";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { XeroClient } from "./xero-client";

export const metadata: Metadata = {
  description: "Manage the Xero connection for this organisation.",
  title: "Xero - Settings - LeaveSync",
};

interface XeroPageProps {
  searchParams: Promise<{ org?: string }>;
}

const XeroPage = async ({ searchParams }: XeroPageProps) => {
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

  const [connection, summariesResult, runsResult, organisation] =
    await Promise.all([
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
      listRuns({
        actingRole: role,
        actingUserId: user.id,
        clerkOrgId,
        filters: {},
        organisationId,
        pagination: { pageSize: 10 },
      }),
      database.organisation.findFirst({
        where: { clerk_org_id: clerkOrgId, id: organisationId },
        select: { name: true },
      }),
    ]);

  return (
    <XeroClient
      connection={connection}
      organisationId={organisationId}
      organisationName={organisation?.name ?? "Organisation"}
      recentRuns={runsResult.ok ? runsResult.value.runs : []}
      summaries={summariesResult.ok ? summariesResult.value : []}
    />
  );
};

export default XeroPage;
