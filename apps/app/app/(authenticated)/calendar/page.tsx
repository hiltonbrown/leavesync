import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { startOfWeek, endOfWeek } from "date-fns";
import { Header } from "../components/header";
import { CalendarGrid } from "./_components/calendar-grid";
import { CalendarFilters } from "./_components/calendar-filters";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";
import { loadTeamCalendarData } from "@/lib/server/load-team-calendar-data";
import { toDateOnly } from "@repo/core";

export const metadata: Metadata = {
  title: "Calendar — LeaveSync",
  description:
    "View team leave and availability as a calendar. Subscribe to keep it in sync with your calendar app.",
};

interface CalendarPageProps {
  searchParams: Promise<{
    org?: string;
    week?: string; // ISO date YYYY-MM-DD
    team?: string;
    location?: string;
    recordType?: string;
    approvalStatus?: string;
  }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;

  // Step 1: Validate organisation context
  const contextResult = await getActiveOrgContext(params.org || "");
  if (!contextResult.ok) {
    return notFound();
  }

  const { clerkOrgId, organisationId } = contextResult.value;

  // Step 2: Determine date range from week param or default to current week
  const now = new Date();
  let weekStart = startOfWeek(now);
  let weekEnd = endOfWeek(now);

  if (params.week) {
    try {
      const weekDate = new Date(params.week);
      if (!isNaN(weekDate.getTime())) {
        weekStart = startOfWeek(weekDate);
        weekEnd = endOfWeek(weekDate);
      }
    } catch {
      // Ignore invalid date, use current week
    }
  }

  // Step 3: Load team calendar data with filters
  const dataResult = await loadTeamCalendarData(
    clerkOrgId,
    organisationId,
    {
      startDate: weekStart,
      endDate: weekEnd,
    },
    {
      teamId: params.team,
      locationId: params.location,
      recordType: params.recordType,
      approvalStatus: params.approvalStatus,
    }
  );

  if (!dataResult.ok) {
    throw new Error(dataResult.error.message);
  }

  const { people, availability } = dataResult.value;

  // Step 4: Transform data for CalendarGrid
  // Create a map of person ID to person details for quick lookup
  const personMap = new Map(people.map((p) => [p.id, p]));

  // Transform availability records to LeaveEntry format
  const leaveEntries = availability.map((record) => {
    const person = personMap.get(record.personId);
    const initials = person
      ? `${person.firstName[0]}${person.lastName[0]}`.toUpperCase()
      : "?";

    return {
      id: record.id,
      start: toDateOnly(record.startsAt),
      end: toDateOnly(record.endsAt),
      name: person ? `${person.firstName} ${person.lastName}` : "Unknown",
      personId: record.personId,
      initials,
      type: record.recordType, // This maps recordType to "leave type"
      approvalStatus: record.approvalStatus,
      privacyMode: record.privacyMode,
    };
  });

  return (
    <>
      <Header page="Calendar" />
      <div className="flex flex-1 flex-col gap-4 p-6 pt-0">
        <CalendarFilters
          team={params.team}
          location={params.location}
          recordType={params.recordType}
          approvalStatus={params.approvalStatus}
        />
        <CalendarGrid
          entries={leaveEntries}
          people={people}
          weekStart={weekStart}
          filters={{
            team: params.team,
            location: params.location,
            recordType: params.recordType,
            approvalStatus: params.approvalStatus,
          }}
        />
      </div>
    </>
  );
}
