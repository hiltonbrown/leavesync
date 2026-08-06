"use server";

import { currentUser } from "@repo/auth/server";
import type { Result } from "@repo/core";
import {
  getUnreadCount,
  isKnownNotificationType,
  listRecentUnread,
  markAllAsRead,
  markAsRead,
  type NotificationListItem,
  type NotificationPreferenceRow,
  type NotificationServiceError,
  type PreferencesServiceError,
  upsertPreference,
} from "@repo/notifications";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePageRole } from "@/lib/auth/require-page-role";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";

type ActionError =
  | NotificationServiceError
  | PreferencesServiceError
  | { code: "not_authorised"; message: string }
  | { code: "validation_error"; message: string };

const NotificationTypeSchema = z
  .string()
  .refine(isKnownNotificationType, "Unknown notification type.");

const OrganisationSchema = z.object({
  organisationId: z.string().uuid(),
});

const MarkReadSchema = OrganisationSchema.extend({
  notificationId: z.string().uuid(),
});

const PreferenceSchema = OrganisationSchema.extend({
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  notificationType: NotificationTypeSchema,
});

export async function markAsReadAction(input: {
  notificationId: string;
  organisationId: string;
}): Promise<
  Result<
    { notification: NotificationListItem; unreadCount: number },
    ActionError
  >
> {
  const parsed = MarkReadSchema.safeParse(input);
  if (!parsed.success) {
    return validationError("Invalid notification.");
  }
  const context = await actionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }

  const result = await markAsRead({
    clerkOrgId: context.value.clerkOrgId,
    notificationId: parsed.data.notificationId,
    organisationId: context.value.organisationId,
    userId: context.value.userId,
  });
  if (!result.ok) {
    return result;
  }
  revalidatePath("/notifications");
  return result;
}

export async function markAllAsReadAction(input: {
  organisationId: string;
}): Promise<Result<{ markedCount: number; unreadCount: 0 }, ActionError>> {
  const parsed = OrganisationSchema.safeParse(input);
  if (!parsed.success) {
    return validationError("Invalid notification request.");
  }
  const context = await actionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }

  const result = await markAllAsRead({
    clerkOrgId: context.value.clerkOrgId,
    organisationId: context.value.organisationId,
    userId: context.value.userId,
  });
  if (!result.ok) {
    return result;
  }
  revalidatePath("/notifications");
  return result;
}

export async function updatePreferenceAction(input: {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  notificationType: string;
  organisationId: string;
}): Promise<Result<NotificationPreferenceRow, ActionError>> {
  const parsed = PreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(
      parsed.error.issues[0]?.message ?? "Invalid notification preference."
    );
  }
  const context = await actionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }

  const result = await upsertPreference({
    clerkOrgId: context.value.clerkOrgId,
    emailEnabled: parsed.data.emailEnabled,
    inAppEnabled: parsed.data.inAppEnabled,
    notificationType: parsed.data.notificationType,
    organisationId: context.value.organisationId,
    userId: context.value.userId,
  });
  if (!result.ok) {
    return result;
  }
  revalidatePath("/notifications");
  return result;
}

export async function refreshUnreadCountAction(input: {
  organisationId: string;
}): Promise<Result<number, ActionError>> {
  const parsed = OrganisationSchema.safeParse(input);
  if (!parsed.success) {
    return validationError("Invalid notification request.");
  }
  const context = await actionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }
  return await getUnreadCount({
    clerkOrgId: context.value.clerkOrgId,
    organisationId: context.value.organisationId,
    userId: context.value.userId,
  });
}

export async function listRecentUnreadAction(input: {
  organisationId: string;
}): Promise<Result<NotificationListItem[], ActionError>> {
  const parsed = OrganisationSchema.safeParse(input);
  if (!parsed.success) {
    return validationError("Invalid notification request.");
  }
  const context = await actionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }
  return await listRecentUnread({
    clerkOrgId: context.value.clerkOrgId,
    limit: 3,
    organisationId: context.value.organisationId,
    userId: context.value.userId,
  });
}

async function actionContext(
  organisationId: string
): Promise<
  Result<
    { clerkOrgId: string; organisationId: string; userId: string },
    ActionError
  >
> {
  await requirePageRole("org:viewer");
  const user = await currentUser();
  if (!user) {
    return {
      error: {
        code: "not_authorised",
        message: "You need to sign in again.",
      },
      ok: false,
    };
  }
  const context = await getActiveOrgContext(organisationId);
  if (!context.ok) {
    return {
      error: {
        code: "not_authorised",
        message: context.error.message,
      },
      ok: false,
    };
  }
  return {
    ok: true,
    value: {
      clerkOrgId: context.value.clerkOrgId,
      organisationId: context.value.organisationId,
      userId: user.id,
    },
  };
}

function validationError(message: string): Result<never, ActionError> {
  return {
    error: { code: "validation_error", message },
    ok: false,
  };
}
