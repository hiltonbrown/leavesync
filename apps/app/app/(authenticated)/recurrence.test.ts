import { describe, expect, test } from "vitest";
import {
  createDefaultRecurrenceRule,
  generateRecurrenceOccurrences,
} from "./recurrence";

const expectOccurrences = (
  result: ReturnType<typeof generateRecurrenceOccurrences>
) => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.occurrences;
};

describe("generateRecurrenceOccurrences", () => {
  test("generates daily occurrences by count", () => {
    const rule = createDefaultRecurrenceRule("daily", "2026-04-10");
    const occurrences = expectOccurrences(
      generateRecurrenceOccurrences("2026-04-10", "2026-04-10", {
        ...rule,
        occurrenceCount: 3,
      })
    );

    expect(occurrences).toEqual([
      { startDate: "2026-04-10", endDate: "2026-04-10" },
      { startDate: "2026-04-11", endDate: "2026-04-11" },
      { startDate: "2026-04-12", endDate: "2026-04-12" },
    ]);
  });

  test("preserves multi-day ranges when repeating weekly", () => {
    const rule = createDefaultRecurrenceRule("weekly", "2026-04-10");
    const occurrences = expectOccurrences(
      generateRecurrenceOccurrences("2026-04-10", "2026-04-12", {
        ...rule,
        occurrenceCount: 2,
      })
    );

    expect(occurrences).toEqual([
      { startDate: "2026-04-10", endDate: "2026-04-12" },
      { startDate: "2026-04-17", endDate: "2026-04-19" },
    ]);
  });

  test("generates fortnightly occurrences", () => {
    const rule = createDefaultRecurrenceRule("fortnightly", "2026-04-10");
    const occurrences = expectOccurrences(
      generateRecurrenceOccurrences("2026-04-10", "2026-04-10", {
        ...rule,
        occurrenceCount: 3,
      })
    );

    expect(occurrences.map((occurrence) => occurrence.startDate)).toEqual([
      "2026-04-10",
      "2026-04-24",
      "2026-05-08",
    ]);
  });

  test("clamps monthly occurrences to the last valid month day", () => {
    const rule = createDefaultRecurrenceRule("monthly", "2026-01-31");
    const occurrences = expectOccurrences(
      generateRecurrenceOccurrences("2026-01-31", "2026-01-31", {
        ...rule,
        occurrenceCount: 3,
      })
    );

    expect(occurrences.map((occurrence) => occurrence.startDate)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  test("clamps annual leap-day recurrence in non-leap years", () => {
    const rule = createDefaultRecurrenceRule("annually", "2024-02-29");
    const occurrences = expectOccurrences(
      generateRecurrenceOccurrences("2024-02-29", "2024-02-29", {
        ...rule,
        occurrenceCount: 3,
      })
    );

    expect(occurrences.map((occurrence) => occurrence.startDate)).toEqual([
      "2024-02-29",
      "2025-02-28",
      "2026-02-28",
    ]);
  });

  test("supports custom weekly weekday rules", () => {
    const rule = createDefaultRecurrenceRule("custom", "2026-04-06");
    const occurrences = expectOccurrences(
      generateRecurrenceOccurrences("2026-04-06", "2026-04-06", {
        ...rule,
        unit: "week",
        weekdays: [1, 3],
        occurrenceCount: 4,
      })
    );

    expect(occurrences.map((occurrence) => occurrence.startDate)).toEqual([
      "2026-04-06",
      "2026-04-08",
      "2026-04-13",
      "2026-04-15",
    ]);
  });

  test("supports until-date endings", () => {
    const rule = createDefaultRecurrenceRule("daily", "2026-04-10");
    const occurrences = expectOccurrences(
      generateRecurrenceOccurrences("2026-04-10", "2026-04-10", {
        ...rule,
        endMode: "until",
        untilDate: "2026-04-12",
      })
    );

    expect(occurrences.map((occurrence) => occurrence.startDate)).toEqual([
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
    ]);
  });

  test("rejects more than the maximum occurrence count", () => {
    const rule = createDefaultRecurrenceRule("daily", "2026-04-10");
    const result = generateRecurrenceOccurrences("2026-04-10", "2026-04-10", {
      ...rule,
      occurrenceCount: 51,
    });

    expect(result).toEqual({
      ok: false,
      error: "Enter 1-50 occurrences",
    });
  });
});
