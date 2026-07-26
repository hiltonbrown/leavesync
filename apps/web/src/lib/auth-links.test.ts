import { afterEach, describe, expect, it, vi } from "vitest";

type VercelEnv = "development" | "preview" | "production" | undefined;

interface EnvMock {
  NEXT_PUBLIC_APP_URL: string | undefined;
  VERCEL_ENV: VercelEnv;
}

async function importAuthLinks(envMock: EnvMock) {
  vi.resetModules();
  vi.doMock("@/env", () => ({ env: envMock }));
  return await import("./auth-links");
}

describe("auth-links", () => {
  afterEach(() => {
    vi.doUnmock("@/env");
  });

  it("does not throw when VERCEL_ENV is unset and NEXT_PUBLIC_APP_URL points to localhost", async () => {
    const { signInHref, signUpHref } = await importAuthLinks({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      VERCEL_ENV: undefined,
    });

    expect(signInHref).toBe("http://localhost:3000/sign-in");
    expect(signUpHref).toBe("http://localhost:3000/sign-up");
  });

  it("does not throw when VERCEL_ENV is preview and NEXT_PUBLIC_APP_URL points to localhost", async () => {
    const { signInHref } = await importAuthLinks({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      VERCEL_ENV: "preview",
    });

    expect(signInHref).toBe("http://localhost:3000/sign-in");
  });

  it("throws when VERCEL_ENV is production and NEXT_PUBLIC_APP_URL points to localhost", async () => {
    await expect(
      importAuthLinks({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        VERCEL_ENV: "production",
      })
    ).rejects.toThrow(
      "NEXT_PUBLIC_APP_URL must point to the Team Calendar app domain in production."
    );
  });

  it("does not throw when VERCEL_ENV is production and NEXT_PUBLIC_APP_URL points to the real domain", async () => {
    const { signInHref } = await importAuthLinks({
      NEXT_PUBLIC_APP_URL: "https://app.teamcalendar.online",
      VERCEL_ENV: "production",
    });

    expect(signInHref).toBe("https://app.teamcalendar.online/sign-in");
  });

  it("falls back to the production origin when NEXT_PUBLIC_APP_URL is unset", async () => {
    const { signInHref } = await importAuthLinks({
      NEXT_PUBLIC_APP_URL: undefined,
      VERCEL_ENV: "production",
    });

    expect(signInHref).toBe("https://app.teamcalendar.online/sign-in");
  });
});
