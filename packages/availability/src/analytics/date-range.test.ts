import { describe, expect, it } from "vitest";
import { resolveDateRange } from "./date-range";

const timezone = "Australia/Brisbane";
const now = new Date("2026-04-18T02:00:00.000Z");

describe("resolveDateRange", () => {
  it("resolves this month in the organisation timezone", () => {
    const result = resolveDateRange({ now, preset: "this_month", timezone });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.start.toISOString()).toBe("2026-03-31T14:00:00.000Z");
      expect(result.value.end.toISOString()).toBe("2026-04-30T14:00:00.000Z");
      expect(result.value.label).toBe("This month");
    }
  });

  it("resolves last month across a January boundary", () => {
    const result = resolveDateRange({
      now: new Date("2026-01-15T02:00:00.000Z"),
      preset: "last_month",
      timezone,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.start.toISOString()).toBe("2025-11-30T14:00:00.000Z");
      expect(result.value.end.toISOString()).toBe("2025-12-31T14:00:00.000Z");
    }
  });

  it("resolves this quarter in Q2", () => {
    const result = resolveDateRange({ now, preset: "this_quarter", timezone });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.start.toISOString()).toBe("2026-03-31T14:00:00.000Z");
      expect(result.value.end.toISOString()).toBe("2026-06-30T14:00:00.000Z");
      expect(result.value.label).toBe("Q2 2026");
    }
  });

  it("resolves last 12 months as clean calendar months", () => {
    const result = resolveDateRange({
      now,
      preset: "last_12_months",
      timezone,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.start.toISOString()).toBe("2025-03-31T14:00:00.000Z");
      expect(result.value.end.toISOString()).toBe("2026-03-31T14:00:00.000Z");
    }
  });

  it("rejects custom ranges without both dates", () => {
    const result = resolveDateRange({
      customStart: "2026-01-01",
      preset: "custom",
      timezone,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid_date_range",
        message: "Custom ranges need a start and end date.",
      },
    });
  });

  it("rejects custom ranges wider than 3 years", () => {
    const result = resolveDateRange({
      customEnd: "2029-01-01",
      customStart: "2026-01-01",
      preset: "custom",
      timezone,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("date_range_too_wide");
    }
  });
});
