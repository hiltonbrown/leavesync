import { auth, clerkClient } from "@repo/auth/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { DangerClient } from "./danger-client";

export const metadata: Metadata = {
  title: "Danger Zone — Settings — LeaveSync",
  description: "Irreversible actions for your organisation.",
};

interface DangerPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const DangerPage = async ({ searchParams }: DangerPageProps) => {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/");
  }

  const { org: orgParam } = await searchParams;
  const { organisationId } = await requireActiveOrgPageContext(orgParam);

  const clerk = await clerkClient();
  const clerkOrg = await clerk.organizations.getOrganization({
    organizationId: orgId,
  });

  return (
    <DangerClient organisationId={organisationId} orgName={clerkOrg.name} />
  );
};

export default DangerPage;
