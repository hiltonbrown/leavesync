export const MAX_RECURRENCE_OCCURRENCES = 50;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type RecurrenceFrequency =
  | "none"
  | "daily"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "annually"
  | "custom";

export type RecurrenceRuleFrequency = Exclude<RecurrenceFrequency, "none">;

export type RecurrenceUnit = "day" | "week" | "month" | "year";

export type RecurrenceEndMode = "count" | "until";

export type RecurrenceMonthMode = "day-of-month" | "last-day";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RecurrenceRule {
  endMode: RecurrenceEndMode;
  frequency: RecurrenceRuleFrequency;
  interval: number;
  monthMode: RecurrenceMonthMode;
  occurrenceCount: number;
  unit: RecurrenceUnit;
  untilDate: string;
  weekdays: Weekday[];
}

export interface DateRangeOccurrence {
  endDate: string;
  startDate: string;
}

type GenerateResult =
  | { occurrences: DateRangeOccurrence[]; ok: true }
  | { error: string; ok: false };

export const WEEKDAY_OPTIONS: {
  label: string;
  shortLabel: string;
  value: Weekday;
}[] = [
  { value: 1, label: "Monday", shortLabel: "Mon" },
  { value: 2, label: "Tuesday", shortLabel: "Tue" },
  { value: 3, label: "Wednesday", shortLabel: "Wed" },
  { value: 4, label: "Thursday", shortLabel: "Thu" },
  { value: 5, label: "Friday", shortLabel: "Fri" },
  { value: 6, label: "Saturday", shortLabel: "Sat" },
  { value: 0, label: "Sunday", shortLabel: "Sun" },
];

const FREQUENCY_LABELS: Record<RecurrenceRuleFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  annually: "Annually",
  custom: "Custom",
};

const isValidDateString = (date: string) => {
  if (!DATE_INPUT_PATTERN.test(date)) {
    return false;
  }

  const parsed = dateFromString(date);
  return parsed ? dateToString(parsed) === date : false;
};

