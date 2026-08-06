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

export const XeroEmployeeSchema = z
  .object({
    Email: z.string().optional().nullable(),
    EmployeeID: z.string().uuid().optional(),
    EmployeeId: z.string().uuid().optional(),
    EmploymentType: z.string().optional().nullable(),
    FirstName: z.string().optional().nullable(),
    JobTitle: z.string().optional().nullable(),
    LastName: z.string().optional().nullable(),
    StartDate: z.string().optional().nullable(),
    Status: z.string().optional().nullable(),
  })
  .passthrough();

export const XeroEmployeesResponseSchema = z
  .object({
    Employees: z.array(XeroEmployeeSchema),
  })
  .passthrough();

export type MapXeroEmployeesResult =
  | { ok: true; employees: XeroEmployee[] }
  | { ok: false };

export function mapXeroEmployees(payload: unknown): XeroEmployee[] {
  const result = tryMapXeroEmployees(payload);
  return result.ok ? result.employees : [];
}

export function tryMapXeroEmployees(payload: unknown): MapXeroEmployeesResult {
  const parsed = XeroEmployeesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false };
  }
  const employees = parsed.data.Employees.map((e) => ({
    email:
      typeof e.Email === "string" && e.Email.trim().length > 0
        ? e.Email.trim()
        : null,
    employeeId: e.EmployeeID ?? e.EmployeeId ?? "",
    employmentType:
      typeof e.EmploymentType === "string" && e.EmploymentType.trim().length > 0
        ? e.EmploymentType.trim()
        : null,
    firstName: e.FirstName ?? "",
    jobTitle:
      typeof e.JobTitle === "string" && e.JobTitle.trim().length > 0
        ? e.JobTitle.trim()
        : null,
    lastName: e.LastName ?? "",
    rawPayload: e,
    startDate:
      typeof e.StartDate === "string" && e.StartDate.trim().length > 0
        ? e.StartDate.trim()
        : null,
    status:
      typeof e.Status === "string" && e.Status.trim().length > 0
        ? e.Status.trim()
        : null,
  }));

  return { employees, ok: true };
}
