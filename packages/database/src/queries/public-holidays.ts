import type { ClerkOrgId, FeedId, OrganisationId, Result } from "@repo/core";
import { appError, startOfUtcDay } from "@repo/core";
import type {
  public_holiday_day_classification,
  public_holiday_type,
} from "../../generated/enums";
import { database } from "../client";
import { scopedQuery } from "../tenant-query";

export interface PublicHolidayImportInput {
  classification: public_holiday_day_classification;
  countryCode: string;
  feedId: FeedId;
  holidays: Array<{
    counties: string[] | null;
    date: string;
    localName: string;
    name: string;
    types: string[];
  }>;
  regionCode: string | null;
  userId: string;
}

export interface PublicHolidayImportResult {
  assignedCount: number;
  importedCount: number;
  skippedCount: number;
}

export async function importPublicHolidaysForFeed(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  input: PublicHolidayImportInput
): Promise<Result<PublicHolidayImportResult>> {
  try {
    const feed = await database.feed.findFirst({
      select: { id: true },
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        id: input.feedId,
        status: { not: "archived" },
      },
    });

    if (!feed) {
      return {
        error: appError("not_found", "Feed not found"),
        ok: false,
      };
    }

    const existingJurisdiction =
      await database.publicHolidayJurisdiction.findFirst({
        select: { id: true },
        where: {
          ...scopedQuery(clerkOrgId, organisationId),
          country_code: input.countryCode,
          region_code: input.regionCode,
        },
      });

    const jurisdiction = existingJurisdiction
      ? await database.publicHolidayJurisdiction.update({
          data: {
            archived_at: null,
            is_enabled: true,
            updated_by_user_id: input.userId,
          },
          select: { id: true },
          where: { id: existingJurisdiction.id },
        })
      : await database.publicHolidayJurisdiction.create({
          data: {
            clerk_org_id: clerkOrgId,
            country_code: input.countryCode,
            created_by_user_id: input.userId,
            organisation_id: organisationId,
            region_code: input.regionCode,
            source: "nager",
            updated_by_user_id: input.userId,
          },
          select: { id: true },
        });

    let importedCount = 0;
    let assignedCount = 0;
    let skippedCount = 0;

    for (const holiday of input.holidays) {
      const sourceRemoteId = sourceRemoteIdForHoliday(
        input.countryCode,
        input.regionCode,
        holiday
      );
      const existing = await database.publicHoliday.findFirst({
        select: { id: true },
        where: {
          ...scopedQuery(clerkOrgId, organisationId),
          source: "nager",
          source_remote_id: sourceRemoteId,
        },
      });

      const publicHoliday = await database.publicHoliday.upsert({
        create: {
          clerk_org_id: clerkOrgId,
          country_code: input.countryCode,
          created_by_user_id: input.userId,
          default_classification: input.classification,
          holiday_date: startOfUtcDay(holiday.date),
          holiday_type: normaliseHolidayType(holiday.types[0]),
          jurisdiction_id: jurisdiction.id,
          local_name: holiday.localName,
          name: holiday.name,
          organisation_id: organisationId,
          region_code: input.regionCode,
          source: "nager",
          source_payload_json: {
            counties: holiday.counties,
            date: holiday.date,
            localName: holiday.localName,
            name: holiday.name,
            types: holiday.types,
          },
          source_remote_id: sourceRemoteId,
          updated_by_user_id: input.userId,
        },
        select: { id: true },
        update: {
          archived_at: null,
          default_classification: input.classification,
          holiday_type: normaliseHolidayType(holiday.types[0]),
          jurisdiction_id: jurisdiction.id,
          local_name: holiday.localName,
          name: holiday.name,
          source_payload_json: {
            counties: holiday.counties,
            date: holiday.date,
            localName: holiday.localName,
            name: holiday.name,
            types: holiday.types,
          },
          updated_by_user_id: input.userId,
        },
        where: {
          organisation_id_source_source_remote_id: {
            organisation_id: organisationId,
            source: "nager",
            source_remote_id: sourceRemoteId,
          },
        },
      });

      if (existing) {
        skippedCount += 1;
      } else {
        importedCount += 1;
      }

      const assignment = await database.publicHolidayAssignment.upsert({
        create: {
          clerk_org_id: clerkOrgId,
          created_by_user_id: input.userId,
          day_classification: input.classification,
          include_in_feeds: true,
          organisation_id: organisationId,
          public_holiday_id: publicHoliday.id,
          scope_type: "feed",
          scope_value: input.feedId,
          updated_by_user_id: input.userId,
        },
        select: { id: true },
        update: {
          archived_at: null,
          day_classification: input.classification,
          include_in_feeds: true,
          updated_by_user_id: input.userId,
        },
        where: {
          public_holiday_id_scope_type_scope_value: {
            public_holiday_id: publicHoliday.id,
            scope_type: "feed",
            scope_value: input.feedId,
          },
        },
      });

      if (assignment.id) {
        assignedCount += 1;
      }
    }

    return {
      ok: true,
      value: {
        assignedCount,
        importedCount,
        skippedCount,
      },
    };
  } catch {
    return {
      error: appError("internal", "Failed to import public holidays"),
      ok: false,
    };
  }
}

function sourceRemoteIdForHoliday(
  countryCode: string,
  regionCode: string | null,
  holiday: { date: string; name: string }
): string {
  const region = regionCode ?? "national";
  return `${countryCode}:${region}:${holiday.date}:${holiday.name.toLowerCase()}`;
}

function normaliseHolidayType(value: string | undefined): public_holiday_type {
  switch (value?.toLowerCase()) {
    case "bank":
      return "bank";
    case "school":
      return "school";
    case "authorities":
      return "authorities";
    case "optional":
      return "optional";
    case "observance":
      return "observance";
    default:
      return "public";
  }
}
