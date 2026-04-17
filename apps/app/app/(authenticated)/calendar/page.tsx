import { toDateOnly } from "@repo/core";
import { endOfWeek, startOfWeek } from "date-fns";
import type { Metadata } from "next";
import { loadTeamCalendarData } from "@/lib/server/load-team-calendar-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";
import { CalendarFilters } from "./_components/calendar-filters";
import { CalendarGrid } from "./_components/calendar-grid";

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

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  const params = await searchParams;

  const { clerkOrgId, organisationId, orgQueryValue } =
    await requireActiveOrgPageContext(params.org);

  // Step 2: Determine date range from week param or default to current week
  const now = new Date();
  let weekStart = startOfWeek(now);
  let weekEnd = endOfWeek(now);

  if (params.week) {
    try {
      const weekDate = new Date(params.week);
      if (!Number.isNaN(weekDate.getTime())) {
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
          approvalStatus={params.approvalStatus}
          location={params.location}
          orgQueryValue={orgQueryValue}
          recordType={params.recordType}
          team={params.team}
        />
        <CalendarGrid
          entries={leaveEntries}
          filters={{
            team: params.team,
            location: params.location,
            recordType: params.recordType,
            approvalStatus: params.approvalStatus,
          }}
          people={people}
          weekStart={weekStart}
        />
      </div>
    </>
  );
}
