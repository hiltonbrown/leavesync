import {
  LOCAL_ONLY_TYPES,
  XERO_LEAVE_TYPES,
} from "@repo/availability/src/records/record-type-categories";
import { z } from "zod";

export const dateRangePresets = [
  "this_month",
  "last_month",
  "this_quarter",
  "last_quarter",
  "this_year",
  "last_year",
  "last_12_months",
  "custom",
] as const;

const arrayParam = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => String(item).split(","))
        .filter((item) => item !== "all" && item.length > 0);
    }
    if (typeof value === "string" && value.length > 0) {
      return value
        .split(",")
        .filter((item) => item !== "all" && item.length > 0);
    }
    return;
  }, z.array(schema).optional());

const boolParam = z.preprocess(
  (value) => value === "true" || value === true,
  z.boolean()
);

const optionalDateOnly = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
);

export const AnalyticsBaseFilterSchema = z.object({
  customEnd: optionalDateOnly,
  customStart: optionalDateOnly,
  includeArchivedPeople: boolParam.default(false),
  locationId: arrayParam(z.string().uuid()),
  personId: arrayParam(z.string().uuid()),
  personType: z
    .preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.enum(["all", "contractor", "employee"]).optional()
    )
    .default("all"),
  preset: z
    .preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.enum(dateRangePresets).optional()
    )
    .default("this_quarter"),
  teamId: arrayParam(z.string().uuid()),
});

export const LeaveReportsFilterSchema = AnalyticsBaseFilterSchema.extend({
  drilldownKind: z
    .preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.enum(["person", "record_type", "team"]).optional()
    )
    .optional(),
  drilldownValue: z
    .preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.string().optional()
    )
    .optional(),
  includePublicHolidays: boolParam.default(false),
  leaveType: arrayParam(z.enum(XERO_LEAVE_TYPES)),
});

export const OutOfOfficeFilterSchema = AnalyticsBaseFilterSchema.extend({
  drilldownKind: z
    .preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.enum(["person", "record_type"]).optional()
    )
    .optional(),
  drilldownValue: z
    .preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.string().optional()
    )
    .optional(),
  recordType: arrayParam(z.enum(LOCAL_ONLY_TYPES)),
});

export const ExportLeaveReportsCsvActionSchema =
  LeaveReportsFilterSchema.extend({
    organisationId: z.string().uuid(),
  });

export const ExportOutOfOfficeCsvActionSchema = OutOfOfficeFilterSchema.extend({
  organisationId: z.string().uuid(),
});

export type LeaveReportsFilterInput = z.infer<typeof LeaveReportsFilterSchema>;
export type OutOfOfficeFilterInput = z.infer<typeof OutOfOfficeFilterSchema>;
