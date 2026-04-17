import type { ClerkOrgId, OrganisationId } from "@repo/core";
import { config } from "dotenv";
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { TenantContext } from "./index";

config({ path: new URL("../database/.env", import.meta.url).pathname });
vi.mock("server-only", () => ({}));

const {
  archiveManualAvailability,
  createManualAvailability,
  listAvailabilityRecords,
  updateManualAvailability,
} = await import("./index");
const { database } = await import("@repo/database");

interface TenantFixture {
  clerkOrgId: string;
  organisationId: string;
  personId: string;
}

const tenantA: TenantFixture = {
  clerkOrgId: "org_test_manual_availability_a",
  organisationId: "41000000-0000-4000-8000-000000000001",
  personId: "41000000-0000-4000-8000-000000000002",
};

const tenantB: TenantFixture = {
  clerkOrgId: "org_test_manual_availability_b",
  organisationId: "42000000-0000-4000-8000-000000000001",
  personId: "42000000-0000-4000-8000-000000000002",
};

const testClerkOrgIds = [tenantA.clerkOrgId, tenantB.clerkOrgId];

const inputFor = (tenant: TenantFixture) => ({
  allDay: true,
  contactability: "limited",
  endsAt: new Date("2026-05-12T00:00:00.000Z"),
  includeInFeed: true,
  notesInternal: "Manual entry fixture",
  personId: tenant.personId,
  privacyMode: "named",
  recordType: "wfh",
  startsAt: new Date("2026-05-10T00:00:00.000Z"),
  title: "Working from home",
  workingLocation: "Brisbane",
});

const createTenant = async (tenant: TenantFixture) => {
  await database.organisation.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      country_code: "AU",
      id: tenant.organisationId,
      name: `Manual availability ${tenant.clerkOrgId}`,
    },
  });

  await database.person.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      email: `${tenant.clerkOrgId}@example.com`,
      employment_type: "employee",
      first_name: "Manual",
      id: tenant.personId,
      is_active: true,
      last_name: "Person",
      organisation_id: tenant.organisationId,
      source_person_key: null,
      source_system: "MANUAL",
    },
  });
};

const cleanTestData = async () => {
  await database.availabilityPublication.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds } },
  });
  await database.availabilityRecord.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds } },
  });
  await database.person.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds } },
  });
  await database.organisation.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds } },
  });
};

const contextFor = (tenant: TenantFixture): TenantContext => ({
  // Test fixture IDs are fixed strings that match the branded runtime shape.
  clerkOrgId: tenant.clerkOrgId as ClerkOrgId,
  organisationId: tenant.organisationId as OrganisationId,
});

beforeEach(async () => {
  await cleanTestData();
  await createTenant(tenantA);
  await createTenant(tenantB);
});

afterAll(async () => {
  await cleanTestData();
  await database.$disconnect();
});

describe("manual availability services", () => {
  test("creates records visible to scoped calendar and people queries", async () => {
    const result = await createManualAvailability(
      contextFor(tenantA),
      inputFor(tenantA),
      "user_test"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toMatchObject({
      contactability: "limited",
      includeInFeed: true,
      personId: tenantA.personId,
      personName: "Manual Person",
      privacyMode: "named",
      recordType: "wfh",
      title: "Working from home",
      workingLocation: "Brisbane",
    });

    await expect(listAvailabilityRecords(contextFor(tenantA))).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: result.value.id,
          personId: tenantA.personId,
        }),
      ])
    );
  });

  test("rejects invalid dates and person IDs outside the tenant", async () => {
    await expect(
      createManualAvailability(
        contextFor(tenantA),
        {
          ...inputFor(tenantA),
          endsAt: new Date("2026-05-09T00:00:00.000Z"),
        },
        "user_test"
      )
    ).resolves.toMatchObject({
      error: expect.objectContaining({ code: "bad_request" }),
      ok: false,
    });

    await expect(
      createManualAvailability(
        contextFor(tenantA),
        { ...inputFor(tenantA), personId: tenantB.personId },
        "user_test"
      )
    ).resolves.toMatchObject({
      error: expect.objectContaining({ code: "not_found" }),
      ok: false,
    });
  });

  test("updates and archives only manual records in the active tenant", async () => {
    const created = await createManualAvailability(
      contextFor(tenantA),
      inputFor(tenantA),
      "user_test"
    );

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    await expect(
      updateManualAvailability(
        contextFor(tenantB),
        created.value.id,
        inputFor(tenantB),
        "user_test"
      )
    ).resolves.toMatchObject({
      error: expect.objectContaining({ code: "not_found" }),
      ok: false,
    });

    const updated = await updateManualAvailability(
      contextFor(tenantA),
      created.value.id,
      {
        ...inputFor(tenantA),
        contactability: "unavailable",
        includeInFeed: false,
        title: "Training day",
      },
      "user_test"
    );

    expect(updated).toMatchObject({
      ok: true,
      value: expect.objectContaining({
        contactability: "unavailable",
        includeInFeed: false,
        title: "Training day",
      }),
    });

    await expect(
      archiveManualAvailability(
        contextFor(tenantB),
        created.value.id,
        "user_test"
      )
    ).resolves.toMatchObject({
      error: expect.objectContaining({ code: "not_found" }),
      ok: false,
    });

    await expect(
      archiveManualAvailability(
        contextFor(tenantA),
        created.value.id,
        "user_test"
      )
    ).resolves.toMatchObject({ ok: true });

    await expect(
      listAvailabilityRecords(contextFor(tenantA))
    ).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.value.id }),
      ])
    );
  });
});
