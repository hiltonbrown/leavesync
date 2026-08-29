import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AmbientCalendarDay,
  AmbientCalendarModel,
} from "./ambient-calendar-data";
import { AmbientCalendarField } from "./ambient-calendar-field";

const scrollIntoView = vi.fn();
const startViewTransition = vi.fn((update: () => void) => update());

describe("AmbientCalendarField", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(document, "startViewTransition");
    vi.clearAllMocks();
  });

  it("renders a chronological fourteen-day tab timeline", () => {
    render(<AmbientCalendarField model={model()} orgQueryValue={null} />);

    const timeline = screen.getByRole("tablist", {
      name: "Your next 14 days, horizontally scrollable chronological 14-day timeline",
    });
    const tabs = screen.getAllByRole("tab");

    expect(timeline).toBeDefined();
    expect(tabs).toHaveLength(14);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[13]?.getAttribute("aria-label")).toBe(
      "Fri, 11 Sep: No records"
    );
    expect(screen.getByRole("tabpanel").textContent).toContain("No records");
    expect(screen.queryByText("People unavailable")).toBeNull();
  });

  it("moves selection and detail through arrow-key navigation", () => {
    render(<AmbientCalendarField model={model()} orgQueryValue={null} />);

    const [firstTab, secondTab] = screen.getAllByRole("tab");
    if (!(firstTab && secondTab)) {
      throw new Error("Expected the first two timeline tabs.");
    }
    fireEvent.keyDown(firstTab, { key: "ArrowRight" });

    expect(secondTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(secondTab);
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(screen.getByRole("tabpanel").textContent).toContain("Annual leave");
  });

  it("updates immediately without a view transition for reduced motion", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });
    render(<AmbientCalendarField model={model()} orgQueryValue={null} />);

    const [, secondTab] = screen.getAllByRole("tab");
    if (!secondTab) {
      throw new Error("Expected the second timeline tab.");
    }
    fireEvent.click(secondTab);

    expect(secondTab.getAttribute("aria-selected")).toBe("true");
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it("uses a view transition when motion is allowed", () => {
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });
    render(<AmbientCalendarField model={model()} orgQueryValue={null} />);

    const [, secondTab] = screen.getAllByRole("tab");
    if (!secondTab) {
      throw new Error("Expected the second timeline tab.");
    }
    fireEvent.click(secondTab);

    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(secondTab.getAttribute("aria-selected")).toBe("true");
  });

  it("renders team coverage on the horizontally scrollable date axis", () => {
    render(<AmbientCalendarField model={teamModel()} orgQueryValue={null} />);

    const timeline = screen.getByRole("tablist", {
      name: "Team coverage, horizontally scrollable chronological 14-day timeline",
    });

    expect(timeline.className).toContain("overflow-x-auto");
    expect(screen.getByText("4/10 live")).toBeDefined();
    expect(screen.getByText("6/10 peak")).toBeDefined();
    expect(screen.getAllByText("No signal")).toHaveLength(12);
    expect(screen.queryByText("0/10 live")).toBeNull();
  });
});

function model(): AmbientCalendarModel {
  return {
    dayCount: 14,
    days: Array.from({ length: 14 }, (_, index) => day(index)),
    description: "Your leave and availability records for the next 14 days.",
    href: "/calendar?scopeType=my_self",
    mode: "personal",
    startDateKey: "2026-08-29",
    timezone: "Australia/Brisbane",
    title: "Your next 14 days",
  };
}

function teamModel(): AmbientCalendarModel {
  const personalModel = model();
  return {
    ...personalModel,
    days: personalModel.days.map((item, index) => {
      if (index === 0) {
        return {
          ...item,
          accessibleLabel: `${item.label}: 4 of 10 unavailable today`,
          confidence: "exact",
          coverage: { awayCount: 4, ratio: 0.4, totalCount: 10 },
          detailLabel: "4 of 10 unavailable today",
          tone: "primary",
        };
      }
      if (index === 1) {
        return {
          ...item,
          accessibleLabel: `${item.label}: 6 of 10 away, peak threshold reached`,
          confidence: "threshold-only",
          coverage: { awayCount: 6, ratio: 0.6, totalCount: 10 },
          detailLabel: "6 of 10 away, peak threshold reached",
          tone: "warning",
        };
      }
      return {
        ...item,
        accessibleLabel: `${item.label}: No coverage peak is flagged for this day`,
        confidence: "unknown",
        coverage: null,
        detailLabel: "No coverage peak is flagged for this day",
        tone: "neutral",
      };
    }),
    description:
      "Team availability today and threshold-based coverage signals ahead.",
    href: "/calendar?scopeType=my_team",
    mode: "team",
    title: "Team coverage",
  };
}

function day(index: number): AmbientCalendarDay {
  const dayNumber = 29 + index;
  const dateKey =
    dayNumber <= 31
      ? `2026-08-${String(dayNumber).padStart(2, "0")}`
      : `2026-09-${String(dayNumber - 31).padStart(2, "0")}`;
  const labels = [
    "Sat, 29 Aug",
    "Sun, 30 Aug",
    "Mon, 31 Aug",
    "Tue, 1 Sep",
    "Wed, 2 Sep",
    "Thu, 3 Sep",
    "Fri, 4 Sep",
    "Sat, 5 Sep",
    "Sun, 6 Sep",
    "Mon, 7 Sep",
    "Tue, 8 Sep",
    "Wed, 9 Sep",
    "Thu, 10 Sep",
    "Fri, 11 Sep",
  ];
  const label = labels[index] ?? dateKey;
  const hasRecord = index === 1;
  const detailLabel = hasRecord ? "Annual leave" : "No records";
  return {
    accessibleLabel: `${label}: ${detailLabel}`,
    confidence: "personal",
    coverage: null,
    dateKey,
    detailLabel,
    isToday: index === 0,
    label,
    signals: hasRecord
      ? [
          {
            allDay: true,
            approvalStatus: "approved",
            id: "annual-leave",
            kind: "personal-record",
            label: "Annual leave",
            recordType: "annual_leave",
          },
        ]
      : [],
    tone: hasRecord ? "primary" : "neutral",
  };
}
