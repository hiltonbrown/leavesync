import { z } from "zod";

const currentYear = new Date().getFullYear();

export const PublicHolidayFilterSchema = z.object({
  includeSuppressed: z
    .preprocess((value) => value === "true" || value === true, z.boolean())
    .default(false),
  locationId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).default(currentYear),
});

export type PublicHolidayFilters = z.infer<typeof PublicHolidayFilterSchema>;
