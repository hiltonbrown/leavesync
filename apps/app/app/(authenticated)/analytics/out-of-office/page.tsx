import { endOfUtcDay, startOfUtcDay } from "@repo/core";
import {
  listAvailabilityForCalendar,
  listPeopleForOrganisation,
} from "@repo/database/src/queries";
import { getOrganisationById } from "@repo/database/src/queries/organisations";
import type { Metadata } from "next";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../../components/header";
import { OooClient } from "./ooo-client";

export const metadata: Metadata = {
  title: "Out Of Office Reports — LeaveSync",
  description:
    "Team location and availability tracking: upcoming travel and work from home status.",
};

interface OooReportsPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const OooReportsPage = async ({ searchParams }: OooReportsPageProps) => {
  const { org } = await searchParams;

  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(org);

  // Load out-of-office availability data for current quarter
  const now = new Date();
  const quarterStart = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3,
    1
  );
  const quarterEnd = new Date(
    quarterStart.getFullYear(),
    quarterStart.getMonth() + 3,
    0
  );

  const [availabilityResult, peopleResult] = await Promise.all([
    listAvailabilityForCalendar(clerkOrgId, organisationId, {
      startDate: startOfUtcDay(quarterStart.toISOString().split("T")[0]),
      endDate: endOfUtcDay(quarterEnd.toISOString().split("T")[0]),
    }),
    listPeopleForOrganisation(clerkOrgId, organisationId),
  ]);
  const organisationResult = await getOrganisationById(
    clerkOrgId,
    organisationId
  );

  if (!availabilityResult.ok) {
    throw new Error(availabilityResult.error.message);
  }
  if (!peopleResult.ok) {
    throw new Error(peopleResult.error.message);
  }
  if (!organisationResult.ok) {
    throw new Error(organisationResult.error.message);
  }

  const reportingUnit = organisationResult.value.reportingUnit ?? "hours";
  const workingHoursPerDay = organisationResult.value.workingHoursPerDay ?? 7.6;

  const people = peopleResult.value;
  const availability = availabilityResult.value;
  const departments = [
    "All Departments",
    ...new Set(people.map((person) => person.employmentType)),
  ];
  const wfhDays = availability
    .filter((record) => record.recordType === "wfh")
    .reduce(
      (total, record) => total + countDays(record.startsAt, record.endsAt),
      0
    );
  const travelDays = availability
    .filter((record) =>
      ["client_site", "travel", "training"].includes(record.recordType)
    )
    .reduce(
      (total, record) => total + countDays(record.startsAt, record.endsAt),
      0
    );
  const oooTypes = [
    {
      bgFill: "color-mix(in srgb, var(--tertiary) 15%, transparent)",
      color: "var(--tertiary)",
      days: wfhDays,
      icon: "home" as const,
      id: "wfh",
      label: "Working from home",
      total: wfhDays,
    },
    {
      bgFill: "color-mix(in srgb, var(--primary) 12%, transparent)",
      color: "var(--primary)",
      days: travelDays,
      icon: "plane" as const,
      id: "travelling",
      label: "Travelling",
      total: travelDays,
    },
  ];
  const staffData = people.map((person, index) => {
    const personRecords = availability.filter(
      (record) => record.personId === person.id
    );
    return {
      id: index + 1,
      name: `${person.firstName} ${person.lastName}`,
      team: person.employmentType,
      travelDays: personRecords
        .filter((record) =>
          ["client_site", "travel", "training"].includes(record.recordType)
        )
        .reduce(
          (total, record) => total + countDays(record.startsAt, record.endsAt),
          0
        ),
      wfhDays: personRecords
        .filter((record) => record.recordType === "wfh")
        .reduce(
          (total, record) => total + countDays(record.startsAt, record.endsAt),
          0
        ),
    };
  });
  const barChartData = staffData.slice(0, 8).map((person) => ({
    name: person.name,
    travelling: person.travelDays,
    wfh: person.wfhDays,
  }));
  const timelineChartData = barChartData;

  return (
    <>
      <Header page="Out of Office" />
      <OooClient
        barChartData={barChartData}
        departments={departments}
        oooTypes={oooTypes}
        reportingUnit={reportingUnit}
        staffData={staffData}
        timelineChartData={timelineChartData}
        workingHoursPerDay={workingHoursPerDay}
      />
    </>
  );
};

export default OooReportsPage;

function countDays(startsAt: Date, endsAt: Date): number {
  const start = startOfUtcDay(startsAt.toISOString().slice(0, 10));
  const end = startOfUtcDay(endsAt.toISOString().slice(0, 10));
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / millisecondsPerDay)
  );
}