const dateFromString = (date: string) => {
  if (!DATE_INPUT_PATTERN.test(date)) {
    return null;
  }

  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const dateToString = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: string, days: number) => {
  const parsed = dateFromString(date);
  if (!parsed) {
    return date;
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return dateToString(parsed);
};

const daysInMonth = (year: number, monthIndex: number) =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const addMonths = (
  date: string,
  months: number,
  monthMode: RecurrenceMonthMode
) => {
  const parsed = dateFromString(date);
  if (!parsed) {
    return date;
  }

  const totalMonths =
    parsed.getUTCFullYear() * 12 + parsed.getUTCMonth() + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12;
  const maxDay = daysInMonth(targetYear, targetMonth);
  const targetDay =
    monthMode === "last-day" ? maxDay : Math.min(parsed.getUTCDate(), maxDay);

  return dateToString(new Date(Date.UTC(targetYear, targetMonth, targetDay)));
};

const daysBetween = (startDate: string, endDate: string) => {
  const start = dateFromString(startDate);
  const end = dateFromString(endDate);
  if (!(start && end)) {
    return 0;
  }
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
};

const weekdayForDate = (date: string): Weekday => {
  const parsed = dateFromString(date);
  if (!parsed) {
    return 1;
  }
  const day = parsed.getUTCDay();
  return day === 0 ||
    day === 1 ||
    day === 2 ||
    day === 3 ||
    day === 4 ||
    day === 5 ||
    day === 6
    ? day
    : 1;
};

export const parseRecurrenceFrequency = (
  value: string
): RecurrenceFrequency | null => {
  if (
    value === "none" ||
    value === "daily" ||
    value === "weekly" ||
    value === "fortnightly" ||
    value === "monthly" ||
    value === "annually" ||
    value === "custom"
  ) {
    return value;
  }
  return null;
};

export const parseRecurrenceEndMode = (
  value: string
): RecurrenceEndMode | null => {
  if (value === "count" || value === "until") {
    return value;
  }
  return null;
};

export const parseRecurrenceUnit = (value: string): RecurrenceUnit | null => {
  if (
    value === "day" ||
    value === "week" ||
    value === "month" ||
    value === "year"
  ) {
    return value;
  }
  return null;
};

export const parseRecurrenceMonthMode = (
  value: string
): RecurrenceMonthMode | null => {
  if (value === "day-of-month" || value === "last-day") {
    return value;
  }
  return null;
};

export const createDefaultRecurrenceRule = (
  frequency: RecurrenceRuleFrequency,
  startDate: string
): RecurrenceRule => {
  const startWeekday = weekdayForDate(startDate);

  if (frequency === "daily") {
    return {
      frequency,
      interval: 1,
      unit: "day",
      endMode: "count",
      occurrenceCount: 5,
      untilDate: startDate,
      weekdays: [startWeekday],
      monthMode: "day-of-month",
    };
  }

  if (frequency === "weekly" || frequency === "fortnightly") {
    return {
      frequency,
      interval: frequency === "fortnightly" ? 2 : 1,
      unit: "week",
      endMode: "count",
      occurrenceCount: 5,
      untilDate: startDate,
      weekdays: [startWeekday],
      monthMode: "day-of-month",
    };
  }

  if (frequency === "monthly") {
    return {
      frequency,
      interval: 1,
      unit: "month",
      endMode: "count",
      occurrenceCount: 5,
      untilDate: startDate,
      weekdays: [startWeekday],
      monthMode: "day-of-month",
    };
  }

  if (frequency === "annually") {
    return {
      frequency,
      interval: 1,
      unit: "year",
      endMode: "count",
      occurrenceCount: 5,
      untilDate: startDate,
      weekdays: [startWeekday],
      monthMode: "day-of-month",
    };
  }

  return {
    frequency,
    interval: 1,
    unit: "week",
    endMode: "count",
    occurrenceCount: 5,
    untilDate: startDate,
    weekdays: [startWeekday],
    monthMode: "day-of-month",
  };
};

export const getRecurrenceValidationError = (
  startDate: string,
  endDate: string,
  rule: RecurrenceRule
) => {
  if (!(isValidDateString(startDate) && isValidDateString(endDate))) {
    return "Select a valid start and end date";
  }

  if (endDate < startDate) {
    return "End date must be after start date";
  }

  if (!(Number.isInteger(rule.interval) && rule.interval > 0)) {
    return "Repeat interval must be at least 1";
  }

  if (
    rule.endMode === "count" &&
    !(
      Number.isInteger(rule.occurrenceCount) &&
      rule.occurrenceCount > 0 &&
      rule.occurrenceCount <= MAX_RECURRENCE_OCCURRENCES
    )
  ) {
    return `Enter 1-${MAX_RECURRENCE_OCCURRENCES} occurrences`;
  }

  if (rule.endMode === "until") {
    if (!isValidDateString(rule.untilDate)) {
      return "Select a valid repeat-until date";
    }
    if (rule.untilDate < startDate) {
      return "Repeat-until date must be on or after the start date";
    }
  }

  if (
    rule.frequency === "custom" &&
    rule.unit === "week" &&
    rule.weekdays.length === 0
  ) {
    return "Select at least one weekday";
  }

  return null;
};

const buildOccurrence = (
  startDate: string,
  durationDays: number
): DateRangeOccurrence => ({
  startDate,
  endDate: addDays(startDate, durationDays),
});

const shouldAddOccurrence = (
  startDate: string,
  rule: RecurrenceRule,
  currentCount: number
) => {
  if (rule.endMode === "count") {
    return currentCount < rule.occurrenceCount;
  }
  return startDate <= rule.untilDate;
};

const addStep = (date: string, rule: RecurrenceRule, step: number) => {
  if (rule.frequency === "daily") {
    return addDays(date, step);
  }
  if (rule.frequency === "weekly") {
    return addDays(date, step * 7);
  }
  if (rule.frequency === "fortnightly") {
    return addDays(date, step * 14);
  }
  if (rule.frequency === "monthly") {
    return addMonths(date, step, rule.monthMode);
  }
  if (rule.frequency === "annually") {
    return addMonths(date, step * 12, rule.monthMode);
  }

  if (rule.unit === "day") {
    return addDays(date, step * rule.interval);
  }
  if (rule.unit === "week") {
    return addDays(date, step * rule.interval * 7);
  }
  if (rule.unit === "month") {
    return addMonths(date, step * rule.interval, rule.monthMode);
  }
  return addMonths(date, step * rule.interval * 12, rule.monthMode);
};

const sortedWeekdays = (weekdays: Weekday[]) =>
  [...new Set(weekdays)].sort((a, b) => a - b);

const generateWeeklyCustomOccurrences = (
  startDate: string,
  durationDays: number,
  rule: RecurrenceRule
): GenerateResult => {
  const occurrences: DateRangeOccurrence[] = [];
  const anchorWeekStart = addDays(startDate, -weekdayForDate(startDate));
  const weekdays = sortedWeekdays(rule.weekdays);
  let weekOffset = 0;

  while (true) {
    const weekStart = addDays(anchorWeekStart, weekOffset * 7);

    if (rule.endMode === "until" && weekStart > rule.untilDate) {
      break;
    }

    for (const weekday of weekdays) {
      const candidate = addDays(weekStart, weekday);
      if (candidate < startDate) {
        continue;
      }
      if (!shouldAddOccurrence(candidate, rule, occurrences.length)) {
        return { ok: true, occurrences };
      }

      occurrences.push(buildOccurrence(candidate, durationDays));

      if (occurrences.length > MAX_RECURRENCE_OCCURRENCES) {
        return {
          ok: false,
          error: `Recurring entries are limited to ${MAX_RECURRENCE_OCCURRENCES} occurrences`,
        };
      }

      if (
        rule.endMode === "count" &&
        occurrences.length >= rule.occurrenceCount
      ) {
        return { ok: true, occurrences };
      }
    }

    weekOffset += rule.interval;
  }

  return { ok: true, occurrences };
};

export const generateRecurrenceOccurrences = (
  startDate: string,
  endDate: string,
  rule: RecurrenceRule
): GenerateResult => {
  const validationError = getRecurrenceValidationError(
    startDate,
    endDate,
    rule
  );
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const durationDays = daysBetween(startDate, endDate);

  if (rule.frequency === "custom" && rule.unit === "week") {
    return generateWeeklyCustomOccurrences(startDate, durationDays, rule);
  }

  const occurrences: DateRangeOccurrence[] = [];
  let step = 0;

  while (true) {
    const candidate = addStep(startDate, rule, step);

    if (!shouldAddOccurrence(candidate, rule, occurrences.length)) {
      break;
    }

    occurrences.push(buildOccurrence(candidate, durationDays));

    if (occurrences.length > MAX_RECURRENCE_OCCURRENCES) {
      return {
        ok: false,
        error: `Recurring entries are limited to ${MAX_RECURRENCE_OCCURRENCES} occurrences`,
      };
    }

    if (
      rule.endMode === "count" &&
      occurrences.length >= rule.occurrenceCount
    ) {
      break;
    }

    step += 1;
  }

  return { ok: true, occurrences };
};

export const getSingleOccurrence = (
  startDate: string,
  endDate: string
): DateRangeOccurrence[] => [{ startDate, endDate }];

export const describeRecurrenceRule = (rule: RecurrenceRule) => {
  if (rule.frequency !== "custom") {
    return FREQUENCY_LABELS[rule.frequency];
  }

  const unitLabel = rule.interval === 1 ? rule.unit : `${rule.unit}s`;

  return `Every ${rule.interval} ${unitLabel}`;
};
