"use server";

import { currentUser } from "@repo/auth/server";
import type { ClerkOrgId } from "@repo/core";
import {
  markAllNotificationsRead,
  markNotificationRead,
  upsertNotificationPreference,
} from "@repo/database/src/queries";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";

const NotificationTypeSchema = z.enum([
  "sync_failed",
  "feed_token_rotated",
  "privacy_conflict",
  "missing_alternative_contact",
]);

const MarkNotificationReadSchema = z.object({
  notificationId: z.string().uuid(),
  org: z.string().uuid().optional(),
});

const MarkAllNotificationsReadSchema = z.object({
  org: z.string().uuid().optional(),
});

const UpdateNotificationPreferenceSchema = z.object({
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  notificationType: NotificationTypeSchema,
  org: z.string().uuid().optional(),
});

export type NotificationActionResult =
  | { ok: true; updatedCount?: number }
  | { ok: false; error: string };

export async function markNotificationReadAction(
  input: z.infer<typeof MarkNotificationReadSchema>
): Promise<NotificationActionResult> {
  const parsed = MarkNotificationReadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid notification" };
  }

  const contextResult = await getNotificationActionContext(parsed.data.org);
  if (!contextResult.ok) {
    return { ok: false, error: contextResult.error };
  }

  const result = await markNotificationRead(
    contextResult.clerkOrgId,
    contextResult.userId,
    parsed.data.notificationId
  );

  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  revalidateNotifications();
  return { ok: true, updatedCount: 1 };
}

export async function markAllNotificationsReadAction(
  input: z.infer<typeof MarkAllNotificationsReadSchema>
): Promise<NotificationActionResult> {
  const parsed = MarkAllNotificationsReadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid notification request" };
  }

  const contextResult = await getNotificationActionContext(parsed.data.org);
  if (!contextResult.ok) {
    return { ok: false, error: contextResult.error };
  }

  const result = await markAllNotificationsRead(
    contextResult.clerkOrgId,
    contextResult.userId
  );

  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  revalidateNotifications();
  return { ok: true, updatedCount: result.value.updatedCount };
}

export async function updateNotificationPreferenceAction(
  input: z.infer<typeof UpdateNotificationPreferenceSchema>
): Promise<NotificationActionResult> {
  const parsed = UpdateNotificationPreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid notification preference" };
  }

  const contextResult = await getNotificationActionContext(parsed.data.org);
  if (!contextResult.ok) {
    return { ok: false, error: contextResult.error };
  }

  const result = await upsertNotificationPreference(
    contextResult.clerkOrgId,
    contextResult.userId,
    {
      notificationType: parsed.data.notificationType,
      inAppEnabled: parsed.data.inAppEnabled,
      emailEnabled: parsed.data.emailEnabled,
    }
  );

  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  revalidateNotifications();
  return { ok: true };
}

async function getNotificationActionContext(org?: string): Promise<
  | {
      ok: true;
      clerkOrgId: ClerkOrgId;
      userId: string;
    }
  | { ok: false; error: string }
> {
  const user = await currentUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const { clerkOrgId } = await requireActiveOrgPageContext(org);
  return { ok: true, clerkOrgId, userId: user.id };
}

function revalidateNotifications(): void {
  revalidatePath("/");
  revalidatePath("/notifications");
}
