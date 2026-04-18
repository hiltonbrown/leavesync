import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  organisationFindFirst: vi.fn(),
  requireOrg: vi.fn(),
}));

vi.mock("@repo/auth/helpers", () => ({
  currentUser: mocks.currentUser,
  requireOrg: mocks.requireOrg,
}));
vi.mock("@repo/database", () => ({
  database: {
    organisation: { findFirst: mocks.organisationFindFirst },
  },
}));
vi.mock("@repo/notifications", () => ({
  subscribeToNotificationStream: vi.fn(() => () => undefined),
}));

const { GET } = await import("./route");

describe("notifications stream route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "user_1" });
    mocks.requireOrg.mockResolvedValue("org_1");
    mocks.organisationFindFirst.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("rejects missing organisation ids", async () => {
    const response = await GET(
      new Request("http://api.test/api/notifications/stream")
    );

    expect(response.status).toBe(400);
  });

  it("rejects organisations outside the Clerk org", async () => {
    mocks.organisationFindFirst.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://api.test/api/notifications/stream?organisationId=00000000-0000-4000-8000-000000000001"
      )
    );

    expect(response.status).toBe(403);
  });

  it("opens an event stream for scoped users", async () => {
    const response = await GET(
      new Request(
        "http://api.test/api/notifications/stream?organisationId=00000000-0000-4000-8000-000000000001"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });
});
