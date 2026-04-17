import { getOrganisationById } from "@repo/database/src/queries/organisations";
import type { Metadata } from "next";
import { loadLeaveBalancesPageData } from "@/lib/server/load-leave-balances-page-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../../components/header";
import { LeaveClient } from "./leave-client";

export const metadata: Metadata = {
  title: "Leave Reports — LeaveSync",
  description:
    "Workforce leave analytics: absenteeism patterns, capacity risk, and policy compliance.",
};

interface LeaveReportsPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const LeaveReportsPage = async ({ searchParams }: LeaveReportsPageProps) => {
  const { org } = await searchParams;

  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(org);

  const dataResult = await loadLeaveBalancesPageData(
    clerkOrgId,
    organisationId
  );
  const organisationResult = await getOrganisationById(
    clerkOrgId,
    organisationId
  );

  if (!dataResult.ok) {
    throw new Error(dataResult.error.message);
  }
  if (!organisationResult.ok) {
    throw new Error(organisationResult.error.message);
  }

  const reportingUnit = organisationResult.value.reportingUnit ?? "hours";
  const workingHoursPerDay = organisationResult.value.workingHoursPerDay ?? 7.6;

  const { balances, people } = dataResult.value;
  const departments = [
    "All Departments",
    ...new Set(people.map((person) => person.employmentType)),
  ];
  const annualAvailable = sumBalances(balances, "ANNUAL");
  const personalAvailable = sumBalances(balances, "PERSONAL");
  const leaveTypes = [
    {
      annual: annualAvailable,
      available: annualAvailable,
      bgFill: "color-mix(in srgb, var(--primary) 12%, transparent)",
      color: "var(--primary)",
      consumed: 0,
      icon: "sun" as const,
      id: "holiday",
      label: "Annual leave",
    },
    {
      annual: personalAvailable,
      available: personalAvailable,
      bgFill: "color-mix(in srgb, var(--tertiary) 15%, transparent)",
      color: "var(--tertiary)",
      consumed: 0,
      icon: "house-heart" as const,
      id: "personal",
      label: "Personal leave",
    },
  ];
  const staffData = people.map((person, index) => {
    const personBalances = balances.filter(
      (balance) => balance.personId === person.id
    );
    return {
      holidayAvailable: sumBalances(personBalances, "ANNUAL"),
      holidayConsumed: 0,
      id: index + 1,
      name: `${person.firstName} ${person.lastName}`,
      personalAvailable: sumBalances(personBalances, "PERSONAL"),
      personalConsumed: 0,
      team: person.employmentType,
    };
  });
  const barChartData = staffData.slice(0, 8).map((person) => ({
    holiday: person.holidayAvailable,
    name: person.name,
    personal: person.personalAvailable,
  }));
  const timelineChartData = barChartData;

  return (
    <>
      <Header page="Leave Reports" />
      <LeaveClient
        barChartData={barChartData}
        departments={departments}
        leaveTypes={leaveTypes}
        reportingUnit={reportingUnit}
        staffData={staffData}
        timelineChartData={timelineChartData}
        workingHoursPerDay={workingHoursPerDay}
      />
    </>
  );
};

export default LeaveReportsPage;

function sumBalances(
  balances: Array<{ balance: number; leaveTypeXeroId: string }>,
  type: "ANNUAL" | "PERSONAL"
): number {
  return balances
    .filter((balance) => balance.leaveTypeXeroId.toUpperCase().includes(type))
    .reduce((total, balance) => total + balance.balance, 0);
}
