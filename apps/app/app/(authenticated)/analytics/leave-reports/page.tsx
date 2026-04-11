import { auth, clerkClient } from "@repo/auth/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "../../components/header";
import { LeaveClient } from "./leave-client";

export const metadata: Metadata = {
  title: "Leave Reports — LeaveSync",
  description:
    "Workforce leave analytics: absenteeism patterns, capacity risk, and policy compliance.",
};

const LeaveReportsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/");
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
      <Header page="Leave Reports" />
      <LeaveClient
        reportingUnit={reportingUnit}
        workingHoursPerDay={workingHoursPerDay}
      />
    </>
  );
};

export default LeaveReportsPage;
