import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveOrgContext: vi.fn(),
  listOrganisationsByClerkOrg: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  requireOrg: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@repo/auth/helpers", () => ({
  requireOrg: mocks.requireOrg,
}));

vi.mock("@repo/database/src/queries/organisations", () => ({
  listOrganisationsByClerkOrg: mocks.listOrganisationsByClerkOrg,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("./get-active-org-context", () => ({
  getActiveOrgContext: mocks.getActiveOrgContext,
}));

const { requireActiveOrgPageContext } = await import(
  "./require-active-org-page-context"
);

const clerkOrgId = "org_test_cookie_state";
const organisationId = "00000000-0000-4000-8000-000000000100";

describe("requireActiveOrgPageContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves missing org from Clerk cookie state without redirecting", async () => {
    mocks.requireOrg.mockResolvedValue(clerkOrgId);
    mocks.listOrganisationsByClerkOrg.mockResolvedValue({
      ok: true,
      value: [
        {
          countryCode: "AU",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          id: organisationId,
          name: "Alpha",
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    });

    await expect(requireActiveOrgPageContext()).resolves.toEqual({
      clerkOrgId,
      organisationId,
      orgQueryValue: null,
      orgSource: "clerk_cookie",
    });
    expect(mocks.getActiveOrgContext).not.toHaveBeenCalled();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("validates explicit org query values", async () => {
    mocks.getActiveOrgContext.mockResolvedValue({
      ok: true,
      value: {
        clerkOrgId,
        organisationId,
      },
    });

    await expect(requireActiveOrgPageContext(organisationId)).resolves.toEqual({
      clerkOrgId,
      organisationId,
      orgQueryValue: organisationId,
      orgSource: "query",
    });
    expect(mocks.requireOrg).not.toHaveBeenCalled();
  });

  it("returns notFound for explicit out-of-scope org values", async () => {
    mocks.getActiveOrgContext.mockResolvedValue({
      error: { code: "not_found", message: "Organisation not found" },
      ok: false,
    });

    await expect(requireActiveOrgPageContext(organisationId)).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it("returns notFound when cookie state has no internal organisations", async () => {
    mocks.requireOrg.mockResolvedValue(clerkOrgId);
    mocks.listOrganisationsByClerkOrg.mockResolvedValue({
      ok: true,
      value: [],
    });

    await expect(requireActiveOrgPageContext()).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });
});
