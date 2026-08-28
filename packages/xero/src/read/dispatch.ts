import type { XeroEmployeesFetchResult } from "../au/read";
import {
  fetchEmployees as fetchAuEmployees,
  fetchLeaveApplicationStatus as fetchAuLeaveApplicationStatus,
  fetchLeaveBalances as fetchAuLeaveBalances,
  fetchLeaveRecords as fetchAuLeaveRecords,
} from "../au/read";
import {
  fetchEmployees as fetchNzEmployees,
  fetchLeaveApplicationStatus as fetchNzLeaveApplicationStatus,
  fetchLeaveBalancesForEmployee as fetchNzLeaveBalancesForEmployee,
  fetchLeaveForEmployee as fetchNzLeaveForEmployee,
} from "../nz/read";
import {
  fetchEmployees as fetchUkEmployees,
  fetchLeaveApplicationStatus as fetchUkLeaveApplicationStatus,
  fetchLeaveBalancesForEmployee as fetchUkLeaveBalancesForEmployee,
  fetchLeaveForEmployee as fetchUkLeaveForEmployee,
} from "../uk/read";
import type {
  PayrollRegion,
  XeroTenantForWrite,
  XeroWriteResult,
} from "../write/types";
import type {
  FetchLeaveApplicationStatusInput,
  XeroLeaveApplicationStatusResult,
} from "./leave-application-status";
import type {
  XeroLeaveBalance,
  XeroLeaveBalanceFetchFailure,
} from "./leave-balances";
import type { XeroLeaveRecord } from "./leave-records";

export async function fetchLeaveApplicationStatusForRegion(
  payrollRegion: PayrollRegion | string,
  input: FetchLeaveApplicationStatusInput
): Promise<XeroWriteResult<XeroLeaveApplicationStatusResult>> {
  switch (payrollRegion) {
    case "AU":
      return await fetchAuLeaveApplicationStatus(input);
    case "NZ":
      return await fetchNzLeaveApplicationStatus(input);
    case "UK":
      return await fetchUkLeaveApplicationStatus(input);
    default:
      return {
        error: {
          code: "unknown_error",
          message: "Unsupported payroll region.",
        },
        ok: false,
      };
  }
}

export async function fetchEmployeesForRegion(
  payrollRegion: PayrollRegion | string,
  input: { xeroTenant: XeroTenantForWrite }
): Promise<XeroWriteResult<XeroEmployeesFetchResult>> {
  switch (payrollRegion) {
    case "AU":
      return await fetchAuEmployees(input);
    case "NZ":
      return await fetchNzEmployees(input);
    case "UK":
      return await fetchUkEmployees(input);
    default:
      return {
        error: {
          code: "unknown_error",
          message: "Unsupported payroll region.",
        },
        ok: false,
      };
  }
}

export async function fetchLeaveRecordsForRegion(
  payrollRegion: PayrollRegion | string,
  input: { xeroTenant: XeroTenantForWrite }
): Promise<
  XeroWriteResult<{
    complete: boolean;
    leaveRecords: XeroLeaveRecord[];
    rawResponse: unknown;
  }>
> {
  switch (payrollRegion) {
    case "AU":
      return await fetchAuLeaveRecords(input);
    case "NZ":
      return {
        error: {
          code: "unknown_error",
          message: "NZ payroll requires per-employee leave reads.",
        },
        ok: false,
      };
    case "UK":
      return {
        error: {
          code: "unknown_error",
          message: "UK payroll requires per-employee leave reads.",
        },
        ok: false,
      };
    default:
      return {
        error: {
          code: "unknown_error",
          message: "Unsupported payroll region.",
        },
        ok: false,
      };
  }
}

export async function fetchLeaveForEmployeeForRegion(
  payrollRegion: PayrollRegion | string,
  input: {
    xeroEmployeeId: string;
    xeroTenant: XeroTenantForWrite;
  }
): Promise<
  XeroWriteResult<{
    complete: boolean;
    leaveRecords: XeroLeaveRecord[];
    rawResponse: unknown;
  }>
> {
  switch (payrollRegion) {
    case "NZ":
      return await fetchNzLeaveForEmployee(input);
    case "UK":
      return await fetchUkLeaveForEmployee(input);
    case "AU":
      return {
        error: {
          code: "unknown_error",
          message: "AU payroll does not support per-employee leave reads.",
        },
        ok: false,
      };
    default:
      return {
        error: {
          code: "unknown_error",
          message: "Unsupported payroll region.",
        },
        ok: false,
      };
  }
}

export async function fetchLeaveBalancesForRegion(
  payrollRegion: PayrollRegion | string,
  input: {
    employeeIds: string[];
    onProgress?: (processed: number, total: number) => Promise<void> | void;
    xeroTenant: XeroTenantForWrite;
  }
): Promise<
  XeroWriteResult<{
    failures: XeroLeaveBalanceFetchFailure[];
    leaveBalances: XeroLeaveBalance[];
    rawResponses: unknown[];
  }>
> {
  switch (payrollRegion) {
    case "AU":
      return await fetchAuLeaveBalances(input);
    case "NZ":
      return await fetchPerEmployeeLeaveBalances(
        input.employeeIds,
        fetchNzLeaveBalancesForEmployee,
        input.xeroTenant,
        input.onProgress
      );
    case "UK":
      return await fetchPerEmployeeLeaveBalances(
        input.employeeIds,
        fetchUkLeaveBalancesForEmployee,
        input.xeroTenant,
        input.onProgress
      );
    default:
      return {
        error: {
          code: "unknown_error",
          message: "Unsupported payroll region.",
        },
        ok: false,
      };
  }
}

async function fetchPerEmployeeLeaveBalances(
  employeeIds: string[],
  fetchFn: (input: {
    xeroEmployeeId: string;
    xeroTenant: XeroTenantForWrite;
  }) => Promise<
    XeroWriteResult<{
      leaveBalances: XeroLeaveBalance[];
      rawResponse: unknown;
    }>
  >,
  xeroTenant: XeroTenantForWrite,
  onProgress?: (processed: number, total: number) => Promise<void> | void
): Promise<
  XeroWriteResult<{
    failures: XeroLeaveBalanceFetchFailure[];
    leaveBalances: XeroLeaveBalance[];
    rawResponses: unknown[];
  }>
> {
  const leaveBalances: XeroLeaveBalance[] = [];
  const rawResponses: unknown[] = [];
  const failures: XeroLeaveBalanceFetchFailure[] = [];

  for (const [index, employeeId] of employeeIds.entries()) {
    const result = await fetchFn({
      xeroEmployeeId: employeeId,
      xeroTenant,
    });

    if (!result.ok) {
      if (
        result.error.code === "auth_error" ||
        result.error.code === "rate_limit_error" ||
        result.error.code === "permission_error" ||
        result.error.code === "network_error"
      ) {
        return { error: result.error, ok: false };
      }
      failures.push({ employeeId, error: result.error });
      if (result.error.rawPayload !== undefined) {
        rawResponses.push(result.error.rawPayload);
      }
      await onProgress?.(index + 1, employeeIds.length);
      continue;
    }

    leaveBalances.push(...result.value.leaveBalances);
    rawResponses.push(result.value.rawResponse);
    await onProgress?.(index + 1, employeeIds.length);
  }

  return {
    ok: true,
    value: {
      failures,
      leaveBalances,
      rawResponses,
    },
  };
}
