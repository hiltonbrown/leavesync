import "server-only";

import { randomUUID } from "node:crypto";
import {
  appError,
  type ClerkOrgId,
  type OrganisationId,
  type Result,
} from "@repo/core";
import { database, scopedQuery } from "@repo/database";
import { z } from "zod";

const WHITESPACE_PATTERN = /\s+/;

const RecordTypeSchema = z.enum([
  "leave",
  "wfh",
  "travel",
  "training",
  "client_site",
]);

const PrivacyModeSchema = z.enum(["named", "masked", "private"]);
const ContactabilityStatusSchema = z.enum([
  "contactable",
  "limited",
  "unavailable",
]);

export const ManualAvailabilityInputSchema = z
  .object({
    personId: z.string().uuid(),
    recordType: RecordTypeSchema,
    title: z.string().min(1).max(200),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    allDay: z.boolean().default(true),
    workingLocation: z.string().max(200).optional(),
    contactability: ContactabilityStatusSchema.default("contactable"),
    preferredContactMethod: z.string().max(200).optional(),
    notesInternal: z.string().max(2000).optional(),
    includeInFeed: z.boolean().default(true),
    privacyMode: PrivacyModeSchema.default("named"),
  })
  .refine((value) => value.endsAt >= value.startsAt, {
    message: "End date must be after start date",
    path: ["endsAt"],
  });

export type ManualAvailabilityInput = z.infer<
  typeof ManualAvailabilityInputSchema
>;

export interface TenantContext {
  clerkOrgId: ClerkOrgId;
  organisationId: OrganisationId;
}

export interface OrganisationSettingsInput {
  clerkOrgId: string;
  countryCode: string;
  fiscalYearStart?: number;
  locale?: string;
  name: string;
  reportingUnit?: string;
  timezone?: string;
  workingHoursPerDay?: number;
}

export interface CurrentUserPersonInput {
  clerkUserId: string;
  displayName: string;
  email?: string;
  jobTitle?: string;
}

export interface PersonView {
  email: string | null;
  id: string;
  initials: string;
  jobTitle: string | null;
  locationName: string | null;
  name: string;
  teamName: string | null;
}

export interface AvailabilityRecordView {
  allDay: boolean;
  contactability: string;
  endsAt: Date;
  id: string;
  includeInFeed: boolean;
  notesInternal: string | null;
  personEmail: string | null;
  personId: string;
  personName: string;
  privacyMode: string;
  recordType: string;
  startsAt: Date;
  title: string;
  workingLocation: string | null;
}

export const getInitials = (name: string): string => {
  const parts = name
    .trim()
    .split(WHITESPACE_PATTERN)
    .filter((part) => part.length > 0);
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
};

