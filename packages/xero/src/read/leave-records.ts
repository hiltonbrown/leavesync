import { z } from "zod";
import { normaliseXeroDateOnly, normaliseXeroDateTime } from "./date";

export type XeroLeaveRecordStatus =
  | "APPROVED"
  | "DELETED"
  | "REJECTED"
  | "SUBMITTED"
  | "UNKNOWN"
  | "WITHDRAWN";

export interface XeroLeaveRecord {
  employeeId: string;
  endDate: string;
  leaveApplicationId: string;
  leaveTypeId: string;
  leaveTypeName: string | null;
  rawPayload: unknown;
  startDate: string;
  status: XeroLeaveRecordStatus;
  title: string | null;
  units: number;
  updatedDateUtc: string | null;
}

const LeavePeriodSchema = z
  .object({
    LeavePeriodStatus: z.string().optional().nullable(),
    NumberOfUnits: z.number().optional().nullable(),
  })
  .passthrough();

const LeaveApplicationSchema = z
  .object({
    EmployeeID: z.string().optional().nullable(),
    EmployeeId: z.string().optional().nullable(),
    EndDate: z.string().optional().nullable(),
    LeaveApplicationID: z.string().optional().nullable(),
    LeaveApplicationId: z.string().optional().nullable(),
    LeavePeriods: z.array(LeavePeriodSchema).optional().nullable(),
    LeaveType: z.string().optional().nullable(),
    LeaveTypeID: z.string().optional().nullable(),
    LeaveTypeId: z.string().optional().nullable(),
    StartDate: z.string().optional().nullable(),
    Status: z.string().optional().nullable(),
    Title: z.string().optional().nullable(),
    UpdatedDateUTC: z.string().optional().nullable(),
    UpdatedDateUtc: z.string().optional().nullable(),
  })
  .passthrough();

const LeaveApplicationsResponseSchema = z
  .object({
    LeaveApplications: z.array(LeaveApplicationSchema),
  })
  .passthrough();

export type MapXeroLeaveRecordsResult =
  | { ok: true; records: XeroLeaveRecord[] }
  | { ok: false };

export function mapXeroLeaveRecords(
  payload: unknown,
  leaveTypeNamesById: ReadonlyMap<string, string> = new Map()
): XeroLeaveRecord[] {
  const result = tryMapXeroLeaveRecords(payload, leaveTypeNamesById);
  return result.ok ? result.records : [];
}

export function tryMapXeroLeaveRecords(
  payload: unknown,
  leaveTypeNamesById: ReadonlyMap<string, string> = new Map()
): MapXeroLeaveRecordsResult {
  const parsed = LeaveApplicationsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false };
  }

  const records = parsed.data.LeaveApplications.map((application) => {
    const leaveTypeId = text(
      application.LeaveTypeID ?? application.LeaveTypeId
    );
    const periods = application.LeavePeriods ?? [];
    return {
      employeeId: text(application.EmployeeID ?? application.EmployeeId),
      endDate: normaliseXeroDateOnly(application.EndDate) ?? "",
      leaveApplicationId: text(
        application.LeaveApplicationID ?? application.LeaveApplicationId
      ),
      leaveTypeId,
      leaveTypeName:
        nullableText(application.LeaveType) ??
        leaveTypeNamesById.get(leaveTypeId) ??
        null,
      rawPayload: application,
      startDate: normaliseXeroDateOnly(application.StartDate) ?? "",
      status: normaliseApplicationStatus(application.Status, periods),
      title: nullableText(application.Title),
      units: sumUnits(periods),
      updatedDateUtc: normaliseXeroDateTime(
        application.UpdatedDateUTC ?? application.UpdatedDateUtc
      ),
    };
  });

  return { ok: true, records };
}

function text(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: string | null | undefined): string | null {
  const normalised = text(value);
  return normalised.length > 0 ? normalised : null;
}

function normaliseApplicationStatus(
  applicationStatus: string | null | undefined,
  periods: Array<{ LeavePeriodStatus?: null | string }>
): XeroLeaveRecordStatus {
  const explicit = normaliseStatus(applicationStatus);
  if (explicit !== "UNKNOWN") {
    return explicit;
  }

  const statuses = periods.map((period) =>
    normaliseStatus(period.LeavePeriodStatus)
  );
  if (statuses.includes("SUBMITTED")) {
    return "SUBMITTED";
  }
  if (statuses.includes("APPROVED")) {
    return "APPROVED";
  }
  if (statuses.includes("REJECTED")) {
    return "REJECTED";
  }
  if (statuses.includes("WITHDRAWN")) {
    return "WITHDRAWN";
  }
  if (statuses.includes("DELETED")) {
    return "DELETED";
  }
  return "UNKNOWN";
}

function normaliseStatus(
  value: string | null | undefined
): XeroLeaveRecordStatus {
  const status = value?.trim().toUpperCase();
  if (
    status === "APPROVED" ||
    status === "SCHEDULED" ||
    status === "PROCESSED"
  ) {
    return "APPROVED";
  }
  if (status === "REJECTED" || status === "DECLINED") {
    return "REJECTED";
  }
  if (status === "WITHDRAWN") {
    return "WITHDRAWN";
  }
  if (status === "DELETED") {
    return "DELETED";
  }
  if (
    status === "SUBMITTED" ||
    status === "PENDING" ||
    status === "REQUESTED"
  ) {
    return "SUBMITTED";
  }
  return "UNKNOWN";
}

function sumUnits(periods: Array<{ NumberOfUnits?: null | number }>): number {
  return periods.reduce(
    (total, period) => total + (period.NumberOfUnits ?? 0),
    0
  );
}
