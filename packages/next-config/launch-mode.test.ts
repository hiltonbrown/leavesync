import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLaunchMode, isEarlyAccess, isPaidLaunch } from "./launch-mode";

describe("launch-mode contract", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("parses valid early_access mode", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "early_access";
    expect(getLaunchMode()).toBe("early_access");
    expect(isEarlyAccess()).toBe(true);
    expect(isPaidLaunch()).toBe(false);
  });

  it("parses valid paid mode", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "paid";
    expect(getLaunchMode()).toBe("paid");
    expect(isEarlyAccess()).toBe(false);
    expect(isPaidLaunch()).toBe(true);
  });

  it("defaults to early_access in non-production environments when unset", () => {
    delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    delete process.env.VERCEL_ENV;

    expect(getLaunchMode()).toBe("early_access");
    expect(isEarlyAccess()).toBe(true);
  });

  it("defaults to early_access in production when NEXT_PUBLIC_LAUNCH_MODE is missing", () => {
    delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    expect(getLaunchMode()).toBe("early_access");
  });

  it("defaults to early_access in the browser production bundle when unset", () => {
    delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.VERCEL_ENV;

    expect(getLaunchMode()).toBe("early_access");
  });

  it("defaults to early_access when NEXT_PUBLIC_VERCEL_ENV is production and unset", () => {
    delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    process.env.NEXT_PUBLIC_VERCEL_ENV = "production";
    delete process.env.VERCEL_ENV;

    expect(getLaunchMode()).toBe("early_access");
  });

  it("defaults to early_access when VERCEL_ENV is production and unset", () => {
    delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    process.env.VERCEL_ENV = "production";

    expect(getLaunchMode()).toBe("early_access");
  });

  it("warns when the production fallback is used", () => {
    delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(getLaunchMode()).toBe("early_access");
    expect(warn).toHaveBeenCalledWith(
      "NEXT_PUBLIC_LAUNCH_MODE is not set in production; defaulting to early_access."
    );

    warn.mockRestore();
  });

  it("does not warn when the missing value fallback is used outside production", () => {
    delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    delete process.env.VERCEL_ENV;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(getLaunchMode()).toBe("early_access");
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });

  it("throws error when NEXT_PUBLIC_LAUNCH_MODE is invalid", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "invalid_mode";

    expect(() => getLaunchMode()).toThrow(
      'Invalid NEXT_PUBLIC_LAUNCH_MODE: "invalid_mode"'
    );
  });
});
