import { appError, type Result } from "@repo/core";
import { z } from "zod";

const NagerHolidaySchema = z.object({
  date: z.string(),
  localName: z.string(),
  name: z.string(),
  countryCode: z.string(),
  fixed: z.boolean(),
  global: z.boolean(),
  counties: z.array(z.string()).nullable().optional(),
  launchYear: z.number().nullable().optional(),
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
          ok: false,
          error: appError(
            "not_found",
            `No holidays found for country ${countryCode} in year ${year}`
          ),
        };
      }
      return {
        ok: false,
        error: appError(
          "internal",
          `Nager.Date API returned status ${response.status}`
        ),
      };
    }

    const data = await response.json();
    const parsed = NagerHolidaysResponseSchema.safeParse(data);

    if (!parsed.success) {
      return {
        ok: false,
        error: appError(
          "bad_request",
          "Failed to parse Nager.Date API response"
        ),
      };
    }

    return {
      ok: true,
      value: parsed.data,
    };
  } catch (_error) {
    return {
      ok: false,
      error: appError("internal", "Network error while calling Nager.Date API"),
    };
  }
}
