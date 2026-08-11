import "./setup-env";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sentEvents: Array<{ name: string; data: any; id?: string }> = [];

vi.mock("../client", () => ({
  inngest: {
    createFunction: vi.fn((opts: any, trigger: any, fn: any) => ({
      fn,
      opts,
      trigger,
    })),
    send: vi.fn((payload: any) => {
      sentEvents.push(payload);
      return { ids: [payload.id ?? "evt_mock_id"] };
    }),
  },
}));

let database: typeof import("@repo/database")["database"];
let scheduleXeroSyncsPage: typeof import("./schedule-xero-syncs")["scheduleXeroSyncsPage"];

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;

if (process.env.DATABASE_URL) {
  ({ database } = await import("@repo/database"));
  ({ scheduleXeroSyncsPage } = await import("./schedule-xero-syncs"));
}

const tenantA = {
  clerkOrgId: "org_test_schedule_sync_a",
  organisationId: "50000000-0000-4000-8000-000000000001",
  xeroConnectionId: "50000000-0000-4000-8000-000000000002",
  xeroTenantId: "50000000-0000-4000-8000-000000000003",
} as const;

const tenantB = {
  clerkOrgId: "org_test_schedule_sync_b",
  organisationId: "60000000-0000-4000-8000-000000000001",
  xeroConnectionId: "60000000-0000-4000-8000-000000000002",
  xeroTenantId: "60000000-0000-4000-8000-000000000003",
} as const;

const testClerkOrgIds = [tenantA.clerkOrgId, tenantB.clerkOrgId] as const;

async function setupTenant(tenant: typeof tenantA, timezone: string) {
  if (!database) {
    return;
  }
  await database.organisation.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      country_code: "AU",
      id: tenant.organisationId,
      is_active: true,
      name: `Schedule Test Org ${tenant.clerkOrgId}`,
      timezone,
    },
  });

  await database.xeroConnection.create({
    data: {
      access_token_encrypted: "encrypted-token",
      clerk_org_id: tenant.clerkOrgId,
      expires_at: new Date(Date.now() + 3_600_000),
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
      xero_connection_id: tenant.xeroConnectionId,
      xero_tenant_id: tenant.xeroTenantId,
    },
  });
}

async function cleanupTestFixtures() {
  if (!database) {
    return;
  }
  await database.xeroTenant.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds as unknown as string[] } },
  });
  await database.xeroConnection.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds as unknown as string[] } },
  });
  await database.organisation.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds as unknown as string[] } },
  });
}

describeWithDatabase("scheduleXeroSyncs Integration", () => {
  beforeEach(async () => {
    sentEvents.length = 0;
    await cleanupTestFixtures();
  });

  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("scans database tenants and emits tenant-scoped events carrying matching Clerk Org and Organisation IDs", async () => {
    await setupTenant(tenantA, "Australia/Sydney");
    await setupTenant(tenantB, "Australia/Melbourne");

    const now = new Date("2026-08-12T00:00:00.000Z"); // Wed 10:00 AM local
    const result = await scheduleXeroSyncsPage({ now });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.scanned).toBeGreaterThanOrEqual(2);
    expect(result.value.dispatched).toBeGreaterThanOrEqual(6); // 3 per tenant

    // Filter sent events for our test tenants
    const tenantAEvents = sentEvents.filter(
      (e) => e.data.clerkOrgId === tenantA.clerkOrgId
    );
    const tenantBEvents = sentEvents.filter(
      (e) => e.data.clerkOrgId === tenantB.clerkOrgId
    );

    expect(tenantAEvents.length).toBeGreaterThanOrEqual(3);
    expect(tenantBEvents.length).toBeGreaterThanOrEqual(3);

    for (const evt of tenantAEvents) {
      expect(evt.data.clerkOrgId).toBe(tenantA.clerkOrgId);
      expect(evt.data.organisationId).toBe(tenantA.organisationId);
      expect(evt.data.xeroTenantId).toBe(tenantA.xeroTenantId);
      expect(evt.data.triggerType).toBe("scheduled");
    }

    for (const evt of tenantBEvents) {
      expect(evt.data.clerkOrgId).toBe(tenantB.clerkOrgId);
      expect(evt.data.organisationId).toBe(tenantB.organisationId);
      expect(evt.data.xeroTenantId).toBe(tenantB.xeroTenantId);
      expect(evt.data.triggerType).toBe("scheduled");
    }
  });
});
