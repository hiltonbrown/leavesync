import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  feedTokenFindUnique: vi.fn(),
  feedTokenUpdate: vi.fn(() => Promise.resolve({})),
  feedUpdate: vi.fn(() => Promise.resolve({})),
  getCachedFeedBody: vi.fn(() => Promise.resolve({ ok: true, value: null })),
  logWarn: vi.fn(),
  projectFeedEvents: vi.fn(() =>
    Promise.resolve({
      ok: true,
      value: [
        {
          allDay: true,
          contactabilityStatus: "unavailable",
          description: null,
          displayName: "Jane Smith",
          endsAt: new Date("2026-05-08T00:00:00.000Z"),
          isPublicHoliday: false,
          location: "Brisbane",
          publishedSequence: 2,
          publishedUid: "stable@ical.teamcalendar.online",
          recordType: "annual_leave",
          sourceRecordId: "10000000-0000-4000-8000-000000000001",
          startsAt: new Date("2026-05-07T00:00:00.000Z"),
          summary: "Jane Smith: Annual Leave",
        },
      ],
    })
  ),
  setCachedFeedBody: vi.fn(() =>
    Promise.resolve({ ok: true, value: undefined })
  ),
}));

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({
  database: {
    feed: { update: mocks.feedUpdate },
    feedToken: {
      findUnique: mocks.feedTokenFindUnique,
      update: mocks.feedTokenUpdate,
    },
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { warn: mocks.logWarn },
}));
vi.mock("../cache/feed-cache", () => ({
  feedCacheKey: () => "feed:cache:key",
  getCachedFeedBody: mocks.getCachedFeedBody,
  setCachedFeedBody: mocks.setCachedFeedBody,
}));
vi.mock("../projection/feed-projection", () => ({
  projectFeedEvents: mocks.projectFeedEvents,
}));

const { cachedEtagForToken, renderFeedForToken } = await import(
  "./render-feed"
);

function feedTokenFixture(overrides: Record<string, unknown> = {}) {
  return {
    clerk_org_id: "org_render",
    expires_at: null,
    feed: {
      id: "20000000-0000-4000-8000-000000000001",
      name: "Team feed",
      privacy_mode: "named",
      status: "active",
      updated_at: new Date("2026-05-01T00:00:00.000Z"),
    },
    feed_id: "20000000-0000-4000-8000-000000000001",
    id: "30000000-0000-4000-8000-000000000001",
    last_used_at: null,
    organisation_id: "40000000-0000-4000-8000-000000000001",
    status: "active",
    ...overrides,
  };
}

