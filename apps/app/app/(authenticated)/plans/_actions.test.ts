import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  archiveRecord: vi.fn(),
  auth: vi.fn(),
  createRecord: vi.fn(),
  currentUser: vi.fn(),
  deleteDraftRecord: vi.fn(),
  getActiveOrgContext: vi.fn(),
  restoreRecord: vi.fn(),
  revalidatePath: vi.fn(),
  updateRecord: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));
vi.mock("@repo/availability", () => ({
  archiveRecord: mocks.archiveRecord,
  createRecord: mocks.createRecord,
  deleteDraftRecord: mocks.deleteDraftRecord,
  restoreRecord: mocks.restoreRecord,
  updateRecord: mocks.updateRecord,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/lib/server/get-active-org-context", () => ({
  getActiveOrgContext: mocks.getActiveOrgContext,
}));

const { createRecordAction, submitForApprovalAction, updateRecordAction } =
  await import("./_actions");

const validInput = {
  allDay: true,
  contactabilityStatus: "contactable",
  endsAt: "2026-05-05",
  endTime: "",
  notesInternal: "",
  organisationId: "00000000-0000-4000-8000-000000000001",
  personId: "00000000-0000-4000-8000-000000000011",
  privacyMode: "named",
  recordType: "annual_leave",
  startsAt: "2026-05-04",
  startTime: "",
} as const;

describe("plans actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ orgRole: "org:viewer" });
    mocks.currentUser.mockResolvedValue({ id: "user_1" });
    mocks.getActiveOrgContext.mockResolvedValue({
      ok: true,
      value: {
        clerkOrgId: "org_1",
        organisationId: validInput.organisationId,
      },
    });
  });

  it("rejects unauthorised callers", async () => {
    mocks.auth.mockResolvedValue({ orgRole: null });

    const result = await createRecordAction(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not_authorised");
    }
  });

  it("rejects malformed input", async () => {
    const result = await createRecordAction({
      ...validInput,
      personId: "not-a-uuid",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_error");
    }
  });

  it("revalidates expected paths on create success", async () => {
    mocks.createRecord.mockResolvedValue({
      ok: true,
      value: { id: "00000000-0000-4000-8000-000000000099" },
    });

    const result = await createRecordAction(validInput);

    expect(result.ok).toBe(true);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/plans");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/calendar");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("revalidates plans and calendar on update success", async () => {
    mocks.updateRecord.mockResolvedValue({
      ok: true,
      value: { id: "00000000-0000-4000-8000-000000000099" },
    });

    const result = await updateRecordAction({
      ...validInput,
      recordId: "00000000-0000-4000-8000-000000000099",
    });

    expect(result.ok).toBe(true);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/plans");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/calendar");
  });

  it("returns not_implemented for submission stubs", async () => {
    const result = await submitForApprovalAction({
      organisationId: validInput.organisationId,
      recordId: "00000000-0000-4000-8000-000000000099",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not_implemented");
    }
  });
});
