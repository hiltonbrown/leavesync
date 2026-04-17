import type {
  AvailabilityRecordId,
  ClerkOrgId,
  OrganisationId,
  PersonId,
  Result,
} from "@repo/core";
import { appError } from "@repo/core";

import { database } from "../client";
import { scopedQuery } from "../tenant-query";

export interface AvailabilityRecordData {
  approvalStatus: string;
  clerkOrgId: string;
  contactability: string;
  createdAt: Date;
  derivedUidKey: string;
  endsAt: Date;
  id: AvailabilityRecordId;
  includeInFeed: boolean;
  organisationId: OrganisationId;
  personId: PersonId;
  privacyMode: string;
  publishStatus: string;
  recordType: string;
  sourceRemoteId: string | null;
  sourceType: string;
  startsAt: Date;
  updatedAt: Date;
}

export interface ManualAvailabilityListData extends AvailabilityRecordData {
  allDay: boolean;
  archivedAt: Date | null;
  notesInternal: string | null;
  personFirstName: string;
  personLastName: string;
  title: string | null;
  workingLocation: string | null;
}

interface CalendarFilters {
  approvalStatus?: string;
  personIds?: PersonId[];
  publishStatus?: string;
  recordTypes?: string[];
  sourceTypes?: string[];
}

interface DateRange {
  endDate: Date;
  startDate: Date;
}

export async function listAvailabilityForCalendar(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  dateRange: DateRange,
  filters?: CalendarFilters
): Promise<Result<AvailabilityRecordData[]>> {
  try {
    const whereConditions: Record<string, unknown> = {
      ...scopedQuery(clerkOrgId, organisationId),
      starts_at: {
        lte: dateRange.endDate,
      },
      ends_at: {
        gte: dateRange.startDate,
      },
    };

    if (filters?.recordTypes) {
      whereConditions.record_type = { in: filters.recordTypes };
    }
    if (filters?.sourceTypes) {
      whereConditions.source_type = { in: filters.sourceTypes };
    }
    if (filters?.publishStatus) {
      whereConditions.publish_status = filters.publishStatus;
    }
    if (filters?.approvalStatus) {
      whereConditions.approval_status = filters.approvalStatus;
    }
    if (filters?.personIds && filters.personIds.length > 0) {
      whereConditions.person_id = { in: filters.personIds };
    }

    const records = await database.availabilityRecord.findMany({
      where: whereConditions,
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
  } catch {
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
        starts_at: {
          lte: dateRange.endDate,
        },
        ends_at: {
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
  } catch (_error) {
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
    const whereConditions: Record<string, unknown> = {
      ...scopedQuery(clerkOrgId, organisationId),
      approval_status: "submitted",
    };

    if (filters?.personIds && filters.personIds.length > 0) {
      whereConditions.person_id = { in: filters.personIds };
    }
    if (filters?.recordTypes) {
      whereConditions.record_type = { in: filters.recordTypes };
    }

    const records = await database.availabilityRecord.findMany({
      where: whereConditions,
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
  } catch (_error) {
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

export async function listManualAvailability(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  filters?: {
    personId?: PersonId;
    approvalStatus?: string;
    includeArchived?: boolean;
    dateRange?: { startDate: Date; endDate: Date };
  }
): Promise<Result<ManualAvailabilityListData[]>> {
  try {
    const whereConditions: Record<string, unknown> = {
      ...scopedQuery(clerkOrgId, organisationId),
      source_type: "manual",
    };

    if (filters?.personId) {
      whereConditions.person_id = filters.personId;
    }
    if (filters?.approvalStatus) {
      whereConditions.approval_status = filters.approvalStatus;
    }
    if (!filters?.includeArchived) {
      whereConditions.archived_at = null;
    }
    if (filters?.dateRange) {
      whereConditions.starts_at = { lte: filters.dateRange.endDate };
      whereConditions.ends_at = { gte: filters.dateRange.startDate };
    }

    const records = await database.availabilityRecord.findMany({
      where: whereConditions,
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
        title: true,
        all_day: true,
        notes_internal: true,
        working_location: true,
        archived_at: true,
        person: { select: { first_name: true, last_name: true } },
      },
      orderBy: { starts_at: "asc" },
    });

    return {
      ok: true,
      value: records.map((r) => ({
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
        title: r.title,
        allDay: r.all_day,
        notesInternal: r.notes_internal,
        workingLocation: r.working_location,
        archivedAt: r.archived_at,
        personFirstName: r.person.first_name,
        personLastName: r.person.last_name,
      })),
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to list manual availability"),
    };
  }
}

export async function getAvailabilityRecordById(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  recordId: AvailabilityRecordId
): Promise<Result<ManualAvailabilityListData>> {
  try {
    const record = await database.availabilityRecord.findFirst({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        id: recordId,
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
        title: true,
        all_day: true,
        notes_internal: true,
        working_location: true,
        archived_at: true,
        person: { select: { first_name: true, last_name: true } },
      },
    });

    if (!record) {
      return {
        ok: false,
        error: appError("not_found", "Availability record not found"),
      };
    }

    return {
      ok: true,
      value: {
        id: record.id as AvailabilityRecordId,
        clerkOrgId: record.clerk_org_id,
        organisationId: record.organisation_id as OrganisationId,
        personId: record.person_id as PersonId,
        recordType: record.record_type,
        sourceType: record.source_type,
        sourceRemoteId: record.source_remote_id,
        startsAt: record.starts_at,
        endsAt: record.ends_at,
        approvalStatus: record.approval_status,
        privacyMode: record.privacy_mode,
        contactability: record.contactability,
        includeInFeed: record.include_in_feed,
        publishStatus: record.publish_status,
        derivedUidKey: record.derived_uid_key,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        title: record.title,
        allDay: record.all_day,
        notesInternal: record.notes_internal,
        workingLocation: record.working_location,
        archivedAt: record.archived_at,
        personFirstName: record.person.first_name,
        personLastName: record.person.last_name,
      },
    };
  } catch (_error) {
    return {
      ok: false,
      error: appError("internal", "Failed to get availability record"),
    };
  }
}
