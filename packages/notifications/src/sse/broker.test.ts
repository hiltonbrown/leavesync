import { describe, expect, it, vi } from "vitest";
import {
  publishNotificationEvent,
  subscribeToNotificationStream,
} from "./broker";

describe("notification SSE broker", () => {
  it("delivers events only to the exact user and organisation key", () => {
    const matching = vi.fn();
    const otherOrg = vi.fn();
    const otherUser = vi.fn();

    const unsubscribeMatching = subscribeToNotificationStream(
      { organisationId: "org-a", userId: "user-a" },
      matching
    );
    const unsubscribeOtherOrg = subscribeToNotificationStream(
      { organisationId: "org-b", userId: "user-a" },
      otherOrg
    );
    const unsubscribeOtherUser = subscribeToNotificationStream(
      { organisationId: "org-a", userId: "user-b" },
      otherUser
    );

    publishNotificationEvent(
      { organisationId: "org-a", userId: "user-a" },
      {
        type: "notification.all_read",
        payload: { unreadCount: 0 },
      }
    );

    expect(matching).toHaveBeenCalledTimes(1);
    expect(otherOrg).not.toHaveBeenCalled();
    expect(otherUser).not.toHaveBeenCalled();

    unsubscribeMatching();
    unsubscribeOtherOrg();
    unsubscribeOtherUser();
  });
});
