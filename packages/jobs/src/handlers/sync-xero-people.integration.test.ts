import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  try {
    const fs = require("node:fs");
    const path = require("node:path");
    const envPaths = [
      path.resolve(process.cwd(), "packages/database/.env"),
      path.resolve(process.cwd(), "../database/.env"),
    ];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        for (const line of envContent.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const [key, ...valueParts] = trimmed.split("=");
            const value = valueParts.join("=");
            if (key && value) {
              const cleanKey = key.trim();
              if (
                cleanKey !== "__proto__" &&
                cleanKey !== "constructor" &&
                cleanKey !== "prototype"
              ) {
                Reflect.set(
                  process.env,
                  cleanKey,
                  value.trim().replace(/^['"]|['"]$/g, "")
                );
              }
            }
          }
        }
        break;
      }
    }
  } catch {
    // ignore
  }
});

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
        complete: true,
        employees: mockEmployees,
        failures: [],
        rawItemCount: mockEmployees.length,
        rawResponse: {},
        seenEmployeeIds: mockEmployees.map((e) => e.employeeId),
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
      person_type: "contractor",
    });
    expect(people1[1]).toMatchObject({
      email: "john.doe@example.com",
      employment_type: "employee",
      first_name: "John",
      is_active: true,
      last_name: "Doe",
      person_type: "employee",
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
      orderBy: { first_name: "asc" },
      where: { clerk_org_id: tenantA.clerkOrgId },
    });
    expect(people2.length).toBe(2); // no duplicates
    expect(people2[0].person_type).toBe("contractor");
    expect(people2[1].person_type).toBe("employee");

    // Run 3 (Update check - employment type changed in Xero)
    const updatedEmployees = [
      {
        ...mockEmployees[0],
        employmentType: "EMPLOYEE",
      },
      {
        ...mockEmployees[1],
        employmentType: "EMPLOYEE",
      },
    ];
    mockFetchEmployeesForRegion.mockResolvedValueOnce({
      ok: true,
      value: {
        complete: true,
        employees: updatedEmployees,
        failures: [],
        rawItemCount: updatedEmployees.length,
        rawResponse: {},
        seenEmployeeIds: updatedEmployees.map((e) => e.employeeId),
      },
    });

    const result3 = await syncXeroPeople(input);
    expect(result3.ok).toBe(true);
    if (result3.ok) {
      expect(result3.value.upserted).toBe(2);
      expect(result3.value.status).toBe("succeeded");
    }

    const people3 = await database.person.findMany({
      orderBy: { first_name: "asc" },
      where: { clerk_org_id: tenantA.clerkOrgId },
    });
    expect(people3.length).toBe(2);
    expect(people3[0]).toMatchObject({
      employment_type: "employee",
      first_name: "Jane",
      person_type: "employee",
    });
    expect(people3[1]).toMatchObject({
      employment_type: "employee",
      first_name: "John",
      person_type: "employee",
    });

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
        complete: true,
        employees: [mockEmployee],
        failures: [],
        rawItemCount: 1,
        rawResponse: {},
        seenEmployeeIds: [mockEmployee.employeeId],
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
        complete: true,
        employees: mockEmployees,
        failures: [],
        rawItemCount: mockEmployees.length,
        rawResponse: {},
        seenEmployeeIds: mockEmployees.map((e) => e.employeeId),
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

  it("records Xero page mapping failures separately from handler validation failures", async () => {
    await setupTenant(tenantA);

    const validEmployee = {
      email: "john.doe@example.com",
      employeeId: "11111111-1111-4111-8111-111111111111",
      employmentType: "EMPLOYEE",
      firstName: "John",
      jobTitle: "Developer",
      lastName: "Doe",
      rawPayload: { employee: "data1" },
      startDate: "2026-01-01",
      status: "ACTIVE",
    };

    // fetchEmployeesForRegion already isolated a malformed page record into
    // `failures` before it ever became an XeroEmployee, distinct from the
    // handler's own validateEmployee failures (covered by the previous
    // test) and from persistence (db_error) failures.
    mockFetchEmployeesForRegion.mockResolvedValue({
      ok: true,
      value: {
        complete: true,
        employees: [validEmployee],
        failures: [
          {
            index: 1,
            rawEmployeeId: null,
            rawPayload: { Broken: true },
            reason: "Missing Employee ID",
          },
        ],
        rawItemCount: 2,
        rawResponse: {},
        seenEmployeeIds: [validEmployee.employeeId],
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
      // fetched reflects the raw item count Xero returned, including the
      // record that could not be mapped.
      expect(result.value.fetched).toBe(2);
      expect(result.value.upserted).toBe(1);
      expect(result.value.failed).toBe(1);
      expect(result.value.status).toBe("partial_success");
    }

    const failedRecords = await database.failedRecord.findMany({
      where: { clerk_org_id: tenantA.clerkOrgId },
    });
    expect(failedRecords).toHaveLength(1);
    expect(failedRecords[0]).toMatchObject({
      error_code: "mapping_error",
      error_message: "Missing Employee ID",
      source_id: "unknown",
    });
  });

  it("reuses the same Person and clears archived_at when a previously archived EmployeeID returns from Xero", async () => {
    await setupTenant(tenantA);

    const employeeId = "11111111-1111-4111-8111-111111111111";
    const archived = await database.person.create({
      data: {
        archived_at: new Date("2026-01-01T00:00:00.000Z"),
        clerk_org_id: tenantA.clerkOrgId,
        display_name: "John Doe",
        email: "john.doe@example.com",
        employment_type: "employee",
        first_name: "John",
        is_active: false,
        last_name: "Doe",
        organisation_id: tenantA.organisationId,
        person_type: "employee",
        source_person_key: employeeId,
        source_system: "XERO",
      },
    });

    mockFetchEmployeesForRegion.mockResolvedValue({
      ok: true,
      value: {
        complete: true,
        employees: [
          {
            email: "john.doe@example.com",
            employeeId,
            employmentType: "EMPLOYEE",
            firstName: "John",
            jobTitle: "Developer",
            lastName: "Doe",
            rawPayload: { employee: "data" },
            startDate: "2026-01-01",
            status: "ACTIVE",
          },
        ],
        failures: [],
        rawItemCount: 1,
        rawResponse: {},
        seenEmployeeIds: [employeeId],
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
      expect(result.value.upserted).toBe(1);
      expect(result.value.failed).toBe(0);
      expect(result.value.status).toBe("succeeded");
    }

    const people = await database.person.findMany({
      where: { clerk_org_id: tenantA.clerkOrgId },
    });
    expect(people).toHaveLength(1);
    expect(people[0].id).toBe(archived.id);
    expect(people[0].archived_at).toBeNull();
    expect(people[0].is_active).toBe(true);
  });

  it("maps active, inactive, and terminated employees independently from archival state, and leaves a manual same-email person untouched", async () => {
    await setupTenant(tenantA);

    const manualPerson = await database.person.create({
      data: {
        clerk_org_id: tenantA.clerkOrgId,
        display_name: "Manual Person",
        email: "shared@example.com",
        employment_type: "employee",
        first_name: "Manual",
        is_active: true,
        last_name: "Person",
        organisation_id: tenantA.organisationId,
        person_type: "employee",
        source_system: "MANUAL",
      },
    });

    const activeId = "11111111-1111-4111-8111-111111111111";
    const inactiveId = "22222222-2222-4222-8222-222222222222";
    const terminatedId = "33333333-3333-4333-8333-333333333333";

    const mockEmployees = [
      {
        email: "shared@example.com",
        employeeId: activeId,
        employmentType: "EMPLOYEE",
        firstName: "Active",
        jobTitle: "Developer",
        lastName: "Person",
        rawPayload: { employee: "active" },
        startDate: "2026-01-01",
        status: "ACTIVE",
      },
      {
        email: "inactive@example.com",
        employeeId: inactiveId,
        employmentType: "EMPLOYEE",
        firstName: "Inactive",
        jobTitle: "Developer",
        lastName: "Person",
        rawPayload: { employee: "inactive" },
        startDate: "2026-01-01",
        status: "INACTIVE",
      },
      {
        email: "terminated@example.com",
        employeeId: terminatedId,
        employmentType: "EMPLOYEE",
        firstName: "Terminated",
        jobTitle: "Developer",
        lastName: "Person",
        rawPayload: { employee: "terminated" },
        startDate: "2026-01-01",
        status: "TERMINATED",
      },
    ];

    mockFetchEmployeesForRegion.mockResolvedValue({
      ok: true,
      value: {
        complete: true,
        employees: mockEmployees,
        failures: [],
        rawItemCount: mockEmployees.length,
        rawResponse: {},
        seenEmployeeIds: mockEmployees.map((e) => e.employeeId),
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
      expect(result.value.upserted).toBe(3);
      expect(result.value.failed).toBe(0);
      expect(result.value.status).toBe("succeeded");
    }

    const xeroPeople = await database.person.findMany({
      orderBy: { first_name: "asc" },
      where: { clerk_org_id: tenantA.clerkOrgId, source_system: "XERO" },
    });
    expect(xeroPeople).toHaveLength(3);
    expect(
      xeroPeople.find((p) => p.source_person_key === activeId)
    ).toMatchObject({
      archived_at: null,
      is_active: true,
      person_type: "employee",
    });
    expect(
      xeroPeople.find((p) => p.source_person_key === inactiveId)
    ).toMatchObject({
      archived_at: null,
      is_active: false,
      person_type: "employee",
    });
    expect(
      xeroPeople.find((p) => p.source_person_key === terminatedId)
    ).toMatchObject({
      archived_at: null,
      is_active: false,
      person_type: "employee",
    });

    // The manual person sharing an email must remain untouched: same row,
    // still MANUAL, still active, unaffected by the Xero-sourced import.
    const manualAfter = await database.person.findFirst({
      where: { id: manualPerson.id },
    });
    expect(manualAfter).toMatchObject({
      archived_at: null,
      first_name: "Manual",
      is_active: true,
      person_type: "employee",
      source_system: "MANUAL",
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
