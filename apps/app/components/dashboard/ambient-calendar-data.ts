import type {
  EmployeeDashboardView,
  ManagerDashboardView,
} from "@repo/availability";

export const AMBIENT_CALENDAR_DAY_COUNT = 14;

export type AmbientCalendarConfidence =
  | "exact"
  | "personal"
  | "threshold-only"
  | "unknown";

export type AmbientCalendarProvenance = "manual" | "team-calendar" | "xero";

export type AmbientCalendarTone =
  | "danger"
  | "manual"
  | "neutral"
  | "primary"
  | "warning";

type PersonalUpcomingRecord = Extract<
  EmployeeDashboardView["upcoming"],
  { status: "ready" }
>["data"]["next14Days"][number];

type PersonalTodayRecord = NonNullable<
  Extract<
    EmployeeDashboardView["todayStatus"],
    { status: "ready" }
  >["data"]["activeRecord"]
>;

type TeamTodayData = Extract<
  ManagerDashboardView["teamToday"],
  { status: "ready" }
>["data"];

type TeamTodayPerson = TeamTodayData["peopleNeedingAttention"][number];

type TeamRecord = Extract<
  ManagerDashboardView["teamThisWeek"],
  { status: "ready" }
>["data"]["upcomingRecords"][number];

type TeamPeak = Extract<
  ManagerDashboardView["upcomingPeaks"],
  { status: "ready" }
>["data"]["peaks"][number];

export interface AmbientCalendarCoverage {
  awayCount: number;
  ratio: number;
  totalCount: number;
}

export interface AmbientCalendarPersonalRecordSignal {
  allDay: boolean;
  approvalStatus: PersonalUpcomingRecord["approvalStatus"];
  id: string;
  kind: "personal-record";
  label: string;
  provenance?: AmbientCalendarProvenance;
  recordType: PersonalUpcomingRecord["recordType"];
}

export interface AmbientCalendarHolidaySignal {
  id: string;
  kind: "holiday";
  label: string;
  source: string;
}

export interface AmbientCalendarTeamRecordSignal {
  id: string;
  kind: "team-record";
  label: string;
  personName: string;
  recordType: TeamRecord["recordType"];
}

export interface AmbientCalendarTeamPersonSignal {
  id: string;
  kind: "team-person";
  label: string;
  personName: string;
  recordType: TeamTodayPerson["recordType"];
  statusKey: TeamTodayPerson["statusKey"];
  xeroSyncFailedCount: number;
}

export interface AmbientCalendarTeamSummarySignal {
  availableCount: number;
  id: string;
  kind: "team-summary";
  label: string;
  onLeaveCount: number;
  otherUnavailableCount: number;
  travellingCount: number;
  workingFromHomeCount: number;
  xeroSyncFailedCount: number;
}

export interface AmbientCalendarTeamPeakSignal {
  awayCount: number;
  id: string;
  kind: "team-peak";
  label: string;
  percentage: number;
  recordTypes: TeamPeak["recordTypes"];
  totalCount: number;
}

export type AmbientCalendarSignal =
  | AmbientCalendarHolidaySignal
  | AmbientCalendarPersonalRecordSignal
  | AmbientCalendarTeamPeakSignal
  | AmbientCalendarTeamPersonSignal
  | AmbientCalendarTeamRecordSignal
  | AmbientCalendarTeamSummarySignal;

export interface AmbientCalendarDay {
  accessibleLabel: string;
  confidence: AmbientCalendarConfidence;
  coverage: AmbientCalendarCoverage | null;
  dateKey: string;
  detailLabel: string;
  isToday: boolean;
  label: string;
  signals: AmbientCalendarSignal[];
  tone: AmbientCalendarTone;
}

export interface AmbientCalendarModel {
  dayCount: typeof AMBIENT_CALENDAR_DAY_COUNT;
  days: AmbientCalendarDay[];
  description: string;
  href: string;
  mode: "personal" | "team";
  startDateKey: string;
  timezone: string;
  title: string;
}

export type AmbientCalendarSource =
  | { mode: "personal"; view: EmployeeDashboardView }
  | { mode: "team"; view: ManagerDashboardView };

export interface AmbientCalendarOptions {
  now: Date;
  timezone: string;
}

