"use server";

import { auth, currentUser } from "@repo/auth/server";
import {
  type AnalyticsRecordListItem,
  type AnalyticsRole,
  type AnalyticsServiceError,
  aggregationFingerprint,
  type DateRangePreset,
  listLeaveReportRecordsForDrilldown,
  listOutOfOfficeRecordsForDrilldown,
  resolveDateRange,
} from "@repo/availability";
import type { Result } from "@repo/core";
import { database } from "@repo/database";
import { getOrganisationById } from "@repo/database/src/queries/organisations";
import { requirePageRole } from "@/lib/auth/require-page-role";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";
import {
  ExportLeaveReportsCsvActionSchema,
  ExportOutOfOfficeCsvActionSchema,
} from "./_schemas";

type AnalyticsActionError =
  | AnalyticsServiceError
  | { code: "invalid_date_range"; message: string }
  | { code: "not_authorised"; message: string }
  | { code: "validation_error"; message: string };

const CSV_EXPORT_LIMIT = 50_000;
const CSV_ESCAPE_PATTERN = /[",\r\n]/;

export async function exportLeaveReportsCsvAction(
  input: unknown
): Promise<
  Result<{ csvContent: string; filename: string }, AnalyticsActionError>
> {
  const parsed = ExportLeaveReportsCsvActionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message);
  }
  const context = await actionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }
  const dateRange = resolveActionDateRange(context.value, parsed.data);
  if (!dateRange.ok) {
    return dateRange;
  }

  const filters = {
    includeArchivedPeople: parsed.data.includeArchivedPeople,
    leaveType: parsed.data.leaveType,
    locationId: parsed.data.locationId,
    personId: parsed.data.personId,
    personType: parsed.data.personType,
    teamId: parsed.data.teamId,
  };
  const rows: AnalyticsRecordListItem[] = [];
  let cursor: string | null = null;
  let truncated = false;
  while (rows.length <= CSV_EXPORT_LIMIT) {
    const page = await listLeaveReportRecordsForDrilldown({
      ...context.value,
      cursor,
      dateRange: dateRange.value,
      filters,
      includePublicHolidays: parsed.data.includePublicHolidays,
      pageSize: 200,
    });
    if (!page.ok) {
      return page;
    }
    rows.push(...page.value.records);
    cursor = page.value.nextCursor;
    if (!cursor) {
      break;
    }
  }
  if (rows.length > CSV_EXPORT_LIMIT) {
    truncated = true;
  }
  const exportRows = rows.slice(0, CSV_EXPORT_LIMIT);
  const csvRows = exportRows.map((record) => [
    record.id,
    record.personFirstName,
    record.personLastName,
    record.teamName ?? "",
    record.locationName ?? "",
    record.recordType,
    record.startsAt.toISOString(),
    record.endsAt.toISOString(),
    String(record.workingDays),
    record.sourceType,
    record.submittedAt?.toISOString() ?? "",
    record.approvedAt?.toISOString() ?? "",
    record.approvedByFirstName ?? "",
    record.approvedByLastName ?? "",
  ]);
  if (truncated) {
    csvRows.push([
      "# Truncated after 50000 rows; use a narrower date range for full export",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  }
  await auditExport({
    action: "analytics.leave_reports_exported",
    context: context.value,
    filterFingerprint: aggregationFingerprint({
      clerkOrgId: context.value.clerkOrgId,
      dateRangeKey: `${dateRange.value.start.toISOString()}:${dateRange.value.end.toISOString()}`,
      filterKey: filters,
      organisationId: context.value.organisationId,
      serviceMethod: "leave-reports:csv",
    }),
    rowCount: exportRows.length,
  });
  return {
    ok: true,
    value: {
      csvContent: toCsv([
        [
          "record_id",
          "person_first_name",
          "person_last_name",
          "team_name",
          "location_name",
          "leave_type",
          "starts_at",
          "ends_at",
          "working_days",
          "source_type",
          "submitted_at",
          "approved_at",
          "approved_by_first_name",
          "approved_by_last_name",
        ],
        ...csvRows,
      ]),
      filename: `leave-reports-${dateStamp(dateRange.value.start)}-${dateStamp(
        new Date(dateRange.value.end.getTime() - 1)
      )}.csv`,
    },
  };
}

export async function exportOutOfOfficeCsvAction(
  input: unknown
): Promise<
  Result<{ csvContent: string; filename: string }, AnalyticsActionError>
> {
  const parsed = ExportOutOfOfficeCsvActionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message);
  }
  const context = await actionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }
  const dateRange = resolveActionDateRange(context.value, parsed.data);
  if (!dateRange.ok) {
    return dateRange;
  }
  const filters = {
    includeArchivedPeople: parsed.data.includeArchivedPeople,
    locationId: parsed.data.locationId,
    personId: parsed.data.personId,
    personType: parsed.data.personType,
    recordType: parsed.data.recordType,
    teamId: parsed.data.teamId,
  };
  const rows: AnalyticsRecordListItem[] = [];
  let cursor: string | null = null;
  let truncated = false;
  while (rows.length <= CSV_EXPORT_LIMIT) {
    const page = await listOutOfOfficeRecordsForDrilldown({
      ...context.value,
      cursor,
      dateRange: dateRange.value,
      filters,
      pageSize: 200,
    });
    if (!page.ok) {
      return page;
    }
    rows.push(...page.value.records);
    cursor = page.value.nextCursor;
    if (!cursor) {
      break;
    }
  }
  if (rows.length > CSV_EXPORT_LIMIT) {
    truncated = true;
  }
  const exportRows = rows.slice(0, CSV_EXPORT_LIMIT);
  const csvRows = exportRows.map((record) => [
    record.id,
    record.personFirstName,
    record.personLastName,
    record.teamName ?? "",
    record.locationName ?? "",
    record.recordType,
    record.startsAt.toISOString(),
    record.endsAt.toISOString(),
    String(record.workingDays),
  ]);
  if (truncated) {
    csvRows.push([
      "# Truncated after 50000 rows; use a narrower date range for full export",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  }
  await auditExport({
    action: "analytics.out_of_office_exported",
    context: context.value,
    filterFingerprint: aggregationFingerprint({
      clerkOrgId: context.value.clerkOrgId,
      dateRangeKey: `${dateRange.value.start.toISOString()}:${dateRange.value.end.toISOString()}`,
      filterKey: filters,
      organisationId: context.value.organisationId,
      serviceMethod: "out-of-office:csv",
    }),
    rowCount: exportRows.length,
  });
  return {
    ok: true,
    value: {
      csvContent: toCsv([
        [
          "record_id",
          "person_first_name",
          "person_last_name",
          "team_name",
          "location_name",
          "availability_type",
          "starts_at",
          "ends_at",
          "working_days",
        ],
        ...csvRows,
      ]),
      filename: `out-of-office-${dateStamp(dateRange.value.start)}-${dateStamp(
        new Date(dateRange.value.end.getTime() - 1)
      )}.csv`,
    },
  };
}

interface ActionContext {
  actingUserId: string;
  clerkOrgId: string;
  organisationId: string;
  role: AnalyticsRole;
  timezone: string;
}

async function actionContext(
  organisationId: string
): Promise<Result<ActionContext, AnalyticsActionError>> {
  await requirePageRole("org:viewer");
  const [{ orgRole }, user, context] = await Promise.all([
    auth(),
    currentUser(),
    getActiveOrgContext(organisationId),
  ]);
  const role = effectiveRole(orgRole);
  if (!(user && role && context.ok)) {
    return notAuthorised();
  }
  const organisation = await getOrganisationById(
    context.value.clerkOrgId,
    context.value.organisationId
  );
  if (!organisation.ok) {
    return notAuthorised();
  }
  return {
    ok: true,
    value: {
      actingUserId: user.id,
      clerkOrgId: context.value.clerkOrgId,
      organisationId: context.value.organisationId,
      role,
      timezone: organisation.value.timezone ?? "UTC",
    },
  };
}

function resolveActionDateRange(
  context: ActionContext,
  input: {
    customEnd?: string;
    customStart?: string;
    preset: DateRangePreset;
  }
) {
  return resolveDateRange({
    customEnd: input.customEnd,
    customStart: input.customStart,
    preset: input.preset,
    timezone: context.timezone,
  });
}

async function auditExport({
  action,
  context,
  filterFingerprint,
  rowCount,
}: {
  action: string;
  context: ActionContext;
  filterFingerprint: string;
  rowCount: number;
}) {
  await database.auditEvent.create({
    data: {
      action,
      actor_user_id: context.actingUserId,
      clerk_org_id: context.clerkOrgId,
      organisation_id: context.organisationId,
      payload: {
        actingUserId: context.actingUserId,
        filterFingerprint,
        rowCount,
      },
      resource_id: context.organisationId,
      resource_type: "analytics_report",
    },
  });
}

function effectiveRole(role: string | null | undefined): AnalyticsRole | null {
  if (role === "org:owner") {
    return "owner";
  }
  if (role === "org:admin") {
    return "admin";
  }
  if (role === "org:manager") {
    return "manager";
  }
  if (role === "org:viewer") {
    return "viewer";
  }
  return null;
}

function toCsv(rows: string[][]): string {
  return `${rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n")}\r\n`;
}

function escapeCsvField(value: string): string {
  if (CSV_ESCAPE_PATTERN.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function dateStamp(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function validationError(
  message?: string
): Result<never, AnalyticsActionError> {
  return {
    ok: false,
    error: {
      code: "validation_error",
      message: message ?? "Invalid analytics export input.",
    },
  };
}

function notAuthorised(): Result<never, AnalyticsActionError> {
  return {
    ok: false,
    error: {
      code: "not_authorised",
      message: "You do not have access to this analytics export.",
    },
  };
}
