import type { ClerkOrgId, Result } from "@repo/core";
import { appError } from "@repo/core";
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
