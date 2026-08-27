import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchAuEmployees: vi.fn(),
  fetchAuLeaveApplicationStatus: vi.fn(),
  fetchAuLeaveBalances: vi.fn(),
  fetchAuLeaveRecords: vi.fn(),
  fetchNzEmployees: vi.fn(),
  fetchNzLeaveApplicationStatus: vi.fn(),
  fetchUkEmployees: vi.fn(),
  fetchUkLeaveApplicationStatus: vi.fn(),
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
}));

vi.mock("../uk/read", () => ({
  fetchEmployees: mocks.fetchUkEmployees,
  fetchLeaveApplicationStatus: mocks.fetchUkLeaveApplicationStatus,
}));

import {
  fetchEmployeesForRegion,
  fetchLeaveApplicationStatusForRegion,
  fetchLeaveBalancesForRegion,
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

describe("regional stubs for leave records and balances", () => {
  it("returns not available for NZ leave records", async () => {
    const result = await fetchLeaveRecordsForRegion("NZ", {
      xeroTenant: buildTenant("NZ"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(
        "NZ payroll leave reads are not yet available."
      );
    }
  });

  it("returns not available for UK leave records", async () => {
    const result = await fetchLeaveRecordsForRegion("UK", {
      xeroTenant: buildTenant("UK"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(
        "UK payroll leave reads are not yet available."
      );
    }
  });

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
