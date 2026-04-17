import type { ClerkOrgId, Result } from "@repo/core";
import { appError } from "@repo/core";
import type { notification_type } from "../../generated/enums";
import { database } from "../client";

export interface NotificationData {
  clerkOrgId: string;
  createdAt: Date;
  id: string;
  isRead: boolean;
  payload: unknown;
  recipientUserId: string;
  type: string;
  updatedAt: Date;
}

export interface NotificationPreferenceData {
  clerkOrgId: string;
  createdAt: Date;
  emailEnabled: boolean;
  id: string;
  inAppEnabled: boolean;
  notificationType: string;
  updatedAt: Date;
  userId: string;
}

interface NotificationFilters {
  isRead?: boolean;
  types?: string[];
}

export async function listNotificationsForUser(
  clerkOrgId: ClerkOrgId,
  userId: string,
  filters?: NotificationFilters
): Promise<Result<NotificationData[]>> {
  try {
    const whereConditions: Record<string, unknown> = {
      clerk_org_id: clerkOrgId,
      recipient_user_id: userId,
    };

    if (filters?.isRead !== undefined) {
      whereConditions.is_read = filters.isRead;
    }
    if (filters?.types && filters.types.length > 0) {
      whereConditions.type = { in: filters.types };
    }

    const notifications = await database.notification.findMany({
      where: whereConditions,
      select: {
        id: true,
        clerk_org_id: true,
        recipient_user_id: true,
        type: true,
        payload: true,
        is_read: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
    });

    return {
      ok: true,
      value: notifications.map((n) => ({
        id: n.id,
        clerkOrgId: n.clerk_org_id,
        recipientUserId: n.recipient_user_id,
        type: n.type,
        payload: n.payload,
        isRead: n.is_read,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      })),
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to list notifications"),
    };
  }
}

export async function countUnreadNotifications(
  clerkOrgId: ClerkOrgId,
  userId: string
): Promise<Result<number>> {
  try {
    const count = await database.notification.count({
      where: {
        clerk_org_id: clerkOrgId,
        recipient_user_id: userId,
        is_read: false,
      },
    });

    return {
      ok: true,
      value: count,
    };
  } catch (_error) {
    return {
      ok: false,
      error: appError("internal", "Failed to count unread notifications"),
    };
  }
}

export async function markNotificationRead(
  clerkOrgId: ClerkOrgId,
  userId: string,
  notificationId: string
): Promise<Result<void>> {
  try {
    await database.notification.updateMany({
      where: {
        id: notificationId,
        clerk_org_id: clerkOrgId,
        recipient_user_id: userId,
      },
      data: {
        is_read: true,
      },
    });

    return {
      ok: true,
      value: undefined,
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to mark notification as read"),
    };
  }
}

export async function markAllNotificationsRead(
  clerkOrgId: ClerkOrgId,
  userId: string
): Promise<Result<{ updatedCount: number }>> {
  try {
    const result = await database.notification.updateMany({
      where: {
        clerk_org_id: clerkOrgId,
        recipient_user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });

    return {
      ok: true,
      value: { updatedCount: result.count },
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to mark notifications as read"),
    };
  }
}

export async function listNotificationPreferencesForUser(
  clerkOrgId: ClerkOrgId,
  userId: string
): Promise<Result<NotificationPreferenceData[]>> {
  try {
    const preferences = await database.notificationPreference.findMany({
      where: {
        clerk_org_id: clerkOrgId,
        user_id: userId,
      },
      select: {
        id: true,
        user_id: true,
        clerk_org_id: true,
        notification_type: true,
        in_app_enabled: true,
        email_enabled: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { notification_type: "asc" },
    });

    return {
      ok: true,
      value: preferences.map((preference) => ({
        id: preference.id,
        userId: preference.user_id,
        clerkOrgId: preference.clerk_org_id,
        notificationType: preference.notification_type,
        inAppEnabled: preference.in_app_enabled,
        emailEnabled: preference.email_enabled,
        createdAt: preference.created_at,
        updatedAt: preference.updated_at,
      })),
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to list notification preferences"),
    };
  }
}

export async function upsertNotificationPreference(
  clerkOrgId: ClerkOrgId,
  userId: string,
  input: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
    notificationType: notification_type;
  }
): Promise<Result<NotificationPreferenceData>> {
  try {
    const preference = await database.notificationPreference.upsert({
      where: {
        user_id_clerk_org_id_notification_type: {
          user_id: userId,
          clerk_org_id: clerkOrgId,
          notification_type: input.notificationType,
        },
      },
      create: {
        user_id: userId,
        clerk_org_id: clerkOrgId,
        notification_type: input.notificationType,
        in_app_enabled: input.inAppEnabled,
        email_enabled: input.emailEnabled,
      },
      update: {
        in_app_enabled: input.inAppEnabled,
        email_enabled: input.emailEnabled,
      },
      select: {
        id: true,
        user_id: true,
        clerk_org_id: true,
        notification_type: true,
        in_app_enabled: true,
        email_enabled: true,
        created_at: true,
        updated_at: true,
      },
    });

    return {
      ok: true,
      value: {
        id: preference.id,
        userId: preference.user_id,
        clerkOrgId: preference.clerk_org_id,
        notificationType: preference.notification_type,
        inAppEnabled: preference.in_app_enabled,
        emailEnabled: preference.email_enabled,
        createdAt: preference.created_at,
        updatedAt: preference.updated_at,
      },
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to update notification preference"),
    };
  }
}
