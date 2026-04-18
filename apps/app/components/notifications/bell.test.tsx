import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationsBell } from "./bell";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  subscribe: vi.fn(() => () => undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@repo/notifications/components/provider", () => ({
  useNotificationEvents: () => ({
    connectionVersion: 0,
    status: "open",
    subscribe: mocks.subscribe,
  }),
}));
vi.mock("@/app/(authenticated)/notifications/_actions", () => ({
  listRecentUnreadAction: vi.fn(),
  markAllAsReadAction: vi.fn(),
  markAsReadAction: vi.fn(),
  refreshUnreadCountAction: vi.fn(),
}));

describe("NotificationsBell", () => {
  it("renders server-provided badge and recent unread rows", async () => {
    render(
      <NotificationsBell
        initialRecent={[
          {
            actionUrl: "/plans",
            body: "Ava submitted leave.",
            createdAt: new Date().toISOString(),
            iconKey: "inbox-in",
            id: "n_1",
            title: "Leave submitted",
          },
        ]}
        initialUnreadCount={7}
        organisationId="00000000-0000-4000-8000-000000000001"
      />
    );

    expect(screen.getByLabelText("Notifications, 7 unread")).toBeDefined();
    fireEvent.click(screen.getByLabelText("Notifications, 7 unread"));
    expect(await screen.findByText("Leave submitted")).toBeDefined();
  });

  it("formats large badges as 99+", () => {
    render(
      <NotificationsBell
        initialRecent={[]}
        initialUnreadCount={120}
        organisationId="00000000-0000-4000-8000-000000000001"
      />
    );

    expect(screen.getByText("99+")).toBeDefined();
  });
});
