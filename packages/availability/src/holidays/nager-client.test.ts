import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicHolidays } from "./nager-client";

describe("nager-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch and parse holidays successfully", async () => {
    const mockHolidays = [
      {
        date: "2024-01-01",
        localName: "New Year's Day",
        name: "New Year's Day",
        countryCode: "AU",
        fixed: true,
        global: true,
        counties: null,
        launchYear: null,
        types: ["Public"],
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHolidays),
    });

    const result = await getPublicHolidays("AU", 2024);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.name).toBe("New Year's Day");
      expect(result.value[0]?.date).toBe("2024-01-01");
    }
  });

  it("should return an error if the API request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const result = await getPublicHolidays("ZZ", 2024);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Nager.Date API returned status");
    }
  });

  it("should return an error if the response validation fails", async () => {
    const invalidHolidays = [
      {
        date: "not-a-date", // Invalid date format
        name: "New Year's Day",
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(invalidHolidays),
    });

    const result = await getPublicHolidays("AU", 2024);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(
        "Failed to parse Nager.Date API response"
      );
    }
  });
});
