import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  database: {
    person: { create: vi.fn() },
  },
  getActiveOrgContext: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  auth: mocks.auth,
}));
vi.mock("@repo/database", () => ({
  database: mocks.database,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));
vi.mock("@/lib/server/get-active-org-context", () => ({
  getActiveOrgContext: mocks.getActiveOrgContext,
}));

const { createManualPersonAction } = await import("./_actions");

const organisationId = "00000000-0000-4000-8000-000000000001";
const clerkOrgId = "org_123";

describe("people/new manual person creation action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ orgRole: "org:admin" });
    mocks.getActiveOrgContext.mockResolvedValue({
      ok: true,
      value: { clerkOrgId, organisationId },
    });
    mocks.database.person.create.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000002",
    });
  });

  describe("baseline authorization and scoping tests", () => {
    it("rejects unauthenticated or non-admin callers", async () => {
      mocks.auth.mockResolvedValue({ orgRole: "org:manager" });

      const result = await createManualPersonAction({
        email: "john@example.com",
        employmentType: "employee",
        firstName: "John",
        lastName: "Doe",
        organisationId,
      });

      expect(result).toEqual({
        error: {
          code: "not_authorised",
          message: "You do not have permission to add people.",
        },
        ok: false,
      });
      expect(mocks.database.person.create).not.toHaveBeenCalled();
    });

    it("rejects malformed inputs", async () => {
      const result = await createManualPersonAction({
        email: "not-an-email",
        employmentType: "employee",
        firstName: "",
        lastName: "Doe",
        organisationId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("validation_error");
      }
      expect(mocks.database.person.create).not.toHaveBeenCalled();
    });

    it("scopes person creation to clerk_org_id and organisation_id", async () => {
      await createManualPersonAction({
        email: "JANE@EXAMPLE.COM",
        employmentType: "contractor",
        firstName: "Jane",
        jobTitle: "Consultant",
        lastName: "Smith",
        organisationId,
      });

      expect(mocks.database.person.create).toHaveBeenCalledWith({
        data: {
          clerk_org_id: clerkOrgId,
          email: "jane@example.com",
          employment_type: "contractor",
          first_name: "Jane",
          job_title: "Consultant",
          last_name: "Smith",
          organisation_id: organisationId,
          source_system: "MANUAL",
        },
        select: { id: true },
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/people");
      expect(mocks.redirect).toHaveBeenCalledWith("/people");
    });
  });
});
