import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchAuEmployees: vi.fn(),
  fetchAuLeaveApplicationStatus: vi.fn(),
  fetchAuLeaveBalances: vi.fn(),
  fetchAuLeaveRecords: vi.fn(),
  fetchNzEmployees: vi.fn(),
  fetchNzLeaveApplicationStatus: vi.fn(),
  fetchNzLeaveForEmployee: vi.fn(),
  fetchUkEmployees: vi.fn(),
  fetchUkLeaveApplicationStatus: vi.fn(),
  fetchUkLeaveForEmployee: vi.fn(),
}));

vi.mock("../au/read", () => ({
  fetchEmployees: mocks.fetchAuEmployees,
  fetchLeaveApplicationStatus: mocks.fetchAuLeaveApplicationStatus,
  fetchLeaveBalances: mocks.fetchAuLeaveBalances,
  fetchLeaveRecords: mocks.fetchAuLeaveRecords,
}));

vi.mock("../nz/read", () => ({
  fetchEmployees: mocks.fetchNzEmployees,
  fetchLeaveApplicationStatus: mocks.fetchNzLeaveApplicationStatus,
  fetchLeaveForEmployee: mocks.fetchNzLeaveForEmployee,
}));

vi.mock("../uk/read", () => ({
  fetchEmployees: mocks.fetchUkEmployees,
  fetchLeaveApplicationStatus: mocks.fetchUkLeaveApplicationStatus,
  fetchLeaveForEmployee: mocks.fetchUkLeaveForEmployee,
}));

import {
  fetchEmployeesForRegion,
  fetchLeaveApplicationStatusForRegion,
  fetchLeaveBalancesForRegion,
  fetchLeaveForEmployeeForRegion,
  fetchLeaveRecordsForRegion,
} from "./dispatch";

function buildTenant(region: "AU" | "NZ" | "UK") {
  return {
    clerk_org_id: "org_1",
    id: "tenant_1",
    organisation_id: "00000000-0000-4000-8000-000000000001",
    payroll_region: region,
    xero_connection: {
      access_token_auth_tag: "tag",
      access_token_encrypted: "encrypted",
      access_token_iv: "iv",
      revoked_at: null,
    },
    xero_tenant_id: "xero-tenant-1",
  };
}

describe("fetchEmployeesForRegion dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches to AU reader for AU region", async () => {
    mocks.fetchAuEmployees.mockResolvedValueOnce({
      ok: true,
      value: {
        complete: true,
        employees: [],
        failures: [],
        rawItemCount: 0,
        rawResponse: {},
        seenEmployeeIds: [],
      },
    });

    const tenant = buildTenant("AU");
    const result = await fetchEmployeesForRegion("AU", { xeroTenant: tenant });

    expect(result.ok).toBe(true);
    expect(mocks.fetchAuEmployees).toHaveBeenCalledWith({ xeroTenant: tenant });
  });

  it("dispatches to NZ reader for NZ region", async () => {
    mocks.fetchNzEmployees.mockResolvedValueOnce({
      ok: true,
      value: {
        complete: true,
        employees: [],
        failures: [],
        rawItemCount: 0,
        rawResponse: {},
        seenEmployeeIds: [],
      },
    });

    const tenant = buildTenant("NZ");
    const result = await fetchEmployeesForRegion("NZ", { xeroTenant: tenant });

    expect(result.ok).toBe(true);
    expect(mocks.fetchNzEmployees).toHaveBeenCalledWith({ xeroTenant: tenant });
  });

  it("dispatches to UK reader for UK region", async () => {
    mocks.fetchUkEmployees.mockResolvedValueOnce({
      ok: true,
      value: {
        complete: true,
        employees: [],
        failures: [],
        rawItemCount: 0,
        rawResponse: {},
        seenEmployeeIds: [],
      },
    });

    const tenant = buildTenant("UK");
    const result = await fetchEmployeesForRegion("UK", { xeroTenant: tenant });

    expect(result.ok).toBe(true);
    expect(mocks.fetchUkEmployees).toHaveBeenCalledWith({ xeroTenant: tenant });
  });

  it("returns unsupported payroll region error for unknown regions", async () => {
    const tenant = buildTenant("AU");
    const result = await fetchEmployeesForRegion("US", { xeroTenant: tenant });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unknown_error");
      expect(result.error.message).toBe("Unsupported payroll region.");
    }
  });
});

