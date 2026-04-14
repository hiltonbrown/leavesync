import "server-only";

import type { ClerkOrgId, Result } from "@repo/core";
import { appError } from "@repo/core";
import { currentUser } from "@repo/auth";
import {
  listNotificationsForUser,
  countUnreadNotifications,
} from "@repo/database/src/queries/notifications";

/**
 * Loads notifications data for the current authenticated user.
 * Includes all notifications and unread count.
 */
export async function loadNotificationsData(
  clerkOrgId: ClerkOrgId,
  filters?: {
    isRead?: boolean;
    types?: string[];
  }
): Promise<
  Result<{
    notifications: Array<{
      id: string;
      type: string;
      payload: unknown;
      isRead: boolean;
      createdAt: Date;
    }>;
    unreadCount: number;
  }>
> {
  try {
    // Get current user
    const user = await currentUser();
    if (!user) {
      return {
        ok: false,
        error: appError("unauthorised", "Not authenticated"),
      };
    }

    const userId = user.id;

    // Load notifications
    const notificationsResult = await listNotificationsForUser(
      clerkOrgId,
      userId,
      filters
    );

    if (!notificationsResult.ok) {
      return {
        ok: false,
        error: notificationsResult.error,
      };
    }

    // Count unread
    const unreadResult = await countUnreadNotifications(clerkOrgId, userId);

    if (!unreadResult.ok) {
      return {
        ok: false,
        error: unreadResult.error,
      };
    }

    return {
      ok: true,
      value: {
        notifications: notificationsResult.value.map((notification) => ({
          id: notification.id,
          type: notification.type,
          payload: notification.payload,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        })),
        unreadCount: unreadResult.value,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: appError("internal", "Failed to load notifications"),
    };
  }
}
