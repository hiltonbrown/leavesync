import "server-only";

import {
  type ClerkOrgId,
  type OrganisationId,
  startOfUtcDay,
} from "@repo/core";
import { database, scopedQuery } from "@repo/database";
import type {
  availability_approval_status,
  availability_contactability,
  availability_record_type,
  availability_source_type,
  public_holiday_source,
  public_holiday_type,
} from "@repo/database/generated/enums";
import {
  isXeroLeaveType,
  type RecordType,
} from "../records/record-type-categories";

export type CurrentStatusKey =
  | "alternative_contact"
  | "another_office"
  | "available"
  | "client_site"
  | "limited_availability"
  | "offsite_meeting"
  | "on_leave"
  | "other"
  | "pending_leave"
  | "public_holiday"
  | "training"
  | "travelling"
  | "wfh";

export interface CurrentStatusRecord {
  approvalStatus: availability_approval_status;
  archivedAt: Date | null;
  contactabilityStatus: availability_contactability;
  endsAt: Date;
  id: string;
  recordType: availability_record_type;
  sourceType: availability_source_type;
  startsAt: Date;
  title: string | null;
}

export interface CurrentStatusPublicHoliday {
  date: Date;
  id: string;
  name: string;
  source: public_holiday_source;
  type: public_holiday_type;
}

export interface CurrentStatus {
  activePublicHoliday: CurrentStatusPublicHoliday | null;
  activeRecord: CurrentStatusRecord | null;
  approvalStatus: availability_approval_status | null;
  contactabilityStatus: availability_contactability | null;
  label: string;
  recordType: availability_record_type | null;
  statusKey: CurrentStatusKey;
}

const LOCAL_PRIORITY: Array<{
  label: string;
  recordTypes: availability_record_type[];
  statusKey: CurrentStatusKey;
}> = [
  {
    label: "Travelling",
    recordTypes: ["travelling"],
    statusKey: "travelling",
  },
  {
    label: "At client site",
    recordTypes: ["client_site"],
    statusKey: "client_site",
  },
  {
    label: "At another office",
    recordTypes: ["another_office"],
    statusKey: "another_office",
  },
  {
    label: "In training",
    recordTypes: ["training"],
    statusKey: "training",
  },
  {
    label: "Offsite meeting",
    recordTypes: ["offsite_meeting"],
    statusKey: "offsite_meeting",
  },
  {
    label: "Working from home",
    recordTypes: ["wfh"],
    statusKey: "wfh",
  },
  {
    label: "Limited availability",
    recordTypes: ["contractor_unavailable", "limited_availability"],
    statusKey: "limited_availability",
  },
  {
    label: "Use alternative contact",
    recordTypes: ["alternative_contact"],
    statusKey: "alternative_contact",
  },
  {
    label: "Unavailable",
    recordTypes: ["other"],
    statusKey: "other",
  },
];

