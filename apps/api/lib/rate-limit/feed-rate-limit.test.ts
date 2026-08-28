import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkFeedRateLimit,
  extractClientIp,
  FEED_RATE_LIMITS,
  hashToken,
  setFeedRateLimiterClientForTests,
} from "./feed-rate-limit";

describe("extractClientIp", () => {
  it("extracts the first hop from x-forwarded-for", () => {
    const request = new Request("https://api.example.com/ical/feed.ics", {
      headers: {
        "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
      },
    });

    expect(extractClientIp(request)).toBe("203.0.113.195");
  });

  it("extracts x-real-ip when x-forwarded-for is absent", () => {
    const request = new Request("https://api.example.com/ical/feed.ics", {
      headers: {
        "x-real-ip": "198.51.100.42",
      },
    });

    expect(extractClientIp(request)).toBe("198.51.100.42");
  });

  it("prioritises x-forwarded-for over x-real-ip", () => {
    const request = new Request("https://api.example.com/ical/feed.ics", {
      headers: {
        "x-forwarded-for": "203.0.113.1",
        "x-real-ip": "198.51.100.2",
      },
    });

    expect(extractClientIp(request)).toBe("203.0.113.1");
  });

  it("strips port from IPv4 address", () => {
    const request = new Request("https://api.example.com/ical/feed.ics", {
      headers: {
        "x-forwarded-for": "192.0.2.1:54321",
      },
    });

    expect(extractClientIp(request)).toBe("192.0.2.1");
  });

  it("strips port from IPv6 bracket notation", () => {
    const request = new Request("https://api.example.com/ical/feed.ics", {
      headers: {
        "x-forwarded-for": "[2001:db8::1]:8080",
      },
    });

    expect(extractClientIp(request)).toBe("2001:db8::1");
  });

  it("falls back to 'unknown' when no client IP header is present", () => {
    const request = new Request("https://api.example.com/ical/feed.ics");

    expect(extractClientIp(request)).toBe("unknown");
  });
});

describe("hashToken", () => {
  it("produces deterministic SHA-256 hex digest", () => {
    const hash1 = hashToken("secret-token-123");
    const hash2 = hashToken("secret-token-123");
    const hashOther = hashToken("other-token");

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashOther);
  });
});

describe("checkFeedRateLimit", () => {
  beforeEach(() => {
    setFeedRateLimiterClientForTests(null);
  });

  afterEach(() => {
    setFeedRateLimiterClientForTests(null);
  });

  it("allows request when under IP and token limits", async () => {
    const store = new Map<string, number>();
    setFeedRateLimiterClientForTests({
      eval: (_script, keys, _args) => {
        const [key] = keys;
        const current = (store.get(key) ?? 0) + 1;
        store.set(key, current);
        return Promise.resolve([current, 45]);
      },
    });

    const result = await checkFeedRateLimit({
      clientIp: "192.0.2.1",
      tokenDigest: "digest-123",
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(FEED_RATE_LIMITS.CLIENT_IP.limit - 1);
    expect(result.resetInSeconds).toBe(45);
  });

  it("rejects request when IP limit is exceeded (60 req / 60s)", async () => {
    setFeedRateLimiterClientForTests({
      eval: (_script, keys) => {
        const [key] = keys;
        if (key.startsWith("ratelimit:feed:ip:")) {
          return Promise.resolve([61, 30]); // 61 exceeds limit 60
        }
        return Promise.resolve([1, 60]);
      },
    });

    const result = await checkFeedRateLimit({
      clientIp: "192.0.2.1",
      tokenDigest: "digest-123",
    });

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(30);
  });

  it("rejects request when token probe limit is exceeded (120 req / 60s)", async () => {
    setFeedRateLimiterClientForTests({
      eval: (_script, keys) => {
        const [key] = keys;
        if (key.startsWith("ratelimit:feed:ip:")) {
          return Promise.resolve([10, 50]); // IP is within limit 60
        }
        if (key.startsWith("ratelimit:feed:token:")) {
          return Promise.resolve([121, 40]); // Token probe exceeds limit 120
        }
        return Promise.resolve([1, 60]);
      },
    });

    const result = await checkFeedRateLimit({
      clientIp: "192.0.2.1",
      tokenDigest: "digest-123",
    });

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(40);
  });

  it("fails open when Redis rate limiter is unconfigured or unavailable", async () => {
    setFeedRateLimiterClientForTests(null);

    const result = await checkFeedRateLimit({
      clientIp: "192.0.2.1",
      tokenDigest: "digest-123",
    });

    expect(result.allowed).toBe(true);
  });

  it("fails open when Redis command throws an error", async () => {
    setFeedRateLimiterClientForTests({
      eval: () => Promise.reject(new Error("Redis connection timeout")),
    });

    const result = await checkFeedRateLimit({
      clientIp: "192.0.2.1",
      tokenDigest: "digest-123",
    });

    expect(result.allowed).toBe(true);
  });
});
