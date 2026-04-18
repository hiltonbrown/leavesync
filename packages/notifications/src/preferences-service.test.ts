import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({ database: {} }));

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

const client = {
  notificationPreference: {
    findMany: mocks.findMany,
    findUnique: mocks.findUnique,
    upsert: mocks.upsert,
  },
};

const { listPreferences, shouldDeliverToChannel, upsertPreference } =
  await import("./preferences-service");

const input = {
  clerkOrgId: "org_1",
  organisationId: "00000000-0000-4000-8000-000000000001",
  userId: "user_1",
};

describe("preferences-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.findUnique.mockResolvedValue(null);
  });

  it("returns defaults for every registry type", async () => {
    const result = await listPreferences(input, client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(10);
      expect(result.value.every((row) => row.isDefault)).toBe(true);
    }
  });

  it("uses stored preferences over defaults", async () => {
    mocks.findMany.mockResolvedValue([
      {
        notification_type: "leave_submitted",
        in_app_enabled: false,
        email_enabled: true,
      },
    ]);

    const result = await listPreferences(input, client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.value.find((row) => row.type === "leave_submitted")
      ).toMatchObject({
        emailEnabled: true,
        inAppEnabled: false,
        isDefault: false,
      });
    }
  });

  it("rejects both channels disabled", async () => {
    const result = await upsertPreference(
      {
        ...input,
        notificationType: "leave_submitted",
        inAppEnabled: false,
        emailEnabled: false,
      },
      client
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("at_least_one_channel_required");
    }
  });

  it("falls back to registry defaults for delivery checks", async () => {
    const result = await shouldDeliverToChannel(
      {
        ...input,
        notificationType: "leave_withdrawn",
        channel: "email",
      },
      client
    );

    expect(result).toEqual({ ok: true, value: false });
  });
});
