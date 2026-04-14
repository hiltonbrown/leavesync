"use client";

import { CalendarClient } from "../calendar-client";

interface LeaveEntry {
  id: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  name: string;
  personId: string;
  initials: string;
  type: string;
  approvalStatus: string;
  privacyMode: string;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  teamId: string | null;
  locationId: string | null;
}

interface CalendarGridProps {
  entries: LeaveEntry[];
  people: Person[];
  weekStart: Date;
  filters?: {
    team?: string;
    location?: string;
    recordType?: string;
    approvalStatus?: string;
  };
}

/**
 * Calendar grid component that displays availability records in a calendar view.
 * Wraps the CalendarClient with data loading already complete.
 */
export function CalendarGrid({
  entries,
  people,
  weekStart,
  filters,
}: CalendarGridProps) {
  return (
    <CalendarClient
      initialEntries={entries}
      people={people}
      weekStart={weekStart}
      filters={filters}
    />
  );
}