export function buildPersonalCalendarTimeline(
  view: EmployeeDashboardView,
  options: AmbientCalendarOptions
): AmbientCalendarModel {
  return buildAmbientCalendarModel({ mode: "personal", view }, options);
}

export function buildManagerCalendarTimeline(
  view: ManagerDashboardView,
  options: AmbientCalendarOptions
): AmbientCalendarModel {
  return buildAmbientCalendarModel({ mode: "team", view }, options);
}

export function buildAmbientCalendarModel(
  source: AmbientCalendarSource,
  options: AmbientCalendarOptions
): AmbientCalendarModel {
  const formatter = createDateKeyFormatter(options.timezone);
  const startDateKey = toDateKey(options.now, formatter);
  const days = buildEmptyDays(startDateKey);

  if (source.mode === "personal") {
    projectPersonalTimeline(days, source.view, formatter);
  } else {
    projectManagerTimeline(days, source.view, formatter);
  }

  const labelledDays = days.map((day) => labelDay(day, source.mode));
  const copy = modelCopy(source.mode);

  return {
    dayCount: AMBIENT_CALENDAR_DAY_COUNT,
    days: labelledDays,
    description: copy.description,
    href: copy.href,
    mode: source.mode,
    startDateKey,
    timezone: options.timezone,
    title: copy.title,
  };
}

function buildEmptyDays(startDateKey: string): AmbientCalendarDay[] {
  return Array.from({ length: AMBIENT_CALENDAR_DAY_COUNT }, (_, index) => ({
    accessibleLabel: "",
    confidence: "unknown",
    coverage: null,
    dateKey: addDays(startDateKey, index),
    detailLabel: "",
    isToday: index === 0,
    label: "",
    signals: [],
    tone: "neutral",
  }));
}

function modelCopy(mode: AmbientCalendarModel["mode"]): {
  description: string;
  href: string;
  title: string;
} {
  if (mode === "team") {
    return {
      description:
        "Team availability today and threshold-based coverage signals ahead.",
      href: "/calendar?scopeType=my_team",
      title: "Team coverage",
    };
  }
  return {
    description: "Your leave and availability records for the next 14 days.",
    href: "/calendar?scopeType=my_self",
    title: "Your next 14 days",
  };
}

function labelDay(
  day: AmbientCalendarDay,
  mode: AmbientCalendarModel["mode"]
): AmbientCalendarDay {
  const signals = [...day.signals].sort((left, right) =>
    left.id.localeCompare(right.id)
  );
  const label = formatDateKey(day.dateKey);
  const detailLabel = dayDetailLabel({ ...day, signals }, mode);
  return {
    ...day,
    accessibleLabel: `${label}: ${detailLabel}`,
    detailLabel,
    label,
    signals,
    tone: dayTone({ ...day, signals }),
  };
}

function dayDetailLabel(
  day: AmbientCalendarDay,
  mode: AmbientCalendarModel["mode"]
): string {
  if (mode === "personal") {
    if (day.confidence === "unknown") {
      return "Schedule data is unavailable for this day";
    }
    if (day.signals.length === 0) {
      return "No personal records scheduled";
    }
    return day.signals.map((signal) => signal.label).join(", ");
  }
  if (day.confidence === "exact" && day.coverage) {
    return `${day.coverage.awayCount} of ${day.coverage.totalCount} unavailable today`;
  }
  if (day.confidence === "threshold-only" && day.coverage) {
    return `${day.coverage.awayCount} of ${day.coverage.totalCount} away, peak threshold reached`;
  }
  if (day.signals.length > 0) {
    return `${day.signals.map((signal) => signal.label).join(", ")}; complete coverage is not available`;
  }
  return "No coverage peak is flagged for this day";
}