const mapPerson = (person: {
  email: string | null;
  id: string;
  job_title: string | null;
  display_name: string | null;
  first_name?: string;
  last_name?: string;
  location?: { name: string } | null;
  team?: { name: string } | null;
}): PersonView => {
  const fullName =
    person.display_name ??
    `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim();
  return {
    email: person.email,
    id: person.id,
    initials: getInitials(fullName),
    jobTitle: person.job_title,
    locationName: person.location?.name ?? null,
    name: fullName,
    teamName: person.team?.name ?? null,
  };
};

const mapRecord = (record: {
  all_day: boolean;
  contactability: string | null;
  ends_at: Date;
  id: string;
  include_in_feed: boolean;
  notes_internal: string | null;
  person: {
    display_name: string | null;
    email: string | null;
    first_name: string;
    id: string;
    last_name: string;
  };
  privacy_mode: string | null;
  record_type: string;
  starts_at: Date;
  title: string | null;
  working_location: string | null;
}): AvailabilityRecordView => ({
  allDay: record.all_day,
  contactability: record.contactability ?? "contactable",
  endsAt: record.ends_at,
  id: record.id,
  includeInFeed: record.include_in_feed,
  notesInternal: record.notes_internal,
  personEmail: record.person.email,
  personId: record.person.id,
  personName:
    record.person.display_name ??
    `${record.person.first_name} ${record.person.last_name}`,
  privacyMode: record.privacy_mode ?? "named",
  recordType: record.record_type,
  startsAt: record.starts_at,
  title: record.title ?? "",
  workingLocation: record.working_location,
});

export const ensureOrganisationForClerk = async (
  input: OrganisationSettingsInput
): Promise<TenantContext> => {
  const existingOrganisation = await database.organisation.findFirst({
    where: {
      archived_at: null,
      clerk_org_id: input.clerkOrgId,
    },
    orderBy: { created_at: "asc" },
  });

  const organisation = existingOrganisation
    ? await database.organisation.update({
        where: { id: existingOrganisation.id },
        data: {
          country_code: input.countryCode,
          fiscal_year_start: input.fiscalYearStart ?? 7,
          locale: input.locale ?? "en-AU",
          name: input.name,
          reporting_unit: input.reportingUnit ?? "hours",
          timezone: input.timezone ?? "UTC",
          working_hours_per_day: input.workingHoursPerDay ?? 7.6,
        },
      })
    : await database.organisation.create({
        data: {
          clerk_org_id: input.clerkOrgId,
          country_code: input.countryCode,
          fiscal_year_start: input.fiscalYearStart ?? 7,
          locale: input.locale ?? "en-AU",
          name: input.name,
          reporting_unit: input.reportingUnit ?? "hours",
          timezone: input.timezone ?? "UTC",
          working_hours_per_day: input.workingHoursPerDay ?? 7.6,
        },
      });

  return {
    clerkOrgId: input.clerkOrgId as ClerkOrgId,
    organisationId: organisation.id as OrganisationId,
  };
};

export const ensureCurrentUserPerson = async (
  tenant: TenantContext,
  input: CurrentUserPersonInput
): Promise<PersonView> => {
  const person = await database.person.upsert({
    where: {
      organisation_id_clerk_user_id: {
        clerk_user_id: input.clerkUserId,
        organisation_id: tenant.organisationId,
      },
    },
    create: {
      clerk_org_id: tenant.clerkOrgId,
      clerk_user_id: input.clerkUserId,
      display_name: input.displayName,
      email: input.email ?? `${input.clerkUserId}@internal`,
      employment_type: "employee",
      first_name: input.displayName.split(" ")[0] ?? "User",
      job_title: input.jobTitle,
      last_name: input.displayName.split(" ")[1] ?? input.clerkUserId,
      organisation_id: tenant.organisationId,
      source_system: "MANUAL",
    },
    update: {
      display_name: input.displayName,
      email: input.email,
      job_title: input.jobTitle,
    },
    include: { location: true, team: true },
  });

  return mapPerson(person);
};

export const listPersonViews = async (
  tenant: TenantContext
): Promise<PersonView[]> => {
  const people = await database.person.findMany({
    where: {
      ...scopedQuery(tenant.clerkOrgId, tenant.organisationId),
      archived_at: null,
    },
    include: { location: true, team: true },
    orderBy: [{ display_name: "asc" }, { first_name: "asc" }],
  });

  return people.map(mapPerson);
};

export const listAvailabilityRecords = async (
  tenant: TenantContext,
  range?: { startsBefore?: Date; endsAfter?: Date; personId?: string }
): Promise<AvailabilityRecordView[]> => {
  const records = await database.availabilityRecord.findMany({
    where: {
      ...scopedQuery(tenant.clerkOrgId, tenant.organisationId),
      archived_at: null,
      ...(range?.personId ? { person_id: range.personId } : {}),
      ...(range?.startsBefore
        ? { starts_at: { lte: range.startsBefore } }
        : {}),
      ...(range?.endsAfter ? { ends_at: { gte: range.endsAfter } } : {}),
    },
    include: { person: true },
    orderBy: [{ starts_at: "asc" }, { title: "asc" }],
  });

  return records.map(mapRecord);
};

export const createManualAvailability = async (
  tenant: TenantContext,
  input: unknown,
  userId: string
): Promise<Result<AvailabilityRecordView>> => {
  const parsed = ManualAvailabilityInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError(
        "bad_request",
        parsed.error.issues[0]?.message ?? "Invalid availability record"
      ),
    };
  }

  const person = await database.person.findFirst({
    where: {
      ...scopedQuery(tenant.clerkOrgId, tenant.organisationId),
      archived_at: null,
      id: parsed.data.personId,
    },
  });

  if (!person) {
    return { ok: false, error: appError("not_found", "Person not found") };
  }

  const id = randomUUID();
  const record = await database.availabilityRecord.create({
    data: {
      id,
      person_id: parsed.data.personId,
      record_type: parsed.data.recordType,
      title: parsed.data.title,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      all_day: parsed.data.allDay,
      working_location: parsed.data.workingLocation,
      contactability: parsed.data.contactability,
      preferred_contact_method: parsed.data.preferredContactMethod,
      notes_internal: parsed.data.notesInternal,
      include_in_feed: parsed.data.includeInFeed,
      privacy_mode: parsed.data.privacyMode,
      approval_status: "approved",
      approved_at: new Date(),
      clerk_org_id: tenant.clerkOrgId,
      created_by_user_id: userId,
      derived_uid_key: `leavesync:manual:${tenant.organisationId}:${id}`,
      organisation_id: tenant.organisationId,
      source_type: "manual",
      updated_by_user_id: userId,
    },
    include: { person: true },
  });

  return { ok: true, value: mapRecord(record) };
};

export const updateManualAvailability = async (
  tenant: TenantContext,
  recordId: string,
  input: unknown,
  userId: string
): Promise<Result<AvailabilityRecordView>> => {
  const parsed = ManualAvailabilityInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError(
        "bad_request",
        parsed.error.issues[0]?.message ?? "Invalid availability record"
      ),
    };
  }

  const existing = await database.availabilityRecord.findFirst({
    where: {
      ...scopedQuery(tenant.clerkOrgId, tenant.organisationId),
      archived_at: null,
      id: recordId,
      source_type: "manual",
    },
  });

  if (!existing) {
    return { ok: false, error: appError("not_found", "Record not found") };
  }

  const record = await database.availabilityRecord.update({
    where: { id: recordId },
    data: {
      record_type: parsed.data.recordType,
      title: parsed.data.title,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      all_day: parsed.data.allDay,
      working_location: parsed.data.workingLocation,
      contactability: parsed.data.contactability,
      preferred_contact_method: parsed.data.preferredContactMethod,
      notes_internal: parsed.data.notesInternal,
      include_in_feed: parsed.data.includeInFeed,
      privacy_mode: parsed.data.privacyMode,
      updated_by_user_id: userId,
    },
    include: { person: true },
  });

  return { ok: true, value: mapRecord(record) };
};

export const updateAvailabilityApprovalStatus = async (
  tenant: TenantContext,
  recordId: string,
  approvalStatus: "approved" | "declined",
  userId: string
): Promise<Result<void>> => {
  const existing = await database.availabilityRecord.findFirst({
    where: {
      ...scopedQuery(tenant.clerkOrgId, tenant.organisationId),
      archived_at: null,
      approval_status: "submitted",
      id: recordId,
    },
  });

  if (!existing) {
    return {
      ok: false,
      error: appError("not_found", "Pending availability record not found"),
    };
  }

  await database.availabilityRecord.update({
    where: { id: recordId },
    data: {
      approval_status: approvalStatus,
      approved_at: approvalStatus === "approved" ? new Date() : null,
      publish_status:
        approvalStatus === "approved" ? existing.publish_status : "suppressed",
      updated_by_user_id: userId,
    },
  });

  return { ok: true, value: undefined };
};

export const archiveManualAvailability = async (
  tenant: TenantContext,
  recordId: string,
  userId: string
): Promise<Result<void>> => {
  const existing = await database.availabilityRecord.findFirst({
    where: {
      ...scopedQuery(tenant.clerkOrgId, tenant.organisationId),
      archived_at: null,
      id: recordId,
      source_type: "manual",
    },
  });

  if (!existing) {
    return { ok: false, error: appError("not_found", "Record not found") };
  }

  await database.availabilityRecord.update({
    where: { id: recordId },
    data: {
      archived_at: new Date(),
      publish_status: "archived",
      updated_by_user_id: userId,
    },
  });

  return { ok: true, value: undefined };
};

export * from "./src/approvals/approval-service";
export * from "./src/calendar/calendar-service";
export * from "./src/duration/working-days";
export * from "./src/holidays/holiday-service";
export * from "./src/holidays/nager-client";
export * from "./src/people/alternative-contact-service";
export * from "./src/people/balance-refresh";
export * from "./src/people/current-status";
export * from "./src/people/field-ownership";
export * from "./src/people/people-service";
export * from "./src/plans/plan-service";
export * from "./src/plans/submit-service";
export * from "./src/records/record-type-categories";
export * from "./src/xero-connection-state";
