import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarDayView } from "./calendar-day-view";

const TIMED_EVENT_NAME = /Kai Timed.*Source: Team Calendar leave/i;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("CalendarDayView", () => {
  afterEach(() => cleanup());

  it("renders all-day events and public holidays", () => {
    render(
      <CalendarDayView
        actingPersonId="00000000-0000-4000-8000-000000000011"
        data={rangeWithEvents()}
        orgQueryValue={null}
        selectedPersonId={null}
      />
    );

    expect(screen.getByText("All day")).toBeDefined();
    expect(screen.getByText("Queensland Day")).toBeDefined();
    expect(screen.getByText("Ari Report")).toBeDefined();
  });

  it("keeps timed event controls separate from add-at-time controls", () => {
    render(
      <CalendarDayView
        actingPersonId="00000000-0000-4000-8000-000000000011"
        data={rangeWithEvents()}
        orgQueryValue={null}
        selectedPersonId={null}
      />
    );

    const eventButton = screen.getByRole("button", {
      name: TIMED_EVENT_NAME,
    });
    const addAtNine = screen.getByRole("button", {
      name: "Add availability for 15 April 2026 at 09:00",
    });

    expect(addAtNine.contains(eventButton)).toBe(false);
    expect(
      addAtNine.querySelectorAll(
        'button, a[href], [tabindex]:not([tabindex="-1"])'
      )
    ).toHaveLength(0);
    expect(screen.getByText("Add at 09:00")).toBeDefined();
  });

  it("renders the empty state for a blank day", () => {
    render(
      <CalendarDayView
        actingPersonId={null}
        data={{
          ...rangeWithEvents(),
          days: [{ ...rangeWithEvents().days[0], events: [] }],
        }}
        orgQueryValue={null}
        selectedPersonId={null}
      />
    );

    expect(
      screen.getByText("No leave or availability for this day")
    ).toBeDefined();
  });
});

function rangeWithEvents() {
  return {
    days: [
      {
        date: new Date("2026-04-15T00:00:00.000Z"),
        dayOfWeek: 3,
        events: [event(), timedEvent()],
        isToday: true,
        publicHolidays: [
          {
            appliesToAllLocationsInView: true,
            isSuppressed: false,
            locationNames: ["Brisbane"],
            name: "Queensland Day",
          },
        ],
      },
    ],
    hasActiveXeroConnection: false,
    people: [],
    range: {
      end: new Date("2026-04-16T00:00:00.000Z"),
      start: new Date("2026-04-15T00:00:00.000Z"),
      timezone: "Australia/Brisbane",
    },
    totalPeopleInScope: 0,
    truncated: false,
    view: "day",
    xeroSyncFailedCount: 0,
  } as const;
}

function timedEvent() {
  return {
    ...event(),
    allDay: false,
    displayName: "Kai Timed",
    endsAt: new Date("2026-04-15T10:00:00.000Z"),
    id: "timed-event",
    startsAt: new Date("2026-04-15T09:30:00.000Z"),
  } as const;
}

function event() {
  return {
    allDay: true,
    approvalStatus: "approved",
    avatarUrl: null,
    contactabilityStatus: "contactable",
    displayName: "Ari Report",
    endsAt: new Date("2026-04-16T00:00:00.000Z"),
    id: "event",
    isEditableByActor: true,
    notesInternal: null,
    personId: "00000000-0000-4000-8000-000000000011",
    privacyMode: "named",
    recordType: "annual_leave",
    recordTypeCategory: "xero_leave",
    renderTreatment: "solid",
    sourceType: "team_calendar_leave",
    startsAt: new Date("2026-04-15T00:00:00.000Z"),
    xeroWriteError: null,
  } as const;
}
