import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyticsCapture: vi.fn(),
  analyticsGroupIdentify: vi.fn(),
  analyticsShutdown: vi.fn(),
  ensureCurrentUserPerson: vi.fn(),
  organisationFindMany: vi.fn(),
  personUpdateMany: vi.fn(),
}));

vi.mock("@repo/analytics/server", () => ({
  analytics: {
    capture: mocks.analyticsCapture,
    groupIdentify: mocks.analyticsGroupIdentify,
    identify: vi.fn(),
    shutdown: mocks.analyticsShutdown,
  },
}));
vi.mock("@repo/availability", () => ({
  ensureCurrentUserPerson: mocks.ensureCurrentUserPerson,
}));
vi.mock("@repo/database", () => ({
  database: {
    organisation: { findMany: mocks.organisationFindMany },
    person: { updateMany: mocks.personUpdateMany },
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));
vi.mock("@/env", () => ({
  env: { CLERK_WEBHOOK_SECRET: "secret" },
}));

const {
  handleOrganizationMembershipCreated,
  handleOrganizationMembershipDeleted,
} = await import("./route");

function membershipFixture() {
  return {
    organization: { id: "org_1" },
    public_user_data: {
      first_name: "Test",
      identifier: "person@example.com",
      image_url: "https://img.clerk.com/user.png",
      last_name: "Person",
      user_id: "user_1",
    },
  } as Parameters<typeof handleOrganizationMembershipCreated>[0];
}

describe("Clerk organisation membership webhook handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.organisationFindMany.mockResolvedValue([
      {
        clerk_org_id: "org_1",
        id: "00000000-0000-4000-8000-000000000001",
      },
      {
        clerk_org_id: "org_1",
        id: "00000000-0000-4000-8000-000000000002",
      },
    ]);
    mocks.ensureCurrentUserPerson.mockResolvedValue({
      ok: true,
      value: { id: "00000000-0000-4000-8000-000000000011" },
    });
    mocks.personUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("links or creates people for each active organisation on membership creation", async () => {
    const response = await handleOrganizationMembershipCreated(
      membershipFixture()
    );

    expect(response.status).toBe(201);
    expect(mocks.organisationFindMany).toHaveBeenCalledWith({
      where: {
        archived_at: null,
        clerk_org_id: "org_1",
      },
      select: {
        clerk_org_id: true,
        id: true,
      },
    });
    expect(mocks.ensureCurrentUserPerson).toHaveBeenCalledTimes(2);
    expect(mocks.ensureCurrentUserPerson).toHaveBeenCalledWith(
      {
        clerkOrgId: "org_1",
        organisationId: "00000000-0000-4000-8000-000000000001",
      },
      {
        avatarUrl: "https://img.clerk.com/user.png",
        clerkUserId: "user_1",
        displayName: "Test Person",
        email: "person@example.com",
        firstName: "Test",
        lastName: "Person",
      }
    );
  });

  it("clears clerk_user_id on membership deletion without deleting people", async () => {
    const response = await handleOrganizationMembershipDeleted(
      membershipFixture()
    );

    expect(response.status).toBe(201);
    expect(mocks.personUpdateMany).toHaveBeenCalledWith({
      where: {
        clerk_org_id: "org_1",
        clerk_user_id: "user_1",
      },
      data: {
        clerk_user_id: null,
      },
    });
  });
});
