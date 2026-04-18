import { describe, expect, it } from "vitest";
import {
  buildHeatmapMatrix,
  type ExpandedRecordDay,
  expandRecordAcrossDays,
  groupByDayOfWeek,
  groupByLocation,
  groupByMonth,
  groupByPerson,
  groupByRecordType,
  groupByTeam,
  percentileRank,
} from "./aggregation-primitives";

const record = {
  allDay: true,
  endsAt: new Date("2026-05-08T23:00:00.000Z"),
  id: "record_1",
  locationId: "loc_1",
  personId: "person_1",
  recordType: "annual_leave" as const,
  startsAt: new Date("2026-05-04T00:00:00.000Z"),
};

describe("aggregation primitives", () => {
  it("expands a Monday to Friday all-day record into five entries", () => {
    const entries = expandRecordAcrossDays({
      locationHolidays: [],
      rangeEnd: new Date("2026-05-09T00:00:00.000Z"),
      rangeStart: new Date("2026-05-04T00:00:00.000Z"),
      record,
    });

    expect(entries).toHaveLength(5);
    expect(entries.map((entry) => entry.workingDayFraction)).toEqual([
      1, 1, 1, 1, 1,
    ]);
  });

  it("excludes weekends and non-suppressed holidays", () => {
    const entries = expandRecordAcrossDays({
      locationHolidays: [
        { date: new Date("2026-05-05T00:00:00.000Z"), isSuppressed: false },
        { date: new Date("2026-05-06T00:00:00.000Z"), isSuppressed: true },
      ],
      rangeEnd: new Date("2026-05-11T00:00:00.000Z"),
      rangeStart: new Date("2026-05-04T00:00:00.000Z"),
      record: {
        ...record,
        endsAt: new Date("2026-05-10T23:00:00.000Z"),
      },
    });

    expect(
      entries.map((entry) => entry.date.toISOString().slice(0, 10))
    ).toEqual(["2026-05-04", "2026-05-06", "2026-05-07", "2026-05-08"]);
  });

  it("rounds part-day records half-up to a quarter day", () => {
    const entries = expandRecordAcrossDays({
      locationHolidays: [],
      rangeEnd: new Date("2026-05-05T00:00:00.000Z"),
      rangeStart: new Date("2026-05-04T00:00:00.000Z"),
      record: {
        ...record,
        allDay: false,
        endsAt: new Date("2026-05-04T12:01:00.000Z"),
        startsAt: new Date("2026-05-04T09:00:00.000Z"),
      },
    });

    expect(entries[0]?.workingDayFraction).toBe(0.5);
  });

  it("clips records to the queried range", () => {
    const entries = expandRecordAcrossDays({
      locationHolidays: [
        { date: new Date("2026-01-01T00:00:00.000Z"), isSuppressed: false },
      ],
      rangeEnd: new Date("2026-01-06T00:00:00.000Z"),
      rangeStart: new Date("2026-01-01T00:00:00.000Z"),
      record: {
        ...record,
        endsAt: new Date("2026-01-05T23:00:00.000Z"),
        startsAt: new Date("2025-12-28T00:00:00.000Z"),
      },
    });

    expect(
      entries.map((entry) => entry.date.toISOString().slice(0, 10))
    ).toEqual(["2026-01-02", "2026-01-05"]);
  });

  it("groups entries across dimensions", () => {
    const entries: ExpandedRecordDay[] = [
      {
        date: new Date("2026-05-04T00:00:00.000Z"),
        locationId: "loc_1",
        personId: "person_1",
        recordId: "record_1",
        recordType: "annual_leave",
        workingDayFraction: 1,
      },
      {
        date: new Date("2026-05-05T00:00:00.000Z"),
        locationId: "loc_2",
        personId: "person_2",
        recordId: "record_2",
        recordType: "sick_leave",
        workingDayFraction: 0.5,
      },
    ];
    const people = new Map([
      [
        "person_1",
        {
          archivedAt: null,
          firstName: "A",
          lastName: "One",
          locationId: "loc_1",
          personType: "employee" as const,
          teamId: "team_1",
        },
      ],
      [
        "person_2",
        {
          archivedAt: null,
          firstName: "B",
          lastName: "Two",
          locationId: "loc_2",
          personType: "employee" as const,
          teamId: "team_2",
        },
      ],
    ]);

    expect(groupByRecordType(entries).get("annual_leave")).toBe(1);
    expect(groupByPerson(entries).get("person_2")).toBe(0.5);
    expect(groupByTeam(entries, people).get("team_1")).toBe(1);
    expect(groupByLocation(entries, people).get("loc_2")).toBe(0.5);
    expect(groupByMonth(entries, "UTC").get("2026-05")).toBe(1.5);
    expect(groupByDayOfWeek(entries, "UTC").get(0)).toBe(1);
  });

  it("builds a heatmap and computes percentile ranks", () => {
    const entries = expandRecordAcrossDays({
      locationHolidays: [],
      rangeEnd: new Date("2026-05-09T00:00:00.000Z"),
      rangeStart: new Date("2026-05-04T00:00:00.000Z"),
      record,
    });
    const heatmap = buildHeatmapMatrix({ entries, timezone: "UTC" });

    expect(heatmap.days).toHaveLength(7);
    expect(heatmap.maxValue).toBe(1);
    expect(percentileRank([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 80)).toBe(8.2);
  });
});
