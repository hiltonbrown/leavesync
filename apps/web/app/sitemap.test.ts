import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_WEB_URL: "https://teamcalendar.online",
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
  },
}));

vi.mock("@/src/lib/blog", () => ({
  getAllPosts: vi.fn(async () => [{ slug: "launch-note" }]),
}));

describe("public sitemap", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("publishes both help routes once without implementation directories", async () => {
    const { default: sitemap } = await import("./sitemap");
    const entries = await sitemap();
    const paths = entries.map((entry) => new URL(entry.url).pathname);

    expect(paths.filter((path) => path === "/help-centre")).toHaveLength(1);
    expect(
      paths.filter((path) => path === "/help-centre/onboarding")
    ).toHaveLength(1);
    expect(paths).not.toContain("/help-centre/components");
    expect(paths).toContain("/blog/launch-note");
  });
});
