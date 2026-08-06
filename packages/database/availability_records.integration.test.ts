// biome-ignore-all lint/style/useFilenamingConvention: The requested test file is availability_records.integration.test.ts.
import { config } from "dotenv";
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

config({ path: new URL("./.env", import.meta.url).pathname });
vi.mock("server-only", () => ({}));

const {
  availability_approval_status,
  availability_contactability,
  availability_privacy_mode,
  availability_publish_status,
  availability_record_type,
  availability_source_type,
  database,
  employment_type,
  source_system,
} = await import("./index.js");

const tenantA = {
  clerkOrgId: "org_test_availability_a",
  locationId: "10000000-0000-4000-8000-000000000003",
  organisationId: "10000000-0000-4000-8000-000000000001",
  personId: "10000000-0000-4000-8000-000000000004",
  teamId: "10000000-0000-4000-8000-000000000002",
} as const;

const tenantB = {
  clerkOrgId: "org_test_availability_b",
  locationId: "20000000-0000-4000-8000-000000000003",
  organisationId: "20000000-0000-4000-8000-000000000001",
  personId: "20000000-0000-4000-8000-000000000004",
  teamId: "20000000-0000-4000-8000-000000000002",
} as const;

const testClerkOrgIds = [tenantA.clerkOrgId, tenantB.clerkOrgId] as const;

interface Tenant {
  clerkOrgId: string;
  locationId: string;
  organisationId: string;
  personId: string;
  teamId: string;
}

const availabilityRecordIds = {
  manualDuplicate: "30000000-0000-4000-8000-000000000006",
  manualOriginal: "30000000-0000-4000-8000-000000000005",
  otherTenant: "30000000-0000-4000-8000-000000000002",
  scoped: "30000000-0000-4000-8000-000000000001",
  xeroDuplicate: "30000000-0000-4000-8000-000000000004",
  xeroOriginal: "30000000-0000-4000-8000-000000000003",
} as const;

const createTenant = async (tenant: Tenant) => {
  await database.organisation.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      country_code: "AU",
      id: tenant.organisationId,
      name: `Test ${tenant.clerkOrgId}`,
    },
  });

  await database.team.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      id: tenant.teamId,
      name: "Operations",
      organisation_id: tenant.organisationId,
    },
  });

  await database.location.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      id: tenant.locationId,
      name: "Brisbane",
      organisation_id: tenant.organisationId,
      region_code: "QLD",
    },
  });

  await database.person.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      email: `${tenant.clerkOrgId}@example.com`,
      employment_type: employment_type.employee,
      first_name: "Test",
      id: tenant.personId,
      is_active: true,
      last_name: "Person",
      location_id: tenant.locationId,
      organisation_id: tenant.organisationId,
      source_person_key: null,
      source_system: source_system.MANUAL,
      team_id: tenant.teamId,
    },
  });
};

const createAvailabilityRecord = async ({
  id,
  tenant,
  sourceRemoteId = null,
  sourceType = availability_source_type.manual,
}: {
  id: string;
  tenant: Tenant;
  sourceRemoteId?: null | string;
  sourceType?:
    | typeof availability_source_type.manual
    | typeof availability_source_type.xero;
}) =>
  database.availabilityRecord.create({
    data: {
      approval_status: availability_approval_status.approved,
      clerk_org_id: tenant.clerkOrgId,
      contactability: availability_contactability.contactable,
      derived_uid_key: `test:${id}`,
      ends_at: new Date("2026-05-02T00:00:00.000Z"),
      id,
      include_in_feed: true,
      organisation_id: tenant.organisationId,
      person_id: tenant.personId,
      privacy_mode: availability_privacy_mode.named,
      publish_status: availability_publish_status.eligible,
      record_type: availability_record_type.leave,
      source_remote_id: sourceRemoteId,
      source_type: sourceType,
      starts_at: new Date("2026-05-01T00:00:00.000Z"),
    },
  });

const cleanTestData = async () => {
  const scope = { clerk_org_id: { in: [...testClerkOrgIds] } };
  await database.failedRecord.deleteMany({ where: scope });
  await database.availabilityPublication.deleteMany({ where: scope });
  await database.auditEvent.deleteMany({ where: scope });
  await database.availabilityRecord.deleteMany({ where: scope });
  await database.leaveBalance.deleteMany({ where: scope });
  await database.alternativeContact.deleteMany({ where: scope });
  await database.notification.deleteMany({ where: scope });
  await database.notificationPreference.deleteMany({ where: scope });
  await database.xeroSyncCursor.deleteMany({ where: scope });
  await database.syncRun.deleteMany({ where: scope });
  await database.xeroTenant.deleteMany({ where: scope });
  await database.xeroConnection.deleteMany({ where: scope });
  await database.publicHolidayAssignment.deleteMany({ where: scope });
  await database.publicHoliday.deleteMany({ where: scope });
  await database.publicHolidayJurisdiction.deleteMany({ where: scope });
  await database.feedToken.deleteMany({ where: scope });
  await database.feedScope.deleteMany({ where: scope });
  await database.feed.deleteMany({ where: scope });
  await database.person.deleteMany({ where: scope });
  await database.location.deleteMany({ where: scope });
  await database.team.deleteMany({ where: scope });
  await database.organisation.deleteMany({ where: scope });
};

