import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  dispatchManualSync: vi.fn(),
  requireOrg: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@repo/auth/helpers", () => ({
  currentUser: mocks.currentUser,
  requireOrg: mocks.requireOrg,
  requireRole: mocks.requireRole,
}));
vi.mock("@repo/availability", () => ({
  dispatchManualSync: mocks.dispatchManualSync,
}));

const { POST } = await import("./route");

const input = {
  organisationId: "00000000-0000-4000-8000-000000000001",
  runType: "people",
  xeroTenantId: "00000000-0000-4000-8000-000000000002",
} as const;

function request(body: unknown): Request {
  return new Request("https://api.example.com/api/sync/dispatch", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("manual sync dispatch route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOrg.mockResolvedValue("org_123");
    mocks.currentUser.mockResolvedValue({ id: "user_123" });
    mocks.requireRole.mockImplementation((role: string) =>
      Promise.resolve(role === "org:admin")
    );
    mocks.dispatchManualSync.mockResolvedValue({
      ok: true,
      value: { eventName: "sync-xero-people", queued: true },
    });
  });

  it("rejects unauthenticated callers", async () => {
    mocks.requireOrg.mockRejectedValueOnce(new Error("No organisation"));

    const response = await POST(request(input));

    expect(response.status).toBe(401);
    expect(mocks.dispatchManualSync).not.toHaveBeenCalled();
  });

  it("rejects callers who are not admins or owners", async () => {
    mocks.requireRole.mockResolvedValue(false);

    const response = await POST(request(input));

    expect(response.status).toBe(403);
    expect(mocks.dispatchManualSync).not.toHaveBeenCalled();
  });

  it("validates the external request body", async () => {
    const response = await POST(request({ ...input, organisationId: "bad" }));

    expect(response.status).toBe(400);
    expect(mocks.dispatchManualSync).not.toHaveBeenCalled();
  });

  it("dispatches with both authenticated tenant identifiers", async () => {
    const response = await POST(request(input));

    expect(response.status).toBe(202);
    expect(mocks.dispatchManualSync).toHaveBeenCalledWith({
      actingRole: "admin",
      actingUserId: "user_123",
      clerkOrgId: "org_123",
      organisationId: input.organisationId,
      runType: "people",
      xeroTenantId: input.xeroTenantId,
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      value: { eventName: "sync-xero-people", queued: true },
    });
  });

  it("preserves a scoped service failure", async () => {
    mocks.dispatchManualSync.mockResolvedValueOnce({
      error: {
        code: "tenant_not_found",
        message: "Xero tenant was not found for this organisation.",
      },
      ok: false,
    });

    const response = await POST(request(input));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "tenant_not_found",
        message: "Xero tenant was not found for this organisation.",
      },
      ok: false,
    });
  });
});