function dayTone(day: AmbientCalendarDay): AmbientCalendarTone {
  if (
    day.signals.some(
      (signal) =>
        (signal.kind === "team-person" && signal.xeroSyncFailedCount > 0) ||
        (signal.kind === "team-summary" && signal.xeroSyncFailedCount > 0) ||
        (signal.kind === "personal-record" &&
          signal.approvalStatus === "xero_sync_failed")
    )
  ) {
    return "danger";
  }
  if (
    day.signals.some(
      (signal) =>
        signal.kind === "personal-record" && signal.provenance === "manual"
    )
  ) {
    return "manual";
  }
  if (
    day.confidence === "threshold-only" ||
    day.signals.some((signal) => signal.kind === "holiday") ||
    day.signals.some(
      (signal) =>
        signal.kind === "personal-record" &&
        (signal.approvalStatus === "draft" ||
          signal.approvalStatus === "submitted")
    )
  ) {
    return "warning";
  }
  return day.signals.length > 0 || day.coverage ? "primary" : "neutral";
}

function projectPersonalTimeline(
  days: AmbientCalendarDay[],
  view: EmployeeDashboardView,
  formatter: Intl.DateTimeFormat
): void {
  if (view.upcoming.status === "ready") {
    for (const day of days) {
      day.confidence = "personal";
    }
    for (const record of view.upcoming.data.next14Days) {
      addPersonalRecord(days, record, formatter);
    }
  }

  if (view.todayStatus.status !== "ready") {
    return;
  }

  const [today] = days;
  if (!today) {
    return;
  }
  today.confidence = "personal";

  if (view.todayStatus.data.activeRecord) {
    addTodayRecord(days, view.todayStatus.data.activeRecord, formatter);
  }
  if (view.todayStatus.data.activePublicHoliday) {
    upsertSignal(today, {
      id: `holiday:${view.todayStatus.data.activePublicHoliday.id}`,
      kind: "holiday",
      label: `Public holiday: ${view.todayStatus.data.activePublicHoliday.name}`,
      source: view.todayStatus.data.activePublicHoliday.source,
    });
  }
}

function addPersonalRecord(
  days: AmbientCalendarDay[],
  record: PersonalUpcomingRecord,
  formatter: Intl.DateTimeFormat
): void {
  const signal: AmbientCalendarPersonalRecordSignal = {
    allDay: record.allDay,
    approvalStatus: record.approvalStatus,
    id: `personal-record:${record.recordId}`,
    kind: "personal-record",
    label: humaniseRecordType(record.recordType),
    recordType: record.recordType,
  };
  addSignalAcrossRange(days, signal, record.startsAt, record.endsAt, formatter);
}

function addTodayRecord(
  days: AmbientCalendarDay[],
  record: PersonalTodayRecord,
  formatter: Intl.DateTimeFormat
): void {
  const signal: AmbientCalendarPersonalRecordSignal = {
    allDay: false,
    approvalStatus: record.approvalStatus,
    id: `personal-record:${record.id}`,
    kind: "personal-record",
    label: record.title ?? humaniseRecordType(record.recordType),
    provenance: provenanceFor(record.sourceType),
    recordType: record.recordType,
  };
  addSignalAcrossRange(days, signal, record.startsAt, record.endsAt, formatter);
}

function projectManagerTimeline(
  days: AmbientCalendarDay[],
  view: ManagerDashboardView,
  formatter: Intl.DateTimeFormat
): void {
  projectManagerToday(days, view.teamToday);

  if (view.upcomingPeaks.status === "ready") {
    for (const peak of view.upcomingPeaks.data.peaks) {
      const dateKey = toDateKey(peak.date, formatter);
      const day = findDay(days, dateKey);
      if (!day || day.isToday) {
        continue;
      }
      day.confidence = "threshold-only";
      day.coverage = toCoverage(peak.peopleAwayCount, peak.totalPeopleInScope);
      upsertSignal(day, {
        awayCount: peak.peopleAwayCount,
        id: `team-peak:${dateKey}`,
        kind: "team-peak",
        label: `${peak.peopleAwayCount} of ${peak.totalPeopleInScope} away`,
        percentage: peak.percentage,
        recordTypes: peak.recordTypes,
        totalCount: peak.totalPeopleInScope,
      });
    }
  }

  if (view.teamThisWeek.status === "ready") {
    for (const record of view.teamThisWeek.data.upcomingRecords) {
      const personName = `${record.personFirstName} ${record.personLastName}`;
      const signal: AmbientCalendarTeamRecordSignal = {
        id: `team-record:${record.recordId}`,
        kind: "team-record",
        label: `${personName}, ${humaniseRecordType(record.recordType)}`,
        personName,
        recordType: record.recordType,
      };
      addSignalAcrossRange(
        days,
        signal,
        record.startsAt,
        record.endsAt,
        formatter
      );
    }
  }
}

