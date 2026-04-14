import type {
  AvailabilityRecordId,
  ClerkOrgId,
  OrganisationId,
  PersonId,
  Result,
} from "../../../core/index";
import { appError } from "../../../core/index";
import { database } from "../client";
import { scopedQuery } from "../tenant-query";

export interface AvailabilityRecordData {
  id: AvailabilityRecordId;
  clerkOrgId: string;
  organisationId: OrganisationId;
  personId: PersonId;
  recordType: string;
  sourceType: string;
  sourceRemoteId: string | null;
  startsAt: Date;
  endsAt: Date;
  approvalStatus: string;
  privacyMode: string;
  contactability: string;
  includeInFeed: boolean;
  publishStatus: string;
  derivedUidKey: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CalendarFilters {
  recordTypes?: string[];
  sourceTypes?: string[];
  publishStatus?: string;
  approvalStatus?: string;
  personIds?: PersonId[];
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export async function listAvailabilityForCalendar(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  dateRange: DateRange,
  filters?: CalendarFilters
): Promise<Result<AvailabilityRecordData[]>> {
  try {
    const records = await database.availabilityRecord.findMany({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        startsAt: {
          lte: dateRange.endDate,
        },
        endsAt: {
          gte: dateRange.startDate,
        },
        ...(filters?.recordTypes && {
          record_type: { in: filters.recordTypes },
        }),
        ...(filters?.sourceTypes && {
          source_type: { in: filters.sourceTypes },
        }),
        ...(filters?.publishStatus && {
          publish_status: filters.publishStatus,
        }),
        ...(filters?.approvalStatus && {
          approval_status: filters.approvalStatus,
        }),
        ...(filters?.personIds &&
          filters.personIds.length > 0 && {
            person_id: { in: filters.personIds },
          }),
      },
      select: {
        id: true,
        clerk_org_id: true,
        organisation_id: true,
        person_id: true,
        record_type: true,
        source_type: true,
        source_remote_id: true,
        starts_at: true,
        ends_at: true,
        approval_status: true,
        privacy_mode: true,
        contactability: true,
        include_in_feed: true,
        publish_status: true,
        derived_uid_key: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: [{ starts_at: "asc" }, { person_id: "asc" }],
    });

    return {
      ok: true,
      value: records.map(toAvailabilityRecord),
    };
  } catch (error) {
    return {
      ok: false,
      error: appError("internal", "Failed to list calendar availability"),
    };
  }
}

export async function listAvailabilityForPerson(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  personId: PersonId,
  dateRange: DateRange
): Promise<Result<AvailabilityRecordData[]>> {
  try {
    const records = await database.availabilityRecord.findMany({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        person_id: personId,
        startsAt: {
          lte: dateRange.endDate,
        },
        endsAt: {
          gte: dateRange.startDate,
        },
      },
      select: {
        id: true,
        clerk_org_id: true,
        organisation_id: true,
        person_id: true,
        record_type: true,
        source_type: true,
        source_remote_id: true,
        starts_at: true,
        ends_at: true,
        approval_status: true,
        privacy_mode: true,
        contactability: true,
        include_in_feed: true,
        publish_status: true,
        derived_uid_key: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { starts_at: "asc" },
    });

    return {
      ok: true,
      value: records.map(toAvailabilityRecord),
    };
  } catch (error) {
    return {
      ok: false,
      error: appError("internal", "Failed to list person availability"),
    };
  }
}

export async function listPendingApprovalRecords(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  filters?: {
    personIds?: PersonId[];
    recordTypes?: string[];
  }
): Promise<Result<AvailabilityRecordData[]>> {
  try {
    const records = await database.availabilityRecord.findMany({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        approval_status: "submitted",
        ...(filters?.personIds &&
          filters.personIds.length > 0 && {
            person_id: { in: filters.personIds },
          }),
        ...(filters?.recordTypes && {
          record_type: { in: filters.recordTypes },
        }),
      },
      select: {
        id: true,
        clerk_org_id: true,
        organisation_id: true,
        person_id: true,
        record_type: true,
        source_type: true,
        source_remote_id: true,
        starts_at: true,
        ends_at: true,
        approval_status: true,
        privacy_mode: true,
        contactability: true,
        include_in_feed: true,
        publish_status: true,
        derived_uid_key: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "asc" },
    });

    return {
      ok: true,
      value: records.map(toAvailabilityRecord),
    };
  } catch (error) {
    return {
      ok: false,
      error: appError("internal", "Failed to list pending approval records"),
    };
  }
}

function toAvailabilityRecord(r: {
  id: string;
  clerk_org_id: string;
  organisation_id: string;
  person_id: string;
  record_type: string;
  source_type: string;
  source_remote_id: string | null;
  starts_at: Date;
  ends_at: Date;
  approval_status: string;
  privacy_mode: string;
  contactability: string;
  include_in_feed: boolean;
  publish_status: string;
  derived_uid_key: string;
  created_at: Date;
  updated_at: Date;
}): AvailabilityRecordData {
  return {
    id: r.id as AvailabilityRecordId,
    clerkOrgId: r.clerk_org_id,
    organisationId: r.organisation_id as OrganisationId,
    personId: r.person_id as PersonId,
    recordType: r.record_type,
    sourceType: r.source_type,
    sourceRemoteId: r.source_remote_id,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    approvalStatus: r.approval_status,
    privacyMode: r.privacy_mode,
    contactability: r.contactability,
    includeInFeed: r.include_in_feed,
    publishStatus: r.publish_status,
    derivedUidKey: r.derived_uid_key,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
