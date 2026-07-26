import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NotificationsClient,
  usePrefersReducedMotion,
} from "./notifications-client";

vi.mock("next/navigation", () => ({
  usePathname: () => "/notifications",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@repo/notifications/components/provider", () => ({
  useNotificationEvents: () => ({ subscribe: vi.fn(() => () => undefined) }),
}));
vi.mock("./_actions", () => ({
  markAllAsReadAction: vi.fn(),
  markAsReadAction: vi.fn(),
  updatePreferenceAction: vi.fn(),
}));

describe("usePrefersReducedMotion", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("handles reduced motion preference, preference changes, and listener cleanup", () => {
    let listener: ((event: MediaQueryListEvent) => void) | null = null;
    const removeEventListener = vi.fn();
    const addEventListener = vi.fn(
      (_event: string, cb: (e: MediaQueryListEvent) => void) => {
        listener = cb;
      }
    );

    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      addEventListener,
      addListener: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener,
      removeListener: vi.fn(),
    }));

    vi.stubGlobal("matchMedia", matchMediaMock);

    const { result, unmount } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    expect(addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );

    act(() => {
      if (listener) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });
    expect(result.current).toBe(true);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });
});

describe("NotificationsClient", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders unread items without border-l-2 side stripe", () => {
    const { container } = render(
      <NotificationsClient
        filters={{
          category: [],
          cursor: null,
          dateFrom: null,
          dateTo: null,
          focus: null,
          tab: "feed",
          type: [],
          unreadOnly: false,
        }}
        nextCursor={null}
        notifications={[
          {
            actionLabel: "View",
            actionUrl: null,
            body: "Test body",
            category: "leave_lifecycle",
            createdAt: new Date().toISOString(),
            iconKey: "inbox-in",
            id: "n1",
            isUnread: true,
            label: "test",
            objectId: null,
            objectType: null,
            readAt: null,
            title: "Unread title",
            type: "leave_submitted",
          },
        ]}
        notificationTypes={[]}
        organisationId="org-1"
        orgQueryValue={null}
        preferences={[]}
        unreadCount={1}
      />
    );

    const article = container.querySelector("article");
    expect(article).not.toBeNull();
    expect(article?.className).not.toContain("border-l-2");
    expect(article?.className).toContain("bg-primary/10");
  });
});
