"use server";

import { z } from "zod";

const CountrySchema = z.array(
  z.object({
    countryCode: z.string(),
    name: z.string(),
  })
);

export type AvailableCountry = z.infer<typeof CountrySchema>[number];

export const getAvailableCountries = async (): Promise<
  { data: AvailableCountry[] } | { error: string }
> => {
  try {
    const res = await fetch("https://date.nager.at/api/v3/AvailableCountries", {
      next: { revalidate: 86_400 },
    });

    if (!res.ok) {
      return { error: `Failed to fetch countries: ${res.status}` };
    }

    const json = await res.json();
    const parsed = CountrySchema.safeParse(json);

    if (!parsed.success) {
      return { error: "Unexpected response shape from countries API" };
    }

    return { data: parsed.data };
  } catch {
    return { error: "Network error fetching countries" };
  }
};
