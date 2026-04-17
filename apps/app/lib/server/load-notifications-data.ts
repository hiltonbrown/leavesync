import "server-only";

import { currentUser } from "@repo/auth/server";
import type { ClerkOrgId, Result } from "@repo/core";
import { appError } from "@repo/core";
import {
  countUnreadNotifications,
  listNotificationPreferencesForUser,
  listNotificationsForUser,
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
    preferences: Array<{
      emailEnabled: boolean;
      inAppEnabled: boolean;
      notificationType: string;
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

    const [unreadResult, preferencesResult] = await Promise.all([
      countUnreadNotifications(clerkOrgId, userId),
      listNotificationPreferencesForUser(clerkOrgId, userId),
    ]);

    if (!unreadResult.ok) {
      return {
        ok: false,
        error: unreadResult.error,
      };
    }

    if (!preferencesResult.ok) {
      return {
        ok: false,
        error: preferencesResult.error,
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
        preferences: preferencesResult.value.map((preference) => ({
          notificationType: preference.notificationType,
          inAppEnabled: preference.inAppEnabled,
          emailEnabled: preference.emailEnabled,
        })),
        unreadCount: unreadResult.value,
      },
    };
  } catch (_error) {
    return {
      ok: false,
      error: appError("internal", "Failed to load notifications"),
    };
  }
}
