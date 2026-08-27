import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptXeroToken } from "../crypto/tokens";
import { fetchEmployees, fetchLeaveApplicationStatus } from "./read";

const ORIGINAL_ENV = process.env.XERO_TOKEN_ENCRYPTION_KEY;
const TEST_ENCRYPTION_KEY = Buffer.alloc(32).toString("base64");

function restoreEncryptionKey() {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.XERO_TOKEN_ENCRYPTION_KEY;
    return;
  }
  process.env.XERO_TOKEN_ENCRYPTION_KEY = ORIGINAL_ENV;
}

function buildXeroTenant() {
  const accessToken = encryptXeroToken("access-token");

  return {
    clerk_org_id: "org_uk_1",
    id: "tenant_uk_1",
    organisation_id: "00000000-0000-4000-8000-000000000003",
    payroll_region: "UK" as const,
    xero_connection: {
      access_token_auth_tag: accessToken.authTag,
      access_token_encrypted: accessToken.encrypted,
      access_token_iv: accessToken.iv,
      revoked_at: null,
    },
    xero_tenant_id: "xero-tenant-uk-1",
  };
}

function employeeListResponse(items: unknown[]): Response {
  return new Response(JSON.stringify({ employees: items }), { status: 200 });
}

function validEmployeeItem(employeeId: string, overrides: object = {}) {
  return {
    email: "oliver@example.co.uk",
    employeeID: employeeId,
    employmentType: "Employee",
    firstName: "Oliver",
    jobTitle: "Product Designer",
    lastName: "Smith",
    startDate: "2026-02-01",
    status: "Active",
    ...overrides,
  };
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    statusText: message,
  });
}

describe("UK employee reads", () => {
  beforeEach(() => {
    process.env.XERO_TOKEN_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    restoreEncryptionKey();
  });

  it("marks a single short page as complete and preserves valid neighbours of a malformed record", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        employeeListResponse([
          validEmployeeItem("11111111-1111-4111-8111-111111111111"),
          null,
          validEmployeeItem("22222222-2222-4222-8222-222222222222"),
        ])
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchEmployees({ xeroTenant: buildXeroTenant() });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.complete).toBe(true);
    expect(result.value.employees.map((e) => e.employeeId)).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
    expect(result.value.failures).toHaveLength(1);
    expect(result.value.rawItemCount).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/payroll.xro/2.0/employees?page=1"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "Xero-Tenant-Id": "xero-tenant-uk-1",
        }),
      })
    );
  });

  it("uses raw page length, not valid employee count, to continue pagination", async () => {
    const firstPageItems = Array.from({ length: 100 }, (_, index) =>
      index % 2 === 0
        ? validEmployeeItem(
            `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`
          )
        : null
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(employeeListResponse(firstPageItems))
      .mockResolvedValueOnce(
        employeeListResponse([
          validEmployeeItem("22222222-2222-4222-8222-222222222222"),
        ])
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchEmployees({ xeroTenant: buildXeroTenant() });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.complete).toBe(true);
    expect(result.value.rawItemCount).toBe(101);
    expect(result.value.employees).toHaveLength(51);
    expect(result.value.failures).toHaveLength(50);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining("/payroll.xro/2.0/employees?page=1"),
      expect.stringContaining("/payroll.xro/2.0/employees?page=2"),
    ]);
  });

  it("handles empty page correctly", async () => {
    const fetchMock = vi.fn().mockResolvedValue(employeeListResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchEmployees({ xeroTenant: buildXeroTenant() });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.complete).toBe(true);
    expect(result.value.employees).toHaveLength(0);
    expect(result.value.rawItemCount).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns complete: false and preserves gathered employees when a page envelope cannot be read", async () => {
    const fullFirstPage = Array.from({ length: 100 }, (_, index) =>
      validEmployeeItem(
        `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`
      )
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(employeeListResponse(fullFirstPage))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ employees: "not an array" }), {
          status: 200,
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchEmployees({ xeroTenant: buildXeroTenant() });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.complete).toBe(false);
    expect(result.value.employees).toHaveLength(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps 401 and 403 to auth_error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(errorResponse(401, "Unauthorised"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchEmployees({ xeroTenant: buildXeroTenant() });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("auth_error");
    }
  });

  it("maps 429 to rate_limit_error", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(errorResponse(429, "Too Many Requests"))
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchEmployees({ xeroTenant: buildXeroTenant() });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("rate_limit_error");
    }
  });

  it("returns auth_error Result without throwing when access_token_iv is null", async () => {
    const tenant = buildXeroTenant();
    tenant.xero_connection.access_token_iv = null;

    await expect(fetchEmployees({ xeroTenant: tenant })).resolves.toMatchObject(
      {
        error: {
          code: "auth_error",
          message: "Xero credentials are missing or revoked.",
        },
        ok: false,
      }
    );
  });

  it("leaves status read as unsupported placeholder", async () => {
    const result = await fetchLeaveApplicationStatus({
      xeroLeaveApplicationId: "leave-app-1",
      xeroTenant: buildXeroTenant(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unknown_error");
      expect(result.error.message).toContain(
        "UK payroll approval-state reads are not yet available."
      );
    }
  });
});