describe("renderFeedForToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.feedTokenFindUnique.mockResolvedValue(feedTokenFixture());
    mocks.feedTokenUpdate.mockResolvedValue({});
    mocks.feedUpdate.mockResolvedValue({});
    mocks.getCachedFeedBody.mockResolvedValue({ ok: true, value: null });
    mocks.projectFeedEvents.mockResolvedValue({
      ok: true,
      value: [
        {
          allDay: true,
          contactabilityStatus: "unavailable",
          description: null,
          displayName: "Jane Smith",
          endsAt: new Date("2026-05-08T00:00:00.000Z"),
          isPublicHoliday: false,
          location: "Brisbane",
          publishedSequence: 2,
          publishedUid: "stable@ical.teamcalendar.online",
          recordType: "annual_leave",
          sourceRecordId: "10000000-0000-4000-8000-000000000001",
          startsAt: new Date("2026-05-07T00:00:00.000Z"),
          summary: "Jane Smith: Annual Leave",
        },
      ],
    });
    mocks.setCachedFeedBody.mockResolvedValue({ ok: true, value: undefined });
  });

  it("serialises ICS with publication UID and SEQUENCE", async () => {
    const result = await renderFeedForToken("plaintext-token");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.status).toBe("active");
    expect(result.value.body).toContain("UID:stable@ical.teamcalendar.online");
    expect(result.value.body).toContain("SEQUENCE:2");
    expect(result.value.body).toContain("SUMMARY:Jane Smith: Annual Leave");
    expect(result.value.body).not.toContain("DESCRIPTION");
    expect(result.value.body).not.toContain(
      "UID:10000000-0000-4000-8000-000000000001"
    );
  });

  it("returns revoked tokens without projecting events", async () => {
    mocks.feedTokenFindUnique.mockResolvedValue(
      feedTokenFixture({ status: "revoked" })
    );

    const result = await renderFeedForToken("revoked-token");

    expect(result).toMatchObject({
      ok: true,
      value: { body: "", etag: "", status: "revoked" },
    });
    expect(mocks.projectFeedEvents).not.toHaveBeenCalled();
  });

  it("marks active expired tokens as expired", async () => {
    mocks.feedTokenFindUnique.mockResolvedValue(
      feedTokenFixture({
        expires_at: new Date("2026-01-01T00:00:00.000Z"),
        status: "active",
      })
    );

    const result = await renderFeedForToken("expired-token");

    expect(result).toMatchObject({
      ok: true,
      value: { body: "", etag: "", status: "expired" },
    });
    expect(mocks.feedTokenUpdate).toHaveBeenCalledWith({
      data: { status: "expired" },
      where: { id: "30000000-0000-4000-8000-000000000001" },
    });
    expect(mocks.projectFeedEvents).not.toHaveBeenCalled();
  });

  it("returns the rendered feed when the cache write fails", async () => {
    mocks.setCachedFeedBody.mockRejectedValue(new Error("KV unavailable"));

    const result = await renderFeedForToken("plaintext-token");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.status).toBe("active");
    expect(result.value.body).toContain("BEGIN:VCALENDAR");
    expect(result.value.body).toContain("SUMMARY:Jane Smith: Annual Leave");
    expect(mocks.feedTokenUpdate).toHaveBeenCalled();
    expect(mocks.feedUpdate).toHaveBeenCalled();
    expect(mocks.logWarn).toHaveBeenCalledWith(
      "Feed cache write failed for feed 20000000-0000-4000-8000-000000000001: Error: KV unavailable"
    );
  });

  it("skips writing last_used_at on a cache hit when last_used_at was 5 minutes ago", async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    mocks.feedTokenFindUnique.mockResolvedValue(
      feedTokenFixture({ last_used_at: fiveMinutesAgo })
    );
    mocks.getCachedFeedBody.mockResolvedValue({
      ok: true,
      value: { body: "cached-ics", etag: "cached-etag" },
    });

    const result = await renderFeedForToken("plaintext-token");

    expect(result).toEqual({
      ok: true,
      value: { body: "cached-ics", etag: "cached-etag", status: "active" },
    });
    expect(mocks.feedTokenUpdate).not.toHaveBeenCalled();
  });

  it("writes last_used_at on a cache hit when last_used_at was 2 hours ago", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    mocks.feedTokenFindUnique.mockResolvedValue(
      feedTokenFixture({ last_used_at: twoHoursAgo })
    );
    mocks.getCachedFeedBody.mockResolvedValue({
      ok: true,
      value: { body: "cached-ics", etag: "cached-etag" },
    });

    const result = await renderFeedForToken("plaintext-token");

    expect(result.ok).toBe(true);
    expect(mocks.feedTokenUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.feedTokenUpdate).toHaveBeenCalledWith({
      data: { last_used_at: expect.any(Date) },
      where: {
        clerk_org_id: "org_render",
        id: "30000000-0000-4000-8000-000000000001",
        organisation_id: "40000000-0000-4000-8000-000000000001",
      },
    });
  });

  it("writes last_used_at on a cache hit when last_used_at is null", async () => {
    mocks.feedTokenFindUnique.mockResolvedValue(
      feedTokenFixture({ last_used_at: null })
    );
    mocks.getCachedFeedBody.mockResolvedValue({
      ok: true,
      value: { body: "cached-ics", etag: "cached-etag" },
    });

    const result = await renderFeedForToken("plaintext-token");

    expect(result.ok).toBe(true);
    expect(mocks.feedTokenUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns ok when the telemetry write rejects on a cache hit and logs a warning", async () => {
    mocks.feedTokenFindUnique.mockResolvedValue(
      feedTokenFixture({ last_used_at: null })
    );
    mocks.getCachedFeedBody.mockResolvedValue({
      ok: true,
      value: { body: "cached-ics", etag: "cached-etag" },
    });
    mocks.feedTokenUpdate.mockRejectedValue(new Error("DB timeout"));

    const result = await renderFeedForToken("plaintext-token");

    expect(result).toEqual({
      ok: true,
      value: { body: "cached-ics", etag: "cached-etag", status: "active" },
    });
    // Wait microtask tick for floating promise catch handler
    await new Promise((r) => setTimeout(r, 10));
    expect(mocks.logWarn).toHaveBeenCalledWith(
      "Feed token use write failed: Error: DB timeout"
    );
  });

  it("serialises a one-day all-day event with exclusive DTEND", async () => {
    const result = await renderFeedForToken("plaintext-token");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.body).toContain("DTSTART;VALUE=DATE:20260507");
    expect(result.value.body).toContain("DTEND;VALUE=DATE:20260508");
  });

  it("serialises a multi-day all-day event with exclusive DTEND", async () => {
    mocks.projectFeedEvents.mockResolvedValueOnce({
      ok: true,
      value: [
        {
          allDay: true,
          contactabilityStatus: "unavailable",
          description: null,
          displayName: "Jane Smith",
          endsAt: new Date("2026-05-10T00:00:00.000Z"),
          isPublicHoliday: false,
          location: "Brisbane",
          publishedSequence: 2,
          publishedUid: "stable@ical.teamcalendar.online",
          recordType: "annual_leave",
          sourceRecordId: "10000000-0000-4000-8000-000000000001",
          startsAt: new Date("2026-05-07T00:00:00.000Z"),
          summary: "Jane Smith: Annual Leave",
        },
      ],
    });

    const result = await renderFeedForToken("plaintext-token");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.body).toContain("DTSTART;VALUE=DATE:20260507");
    expect(result.value.body).toContain("DTEND;VALUE=DATE:20260510");
  });
});

