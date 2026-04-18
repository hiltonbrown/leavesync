import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({ database: {} }));

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
}));

const client = {
  notificationEmailQueue: {
    create: mocks.create,
  },
};

const { enqueueNotificationEmail, preferencesUrl } = await import(
  "./email-queue-service"
);

describe("email-queue-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000201",
    });
  });

  it("creates a durable queue row with preference URL", async () => {
    const result = await enqueueNotificationEmail(
      {
        actionUrl: "/plans?recordId=00000000-0000-4000-8000-000000000099",
        body: "Approved.",
        clerkOrgId: "org_1",
        emailTemplate: "LeaveApproved",
        notificationId: "00000000-0000-4000-8000-000000000101",
        notificationType: "leave_approved",
        organisationId: "00000000-0000-4000-8000-000000000001",
        recipientEmail: "ava@example.com",
        recipientUserId: "user_1",
        title: "Leave approved",
      },
      client
    );

    expect(result.ok).toBe(true);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email_template: "LeaveApproved",
          notification_type: "leave_approved",
          unsubscribe_url: expect.stringContaining("focus=leave_approved"),
        }),
      })
    );
  });

  it("builds a non-mutating preferences URL", () => {
    expect(preferencesUrl("leave_submitted")).toContain(
      "/notifications?tab=preferences&focus=leave_submitted"
    );
  });
});