describe("fetchLeaveRecordsForRegion dispatch", () => {
  it("dispatches to AU reader for AU region", async () => {
    mocks.fetchAuLeaveRecords.mockResolvedValueOnce({
      ok: true,
      value: { complete: true, leaveRecords: [], rawResponse: {} },
    });

    const tenant = buildTenant("AU");
    const result = await fetchLeaveRecordsForRegion("AU", {
      xeroTenant: tenant,
    });

    expect(result.ok).toBe(true);
    expect(mocks.fetchAuLeaveRecords).toHaveBeenCalledWith({
      xeroTenant: tenant,
    });
  });

  it("returns per-employee requirement error for NZ leave records", async () => {
    const result = await fetchLeaveRecordsForRegion("NZ", {
      xeroTenant: buildTenant("NZ"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(
        "NZ payroll requires per-employee leave reads."
      );
    }
  });

  it("returns per-employee requirement error for UK leave records", async () => {
    const result = await fetchLeaveRecordsForRegion("UK", {
      xeroTenant: buildTenant("UK"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(
        "UK payroll requires per-employee leave reads."
      );
    }
  });

  it("returns unsupported payroll region error for unknown regions", async () => {
    const result = await fetchLeaveRecordsForRegion("US", {
      xeroTenant: buildTenant("AU"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unknown_error");
      expect(result.error.message).toBe("Unsupported payroll region.");
    }
  });
});

describe("fetchLeaveForEmployeeForRegion dispatch", () => {
  it("dispatches to NZ reader for NZ region", async () => {
    mocks.fetchNzLeaveForEmployee.mockResolvedValueOnce({
      ok: true,
      value: { complete: true, leaveRecords: [], rawResponse: {} },
    });

    const tenant = buildTenant("NZ");
    const result = await fetchLeaveForEmployeeForRegion("NZ", {
      xeroEmployeeId: "emp-nz-1",
      xeroTenant: tenant,
    });

    expect(result.ok).toBe(true);
    expect(mocks.fetchNzLeaveForEmployee).toHaveBeenCalledWith({
      xeroEmployeeId: "emp-nz-1",
      xeroTenant: tenant,
    });
  });

  it("dispatches to UK reader for UK region", async () => {
    mocks.fetchUkLeaveForEmployee.mockResolvedValueOnce({
      ok: true,
      value: { complete: true, leaveRecords: [], rawResponse: {} },
    });

    const tenant = buildTenant("UK");
    const result = await fetchLeaveForEmployeeForRegion("UK", {
      xeroEmployeeId: "emp-uk-1",
      xeroTenant: tenant,
    });

    expect(result.ok).toBe(true);
    expect(mocks.fetchUkLeaveForEmployee).toHaveBeenCalledWith({
      xeroEmployeeId: "emp-uk-1",
      xeroTenant: tenant,
    });
  });

  it("returns unsupported for AU per-employee leave reads", async () => {
    const tenant = buildTenant("AU");
    const result = await fetchLeaveForEmployeeForRegion("AU", {
      xeroEmployeeId: "emp-au-1",
      xeroTenant: tenant,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unknown_error");
      expect(result.error.message).toContain(
        "AU payroll does not support per-employee leave reads."
      );
    }
  });

  it("returns unsupported payroll region error for unknown regions", async () => {
    const tenant = buildTenant("AU");
    const result = await fetchLeaveForEmployeeForRegion("US", {
      xeroEmployeeId: "emp-1",
      xeroTenant: tenant,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unknown_error");
      expect(result.error.message).toBe("Unsupported payroll region.");
    }
  });
});

describe("regional stubs for leave balances", () => {
  it("returns not available for NZ leave balances", async () => {
    const result = await fetchLeaveBalancesForRegion("NZ", {
      employeeIds: ["emp-1"],
      xeroTenant: buildTenant("NZ"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(
        "NZ payroll leave balance reads are not yet available."
      );
    }
  });

  it("returns not available for UK leave balances", async () => {
    const result = await fetchLeaveBalancesForRegion("UK", {
      employeeIds: ["emp-1"],
      xeroTenant: buildTenant("UK"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(
        "UK payroll leave balance reads are not yet available."
      );
    }
  });

  it("dispatches leave application status for all regions", async () => {
    mocks.fetchAuLeaveApplicationStatus.mockResolvedValueOnce({
      ok: true,
      value: { approvedAt: null, rawResponse: {}, status: "APPROVED" },
    });

    mocks.fetchNzLeaveApplicationStatus.mockResolvedValueOnce({
      error: {
        code: "unknown_error",
        message: "NZ payroll approval-state reads are not yet available.",
      },
      ok: false,
    });

    mocks.fetchUkLeaveApplicationStatus.mockResolvedValueOnce({
      error: {
        code: "unknown_error",
        message: "UK payroll approval-state reads are not yet available.",
      },
      ok: false,
    });

    await fetchLeaveApplicationStatusForRegion("AU", {
      xeroLeaveApplicationId: "app-1",
      xeroTenant: buildTenant("AU"),
    });
    expect(mocks.fetchAuLeaveApplicationStatus).toHaveBeenCalledTimes(1);

    await fetchLeaveApplicationStatusForRegion("NZ", {
      xeroLeaveApplicationId: "app-1",
      xeroTenant: buildTenant("NZ"),
    });
    expect(mocks.fetchNzLeaveApplicationStatus).toHaveBeenCalledTimes(1);

    await fetchLeaveApplicationStatusForRegion("UK", {
      xeroLeaveApplicationId: "app-1",
      xeroTenant: buildTenant("UK"),
    });
    expect(mocks.fetchUkLeaveApplicationStatus).toHaveBeenCalledTimes(1);
  });
});