describe("cachedEtagForToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.feedTokenFindUnique.mockResolvedValue(feedTokenFixture());
    mocks.getCachedFeedBody.mockResolvedValue({ ok: true, value: null });
  });

  it("returns null for a missing token", async () => {
    mocks.feedTokenFindUnique.mockResolvedValue(null);
    expect(await cachedEtagForToken("unknown")).toBeNull();
  });

  it("returns null for a revoked token", async () => {
    mocks.feedTokenFindUnique.mockResolvedValue(
      feedTokenFixture({ status: "revoked" })
    );
    expect(await cachedEtagForToken("revoked")).toBeNull();
  });

  it("returns null for an expired token", async () => {
    mocks.feedTokenFindUnique.mockResolvedValue(
      feedTokenFixture({
        expires_at: new Date("2026-01-01T00:00:00.000Z"),
        status: "active",
      })
    );
    expect(await cachedEtagForToken("expired")).toBeNull();
  });

  it("returns null for an inactive feed", async () => {
    mocks.feedTokenFindUnique.mockResolvedValue(
      feedTokenFixture({
        feed: { id: "feed_1", privacy_mode: "named", status: "inactive" },
      })
    );
    expect(await cachedEtagForToken("token")).toBeNull();
  });

  it("returns null on a cache miss", async () => {
    mocks.getCachedFeedBody.mockResolvedValue({ ok: true, value: null });
    expect(await cachedEtagForToken("token")).toBeNull();
  });

  it("returns the cached ETag on a cache hit", async () => {
    mocks.getCachedFeedBody.mockResolvedValue({
      ok: true,
      value: { body: "cached-body", etag: "hash123" },
    });
    expect(await cachedEtagForToken("token")).toBe("hash123");
  });
});
