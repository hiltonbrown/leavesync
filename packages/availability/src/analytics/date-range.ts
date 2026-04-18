import type { Result } from "@repo/core";

export type DateRangePreset =
  | "custom"
  | "last_12_months"
  | "last_month"
  | "last_quarter"
  | "last_year"
  | "this_month"
  | "this_quarter"
  | "this_year";

export type DateRangeError =
  | { code: "date_range_too_wide"; message: string }
  | { code: "invalid_date_range"; message: string };

export interface ResolvedDateRange {
  end: Date;
  label: string;
  start: Date;
}

export interface ResolveDateRangeInput {
  customEnd?: string;
  customStart?: string;
  now?: Date;
  preset: DateRangePreset;
  timezone: string;
}

export const DATE_RANGE_PRESET_OPTIONS: Array<{
  label: string;
  value: DateRangePreset;
}> = [
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "This quarter", value: "this_quarter" },
  { label: "Last quarter", value: "last_quarter" },
  { label: "This year", value: "this_year" },
  { label: "Last year", value: "last_year" },
  { label: "Last 12 months", value: "last_12_months" },
  { label: "Custom", value: "custom" },
];

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function resolveDateRange(
  input: ResolveDateRangeInput
): Result<ResolvedDateRange, DateRangeError> {
  const timezone = input.timezone || "UTC";
  const nowDateOnly = dateOnlyInTimeZone(input.now ?? new Date(), timezone);
  const nowParts = parseDateOnly(nowDateOnly);
  if (!nowParts) {
    return invalidDateRange("Could not resolve the current date.");
  }

  if (input.preset === "custom") {
    return resolveCustomRange(input, timezone);
  }

  const monthStart = dateOnly(nowParts.year, nowParts.month, 1);
  const yearStart = dateOnly(nowParts.year, 1, 1);
  const quarterStartMonth = Math.floor((nowParts.month - 1) / 3) * 3 + 1;
  const quarterStart = dateOnly(nowParts.year, quarterStartMonth, 1);

  const ranges: Record<
    Exclude<DateRangePreset, "custom">,
    { endDateOnly: string; label: string; startDateOnly: string }
  > = {
    last_12_months: {
      endDateOnly: monthStart,
      label: "Last 12 months",
      startDateOnly: addMonths(monthStart, -12),
    },
    last_month: {
      endDateOnly: monthStart,
      label: "Last month",
      startDateOnly: addMonths(monthStart, -1),
    },
    last_quarter: {
      endDateOnly: quarterStart,
      label: quarterLabel(addMonths(quarterStart, -3)),
      startDateOnly: addMonths(quarterStart, -3),
    },
    last_year: {
      endDateOnly: yearStart,
      label: String(nowParts.year - 1),
      startDateOnly: dateOnly(nowParts.year - 1, 1, 1),
    },
    this_month: {
      endDateOnly: addMonths(monthStart, 1),
      label: "This month",
      startDateOnly: monthStart,
    },
    this_quarter: {
      endDateOnly: addMonths(quarterStart, 3),
      label: quarterLabel(quarterStart),
      startDateOnly: quarterStart,
    },
    this_year: {
      endDateOnly: dateOnly(nowParts.year + 1, 1, 1),
      label: String(nowParts.year),
      startDateOnly: yearStart,
    },
  };

  const range = ranges[input.preset];
  return {
    ok: true,
    value: {
      end: zonedStartOfDayToUtc(range.endDateOnly, timezone),
      label: range.label,
      start: zonedStartOfDayToUtc(range.startDateOnly, timezone),
    },
  };
}

function resolveCustomRange(
  input: ResolveDateRangeInput,
  timezone: string
): Result<ResolvedDateRange, DateRangeError> {
  if (!(input.customStart && input.customEnd)) {
    return invalidDateRange("Custom ranges need a start and end date.");
  }
  const startParts = parseDateOnly(input.customStart);
  const endParts = parseDateOnly(input.customEnd);
  if (!(startParts && endParts)) {
    return invalidDateRange("Custom range dates must use YYYY-MM-DD.");
  }
  if (input.customEnd < input.customStart) {
    return invalidDateRange("Custom end date must be after the start date.");
  }

  const exclusiveEnd = addDays(input.customEnd, 1);
  const maxExclusiveEnd = addYears(input.customStart, 3);
  if (exclusiveEnd > maxExclusiveEnd) {
    return {
      ok: false,
      error: {
        code: "date_range_too_wide",
        message: "Custom date ranges cannot be wider than 3 years.",
      },
    };
  }

  return {
    ok: true,
    value: {
      end: zonedStartOfDayToUtc(exclusiveEnd, timezone),
      label: formatCustomLabel(input.customStart, input.customEnd, timezone),
      start: zonedStartOfDayToUtc(input.customStart, timezone),
    },
  };
}

function invalidDateRange(message: string): Result<never, DateRangeError> {
  return { ok: false, error: { code: "invalid_date_range", message } };
}

function formatCustomLabel(
  startDateOnly: string,
  endDateOnly: string,
  timezone: string
): string {
  const start = zonedStartOfDayToUtc(startDateOnly, timezone);
  const end = zonedStartOfDayToUtc(endDateOnly, timezone);
  const formatter = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
    year: "numeric",
  });
  const startLabel = formatter.format(start);
  const endLabel = formatter.format(end);
  return startLabel === endLabel ? startLabel : `${startLabel} to ${endLabel}`;
}

function quarterLabel(startDateOnly: string): string {
  const parts = parseDateOnly(startDateOnly);
  if (!parts) {
    return "Quarter";
  }
  return `Q${Math.floor((parts.month - 1) / 3) + 1} ${parts.year}`;
}

function parseDateOnly(
  value: string
): { day: number; month: number; year: number } | null {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return null;
  }
  const [yearValue, monthValue, dayValue] = value.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { day, month, year };
}

function dateOnly(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function addDays(dateOnlyValue: string, days: number): string {
  const parts = parseDateOnly(dateOnlyValue);
  if (!parts) {
    return dateOnlyValue;
  }
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days)
  );
  return date.toISOString().slice(0, 10);
}

function addMonths(dateOnlyValue: string, months: number): string {
  const parts = parseDateOnly(dateOnlyValue);
  if (!parts) {
    return dateOnlyValue;
  }
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1 + months, parts.day)
  );
  return date.toISOString().slice(0, 10);
}

function addYears(dateOnlyValue: string, years: number): string {
  const parts = parseDateOnly(dateOnlyValue);
  if (!parts) {
    return dateOnlyValue;
  }
  const date = new Date(
    Date.UTC(parts.year + years, parts.month - 1, parts.day)
  );
  return date.toISOString().slice(0, 10);
}

function dateOnlyInTimeZone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function localPartsInTimeZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    day: value("day"),
    hour: value("hour") % 24,
    minute: value("minute"),
    month: value("month"),
    second: value("second"),
    year: value("year"),
  };
}

export function zonedStartOfDayToUtc(
  dateOnlyValue: string,
  timezone: string
): Date {
  const parts = parseDateOnly(dateOnlyValue);
  const year = parts?.year ?? 1970;
  const month = parts?.month ?? 1;
  const day = parts?.day ?? 1;
  let guess = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  for (let index = 0; index < 2; index += 1) {
    const actual = localPartsInTimeZone(new Date(guess), timezone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    const targetAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
    guess -= actualAsUtc - targetAsUtc;
  }
  return new Date(guess);
}