export async function computeCurrentStatus(input: {
  at: Date;
  clerkOrgId: string;
  locationId: string | null;
  organisationId: string;
  personId: string;
}): Promise<CurrentStatus> {
  const clerkOrgId = input.clerkOrgId as ClerkOrgId;
  const organisationId = input.organisationId as OrganisationId;
  const [location, organisation, activeRecords] = await Promise.all([
    input.locationId
      ? database.location.findFirst({
          where: {
            ...scopedQuery(clerkOrgId, organisationId),
            id: input.locationId,
          },
          select: {
            country_code: true,
            region_code: true,
            timezone: true,
          },
        })
      : Promise.resolve(null),
    database.organisation.findFirst({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
      },
      select: {
        country_code: true,
        timezone: true,
      },
    }),
    database.availabilityRecord.findMany({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        archived_at: null,
        approval_status: { in: ["approved", "submitted"] },
        ends_at: { gte: input.at },
        person_id: input.personId,
        starts_at: { lte: input.at },
      },
      select: {
        approval_status: true,
        archived_at: true,
        contactability: true,
        ends_at: true,
        id: true,
        record_type: true,
        source_type: true,
        starts_at: true,
        title: true,
      },
    }),
  ]);

  const mappedRecords = activeRecords.map(toStatusRecord);
  const approvedLeave = mappedRecords.find(
    (record) =>
      record.approvalStatus === "approved" &&
      isXeroLeaveType(record.recordType as RecordType)
  );
  if (approvedLeave) {
    return statusFromRecord(
      "on_leave",
      `On ${leaveTypeLabel(approvedLeave.recordType)}`,
      approvedLeave
    );
  }

  const pendingLeave = mappedRecords.find(
    (record) =>
      record.approvalStatus === "submitted" &&
      isXeroLeaveType(record.recordType as RecordType)
  );
  if (pendingLeave) {
    return statusFromRecord(
      "pending_leave",
      "Leave pending approval",
      pendingLeave
    );
  }

  const timezone = location?.timezone ?? organisation?.timezone ?? "UTC";
  const localDate = dateOnlyInTimeZone(input.at, timezone);
  const holiday = await findPublicHoliday({
    clerkOrgId,
    countryCode: location?.country_code ?? organisation?.country_code ?? null,
    localDate,
    organisationId,
    regionCode: location?.region_code ?? null,
  });
  if (holiday) {
    return {
      activePublicHoliday: {
        date: holiday.holiday_date,
        id: holiday.id,
        name: holiday.name,
        source: holiday.source,
        type: holiday.holiday_type,
      },
      activeRecord: null,
      approvalStatus: null,
      contactabilityStatus: null,
      label: "Public holiday",
      recordType: null,
      statusKey: "public_holiday",
    };
  }

  for (const rung of LOCAL_PRIORITY) {
    const match = mappedRecords.find((record) =>
      rung.recordTypes.includes(record.recordType)
    );
    if (match) {
      return statusFromRecord(rung.statusKey, rung.label, match);
    }
  }

  return {
    activePublicHoliday: null,
    activeRecord: null,
    approvalStatus: null,
    contactabilityStatus: null,
    label: "Available",
    recordType: null,
    statusKey: "available",
  };
}

function toStatusRecord(record: {
  approval_status: availability_approval_status;
  archived_at: Date | null;
  contactability: availability_contactability;
  ends_at: Date;
  id: string;
  record_type: availability_record_type;
  source_type: availability_source_type;
  starts_at: Date;
  title: string | null;
}): CurrentStatusRecord {
  return {
    approvalStatus: record.approval_status,
    archivedAt: record.archived_at,
    contactabilityStatus: record.contactability,
    endsAt: record.ends_at,
    id: record.id,
    recordType: record.record_type,
    sourceType: record.source_type,
    startsAt: record.starts_at,
    title: record.title,
  };
}

function statusFromRecord(
  statusKey: CurrentStatusKey,
  label: string,
  record: CurrentStatusRecord
): CurrentStatus {
  return {
    activePublicHoliday: null,
    activeRecord: record,
    approvalStatus: record.approvalStatus,
    contactabilityStatus: record.contactabilityStatus,
    label,
    recordType: record.recordType,
    statusKey,
  };
}

function findPublicHoliday(input: {
  clerkOrgId: ClerkOrgId;
  countryCode: string | null;
  localDate: string;
  organisationId: OrganisationId;
  regionCode: string | null;
}) {
  if (!input.countryCode) {
    return null;
  }
  const holidayStart = startOfUtcDay(input.localDate);
  const holidayEnd = new Date(holidayStart);
  holidayEnd.setUTCDate(holidayEnd.getUTCDate() + 1);

  return database.publicHoliday.findFirst({
    where: {
      ...scopedQuery(input.clerkOrgId, input.organisationId),
      archived_at: null,
      country_code: input.countryCode,
      holiday_date: {
        gte: holidayStart,
        lt: holidayEnd,
      },
      OR: [{ region_code: null }, { region_code: input.regionCode }],
    },
    orderBy: [{ region_code: "desc" }, { name: "asc" }],
    select: {
      holiday_date: true,
      holiday_type: true,
      id: true,
      name: true,
      source: true,
    },
  });
}

export function dateOnlyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const partValue = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${partValue("year")}-${partValue("month")}-${partValue("day")}`;
}

function leaveTypeLabel(recordType: availability_record_type): string {
  const labels: Partial<Record<availability_record_type, string>> = {
    annual_leave: "annual leave",
    holiday: "holiday",
    long_service_leave: "long service leave",
    personal_leave: "personal leave",
    sick_leave: "sick leave",
    unpaid_leave: "unpaid leave",
  };
  return labels[recordType] ?? "leave";
}
