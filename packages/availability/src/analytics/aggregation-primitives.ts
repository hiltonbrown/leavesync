import type {
  availability_record_type,
  person_type,
} from "@repo/database/generated/enums";

export type RecordType = availability_record_type;
export type DayOfWeekIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface AnalyticsRecordForExpansion {
  allDay: boolean;
  endsAt: Date;
  id: string;
  locationId: string | null;
  personId: string;
  recordType: RecordType;
  startsAt: Date;
}

export interface AnalyticsHoliday {
  date: Date;
  isSuppressed: boolean;
}

export interface ExpandedRecordDay {
  date: Date;
  locationId: string | null;
  personId: string;
  recordId: string;
  recordType: RecordType;
  workingDayFraction: number;
}

export interface PersonIndexValue {
  archivedAt: Date | null;
  firstName: string;
  lastName: string;
  locationId: string | null;
  personType: "contractor" | "employee" | person_type | null;
  teamId: string | null;
}

export interface PersonForIndex {
  archivedAt: Date | null;
  employmentType?: string | null;
  firstName: string;
  id: string;
  lastName: string;
  locationId: string | null;
  personType: "contractor" | "employee" | person_type | null;
  teamId: string | null;
}

const DAY_MS = 86_400_000;
const WORKING_DAY_START_MINUTES = 9 * 60;
const WORKING_DAY_END_MINUTES = 17 * 60;
const WORKING_DAY_MINUTES = WORKING_DAY_END_MINUTES - WORKING_DAY_START_MINUTES;

export function expandRecordAcrossDays({
  record,
  rangeEnd,
  rangeStart,
  timezone = "UTC",
  locationHolidays,
}: {
  locationHolidays: readonly AnalyticsHoliday[];
  rangeEnd: Date;
  rangeStart: Date;
  record: AnalyticsRecordForExpansion;
  timezone?: string;
}): ExpandedRecordDay[] {
  const start = record.startsAt > rangeStart ? record.startsAt : rangeStart;
  const end = record.endsAt < rangeEnd ? record.endsAt : rangeEnd;
  if (end <= start) {
    return [];
  }

  const startParts = getLocalDateParts(start, timezone);
  const endParts = getLocalDateParts(new Date(end.getTime() - 1), timezone);
  const holidayDates = new Set(
    locationHolidays
      .filter((holiday) => !holiday.isSuppressed)
      .map((holiday) => dateOnlyInTimezone(holiday.date, timezone))
  );
  const entries: ExpandedRecordDay[] = [];

  for (const dateOnlyValue of dateRange(
    startParts.dateOnly,
    endParts.dateOnly
  )) {
    if (!isWorkingWeekday(dateOnlyValue) || holidayDates.has(dateOnlyValue)) {
      continue;
    }

    const fraction = record.allDay
      ? 1
      : roundHalfUpToQuarter(
          fractionalWorkingDay(dateOnlyValue, startParts, endParts)
        );
    if (fraction <= 0) {
      continue;
    }

    entries.push({
      date: dateOnlyToUtcDate(dateOnlyValue),
      locationId: record.locationId,
      personId: record.personId,
      recordId: record.id,
      recordType: record.recordType,
      workingDayFraction: fraction,
    });
  }

  return entries;
}

export function groupByRecordType(
  entries: readonly ExpandedRecordDay[]
): Map<RecordType, number> {
  return sumBy(entries, (entry) => entry.recordType);
}

export function groupByPerson(
  entries: readonly ExpandedRecordDay[]
): Map<string, number> {
  return sumBy(entries, (entry) => entry.personId);
}

export function groupByTeam(
  entries: readonly ExpandedRecordDay[],
  peopleIndex: ReadonlyMap<string, PersonIndexValue>
): Map<string, number> {
  return sumBy(entries, (entry) => peopleIndex.get(entry.personId)?.teamId);
}

export function groupByLocation(
  entries: readonly ExpandedRecordDay[],
  peopleIndex: ReadonlyMap<string, PersonIndexValue>
): Map<string, number> {
  return sumBy(entries, (entry) => peopleIndex.get(entry.personId)?.locationId);
}

export function groupByMonth(
  entries: readonly ExpandedRecordDay[],
  timezone: string
): Map<string, number> {
  return sumBy(entries, (entry) =>
    dateOnlyInTimezone(entry.date, timezone).slice(0, 7)
  );
}

export function groupByWeekOfYear(
  entries: readonly ExpandedRecordDay[],
  timezone: string
): Map<string, number> {
  return sumBy(entries, (entry) => isoWeekKey(entry.date, timezone));
}

export function groupByDayOfWeek(
  entries: readonly ExpandedRecordDay[],
  timezone: string
): Map<DayOfWeekIndex, number> {
  return sumBy(entries, (entry) => dayOfWeekIndex(entry.date, timezone));
}

