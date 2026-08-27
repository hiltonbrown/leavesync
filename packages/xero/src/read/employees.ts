import { z } from "zod";

export interface XeroEmployee {
  email: string | null;
  employeeId: string;
  employmentType: string | null;
  firstName: string;
  jobTitle: string | null;
  lastName: string;
  rawPayload: unknown;
  startDate: string | null;
  status: string | null;
}

// A record that Xero returned inside an Employees page but that could not be
// turned into an XeroEmployee: either it does not match the expected shape,
// or it has no resolvable EmployeeID. Team-Calendar-specific import
// requirements (e.g. first/last name) are NOT asserted here; those remain a
// handler-level concern so a name-only gap never discards the record here.
export interface XeroEmployeeMapFailure {
  index: number;
  rawEmployeeId: string | null;
  rawPayload: unknown;
  reason: string;
}

export interface XeroEmployeesFetchResult {
  complete: boolean;
  employees: XeroEmployee[];
  failures: XeroEmployeeMapFailure[];
  rawItemCount: number;
  rawResponse: unknown;
  seenEmployeeIds: string[];
}

export const XeroEmployeeSchema = z
  .object({
    Email: z.string().optional().nullable(),
    EmployeeID: z.string().uuid().optional(),
    EmployeeId: z.string().uuid().optional(),
    EmploymentType: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    employeeID: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
    employmentType: z.string().optional().nullable(),
    engagementType: z.string().optional().nullable(),
    FirstName: z.string().optional().nullable(),
    firstName: z.string().optional().nullable(),
    JobTitle: z.string().optional().nullable(),
    jobTitle: z.string().optional().nullable(),
    LastName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    StartDate: z.string().optional().nullable(),
    Status: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
  })
  .passthrough();

// The envelope only asserts that Employees or employees is an array; each element is
// validated individually below so one malformed record cannot discard its
// valid neighbours on the same page.
const XeroEmployeesEnvelopeSchema = z
  .object({
    Employees: z.array(z.unknown()).optional(),
    employees: z.array(z.unknown()).optional(),
  })
  .passthrough()
  .refine(
    (data) => Array.isArray(data.Employees) || Array.isArray(data.employees),
    { message: "Envelope must contain Employees or employees array" }
  );

export type MapXeroEmployeesResult =
  | {
      employees: XeroEmployee[];
      failures: XeroEmployeeMapFailure[];
      ok: true;
      rawItemCount: number;
      seenEmployeeIds: string[];
    }
  | { ok: false };

export function mapXeroEmployees(payload: unknown): XeroEmployee[] {
  const result = tryMapXeroEmployees(payload);
  return result.ok ? result.employees : [];
}

export function tryMapXeroEmployees(payload: unknown): MapXeroEmployeesResult {
  const parsedEnvelope = XeroEmployeesEnvelopeSchema.safeParse(payload);
  if (!parsedEnvelope.success) {
    return { ok: false };
  }

  const rawItems =
    parsedEnvelope.data.employees ?? parsedEnvelope.data.Employees ?? [];
  const employees: XeroEmployee[] = [];
  const failures: XeroEmployeeMapFailure[] = [];
  const seenEmployeeIds: string[] = [];

  rawItems.forEach((rawItem, index) => {
    // Capture the raw ID before record validation so a record that fails
    // parsing is still accounted for.
    const rawEmployeeId = extractRawEmployeeId(rawItem);
    if (rawEmployeeId) {
      seenEmployeeIds.push(rawEmployeeId);
    }

    const parsedItem = XeroEmployeeSchema.safeParse(rawItem);
    if (!parsedItem.success) {
      failures.push({
        index,
        rawEmployeeId,
        rawPayload: rawItem,
        reason: "Employee record does not match the expected shape",
      });
      return;
    }

    const e = parsedItem.data;
    const employeeId =
      e.EmployeeID ?? e.EmployeeId ?? e.employeeID ?? e.employeeId ?? "";
    if (!employeeId) {
      failures.push({
        index,
        rawEmployeeId,
        rawPayload: rawItem,
        reason: "Missing Employee ID",
      });
      return;
    }

    employees.push({
      email: trimmedOrNull(e.Email ?? e.email),
      employeeId,
      employmentType: trimmedOrNull(
        e.EmploymentType ?? e.employmentType ?? e.engagementType
      ),
      firstName: e.FirstName ?? e.firstName ?? "",
      jobTitle: trimmedOrNull(e.JobTitle ?? e.jobTitle ?? e.title),
      lastName: e.LastName ?? e.lastName ?? "",
      rawPayload: e,
      startDate: trimmedOrNull(e.StartDate ?? e.startDate),
      status: trimmedOrNull(e.Status ?? e.status),
    });
  });

  return {
    employees,
    failures,
    ok: true,
    rawItemCount: rawItems.length,
    seenEmployeeIds,
  };
}

function trimmedOrNull(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function extractRawEmployeeId(rawItem: unknown): string | null {
  if (typeof rawItem !== "object" || rawItem === null) {
    return null;
  }
  const record = rawItem as Record<string, unknown>;
  const candidate =
    record.EmployeeID ??
    record.EmployeeId ??
    record.employeeID ??
    record.employeeId;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : null;
}
