import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditEventCreate: vi.fn(),
  auth: vi.fn(),
  currentUser: vi.fn(),
  getActiveOrgContext: vi.fn(),
  personUpdate: vi.fn(),
  revalidatePath: vi.fn(),
  transaction: vi.fn(),
  xeroPersonMatchFindFirst: vi.fn(),
  xeroPersonMatchUpdate: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));
vi.mock("@repo/database", () => ({
  database: {
    $transaction: mocks.transaction,
    xeroPersonMatch: { findFirst: mocks.xeroPersonMatchFindFirst },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/server/get-active-org-context", () => ({
  getActiveOrgContext: mocks.getActiveOrgContext,
}));

const { resolveXeroPersonMatchAction } = await import("./_actions");

describe("resolveXeroPersonMatchAction", () => {
  const organisationId = "00000000-0000-4000-8000-000000000001";
  const matchId = "00000000-0000-4000-8000-000000000002";
  const clerkOrgId = "org_1";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ orgId: clerkOrgId, orgRole: "org:admin" });
    mocks.currentUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: "admin@example.com" }],
      firstName: "Admin",
      id: "user_1",
      lastName: "User",
    });
    mocks.getActiveOrgContext.mockResolvedValue({
      ok: true,
      value: { clerkOrgId, organisationId },
    });
    mocks.xeroPersonMatchFindFirst.mockResolvedValue({
      candidate_person: {
        clerk_user_id: "user_clerk_1",
        id: "person-candidate",
      },
      id: matchId,
      organisation_id: organisationId,
      xero_person: { id: "person-xero" },
    });
    mocks.personUpdate.mockResolvedValue({});
    mocks.xeroPersonMatchUpdate.mockResolvedValue({});
    mocks.auditEventCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          auditEvent: { create: mocks.auditEventCreate },
          person: { update: mocks.personUpdate },
          xeroPersonMatch: { update: mocks.xeroPersonMatchUpdate },
        })
    );
  });

  it("calls findFirst with clerk_org_id, id and organisation_id on happy path", async () => {
    const result = await resolveXeroPersonMatchAction({
      matchId,
      organisationId,
      resolution: "ignore",
    });

    expect(result.ok).toBe(true);
    expect(mocks.getActiveOrgContext).toHaveBeenCalledWith(organisationId);
    expect(mocks.xeroPersonMatchFindFirst).toHaveBeenCalledTimes(1);
    const where = mocks.xeroPersonMatchFindFirst.mock.calls[0]?.[0]?.where;
    expect(where).toEqual(
      expect.objectContaining({
        clerk_org_id: clerkOrgId,
        id: matchId,
        organisation_id: organisationId,
      })
    );
  });

  it("returns non-ok and does not query when organisation context is invalid", async () => {
    mocks.getActiveOrgContext.mockResolvedValue({
      error: { code: "not_found", message: "Organisation not found" },
      ok: false,
    });

    const result = await resolveXeroPersonMatchAction({
      matchId,
      organisationId,
      resolution: "ignore",
    });

    expect(result.ok).toBe(false);
    expect(mocks.xeroPersonMatchFindFirst).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