export function buildPeopleIndex(
  people: readonly PersonForIndex[]
): Map<string, PersonIndexValue> {
  return new Map(
    people.map((person) => [
      person.id,
      {
        archivedAt: person.archivedAt,
        firstName: person.firstName,
        lastName: person.lastName,
        locationId: person.locationId,
        personType:
          person.personType ??
          (person.employmentType === "contractor" ? "contractor" : "employee"),
        teamId: person.teamId,
      },
    ])
  );
}

export function buildHeatmapMatrix({
  entries,
  timezone,
}: {
  entries: readonly ExpandedRecordDay[];
  timezone: string;
}): { days: number[][]; maxValue: number; weeks: string[] } {
  const weekValues = [...groupByWeekOfYear(entries, timezone).keys()].sort();
  const weeks = weekValues.length > 0 ? weekValues : [];
  const weekIndex = new Map(weeks.map((week, index) => [week, index]));
  const days = Array.from({ length: 7 }, () => weeks.map(() => 0));

  for (const entry of entries) {
    const week = isoWeekKey(entry.date, timezone);
    const column = weekIndex.get(week);
    if (column === undefined) {
      continue;
    }
    const row = dayOfWeekIndex(entry.date, timezone);
    const existingRow = days[row];
    if (existingRow) {
      existingRow[column] = roundToTwoDecimals(
        (existingRow[column] ?? 0) + entry.workingDayFraction
      );
    }
  }

  return {
    days,
    maxValue: Math.max(0, ...days.flat()),
    weeks,
  };
}

export function percentileRank(
  values: readonly number[],
  percentile: number
): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.min(100, Math.max(0, percentile));
  const rank = (clamped / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? lowerValue;
  return roundToTwoDecimals(
    lowerValue + (upperValue - lowerValue) * (rank - lower)
  );
}

function sumBy<TKey extends string | number>(
  entries: readonly ExpandedRecordDay[],
  keyForEntry: (entry: ExpandedRecordDay) => TKey | null | undefined
): Map<TKey, number> {
  const result = new Map<TKey, number>();
  for (const entry of entries) {
    const key = keyForEntry(entry);
    if (key === null || key === undefined || key === "") {
      continue;
    }
    result.set(
      key,
      roundToTwoDecimals((result.get(key) ?? 0) + entry.workingDayFraction)
    );
  }
  return result;
}

function fractionalWorkingDay(
  dateOnlyValue: string,
  startParts: LocalDateParts,
  endParts: LocalDateParts
): number {
  const coveredStart =
    dateOnlyValue === startParts.dateOnly
      ? startParts.hour * 60 + startParts.minute
      : 0;
  const coveredEnd =
    dateOnlyValue === endParts.dateOnly
      ? endParts.hour * 60 + endParts.minute
      : 24 * 60;
  const overlapStart = Math.max(coveredStart, WORKING_DAY_START_MINUTES);
  const overlapEnd = Math.min(coveredEnd, WORKING_DAY_END_MINUTES);
  return Math.max(0, overlapEnd - overlapStart) / WORKING_DAY_MINUTES;
}

interface LocalDateParts {
  dateOnly: string;
  hour: number;
  minute: number;
}

function getLocalDateParts(date: Date, timezone: string): LocalDateParts {
  const parts = new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const year = value("year");
  const month = value("month");
  const day = value("day");
  return {
    dateOnly: `${year}-${pad(month)}-${pad(day)}`,
    hour: value("hour") % 24,
    minute: value("minute"),
  };
}

function dateOnlyInTimezone(date: Date, timezone: string): string {
  return getLocalDateParts(date, timezone).dateOnly;
}

function dateRange(startDateOnly: string, endDateOnly: string): string[] {
  const dates: string[] = [];
  let cursor = dateOnlyToUtcDate(startDateOnly);
  const end = dateOnlyToUtcDate(endDateOnly);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return dates;
}

function dateOnlyToUtcDate(dateOnlyValue: string): Date {
  return new Date(`${dateOnlyValue}T00:00:00.000Z`);
}

function isWorkingWeekday(dateOnlyValue: string): boolean {
  const day = dateOnlyToUtcDate(dateOnlyValue).getUTCDay();
  return day >= 1 && day <= 5;
}

function dayOfWeekIndex(date: Date, timezone: string): DayOfWeekIndex {
  const dateOnlyValue = dateOnlyInTimezone(date, timezone);
  const utcDay = dateOnlyToUtcDate(dateOnlyValue).getUTCDay();
  return toDayOfWeekIndex((utcDay + 6) % 7);
}

function toDayOfWeekIndex(value: number): DayOfWeekIndex {
  if (
    value === 0 ||
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5
  ) {
    return value;
  }
  return 6;
}

function isoWeekKey(date: Date, timezone: string): string {
  const dateOnlyValue = dateOnlyInTimezone(date, timezone);
  const cursor = dateOnlyToUtcDate(dateOnlyValue);
  const day = cursor.getUTCDay() || 7;
  cursor.setUTCDate(cursor.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(cursor.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((cursor.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7
  );
  return `${cursor.getUTCFullYear()}-W${pad(week)}`;
}

function roundHalfUpToQuarter(value: number): number {
  return Math.floor(value * 4 + 0.5) / 4;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
