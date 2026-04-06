"use server";

import { z } from "zod";

const HolidayTypeSchema = z.enum([
  "Public",
  "Bank",
  "School",
  "Authorities",
  "Optional",
  "Observance",
]);

const NagerHolidaySchema = z.array(
  z.object({
    date: z.string(),
    localName: z.string(),
    name: z.string(),
    countryCode: z.string(),
    global: z.boolean(),
    counties: z.array(z.string()).nullable(),
    fixed: z.boolean(),
    launchYear: z.number().nullable(),
    types: z.array(HolidayTypeSchema),
  })
);

export type NagerHoliday = z.infer<typeof NagerHolidaySchema>[number];
export type HolidayType = z.infer<typeof HolidayTypeSchema>;

export const getPublicHolidays = async (
  year: number,
  countryCode: string
): Promise<{ data: NagerHoliday[] } | { error: string }> => {
  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      { next: { revalidate: 43_200 } }
    );

    if (res.status === 404) {
      return { error: `No holiday data found for ${countryCode} in ${year}` };
    }

    if (!res.ok) {
      return { error: `Failed to fetch holidays: ${res.status}` };
    }

    const json = await res.json();
    const parsed = NagerHolidaySchema.safeParse(json);

    if (!parsed.success) {
      return { error: "Unexpected response shape from holidays API" };
    }

    return { data: parsed.data };
  } catch {
    return { error: "Network error fetching holidays" };
  }
};
