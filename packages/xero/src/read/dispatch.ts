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
} from "../nz/read";
import {
  fetchEmployees as fetchUkEmployees,
  fetchLeaveApplicationStatus as fetchUkLeaveApplicationStatus,
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
          message: "NZ payroll leave reads are not yet available.",
        },
        ok: false,
      };
    case "UK":
      return {
        error: {
          code: "unknown_error",
          message: "UK payroll leave reads are not yet available.",
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
      return {
        error: {
          code: "unknown_error",
          message: "NZ payroll leave balance reads are not yet available.",
        },
        ok: false,
      };
    case "UK":
      return {
        error: {
          code: "unknown_error",
          message: "UK payroll leave balance reads are not yet available.",
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
