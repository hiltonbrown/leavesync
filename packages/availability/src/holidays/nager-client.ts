import { appError, type Result } from "@repo/core";
import { z } from "zod";

const NagerHolidaySchema = z.object({
  counties: z.array(z.string()).nullable().optional(),
  countryCode: z.string(),
  date: z.string(),
  fixed: z.boolean(),
  global: z.boolean(),
  launchYear: z.number().nullable().optional(),
  localName: z.string(),
  name: z.string(),
  types: z.array(z.string()),
});

export type NagerHoliday = z.infer<typeof NagerHolidaySchema>;

const NagerHolidaysResponseSchema = z.array(NagerHolidaySchema);

export async function getPublicHolidays(
  countryCode: string,
  year: number
): Promise<Result<NagerHoliday[]>> {
  try {
    const response = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          error: appError(
            "not_found",
            `No holidays found for country ${countryCode} in year ${year}`
          ),
          ok: false,
        };
      }
      return {
        error: appError(
          "internal",
          `Nager.Date API returned status ${response.status}`
        ),
        ok: false,
      };
    }

    const data = await response.json();
    const parsed = NagerHolidaysResponseSchema.safeParse(data);

    if (!parsed.success) {
      return {
        error: appError(
          "bad_request",
          "Failed to parse Nager.Date API response"
        ),
        ok: false,
      };
    }

    return {
      ok: true,
      value: parsed.data,
    };
  } catch {
    return {
      error: appError("internal", "Network error while calling Nager.Date API"),
      ok: false,
    };
  }
}
