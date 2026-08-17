import type { CalendarEvent } from "@repo/availability";

type EventSource = Pick<CalendarEvent, "sourceType">;

export function calendarEventSourceLabel(event: EventSource): string {
  if (event.sourceType === "manual") {
    return "Manual availability";
  }
  if (event.sourceType === "team_calendar_leave") {
    return "Team Calendar leave";
  }
  return "Xero Payroll";
}

export function isManualCalendarEvent(event: EventSource): boolean {
  return event.sourceType === "manual";
}
