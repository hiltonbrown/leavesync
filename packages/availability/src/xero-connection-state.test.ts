import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  logError: vi.fn(),
  scopedQuery: vi.fn((clerkOrgId: string, organisationId: string) => ({
    clerk_org_id: clerkOrgId,
    organisation_id: organisationId,
  })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({
  database: {
    xeroConnection: {
      findFirst: mocks.findFirst,
    },
  },
  scopedQuery: mocks.scopedQuery,
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: mocks.logError },
}));

const { hasActiveXeroConnection } = await import("./xero-connection-state");

describe("hasActiveXeroConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true for a scoped refresh-capable connection with a tenant", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "connection_1",
      xero_tenant: {
        clerk_org_id: "org_1",
        id: "tenant_1",
        organisation_id: "00000000-0000-4000-8000-000000000001",
      },
    });

    await expect(
      hasActiveXeroConnection({
        clerkOrgId: "org_1",
        organisationId: "00000000-0000-4000-8000-000000000001",
      })
    ).resolves.toBe(true);
  });

  it("returns false when no connection exists", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(
      hasActiveXeroConnection({
        clerkOrgId: "org_1",
        organisationId: "00000000-0000-4000-8000-000000000001",
      })
    ).resolves.toBe(false);
  });

  it("returns false when the tenant is missing", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "connection_1",
      xero_tenant: null,
    });

    await expect(
      hasActiveXeroConnection({
        clerkOrgId: "org_1",
        organisationId: "00000000-0000-4000-8000-000000000001",
      })
    ).resolves.toBe(false);
  });

  it("returns false when the tenant belongs to another organisation", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "connection_1",
      xero_tenant: {
        clerk_org_id: "org_1",
        id: "tenant_1",
        organisation_id: "00000000-0000-4000-8000-000000000002",
      },
    });

    await expect(
      hasActiveXeroConnection({
        clerkOrgId: "org_1",
        organisationId: "00000000-0000-4000-8000-000000000001",
      })
    ).resolves.toBe(false);
  });

  it("returns false and logs on lookup errors", async () => {
    mocks.findFirst.mockRejectedValue(new Error("database unavailable"));

    await expect(
      hasActiveXeroConnection({
        clerkOrgId: "org_1",
        organisationId: "00000000-0000-4000-8000-000000000001",
      })
    ).resolves.toBe(false);
    expect(mocks.logError).toHaveBeenCalled();
  });
});
