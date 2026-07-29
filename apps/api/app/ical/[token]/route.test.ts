import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cachedEtagForToken: vi.fn(),
  renderFeedForToken: vi.fn(),
}));

vi.mock("@repo/feeds", () => ({
  cachedEtagForToken: mocks.cachedEtagForToken,
  renderFeedForToken: mocks.renderFeedForToken,
}));

const { GET } = await import("./route");

function activeFeedResult(overrides: { body?: string; etag?: string } = {}) {
  return {
    ok: true,
    value: {
      body: overrides.body ?? "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n",
      etag: overrides.etag ?? "feed-hash",
      status: "active",
    },
  };
}

function requestFor(ifNoneMatch?: string) {
  return new Request("https://api.example.com/ical/feed-token.ics", {
    headers: ifNoneMatch ? { "If-None-Match": ifNoneMatch } : undefined,
  });
}

function getFeed(token = "feed-token.ics", ifNoneMatch?: string) {
  return GET(requestFor(ifNoneMatch), {
    params: Promise.resolve({ token }),
  });
}

describe("GET /ical/:token.ics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cachedEtagForToken.mockResolvedValue(null);
    mocks.renderFeedForToken.mockResolvedValue(activeFeedResult());
  });

  it("returns an active feed with ETag and calendar content type", async () => {
    const response = await getFeed();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
    expect(response.headers.get("ETag")).toBe('"feed-hash"');
    expect(response.headers.get("Content-Type")).toBe(
      "text/calendar;charset=utf-8"
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "max-age=3600, must-revalidate"
    );
  });

  it("returns 304 with an empty body when If-None-Match matches post-render ETag", async () => {
    const response = await getFeed("feed-token.ics", '"feed-hash"');

    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
    expect(response.headers.get("ETag")).toBe('"feed-hash"');
    expect(response.headers.get("Cache-Control")).toBe(
      "max-age=3600, must-revalidate"
    );
  });

  it("returns 304 when If-None-Match is a weak validator on post-render ETag", async () => {
    const response = await getFeed("feed-token.ics", 'W/"feed-hash"');

    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
  });

  it("returns 304 when If-None-Match is a list containing the post-render feed ETag", async () => {
    const response = await getFeed("feed-token.ics", '"other", "feed-hash"');

    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
  });

  it("returns the full body when If-None-Match does not match", async () => {
    const response = await getFeed("feed-token.ics", '"other"');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
    expect(response.headers.get("ETag")).toBe('"feed-hash"');
  });

  it("returns 404 when the token cannot render a feed", async () => {
    mocks.renderFeedForToken.mockResolvedValue({
      ok: false,
      error: { code: "not_found", message: "Feed not found" },
    });

    const response = await getFeed();

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it.each([
    "expired",
    "revoked",
  ] as const)("returns 410 when the token is %s", async (status) => {
    mocks.renderFeedForToken.mockResolvedValue({
      ok: true,
      value: { body: "", etag: "", status },
    });

    const response = await getFeed("feed-token.ics", '""');

    expect(response.status).toBe(410);
    expect(await response.text()).toBe("Gone");
  });

  it("strips the .ics suffix before rendering the token", async () => {
    await getFeed("calendar-token.ics");

    expect(mocks.renderFeedForToken).toHaveBeenCalledWith("calendar-token");
  });

  it("short-circuits to 304 without rendering when cachedEtagForToken matches If-None-Match", async () => {
    mocks.cachedEtagForToken.mockResolvedValue("cached-etag");
    const response = await getFeed("feed-token.ics", '"cached-etag"');

    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
    expect(response.headers.get("ETag")).toBe('"cached-etag"');
    expect(mocks.cachedEtagForToken).toHaveBeenCalledWith("feed-token");
    expect(mocks.renderFeedForToken).not.toHaveBeenCalled();
  });

  it("renders the feed when cachedEtagForToken does not match If-None-Match", async () => {
    mocks.cachedEtagForToken.mockResolvedValue("old-etag");
    const response = await getFeed("feed-token.ics", '"new-etag"');

    expect(response.status).toBe(200);
    expect(mocks.renderFeedForToken).toHaveBeenCalledWith("feed-token");
  });

  it("does not call cachedEtagForToken when If-None-Match is absent", async () => {
    const response = await getFeed("feed-token.ics");

    expect(response.status).toBe(200);
    expect(mocks.cachedEtagForToken).not.toHaveBeenCalled();
    expect(mocks.renderFeedForToken).toHaveBeenCalledWith("feed-token");
  });

  it("matches weak ETags when short-circuiting with cachedEtagForToken", async () => {
    mocks.cachedEtagForToken.mockResolvedValue("cached-etag");
    const response = await getFeed("feed-token.ics", 'W/"cached-etag"');

    expect(response.status).toBe(304);
    expect(mocks.renderFeedForToken).not.toHaveBeenCalled();
  });
});
