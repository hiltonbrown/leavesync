import { describe, expect, it } from "vitest";
import { CalendarFilterSchema } from "../calendar/_schemas";
import { PeopleFilterSchema } from "../people/_schemas";
import {
  buildCalendarDrillDownUrl,
  buildPeopleDrillDownUrl,
} from "./drill-down-url";

describe("analytics drill-down URLs", () => {
  it("builds calendar URLs compatible with the calendar filter schema", () => {
    const url = buildCalendarDrillDownUrl({
      customStart: "2026-01-01",
      org: "00000000-0000-4000-8000-000000000001",
      personId: "00000000-0000-4000-8000-000000000011",
      preset: "custom",
      recordType: "annual_leave",
    });
    const params = new URLSearchParams(url.split("?")[1]);

    expect(
      CalendarFilterSchema.safeParse(Object.fromEntries(params)).success
    ).toBe(true);
  });

  it("builds people URLs compatible with the people filter schema", () => {
    const url = buildPeopleDrillDownUrl({
      org: "00000000-0000-4000-8000-000000000001",
      teamId: "00000000-0000-4000-8000-000000000101",
    });
    const params = new URLSearchParams(url.split("?")[1]);

    expect(
      PeopleFilterSchema.safeParse(Object.fromEntries(params)).success
    ).toBe(true);
  });
});
