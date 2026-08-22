import "./setup-env";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { database } from "@repo/database";
import { getRegisteredSyncEventName } from "../events";
import { syncXeroPeople } from "./sync-xero-people";

// Mock fetchEmployeesForRegion and toPlainLanguageMessage from @repo/xero
const mockFetchEmployeesForRegion = vi.fn();
vi.mock("@repo/xero", async (importOriginal) => {
  const original = await importOriginal<typeof import("@repo/xero")>();
  return {
    ...original,
    fetchEmployeesForRegion: (...args: any[]) =>
      mockFetchEmployeesForRegion(...args),
  };
});

const tenantA = {
  clerkOrgId: "org_test_people_sync_a",
  organisationId: "93000000-0000-4000-8000-000000000001",
  xeroConnectionId: "93000000-0000-4000-8000-000000000002",
  xeroTenantId: "93000000-0000-4000-8000-000000000003",
} as const;

const tenantB = {
  clerkOrgId: "org_test_people_sync_b",
  organisationId: "94000000-0000-4000-8000-000000000001",
  xeroConnectionId: "94000000-0000-4000-8000-000000000002",
  xeroTenantId: "94000000-0000-4000-8000-000000000003",
} as const;

const testClerkOrgIds = [tenantA.clerkOrgId, tenantB.clerkOrgId] as const;

async function setupTenant(tenant: typeof tenantA) {
  await database.organisation.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      country_code: "AU",
      id: tenant.organisationId,
      name: `Test Org ${tenant.clerkOrgId}`,
    },
  });

  await database.xeroConnection.create({
    data: {
      access_token_encrypted: "encrypted-token",
      clerk_org_id: tenant.clerkOrgId,
      expires_at: new Date(Date.now() + 3_600_000), // 1 hour in future
      id: tenant.xeroConnectionId,
      organisation_id: tenant.organisationId,
      status: "active",
    },
  });

  await database.xeroTenant.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      id: tenant.xeroTenantId,
      organisation_id: tenant.organisationId,
      payroll_region: "AU",
      tenant_name: "Xero Tenant",
      xero_connection_id: tenant.xeroConnectionId,
      xero_tenant_id: "xero-tenant-uuid",
    },
  });
}

async function cleanTestData() {
  const scope = { clerk_org_id: { in: [...testClerkOrgIds] } };
  await database.failedRecord.deleteMany({ where: scope });
  await database.syncRun.deleteMany({ where: scope });
  await database.person.deleteMany({ where: scope });
  await database.xeroTenant.deleteMany({ where: scope });
  await database.xeroConnection.deleteMany({ where: scope });
  await database.organisation.deleteMany({ where: scope });
}

beforeEach(async () => {
  vi.clearAllMocks();
  await cleanTestData();
});

afterAll(async () => {
  await cleanTestData();
  await database.$disconnect();
});

