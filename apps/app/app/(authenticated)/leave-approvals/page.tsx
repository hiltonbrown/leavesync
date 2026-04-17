import { auth, clerkClient } from "@repo/auth/server";
import { redirect } from "next/navigation";
import { loadPendingApprovalsData } from "@/lib/server/load-pending-approvals-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";
import { LeaveApprovalsClient } from "./leave-approvals-client";

export const metadata = {
  title: "Leave Approvals — LeaveSync",
  description: "Approve and manage team leave requests.",
};

interface LeaveApprovalsPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const LeaveApprovalsPage = async ({
  searchParams,
}: LeaveApprovalsPageProps) => {
  const { orgId, orgRole } = await auth();

  if (!orgId) {
    redirect("/");
  }

  const isAdminOrOwner = orgRole === "org:owner" || orgRole === "org:admin";

  if (!isAdminOrOwner) {
    redirect("/");
  }

  const params = await searchParams;

  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(
    params.org
  );

  const approvalsResult = await loadPendingApprovalsData(
    clerkOrgId,
    organisationId
  );

  if (!approvalsResult.ok) {
    throw new Error(approvalsResult.error.message);
  }

  const clerk = await clerkClient();
  const org = await clerk.organizations.getOrganization({
    organizationId: orgId,
  });

  const meta = (org.publicMetadata ?? {}) as Record<string, unknown>;

  const reportingUnit =
    typeof meta.reportingUnit === "string" ? meta.reportingUnit : "hours";
  const workingHoursPerDay =
    typeof meta.workingHoursPerDay === "number" ? meta.workingHoursPerDay : 7.6;

  return (
    <>
      <Header page="Leave Approvals" />
      <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
        <LeaveApprovalsClient
          organisationId={organisationId}
          pendingRecords={approvalsResult.value.pendingRecords}
          reportingUnit={reportingUnit}
          workingHoursPerDay={workingHoursPerDay}
        />
      </div>
    </>
  );
};

export default LeaveApprovalsPage;
