import { Knock } from "@knocklabs/node";
import type { Result } from "@repo/core";
import { appError } from "@repo/core";
import { database } from "@repo/database";
import type { notification_type } from "@repo/database/generated/enums";
import { keys } from "./keys";

const key = keys().KNOCK_SECRET_API_KEY;

export const notifications = new Knock({ apiKey: key ?? "" });

export interface CreateNotificationInput {
  actionUrl: string;
  actorUserId: string;
  clerkOrgId: string;
  objectId: string;
  objectType: "availability_record";
  payload?: Record<string, string | number | boolean | null>;
  recipientUserId: string;
  type: notification_type;
}

interface NotificationDatabase {
  notification: {
    create: (args: {
      data: {
        clerk_org_id: string;
        payload: {
          action_url: string;
          actor_user_id: string;
          object_id: string;
          object_type: "availability_record";
          payload?: Record<string, string | number | boolean | null>;
        };
        recipient_user_id: string;
        type: notification_type;
      };
    }) => Promise<unknown>;
  };
  notificationPreference: {
    findUnique: (args: {
      select: { in_app_enabled: true };
      where: {
        user_id_clerk_org_id_notification_type: {
          clerk_org_id: string;
          notification_type: notification_type;
          user_id: string;
        };
      };
    }) => Promise<{ in_app_enabled: boolean } | null>;
  };
}

export async function createNotification(
  input: CreateNotificationInput,
  client: NotificationDatabase = database
): Promise<Result<{ created: boolean }>> {
  try {
    const preference = await client.notificationPreference.findUnique({
      select: { in_app_enabled: true },
      where: {
        user_id_clerk_org_id_notification_type: {
          clerk_org_id: input.clerkOrgId,
          notification_type: input.type,
          user_id: input.recipientUserId,
        },
      },
    });

    if (preference?.in_app_enabled === false) {
      return { ok: true, value: { created: false } };
    }

    await client.notification.create({
      data: {
        clerk_org_id: input.clerkOrgId,
        payload: {
          action_url: input.actionUrl,
          actor_user_id: input.actorUserId,
          object_id: input.objectId,
          object_type: input.objectType,
          ...(input.payload ? { payload: input.payload } : {}),
        },
        recipient_user_id: input.recipientUserId,
        type: input.type,
      },
    });

    return { ok: true, value: { created: true } };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to create notification"),
    };
  }
}
