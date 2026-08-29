import { beforeEach, describe, expect, it, vi } from "vitest";
import type { XeroTenantForWrite, XeroWriteResult } from "../write/types";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  ensureFreshXeroConnection: vi.fn(),
  markXeroConnectionStale: vi.fn(),
  tenantFindFirst: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: { xeroTenant: { findFirst: mocks.tenantFindFirst } },
}));

vi.mock("../oauth/service", () => ({
  ensureFreshXeroConnection: mocks.ensureFreshXeroConnection,
  markXeroConnectionStale: mocks.markXeroConnectionStale,
}));

const { executeWithXeroAuthRecovery } = await import("./auth-recovery");

const tenant: XeroTenantForWrite = {
  clerk_org_id: "org_1",
  id: "tenant_1",
  organisation_id: "00000000-0000-4000-8000-000000000001",
  payroll_region: "AU",
  xero_connection: {
    access_token_auth_tag: "old-tag",
    access_token_encrypted: "old-ciphertext",
    access_token_iv: "old-iv",
    revoked_at: null,
  },
  xero_tenant_id: "xero-tenant-1",
};

function authFailure(status: 401 | 403): XeroWriteResult<string> {
  return {
    error: {
      code: status === 401 ? "auth_error" : "permission_error",
      httpStatus: status,
      message: "Xero rejected the request.",
    },
    ok: false,
  };
}

describe("executeWithXeroAuthRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureFreshXeroConnection.mockResolvedValue({
      ok: true,
      value: {
        expiresAt: new Date("2026-08-29T01:00:00.000Z"),
        refreshed: true,
      },
    });
    mocks.markXeroConnectionStale.mockResolvedValue({
      ok: true,
      value: undefined,
    });
  });

  it("returns non-authentication failures without touching token state", async () => {
    const operation = vi.fn().mockResolvedValue({
      error: { code: "network_error", message: "Offline" },
      ok: false,
    });

    const result = await executeWithXeroAuthRecovery(tenant, operation);

    expect(result).toEqual({
      error: { code: "network_error", message: "Offline" },
      ok: false,
    });
    expect(mocks.tenantFindFirst).not.toHaveBeenCalled();
    expect(mocks.ensureFreshXeroConnection).not.toHaveBeenCalled();
  });

  it("forces one scoped refresh on 401, reloads credentials, and retries once", async () => {
    const refreshedTenant = {
      ...tenant,
      xero_connection: {
        ...tenant.xero_connection,
        access_token_encrypted: "new-ciphertext",
      },
    };
    mocks.tenantFindFirst
      .mockResolvedValueOnce({ xero_connection_id: "connection_1" })
      .mockResolvedValueOnce(refreshedTenant);
    const operation = vi
      .fn()
      .mockResolvedValueOnce(authFailure(401))
      .mockResolvedValueOnce({ ok: true, value: "done" });

    const result = await executeWithXeroAuthRecovery(tenant, operation);

    expect(result).toEqual({ ok: true, value: "done" });
    expect(mocks.ensureFreshXeroConnection).toHaveBeenCalledWith({
      clerkOrgId: tenant.clerk_org_id,
      connectionId: "connection_1",
      forceRefresh: true,
      organisationId: tenant.organisation_id,
      previousAccessTokenEncrypted: "old-ciphertext",
    });
    expect(operation).toHaveBeenNthCalledWith(2, refreshedTenant);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("marks a 403 permission failure stale without rotating or retrying", async () => {
    mocks.tenantFindFirst.mockResolvedValueOnce({
      xero_connection_id: "connection_1",
    });
    const operation = vi.fn().mockResolvedValue(authFailure(403));

    const result = await executeWithXeroAuthRecovery(tenant, operation);

    expect(result).toEqual(authFailure(403));
    expect(mocks.ensureFreshXeroConnection).not.toHaveBeenCalled();
    expect(operation).toHaveBeenCalledOnce();
    expect(mocks.markXeroConnectionStale).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: "connection_1",
        errorCode: "xero_permission_denied",
      })
    );
  });

  it("marks the connection stale when the single retry is also rejected", async () => {
    mocks.tenantFindFirst
      .mockResolvedValueOnce({ xero_connection_id: "connection_1" })
      .mockResolvedValueOnce({
        ...tenant,
        xero_connection: {
          ...tenant.xero_connection,
          access_token_encrypted: "new-ciphertext",
        },
      });
    const operation = vi.fn().mockResolvedValue(authFailure(401));

    const result = await executeWithXeroAuthRecovery(tenant, operation);

    expect(result).toEqual(authFailure(401));
    expect(operation).toHaveBeenCalledTimes(2);
    expect(mocks.markXeroConnectionStale).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: "connection_1",
        errorCode: "xero_auth_rejected_after_refresh",
      })
    );
  });
});
