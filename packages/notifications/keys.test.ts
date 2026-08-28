import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { keys } from "./keys";

describe("notifications keys environment validation", () => {
  const originalUrl = process.env.KV_REST_API_URL;
  const originalToken = process.env.KV_REST_API_TOKEN;

  beforeEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.KV_REST_API_URL;
    } else {
      process.env.KV_REST_API_URL = originalUrl;
    }
    if (originalToken === undefined) {
      delete process.env.KV_REST_API_TOKEN;
    } else {
      process.env.KV_REST_API_TOKEN = originalToken;
    }
  });

  it("passes and returns undefined keys when neither URL nor token is set", () => {
    const env = keys();
    expect(env.KV_REST_API_URL).toBeUndefined();
    expect(env.KV_REST_API_TOKEN).toBeUndefined();
  });

  it("passes when both URL and token are valid", () => {
    process.env.KV_REST_API_URL = "https://example.kv.vercel-storage.com";
    process.env.KV_REST_API_TOKEN = "test-token";

    const env = keys();
    expect(env.KV_REST_API_URL).toBe("https://example.kv.vercel-storage.com");
    expect(env.KV_REST_API_TOKEN).toBe("test-token");
  });

  it("treats empty strings as undefined and passes when both are empty strings", () => {
    process.env.KV_REST_API_URL = "";
    process.env.KV_REST_API_TOKEN = "";

    const env = keys();
    expect(env.KV_REST_API_URL).toBeUndefined();
    expect(env.KV_REST_API_TOKEN).toBeUndefined();
  });

  it("throws when URL is set without token", () => {
    process.env.KV_REST_API_URL = "https://example.kv.vercel-storage.com";

    expect(() => keys()).toThrowError(
      "KV_REST_API_URL and KV_REST_API_TOKEN must both be set or both omitted to configure notification SSE."
    );
  });

  it("throws when token is set without URL", () => {
    process.env.KV_REST_API_TOKEN = "test-token";

    expect(() => keys()).toThrowError(
      "KV_REST_API_URL and KV_REST_API_TOKEN must both be set or both omitted to configure notification SSE."
    );
  });

  it("throws validation error when URL is malformed", () => {
    process.env.KV_REST_API_URL = "not-a-valid-url";
    process.env.KV_REST_API_TOKEN = "test-token";

    expect(() => keys()).toThrowError("Invalid environment variables");
  });
});
