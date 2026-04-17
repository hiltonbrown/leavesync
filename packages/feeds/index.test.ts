import type { ClerkOrgId, OrganisationId } from "@repo/core";
import { config } from "dotenv";
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { FeedTenantContext } from "./index";

config({ path: new URL("../database/.env", import.meta.url).pathname });
vi.mock("server-only", () => ({}));

const { createFeed, renderFeedForToken, rotateFeedToken, setFeedStatus } =
  await import("./index");
const { database } = await import("@repo/database");

interface TenantFixture {
  clerkOrgId: string;
  organisationId: string;
}

const tenantA: TenantFixture = {
  clerkOrgId: "org_test_feed_services_a",
  organisationId: "51000000-0000-4000-8000-000000000001",
};

const tenantB: TenantFixture = {
  clerkOrgId: "org_test_feed_services_b",
  organisationId: "52000000-0000-4000-8000-000000000001",
};

const testClerkOrgIds = [tenantA.clerkOrgId, tenantB.clerkOrgId];

const cleanTestData = async () => {
  await database.publicHolidayAssignment.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds } },
  });
  await database.publicHoliday.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds } },
  });
  await database.publicHolidayJurisdiction.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds } },
  });
  await database.feedToken.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds } },
  });
  await database.feedScope.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds } },
  });
  await database.feed.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds } },
  });
  await database.organisation.deleteMany({
    where: { clerk_org_id: { in: testClerkOrgIds } },
  });
};

const createTenant = async (tenant: TenantFixture) => {
  await database.organisation.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      country_code: "AU",
      id: tenant.organisationId,
      name: `Feed services ${tenant.clerkOrgId}`,
    },
  });
};

const contextFor = (tenant: TenantFixture): FeedTenantContext => ({
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

describe("feed services", () => {
  test("creates feeds with a plaintext token returned once and not persisted", async () => {
    const result = await createFeed(contextFor(tenantA), {
      name: "All staff",
      privacyDefault: "masked",
      scopeType: "all_staff",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.feed).toMatchObject({
      activeTokenHint: result.value.token.slice(-4),
      name: "All staff",
      privacyDefault: "masked",
      scopeType: "all_staff",
      status: "active",
    });

    const tokenRows = await database.feedToken.findMany({
      where: { feed_id: result.value.feed.id },
    });

    expect(tokenRows).toHaveLength(1);
    expect(tokenRows[0]).toMatchObject({
      status: "active",
      token_hint: result.value.token.slice(-4),
    });
    expect(tokenRows[0]?.token_hash).not.toBe(result.value.token);
  });

  test("rotates tokens and revokes the old token", async () => {
    const created = await createFeed(contextFor(tenantA), {
      name: "Calendar feed",
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const rotated = await rotateFeedToken(
      contextFor(tenantA),
      created.value.feed.id
    );

    expect(rotated.ok).toBe(true);
    if (!rotated.ok) {
      return;
    }

    expect(rotated.value.token).not.toBe(created.value.token);
    expect(rotated.value.feed.activeTokenHint).toBe(
      rotated.value.token.slice(-4)
    );

    await expect(
      renderFeedForToken(created.value.token)
    ).resolves.toMatchObject({
      ok: true,
      value: expect.objectContaining({ status: "revoked" }),
    });
    await expect(
      renderFeedForToken(rotated.value.token)
    ).resolves.toMatchObject({
      ok: true,
      value: expect.objectContaining({ status: "active" }),
    });
  });

  test("pauses, archives, and enforces tenant isolation", async () => {
    const created = await createFeed(contextFor(tenantA), {
      name: "Restricted feed",
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    await expect(
      setFeedStatus(contextFor(tenantB), created.value.feed.id, "paused")
    ).resolves.toMatchObject({
      error: expect.objectContaining({ code: "not_found" }),
      ok: false,
    });

    await expect(
      setFeedStatus(contextFor(tenantA), created.value.feed.id, "paused")
    ).resolves.toMatchObject({
      ok: true,
      value: expect.objectContaining({ status: "paused" }),
    });

    await expect(
      renderFeedForToken(created.value.token)
    ).resolves.toMatchObject({
      error: expect.objectContaining({ code: "not_found" }),
      ok: false,
    });

    await expect(
      setFeedStatus(contextFor(tenantA), created.value.feed.id, "archived")
    ).resolves.toMatchObject({
      ok: true,
      value: expect.objectContaining({ status: "archived" }),
    });
  });

  test("renders feed-scoped public holidays without exposing token plaintext", async () => {
    const created = await createFeed(contextFor(tenantA), {
      name: "Holiday feed",
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const holiday = await database.publicHoliday.create({
      data: {
        clerk_org_id: tenantA.clerkOrgId,
        organisation_id: tenantA.organisationId,
        source: "nager",
        source_remote_id: "AU:national:2026-01-26:australia-day",
        country_code: "AU",
        region_code: null,
        holiday_date: new Date("2026-01-26T00:00:00.000Z"),
        name: "Australia Day",
        local_name: "Australia Day",
        holiday_type: "public",
      },
    });

    await database.publicHolidayAssignment.create({
      data: {
        clerk_org_id: tenantA.clerkOrgId,
        organisation_id: tenantA.organisationId,
        public_holiday_id: holiday.id,
        scope_type: "feed",
        scope_value: created.value.feed.id,
        day_classification: "non_working",
      },
    });

    const rendered = await renderFeedForToken(created.value.token);

    expect(rendered.ok).toBe(true);
    if (!rendered.ok) {
      return;
    }

    expect(rendered.value.body).toContain("SUMMARY:Australia Day");
    expect(rendered.value.body).not.toContain(created.value.token);
  });
});
