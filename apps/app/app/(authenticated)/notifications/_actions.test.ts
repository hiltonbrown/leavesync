import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getActiveOrgContext: vi.fn(),
  getUnreadCount: vi.fn(),
  listRecentUnread: vi.fn(),
  markAllAsRead: vi.fn(),
  markAsRead: vi.fn(),
  requirePageRole: vi.fn(),
  revalidatePath: vi.fn(),
  upsertPreference: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  currentUser: mocks.currentUser,
}));
vi.mock("@repo/notifications", () => ({
  getUnreadCount: mocks.getUnreadCount,
  isKnownNotificationType: (value: string) => value === "leave_submitted",
  listRecentUnread: mocks.listRecentUnread,
  markAllAsRead: mocks.markAllAsRead,
  markAsRead: mocks.markAsRead,
  upsertPreference: mocks.upsertPreference,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/lib/auth/require-page-role", () => ({
  requirePageRole: mocks.requirePageRole,
}));
vi.mock("@/lib/server/get-active-org-context", () => ({
  getActiveOrgContext: mocks.getActiveOrgContext,
}));

const { markAllAsReadAction, markAsReadAction, updatePreferenceAction } =
  await import("./_actions");

const organisationId = "00000000-0000-4000-8000-000000000001";

describe("notification actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "user_1" });
    mocks.getActiveOrgContext.mockResolvedValue({
      ok: true,
      value: { clerkOrgId: "org_1", organisationId },
    });
    mocks.markAsRead.mockResolvedValue({
      ok: true,
      value: { notification: {}, unreadCount: 1 },
    });
    mocks.markAllAsRead.mockResolvedValue({
      ok: true,
      value: { markedCount: 2, unreadCount: 0 },
    });
    mocks.upsertPreference.mockResolvedValue({
      ok: true,
      value: { type: "leave_submitted" },
    });
  });

  it("validates markAsRead input", async () => {
    const result = await markAsReadAction({
      notificationId: "nope",
      organisationId,
    });

    expect(result.ok).toBe(false);
  });

  it("marks one notification read and revalidates notifications", async () => {
    const result = await markAsReadAction({
      notificationId: "00000000-0000-4000-8000-000000000099",
      organisationId,
    });

    expect(result.ok).toBe(true);
    expect(mocks.markAsRead).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId, userId: "user_1" })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/notifications");
  });

  it("marks all read and updates preferences through services", async () => {
    await expect(
      markAllAsReadAction({ organisationId })
    ).resolves.toMatchObject({
      ok: true,
    });
    await expect(
      updatePreferenceAction({
        organisationId,
        notificationType: "leave_submitted",
        inAppEnabled: true,
        emailEnabled: false,
      })
    ).resolves.toMatchObject({ ok: true });
  });
});
