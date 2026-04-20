import { afterEach, describe, expect, test, vi } from "vitest";
import { getPublicApiOrigin, getPublicApiUrl } from "./public-api-url";

const originalNodeEnv = process.env.NODE_ENV;

describe("public API URL helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    process.env.NODE_ENV = originalNodeEnv;
  });

  test("uses the configured public API origin without trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.leavesync.test/");

    expect(getPublicApiOrigin()).toBe("https://api.leavesync.test");
    expect(getPublicApiUrl("/api/notifications/stream")).toBe(
      "https://api.leavesync.test/api/notifications/stream"
    );
  });

  test("uses the local API app during development when no origin is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    process.env.NODE_ENV = "development";

    expect(getPublicApiOrigin()).toBe("http://localhost:3002");
  });

  test("returns null outside development when no origin is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    process.env.NODE_ENV = "production";

    expect(getPublicApiOrigin()).toBeNull();
    expect(getPublicApiUrl("/api/notifications/stream")).toBeNull();
  });
});
