import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  feedCount: vi.fn(),
  feedFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({
  database: {
    feed: {
      count: mocks.feedCount,
      findMany: mocks.feedFindMany,
    },
  },
}));

const { getFeedSummaryForDashboard } = await import("./feed-service");

const baseInput = {
  actingRole: "owner" as const,
  actingUserId: "user_1",
  clerkOrgId: "org_1",
  organisationId: "00000000-0000-4000-8000-000000000001",
};

describe("feed-service dashboard summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.feedFindMany.mockResolvedValue([
      {
        id: "feed_1",
        last_rendered_at: new Date("2026-04-18T09:00:00.000Z"),
      },
      {
        id: "feed_2",
        last_rendered_at: new Date("2026-04-17T09:00:00.000Z"),
      },
    ]);
    mocks.feedCount.mockResolvedValue(3);
  });

  it("returns exact active and paused counts with latest render time", async () => {
    const result = await getFeedSummaryForDashboard(baseInput);

    expect(result).toMatchObject({
      ok: true,
      value: {
        activeCount: 2,
        pausedCount: 3,
      },
    });
    expect(result.ok && result.value.lastRenderedAt).toEqual(
      new Date("2026-04-18T09:00:00.000Z")
    );
  });

  it("rejects non-admin callers", async () => {
    const result = await getFeedSummaryForDashboard({
      ...baseInput,
      actingRole: "viewer",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "not_authorised" },
    });
  });
});
