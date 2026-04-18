import type { ClerkOrgId, OrganisationId, Result } from "@repo/core";
import { appError } from "@repo/core";
import type { notification_type } from "../../generated/enums";
import { database } from "../client";

export interface NotificationData {
  actionUrl: string | null;
  body: string;
  clerkOrgId: string;
  createdAt: Date;
  id: string;
  organisationId: string;
  readAt: Date | null;
  recipientUserId: string;
  title: string;
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
  organisationId: string;
  updatedAt: Date;
  userId: string;
}

interface NotificationFilters {
  isRead?: boolean;
  types?: notification_type[];
}

export async function listNotificationsForUser(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  userId: string,
  filters?: NotificationFilters
): Promise<Result<NotificationData[]>> {
  try {
    const notifications = await database.notification.findMany({
      where: {
        clerk_org_id: clerkOrgId,
        organisation_id: organisationId,
        recipient_user_id: userId,
        ...(filters?.isRead === true ? { read_at: { not: null } } : {}),
        ...(filters?.isRead === false ? { read_at: null } : {}),
        ...(filters?.types?.length ? { type: { in: filters.types } } : {}),
      },
      select: {
        id: true,
        clerk_org_id: true,
        organisation_id: true,
        recipient_user_id: true,
        type: true,
        title: true,
        body: true,
        action_url: true,
        read_at: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
    });

    return {
      ok: true,
      value: notifications.map((notification) => ({
        id: notification.id,
        clerkOrgId: notification.clerk_org_id,
        organisationId: notification.organisation_id,
        recipientUserId: notification.recipient_user_id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        actionUrl: notification.action_url,
        readAt: notification.read_at,
        createdAt: notification.created_at,
        updatedAt: notification.updated_at,
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
  organisationId: OrganisationId,
  userId: string
): Promise<Result<number>> {
  try {
    const count = await database.notification.count({
      where: {
        clerk_org_id: clerkOrgId,
        organisation_id: organisationId,
        recipient_user_id: userId,
        read_at: null,
      },
    });
    return { ok: true, value: count };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to count unread notifications"),
    };
  }
}

export async function markNotificationRead(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  userId: string,
  notificationId: string
): Promise<Result<void>> {
  try {
    await database.notification.updateMany({
      where: {
        id: notificationId,
        clerk_org_id: clerkOrgId,
        organisation_id: organisationId,
        recipient_user_id: userId,
        read_at: null,
      },
      data: { read_at: new Date() },
    });
    return { ok: true, value: undefined };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to mark notification as read"),
    };
  }
}

export async function markAllNotificationsRead(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  userId: string
): Promise<Result<{ updatedCount: number }>> {
  try {
    const result = await database.notification.updateMany({
      where: {
        clerk_org_id: clerkOrgId,
        organisation_id: organisationId,
        recipient_user_id: userId,
        read_at: null,
      },
      data: { read_at: new Date() },
    });
    return { ok: true, value: { updatedCount: result.count } };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to mark notifications as read"),
    };
  }
}

export async function listNotificationPreferencesForUser(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  userId: string
): Promise<Result<NotificationPreferenceData[]>> {
  try {
    const preferences = await database.notificationPreference.findMany({
      where: {
        clerk_org_id: clerkOrgId,
        organisation_id: organisationId,
        user_id: userId,
      },
      select: {
        id: true,
        user_id: true,
        clerk_org_id: true,
        organisation_id: true,
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
        organisationId: preference.organisation_id,
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
  organisationId: OrganisationId,
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
        user_id_organisation_id_notification_type: {
          user_id: userId,
          organisation_id: organisationId,
          notification_type: input.notificationType,
        },
      },
      create: {
        user_id: userId,
        clerk_org_id: clerkOrgId,
        organisation_id: organisationId,
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
        organisation_id: true,
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
        organisationId: preference.organisation_id,
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
