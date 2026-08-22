import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addAlternativeContact: vi.fn(),
  auth: vi.fn(),
  currentUser: vi.fn(),
  database: {
    alternativeContact: { findFirst: vi.fn() },
    person: { findFirst: vi.fn() },
    xeroTenant: { findFirst: vi.fn() },
  },
  deleteAlternativeContact: vi.fn(),
  dispatchBalanceRefresh: vi.fn(),
  getActiveOrgContext: vi.fn(),
  reorderAlternativeContacts: vi.fn(),
  revalidatePath: vi.fn(),
  setManualLeaveBalance: vi.fn(),
  syncXeroLeaveBalances: vi.fn(),
  updateAlternativeContact: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));
vi.mock("@repo/jobs", () => ({
  syncXeroLeaveBalances: mocks.syncXeroLeaveBalances,
}));
vi.mock("@repo/availability", () => ({
  addAlternativeContact: mocks.addAlternativeContact,
  deleteAlternativeContact: mocks.deleteAlternativeContact,
  dispatchBalanceRefresh: mocks.dispatchBalanceRefresh,
  reorderAlternativeContacts: mocks.reorderAlternativeContacts,
  setManualLeaveBalance: mocks.setManualLeaveBalance,
  updateAlternativeContact: mocks.updateAlternativeContact,
}));
vi.mock("@repo/database", () => ({
  database: mocks.database,
  scopedQuery: (cOrgId: string, orgId: string) => ({
    clerk_org_id: cOrgId,
    organisation_id: orgId,
  }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/lib/server/get-active-org-context", () => ({
  getActiveOrgContext: mocks.getActiveOrgContext,
}));

const {
  addAlternativeContactAction,
  deleteAlternativeContactAction,
  refreshBalancesAction,
  reorderAlternativeContactsAction,
  setManualBalanceAction,
  updateAlternativeContactAction,
} = await import("./_actions");

const organisationId = "00000000-0000-4000-8000-000000000001";
const personId = "00000000-0000-4000-8000-000000000002";
const contactId = "00000000-0000-4000-8000-000000000003";
const clerkOrgId = "org_123";
const userId = "user_456";

describe("people server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ orgRole: "org:admin" });
    mocks.currentUser.mockResolvedValue({ id: userId });
    mocks.getActiveOrgContext.mockResolvedValue({
      ok: true,
      value: { clerkOrgId, organisationId },
    });
    mocks.database.person.findFirst.mockResolvedValue({ id: personId });
    mocks.database.alternativeContact.findFirst.mockResolvedValue({
      person_id: personId,
    });
    mocks.database.xeroTenant.findFirst.mockResolvedValue({ id: "tenant_1" });
    mocks.addAlternativeContact.mockResolvedValue({
      ok: true,
      value: { id: contactId },
    });
    mocks.updateAlternativeContact.mockResolvedValue({
      ok: true,
      value: { id: contactId },
    });
    mocks.deleteAlternativeContact.mockResolvedValue({
      ok: true,
      value: { personId },
    });
    mocks.reorderAlternativeContacts.mockResolvedValue({
      ok: true,
      value: { personId },
    });
    mocks.dispatchBalanceRefresh.mockResolvedValue({
      ok: true,
      value: { queued: true },
    });
    mocks.setManualLeaveBalance.mockResolvedValue({
      ok: true,
      value: { id: "balance_1" },
    });
  });

  describe("baseline authorization and scoping tests", () => {
    it("rejects unauthenticated callers", async () => {
      mocks.currentUser.mockResolvedValue(null);

      const resAdd = await addAlternativeContactAction({
        email: "contact@example.com",
        name: "Emergency Contact",
        organisationId,
        personId,
      });

      expect(resAdd).toEqual({
        error: {
          code: "not_authorised",
          message: "You do not have permission to manage people.",
        },
        ok: false,
      });
      expect(mocks.addAlternativeContact).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated or non-member roles without permission", async () => {
      mocks.auth.mockResolvedValue({ orgRole: null });

      const resDelete = await deleteAlternativeContactAction({
        contactId,
        organisationId,
      });

      expect(resDelete.ok).toBe(false);
      expect(mocks.deleteAlternativeContact).not.toHaveBeenCalled();
    });

    it("rejects malformed input", async () => {
      const resAdd = await addAlternativeContactAction({
        email: "contact@example.com",
        name: "", // empty name violates min(1)
        organisationId,
        personId,
      });

      expect(resAdd.ok).toBe(false);
      if (!resAdd.ok) {
        expect(resAdd.error.code).toBe("validation_error");
      }
      expect(mocks.addAlternativeContact).not.toHaveBeenCalled();
    });

    it("scopes person lookup to clerk_org_id and organisation_id", async () => {
      await addAlternativeContactAction({
        email: "contact@example.com",
        name: "Emergency Contact",
        organisationId,
        personId,
      });

      expect(mocks.database.person.findFirst).toHaveBeenCalledWith({
        select: { id: true },
        where: {
          archived_at: null,
          clerk_org_id: clerkOrgId,
          clerk_user_id: userId,
          organisation_id: organisationId,
        },
      });
    });
  });

  describe("action specific functionality", () => {
    it("addAlternativeContactAction calls service and revalidates people path", async () => {
      const result = await addAlternativeContactAction({
        email: "contact@example.com",
        name: "Emergency Contact",
        organisationId,
        personId,
      });

      expect(result).toEqual({ ok: true, value: { id: contactId } });
      expect(mocks.addAlternativeContact).toHaveBeenCalledWith(
        expect.objectContaining({
          actingPersonId: personId,
          actingRole: "admin",
          actingUserId: userId,
          clerkOrgId,
          email: "contact@example.com",
          name: "Emergency Contact",
          organisationId,
          personId,
        })
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/people");
      expect(mocks.revalidatePath).toHaveBeenCalledWith(`/people/${personId}`);
    });

    it("updateAlternativeContactAction looks up contact person and revalidates", async () => {
      const result = await updateAlternativeContactAction({
        contactId,
        organisationId,
        patch: { name: "Updated Name" },
      });

      expect(result).toEqual({ ok: true, value: { id: contactId } });
      expect(mocks.database.alternativeContact.findFirst).toHaveBeenCalledWith({
        select: { person_id: true },
        where: {
          clerk_org_id: clerkOrgId,
          id: contactId,
          organisation_id: organisationId,
        },
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith(`/people/${personId}`);
    });

    it("reorderAlternativeContactsAction and refreshBalancesAction execute correctly", async () => {
      const resReorder = await reorderAlternativeContactsAction({
        orderedContactIds: [contactId],
        organisationId,
        personId,
      });
      expect(resReorder).toEqual({ ok: true, value: { personId } });
      expect(mocks.reorderAlternativeContacts).toHaveBeenCalled();

      const resRefresh = await refreshBalancesAction({
        organisationId,
        personId,
      });
      expect(resRefresh).toEqual({ ok: true, value: { queued: true } });
      expect(mocks.dispatchBalanceRefresh).toHaveBeenCalled();
      expect(mocks.syncXeroLeaveBalances).toHaveBeenCalledWith({
        clerkOrgId,
        organisationId,
        personId,
        triggeredByUserId: userId,
        triggerType: "manual",
        xeroTenantId: "tenant_1",
      });
    });

    it("setManualBalanceAction validates balance and passes parameters to service", async () => {
      const result = await setManualBalanceAction({
        balance: 40,
        leaveTypeXeroId: "xero-leave-1",
        organisationId,
        personId,
      });

      expect(result).toEqual({ ok: true, value: { id: "balance_1" } });
      expect(mocks.setManualLeaveBalance).toHaveBeenCalledWith(
        expect.objectContaining({
          actingRole: "admin",
          actingUserId: userId,
          balance: 40,
          clerkOrgId,
          leaveTypeXeroId: "xero-leave-1",
          organisationId,
          personId,
        })
      );
    });
  });
});
