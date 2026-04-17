"use client";

import { CalendarClient } from "../calendar-client";

interface LeaveEntry {
  approvalStatus: string;
  end: string; // YYYY-MM-DD
  id: string;
  initials: string;
  name: string;
  personId: string;
  privacyMode: string;
  start: string; // YYYY-MM-DD
  type: string;
}

interface Person {
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  locationId: string | null;
  teamId: string | null;
}

interface CalendarGridProps {
  entries: LeaveEntry[];
  filters?: {
    team?: string;
    location?: string;
    recordType?: string;
    approvalStatus?: string;
  };
  people: Person[];
  weekStart: Date;
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
      filters={filters}
      initialEntries={entries}
      people={people}
      weekStart={weekStart}
    />
  );
}
