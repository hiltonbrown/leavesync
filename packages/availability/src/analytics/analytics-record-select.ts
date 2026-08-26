import type { Prisma } from "@repo/database";

// Explicit projection: source_payload_json and xero_write_error_raw are audit
// data and must never cross the RSC boundary to a client component.
export const analyticsRecordSelect = {
  all_day: true,
  approved_at: true,
  approved_by: {
    select: {
      first_name: true,
      last_name: true,
    },
  },
  ends_at: true,
  id: true,
  person: {
    select: {
      first_name: true,
      id: true,
      last_name: true,
      location: {
        select: {
          country_code: true,
          id: true,
          name: true,
          region_code: true,
        },
      },
      location_id: true,
      team: {
        select: {
          name: true,
        },
      },
    },
  },
  person_id: true,
  record_type: true,
  source_type: true,
  starts_at: true,
  submitted_at: true,
} satisfies Prisma.AvailabilityRecordSelect;