const expectPrismaErrorCode = async (
  operation: Promise<unknown>,
  code: string
) => {
  let error: unknown;

  try {
    await operation;
  } catch (caught) {
    error = caught;
  }

  expect(error).toMatchObject({ code });
};

beforeEach(async () => {
  await cleanTestData();
});

afterAll(async () => {
  await cleanTestData();
  await database.$disconnect();
});

describe("availability_records", () => {
  test("has expected foreign keys and indexes", async () => {
    const indexes = await database.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname::text AS indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'availability_records'
    `;
    const indexNames = indexes.map(({ indexname }) => indexname);

    expect(indexNames).toEqual(
      expect.arrayContaining([
        "availability_records_clerk_org_id_idx",
        "availability_records_organisation_id_idx",
        "availability_records_person_id_starts_at_ends_at_idx",
        "availability_records_source_type_source_remote_id_idx",
        "availability_records_organisation_id_publish_status_include_idx",
        "availability_records_source_identity_key",
        "availability_records_source_type_source_last_modified_at_idx",
      ])
    );

    const foreignKeys = await database.$queryRaw<
      Array<{ constraint_name: string }>
    >`
      SELECT constraint_name::text AS constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'availability_records'
        AND constraint_type = 'FOREIGN KEY'
    `;
    const foreignKeyNames = foreignKeys.map(
      ({ constraint_name }) => constraint_name
    );

    expect(foreignKeyNames).toEqual(
      expect.arrayContaining([
        "availability_records_organisation_id_fkey",
        "availability_records_person_id_fkey",
      ])
    );
  });

  test("inserts scoped records", async () => {
    await createTenant(tenantA);

    const record = await createAvailabilityRecord({
      id: availabilityRecordIds.scoped,
      tenant: tenantA,
    });

    expect(record).toMatchObject({
      clerk_org_id: tenantA.clerkOrgId,
      id: availabilityRecordIds.scoped,
      organisation_id: tenantA.organisationId,
      person_id: tenantA.personId,
      source_type: availability_source_type.manual,
    });
  });

  test("rejects cross-org queries when tenant scope is applied", async () => {
    await createTenant(tenantA);
    await createTenant(tenantB);
    await createAvailabilityRecord({
      id: availabilityRecordIds.otherTenant,
      tenant: tenantB,
    });

    const crossOrgRecord = await database.availabilityRecord.findFirst({
      where: {
        clerk_org_id: tenantA.clerkOrgId,
        id: availabilityRecordIds.otherTenant,
        organisation_id: tenantA.organisationId,
      },
    });
    const correctlyScopedRecord = await database.availabilityRecord.findFirst({
      where: {
        clerk_org_id: tenantB.clerkOrgId,
        id: availabilityRecordIds.otherTenant,
        organisation_id: tenantB.organisationId,
      },
    });

    expect(crossOrgRecord).toBeNull();
    expect(correctlyScopedRecord).toMatchObject({
      clerk_org_id: tenantB.clerkOrgId,
      id: availabilityRecordIds.otherTenant,
      organisation_id: tenantB.organisationId,
    });
  });

  test("validates uniqueness constraints", async () => {
    await createTenant(tenantA);
    await createAvailabilityRecord({
      id: availabilityRecordIds.xeroOriginal,
      sourceRemoteId: "xero-leave-1",
      sourceType: availability_source_type.xero,
      tenant: tenantA,
    });

    await expectPrismaErrorCode(
      createAvailabilityRecord({
        id: availabilityRecordIds.xeroDuplicate,
        sourceRemoteId: "xero-leave-1",
        sourceType: availability_source_type.xero,
        tenant: tenantA,
      }),
      "P2002"
    );

    await createAvailabilityRecord({
      id: availabilityRecordIds.manualOriginal,
      tenant: tenantA,
    });
    await expectPrismaErrorCode(
      createAvailabilityRecord({
        id: availabilityRecordIds.manualDuplicate,
        tenant: tenantA,
      }),
      "P2002"
    );
  });

  test("enforces foreign keys", async () => {
    await createTenant(tenantA);

    await expectPrismaErrorCode(
      database.availabilityRecord.create({
        data: {
          approval_status: availability_approval_status.approved,
          clerk_org_id: tenantA.clerkOrgId,
          contactability: availability_contactability.contactable,
          derived_uid_key: "test:missing-person",
          ends_at: new Date("2026-05-02T00:00:00.000Z"),
          id: availabilityRecordIds.scoped,
          include_in_feed: true,
          organisation_id: tenantA.organisationId,
          person_id: tenantB.personId,
          privacy_mode: availability_privacy_mode.named,
          publish_status: availability_publish_status.eligible,
          record_type: availability_record_type.leave,
          source_remote_id: null,
          source_type: availability_source_type.manual,
          starts_at: new Date("2026-05-01T00:00:00.000Z"),
        },
      }),
      "P2003"
    );
  });
});
