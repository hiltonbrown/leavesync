import "server-only";

import { currentUser } from "@repo/auth/server";
import type { ClerkOrgId, OrganisationId, Result } from "@repo/core";
import { appError } from "@repo/core";
import {
  listForUser,
  listPreferences,
  type NotificationFilters,
  type NotificationListItem,
  type NotificationPreferenceRow,
} from "@repo/notifications";

export async function loadNotificationsData(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  filters?: NotificationFilters
): Promise<
  Result<{
    notifications: NotificationListItem[];
    nextCursor: string | null;
    preferences: NotificationPreferenceRow[];
    unreadCount: number;
  }>
> {
  try {
    const user = await currentUser();
    if (!user) {
      return {
        ok: false,
        error: appError("unauthorised", "Not authenticated"),
      };
    }

    const [notificationsResult, preferencesResult] = await Promise.all([
      listForUser({
        clerkOrgId,
        organisationId,
        userId: user.id,
        filters,
      }),
      listPreferences({
        clerkOrgId,
        organisationId,
        userId: user.id,
      }),
    ]);
    if (!notificationsResult.ok) {
      return {
        ok: false,
        error: appError("internal", notificationsResult.error.message),
      };
    }
    if (!preferencesResult.ok) {
      return {
        ok: false,
        error: appError("internal", preferencesResult.error.message),
      };
    }

    return {
      ok: true,
      value: {
        notifications: notificationsResult.value.notifications,
        nextCursor: notificationsResult.value.nextCursor,
        preferences: preferencesResult.value,
        unreadCount: notificationsResult.value.unreadCount,
      },
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to load notifications"),
    };
  }
}
