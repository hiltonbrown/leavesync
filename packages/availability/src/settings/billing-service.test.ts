import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clerkOrgSubscriptionFindUnique: vi.fn(),
  usageCounterFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({
  database: {
    clerkOrgSubscription: {
      findUnique: mocks.clerkOrgSubscriptionFindUnique,
    },
    usageCounter: {
      findMany: mocks.usageCounterFindMany,
    },
  },
}));

const { getBillingSummary, getBillingSummaryForDashboard } = await import(
  "./billing-service"
);

const baseInput = {
  actingRole: "owner" as const,
  actingUserId: "user_1",
  clerkOrgId: "org_1",
  organisationId: "00000000-0000-4000-8000-000000000001",
};

describe("billing-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clerkOrgSubscriptionFindUnique.mockResolvedValue({
      clerk_org_id: "org_1",
      current_period_end: new Date("2026-05-01T00:00:00.000Z"),
      id: "sub_1",
      plan_key: "pro",
      seats_purchased: 10,
      status: "active",
    });
    mocks.usageCounterFindMany.mockResolvedValue([
      {
        current_value: 42,
        metric_key: "people_count",
      },
      {
        current_value: 8,
        metric_key: "active_feeds",
      },
    ]);
  });

  it("returns plan, usage, and over-limit state", async () => {
    const result = await getBillingSummary(baseInput);

    expect(result).toMatchObject({
      ok: true,
      value: {
        hasContactFlow: false,
        hasUpgradeFlow: false,
        isOverLimit: false,
        plan: {
          key: "pro",
          label: "Pro",
          seatsPurchased: 10,
          status: "active",
        },
      },
    });
  });

  it("rejects non-owners", async () => {
    const result = await getBillingSummary({
      ...baseInput,
      actingRole: "admin",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "not_authorised" },
    });
  });

  it("returns subscription_not_found when no row exists", async () => {
    mocks.clerkOrgSubscriptionFindUnique.mockResolvedValue(null);

    const result = await getBillingSummary(baseInput);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "subscription_not_found" },
    });
  });

  it("flags over-limit metrics", async () => {
    mocks.usageCounterFindMany.mockResolvedValue([
      {
        current_value: 501,
        metric_key: "people_count",
      },
    ]);

    const result = await getBillingSummary(baseInput);

    expect(result).toMatchObject({
      ok: true,
      value: { isOverLimit: true },
    });
  });

  it("returns dashboard summary for admins with locked visibility", async () => {
    const result = await getBillingSummaryForDashboard({
      ...baseInput,
      actingRole: "admin",
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        hasUpgradeFlow: false,
        visibleToAdmin: false,
      },
    });
  });

  it("returns dashboard summary for owners with billing visibility", async () => {
    const result = await getBillingSummaryForDashboard(baseInput);

    expect(result).toMatchObject({
      ok: true,
      value: {
        hasUpgradeFlow: true,
        visibleToAdmin: true,
      },
    });
  });
});
