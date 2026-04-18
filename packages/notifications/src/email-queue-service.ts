import "server-only";

import type { Result } from "@repo/core";
import { type Database, database } from "@repo/database";
import { notification_type as notificationTypes } from "@repo/database/generated/enums";
import { z } from "zod";

export type EmailQueueServiceError =
  | { code: "unknown_error"; message: string }
  | { code: "validation_error"; message: string };

export interface EmailQueueDatabase {
  notificationEmailQueue: Pick<Database["notificationEmailQueue"], "create">;
}

const QueueSchema = z.object({
  actionUrl: z.string().nullable().optional(),
  body: z.string().min(1),
  clerkOrgId: z.string().min(1),
  emailTemplate: z.string().min(1),
  notificationId: z.string().uuid().nullable().optional(),
  notificationType: z.string().min(1),
  organisationId: z.string().uuid(),
  recipientEmail: z.string().email(),
  recipientUserId: z.string().min(1),
  title: z.string().min(1),
});

export async function enqueueNotificationEmail(
  input: z.input<typeof QueueSchema>,
  client: EmailQueueDatabase = database
): Promise<
  Result<{ queued: boolean; queueId: string }, EmailQueueServiceError>
> {
  const parsed = QueueSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  if (!isNotificationType(parsed.data.notificationType)) {
    return validationErrorMessage("Invalid notification type.");
  }

  try {
    const unsubscribeUrl = preferencesUrl(parsed.data.notificationType);
    const row = await client.notificationEmailQueue.create({
      data: {
        clerk_org_id: parsed.data.clerkOrgId,
        organisation_id: parsed.data.organisationId,
        notification_id: parsed.data.notificationId ?? null,
        recipient_user_id: parsed.data.recipientUserId,
        notification_type: parsed.data.notificationType,
        email_template: parsed.data.emailTemplate,
        recipient_email: parsed.data.recipientEmail,
        title: parsed.data.title,
        body: parsed.data.body,
        action_url: parsed.data.actionUrl ?? null,
        unsubscribe_url: unsubscribeUrl,
        merge_data: {
          actionUrl: parsed.data.actionUrl ?? null,
          unsubscribeUrl,
        },
      },
      select: { id: true },
    });
    return { ok: true, value: { queued: true, queueId: row.id } };
  } catch {
    return unknownError("Failed to queue notification email.");
  }
}

export function preferencesUrl(notificationType: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/notifications", baseUrl);
  url.searchParams.set("tab", "preferences");
  url.searchParams.set("focus", notificationType);
  return url.toString();
}

function validationError(
  error: z.ZodError
): Result<never, EmailQueueServiceError> {
  return {
    ok: false,
    error: {
      code: "validation_error",
      message: error.issues[0]?.message ?? "Invalid email queue request.",
    },
  };
}

function validationErrorMessage(
  message: string
): Result<never, EmailQueueServiceError> {
  return { ok: false, error: { code: "validation_error", message } };
}

function unknownError(message: string): Result<never, EmailQueueServiceError> {
  return { ok: false, error: { code: "unknown_error", message } };
}

function isNotificationType(
  value: string
): value is (typeof notificationTypes)[keyof typeof notificationTypes] {
  return Object.values(notificationTypes).some((type) => type === value);
}
