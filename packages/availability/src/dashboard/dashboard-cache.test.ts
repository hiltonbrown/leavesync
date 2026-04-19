import { describe, expect, it, vi } from "vitest";
import { createDashboardCache } from "./dashboard-cache";

describe("dashboard-cache", () => {
  it("reuses queries within one dashboard render", async () => {
    const cache = createDashboardCache();
    const loader = vi.fn(async () => ({ value: 42 }));

    const [first, second] = await Promise.all([
      cache.getOrLoad("summary", loader),
      cache.getOrLoad("summary", loader),
    ]);

    expect(first).toEqual({ value: 42 });
    expect(second).toEqual({ value: 42 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not leak across renders", async () => {
    const firstCache = createDashboardCache();
    const secondCache = createDashboardCache();
    const firstLoader = vi.fn(async () => "first");
    const secondLoader = vi.fn(async () => "second");

    await firstCache.getOrLoad("summary", firstLoader);
    await secondCache.getOrLoad("summary", secondLoader);

    expect(firstLoader).toHaveBeenCalledTimes(1);
    expect(secondLoader).toHaveBeenCalledTimes(1);
    expect(firstCache.get("summary")).toBe("first");
    expect(secondCache.get("summary")).toBe("second");
  });
});
