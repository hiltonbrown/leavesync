import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
  currentUser: vi.fn(),
  database: {
    $transaction: vi.fn(),
    person: { findFirst: vi.fn() },
    xeroPersonMatch: { findFirst: vi.fn() },
  },
  log: { error: vi.fn() },
  revalidatePath: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  auth: mocks.auth,
  clerkClient: mocks.clerkClient,
  currentUser: mocks.currentUser,
}));
vi.mock("@repo/database", () => ({ database: mocks.database }));
vi.mock("@repo/observability/log", () => ({ log: mocks.log }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const { resolveXeroPersonMatchAction } = await import("./_actions");

describe("resolveXeroPersonMatchAction", () => {
  const orgId = "org_1";
  const matchId = "00000000-0000-4000-8000-000000000001";
  const xeroPersonId = "00000000-0000-4000-8000-000000000002";
  const candidatePersonId = "00000000-0000-4000-8000-000000000003";
  const organisationId = "00000000-0000-4000-8000-000000000004";

  function baseMatch(overrides: Record<string, unknown> = {}) {
    return {
      candidate_person: {
        clerk_user_id: "user_candidate",
        id: candidatePersonId,
      },
      clerk_org_id: orgId,
      id: matchId,
      organisation_id: organisationId,
      xero_person: { id: xeroPersonId },
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ orgId, orgRole: "org:admin" });
    mocks.currentUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: "admin@example.com" }],
      firstName: "Admin",
      id: "user_admin",
      lastName: "User",
    });
    mocks.database.xeroPersonMatch.findFirst.mockResolvedValue(baseMatch());
    mocks.database.person.findFirst.mockResolvedValue(null);
    mocks.database.$transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<void>) => {
        const tx = {
          auditEvent: { create: vi.fn().mockResolvedValue({}) },
          person: { update: vi.fn().mockResolvedValue({}) },
          xeroPersonMatch: { update: vi.fn().mockResolvedValue({}) },
        };
        await cb(tx as never);
      }
    );
    mocks.clerkClient.mockResolvedValue({
      organizations: {
        getOrganizationMembershipList: vi
          .fn()
          .mockResolvedValue({ data: [{ id: "mem_1" }] }),
      },
    });
  });

  it("rejects a non-member", async () => {
    mocks.clerkClient.mockResolvedValue({
      organizations: {
        getOrganizationMembershipList: vi.fn().mockResolvedValue({ data: [] }),
      },
    });
    const result = await resolveXeroPersonMatchAction({
      clerkUserId: "user_outsider123",
      matchId,
      resolution: "match",
    });
    expect(result).toEqual(expect.objectContaining({ ok: false }));
    expect((result as { ok: false; error: { code: string } }).error.code).toBe(
      "validation_error"
    );
    expect(mocks.database.$transaction).not.toHaveBeenCalled();
  });

  it("accepts a member", async () => {
    const result = await resolveXeroPersonMatchAction({
      clerkUserId: "user_valid123",
      matchId,
      resolution: "match",
    });
    expect(result).toEqual({ ok: true, value: { resolved: true } });
    expect(mocks.database.$transaction).toHaveBeenCalled();
  });

  it("fails closed on Clerk error", async () => {
    mocks.clerkClient.mockResolvedValue({
      organizations: {
        getOrganizationMembershipList: vi
          .fn()
          .mockRejectedValue(new Error("down")),
      },
    });
    const result = await resolveXeroPersonMatchAction({
      clerkUserId: "user_valid123",
      matchId,
      resolution: "match",
    });
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: { code: string } }).error.code).toBe(
      "validation_error"
    );
    expect(mocks.database.$transaction).not.toHaveBeenCalled();
  });

  it("skips check for database-sourced fallback", async () => {
    const result = await resolveXeroPersonMatchAction({
      matchId,
      resolution: "match",
    });
    expect(mocks.clerkClient).not.toHaveBeenCalled();
    expect(mocks.database.$transaction).toHaveBeenCalled();
  });

  it("rejects duplicate binding", async () => {
    mocks.database.person.findFirst.mockResolvedValue({ id: "other-person" });
    const result = await resolveXeroPersonMatchAction({
      clerkUserId: "user_valid123",
      matchId,
      resolution: "match",
    });
    expect(result.ok).toBe(false);
    expect(
      (result as { ok: false; error: { message: string } }).error.message
    ).toMatch("already linked");
    expect(mocks.database.$transaction).not.toHaveBeenCalled();
  });

  it("rejects malformed id", async () => {
    const result = await resolveXeroPersonMatchAction({
      clerkUserId: "not-a-user-id",
      matchId,
      resolution: "match",
    });
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: { code: string } }).error.code).toBe(
      "validation_error"
    );
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });

  it("ignore resolution is unaffected", async () => {
    const result = await resolveXeroPersonMatchAction({
      matchId,
      resolution: "ignore",
    });
    expect(result).toEqual({ ok: true, value: { resolved: true } });
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });
});