describe("sync-xero-people handler", () => {
  it("resolves registered event name correctly", () => {
    expect(getRegisteredSyncEventName("people")).toBe("sync-xero-people");
  });

  it("syncs AU employees successfully and is idempotent", async () => {
    await setupTenant(tenantA);

    const mockEmployees = [
      {
        email: "john.doe@example.com",
        employeeId: "11111111-1111-4111-8111-111111111111",
        employmentType: "EMPLOYEE",
        firstName: "John",
        jobTitle: "Developer",
        lastName: "Doe",
        rawPayload: { employee: "data" },
        startDate: "2026-01-01",
        status: "ACTIVE",
      },
      {
        email: "",
        employeeId: "22222222-2222-4222-8222-222222222222",
        employmentType: "CONTRACTOR",
        firstName: "Jane",
        jobTitle: "Manager",
        lastName: "Smith",
        rawPayload: { employee: "data2" },
        startDate: null,
        status: "ACTIVE",
      },
    ];

    mockFetchEmployeesForRegion.mockResolvedValue({
      ok: true,
      value: {
        employees: mockEmployees,
        rawResponse: {},
      },
    });

    const input = {
      clerkOrgId: tenantA.clerkOrgId,
      organisationId: tenantA.organisationId,
      triggerType: "manual" as const,
      xeroTenantId: tenantA.xeroTenantId,
    };

    // Run 1
    const result1 = await syncXeroPeople(input);
    expect(result1.ok).toBe(true);
    if (result1.ok) {
      expect(result1.value.fetched).toBe(2);
      expect(result1.value.upserted).toBe(2);
      expect(result1.value.failed).toBe(0);
      expect(result1.value.status).toBe("succeeded");
    }

    // Assert DB state after Run 1
    const people1 = await database.person.findMany({
      orderBy: { first_name: "asc" },
      where: { clerk_org_id: tenantA.clerkOrgId },
    });
    expect(people1.length).toBe(2);
    expect(people1[0]).toMatchObject({
      email: "jane.smith@noemail.teamcalendar.online", // fallback email
      employment_type: "contractor",
      first_name: "Jane",
      is_active: true,
      last_name: "Smith",
    });
    expect(people1[1]).toMatchObject({
      email: "john.doe@example.com",
      employment_type: "employee",
      first_name: "John",
      is_active: true,
      last_name: "Doe",
    });

    // Run 2 (Idempotency check)
    const result2 = await syncXeroPeople(input);
    expect(result2.ok).toBe(true);
    if (result2.ok) {
      expect(result2.value.fetched).toBe(2);
      expect(result2.value.upserted).toBe(2);
      expect(result2.value.failed).toBe(0);
      expect(result2.value.status).toBe("succeeded");
    }

    const people2 = await database.person.findMany({
      where: { clerk_org_id: tenantA.clerkOrgId },
    });
    expect(people2.length).toBe(2); // no duplicates

    const tenantRow = await database.xeroTenant.findFirst({
      where: { id: tenantA.xeroTenantId },
    });
    expect(tenantRow?.last_people_sync_at).toBeDefined();
    expect(tenantRow?.last_people_sync_at).not.toBeNull();
  });

  it("enforces dual-tenant isolation during upsert", async () => {
    await setupTenant(tenantA);
    await setupTenant(tenantB);

    const mockEmployee = {
      email: "john.doe@example.com",
      employeeId: "11111111-1111-4111-8111-111111111111",
      employmentType: "EMPLOYEE",
      firstName: "John",
      jobTitle: "Developer",
      lastName: "Doe",
      rawPayload: { employee: "data" },
      startDate: "2026-01-01",
      status: "ACTIVE",
    };

    // Run for Tenant A
    mockFetchEmployeesForRegion.mockResolvedValue({
      ok: true,
      value: {
        employees: [mockEmployee],
        rawResponse: {},
      },
    });

    await syncXeroPeople({
      clerkOrgId: tenantA.clerkOrgId,
      organisationId: tenantA.organisationId,
      triggerType: "manual" as const,
      xeroTenantId: tenantA.xeroTenantId,
    });

    // Run for Tenant B with same Employee ID
    await syncXeroPeople({
      clerkOrgId: tenantB.clerkOrgId,
      organisationId: tenantB.organisationId,
      triggerType: "manual" as const,
      xeroTenantId: tenantB.xeroTenantId,
    });

    const peopleA = await database.person.findMany({
      where: { clerk_org_id: tenantA.clerkOrgId },
    });
    const peopleB = await database.person.findMany({
      where: { clerk_org_id: tenantB.clerkOrgId },
    });

    expect(peopleA.length).toBe(1);
    expect(peopleB.length).toBe(1);
    expect(peopleA[0].clerk_org_id).toBe(tenantA.clerkOrgId);
    expect(peopleB[0].clerk_org_id).toBe(tenantB.clerkOrgId);
    expect(peopleA[0].organisation_id).toBe(tenantA.organisationId);
    expect(peopleB[0].organisation_id).toBe(tenantB.organisationId);
  });

  it("handles record-level failures without failing the entire run", async () => {
    await setupTenant(tenantA);

    const mockEmployees = [
      {
        email: "john.doe@example.com",
        // Valid employee
        employeeId: "11111111-1111-4111-8111-111111111111",
        employmentType: "EMPLOYEE",
        firstName: "John",
        jobTitle: "Developer",
        lastName: "Doe",
        rawPayload: { employee: "data1" },
        startDate: "2026-01-01",
        status: "ACTIVE",
      },
      {
        email: "jane@example.com",
        // Invalid employee (missing last name)
        employeeId: "22222222-2222-4222-8222-222222222222",
        employmentType: "EMPLOYEE",
        firstName: "Jane",
        jobTitle: "Developer",
        lastName: "",
        rawPayload: { employee: "bad-data" },
        startDate: "2026-01-01",
        status: "ACTIVE",
      },
    ];

    mockFetchEmployeesForRegion.mockResolvedValue({
      ok: true,
      value: {
        employees: mockEmployees,
        rawResponse: {},
      },
    });

    const result = await syncXeroPeople({
      clerkOrgId: tenantA.clerkOrgId,
      organisationId: tenantA.organisationId,
      triggerType: "manual" as const,
      xeroTenantId: tenantA.xeroTenantId,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fetched).toBe(2);
      expect(result.value.upserted).toBe(1);
      expect(result.value.failed).toBe(1);
      expect(result.value.status).toBe("partial_success");
    }

    // Verify valid employee synced
    const people = await database.person.findMany({
      where: { clerk_org_id: tenantA.clerkOrgId },
    });
    expect(people.length).toBe(1);
    expect(people[0].first_name).toBe("John");

    // Verify failed record logged in database
    const failedRecords = await database.failedRecord.findMany({
      where: { clerk_org_id: tenantA.clerkOrgId },
    });
    expect(failedRecords.length).toBe(1);
    expect(failedRecords[0]).toMatchObject({
      entity_type: "people",
      error_code: "validation_error",
      error_message: "Last name is required",
      record_type: "people",
      source_id: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("handles NZ/UK region stubbing without failing the run", async () => {
    await setupTenant(tenantA);
    // Update tenant to NZ
    await database.xeroTenant.update({
      data: { payroll_region: "NZ" },
      where: { id: tenantA.xeroTenantId },
    });

    const result = await syncXeroPeople({
      clerkOrgId: tenantA.clerkOrgId,
      organisationId: tenantA.organisationId,
      triggerType: "manual" as const,
      xeroTenantId: tenantA.xeroTenantId,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("succeeded");
      expect(result.value.fetched).toBe(0);
      expect(result.value.upserted).toBe(0);
    }

    const run = await database.syncRun.findFirst({
      where: { clerk_org_id: tenantA.clerkOrgId, id: result.value.runId },
    });
    expect(run).toBeDefined();
    expect(run?.status).toBe("succeeded");
    expect(run?.error_summary).toContain(
      "NZ payroll employee reads are not yet available."
    );
  });
});
