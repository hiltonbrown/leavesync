import { auth, clerkClient } from "@repo/auth/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "../../components/header";
import { OooClient } from "./ooo-client";

export const metadata: Metadata = {
  title: "Out Of Office Reports — LeaveSync",
  description:
    "Team location and availability tracking: upcoming travel and work from home status.",
};

const OooReportsPage = async () => {
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
      <Header page="Out of Office" />
      <OooClient
        reportingUnit={reportingUnit}
        workingHoursPerDay={workingHoursPerDay}
      />
    </>
  );
};

export default OooReportsPage;