function projectManagerToday(
  days: AmbientCalendarDay[],
  state: ManagerDashboardView["teamToday"]
): void {
  const [today] = days;
  if (!today || state.status !== "ready") {
    return;
  }

  const { data } = state;
  const unavailableCount =
    data.peopleOnLeaveCount +
    data.peopleOtherOooCount +
    data.peopleTravellingCount +
    data.peopleWorkingFromHomeCount;
  const totalCount = data.peopleAvailableCount + unavailableCount;

  today.confidence = "exact";
  today.coverage = toCoverage(unavailableCount, totalCount);
  upsertSignal(today, {
    availableCount: data.peopleAvailableCount,
    id: `team-summary:${today.dateKey}`,
    kind: "team-summary",
    label: `${unavailableCount} of ${totalCount} unavailable`,
    onLeaveCount: data.peopleOnLeaveCount,
    otherUnavailableCount: data.peopleOtherOooCount,
    travellingCount: data.peopleTravellingCount,
    workingFromHomeCount: data.peopleWorkingFromHomeCount,
    xeroSyncFailedCount: data.peopleWithXeroSyncFailedCount,
  });

  for (const person of data.peopleNeedingAttention) {
    upsertSignal(today, toTeamPersonSignal(person));
  }
}

function toTeamPersonSignal(
  person: TeamTodayPerson
): AmbientCalendarTeamPersonSignal {
  const personName = `${person.personFirstName} ${person.personLastName}`;
  return {
    id: `team-person:${person.personId}`,
    kind: "team-person",
    label: `${personName}, ${person.statusLabel}`,
    personName,
    recordType: person.recordType,
    statusKey: person.statusKey,
    xeroSyncFailedCount: person.xeroSyncFailedCount,
  };
}

function addSignalAcrossRange(
  days: AmbientCalendarDay[],
  signal: AmbientCalendarSignal,
  startsAt: Date,
  endsAt: Date,
  formatter: Intl.DateTimeFormat
): void {
  const startDateKey = toDateKey(startsAt, formatter);
  const endDateKey = toDateKey(endsAt, formatter);
  for (const day of days) {
    if (day.dateKey >= startDateKey && day.dateKey <= endDateKey) {
      upsertSignal(day, signal);
    }
  }
}

function upsertSignal(
  day: AmbientCalendarDay,
  signal: AmbientCalendarSignal
): void {
  const index = day.signals.findIndex((item) => item.id === signal.id);
  if (index === -1) {
    day.signals.push(signal);
    return;
  }
  day.signals[index] = signal;
}

function findDay(
  days: AmbientCalendarDay[],
  dateKey: string
): AmbientCalendarDay | undefined {
  return days.find((day) => day.dateKey === dateKey);
}

function toCoverage(
  awayCount: number,
  totalCount: number
): AmbientCalendarCoverage {
  return {
    awayCount,
    ratio: totalCount > 0 ? clamp(awayCount / totalCount, 0, 1) : 0,
    totalCount,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function provenanceFor(
  sourceType: PersonalTodayRecord["sourceType"]
): AmbientCalendarProvenance {
  if (sourceType === "manual") {
    return "manual";
  }
  return sourceType === "team_calendar_leave" ? "team-calendar" : "xero";
}

function humaniseRecordType(recordType: string): string {
  return recordType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createDateKeyFormatter(timezone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
}

function toDateKey(value: Date, formatter: Intl.DateTimeFormat): string {
  let day = "";
  let month = "";
  let year = "";

  for (const part of formatter.formatToParts(value)) {
    if (part.type === "day") {
      day = part.value;
    } else if (part.type === "month") {
      month = part.value;
    } else if (part.type === "year") {
      year = part.value;
    }
  }

  if (!(day && month && year)) {
    throw new Error("Unable to create an ambient calendar date key.");
  }

  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, amount: number): string {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  const value = new Date(Date.UTC(year, month - 1, day + amount));
  return value.toISOString().slice(0, 10);
}

function formatDateKey(dateKey: string): string {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
