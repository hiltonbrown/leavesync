import "server-only";

import type { Result } from "@repo/core";
import { type Database, database } from "@repo/database";
import type { notification_type } from "@repo/database/generated/enums";
import { z } from "zod";
import {
  getDefaultChannels,
  getTypeConfig,
  isKnownNotificationType,
  listAllTypes,
  type NotificationCategory,
} from "./types/notification-type-registry";

export type PreferencesServiceError =
  | { code: "at_least_one_channel_required"; message: string }
  | { code: "cross_org_leak"; message: string }
  | { code: "invalid_type"; message: string }
  | { code: "unknown_error"; message: string }
  | { code: "validation_error"; message: string };

export interface NotificationPreferenceRow {
  category: NotificationCategory;
  description: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  isDefault: boolean;
  label: string;
  type: notification_type;
}

export interface PreferencesServiceDatabase {
  notificationPreference: Pick<
    Database["notificationPreference"],
    "findMany" | "findUnique" | "upsert"
  >;
}

const ScopedUserSchema = z.object({
  clerkOrgId: z.string().min(1),
  organisationId: z.string().uuid(),
  userId: z.string().min(1),
});

const UpsertSchema = ScopedUserSchema.extend({
  notificationType: z.string().min(1),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
});

const ChannelSchema = ScopedUserSchema.extend({
  notificationType: z.string().min(1),
  channel: z.enum(["email", "in_app"]),
});

export async function listPreferences(
  input: z.input<typeof ScopedUserSchema>,
  client: PreferencesServiceDatabase = database
): Promise<Result<NotificationPreferenceRow[], PreferencesServiceError>> {
  const parsed = ScopedUserSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const storedRows = await client.notificationPreference.findMany({
      where: {
        clerk_org_id: parsed.data.clerkOrgId,
        organisation_id: parsed.data.organisationId,
        user_id: parsed.data.userId,
      },
      select: {
        notification_type: true,
        in_app_enabled: true,
        email_enabled: true,
      },
    });
    const stored = new Map(
      storedRows.map((row) => [row.notification_type, row])
    );
    return {
      ok: true,
      value: listAllTypes().map((config) => {
        const row = stored.get(config.type);
        return {
          type: config.type,
          label: config.label,
          description: config.description,
          category: config.userFacingCategory,
          inAppEnabled: row?.in_app_enabled ?? config.defaultChannels.inApp,
          emailEnabled: row?.email_enabled ?? config.defaultChannels.email,
          isDefault: !row,
        };
      }),
    };
  } catch {
    return unknownError("Failed to load notification preferences.");
  }
}

export async function upsertPreference(
  input: z.input<typeof UpsertSchema>,
  client: PreferencesServiceDatabase = database
): Promise<Result<NotificationPreferenceRow, PreferencesServiceError>> {
  const parsed = UpsertSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  if (!isKnownNotificationType(parsed.data.notificationType)) {
    return invalidType();
  }
  if (!(parsed.data.inAppEnabled || parsed.data.emailEnabled)) {
    return {
      ok: false,
      error: {
        code: "at_least_one_channel_required",
        message: "At least one notification channel must be enabled.",
      },
    };
  }

  try {
    const row = await client.notificationPreference.upsert({
      where: {
        user_id_organisation_id_notification_type: {
          user_id: parsed.data.userId,
          organisation_id: parsed.data.organisationId,
          notification_type: parsed.data.notificationType,
        },
      },
      create: {
        user_id: parsed.data.userId,
        clerk_org_id: parsed.data.clerkOrgId,
        organisation_id: parsed.data.organisationId,
        notification_type: parsed.data.notificationType,
        in_app_enabled: parsed.data.inAppEnabled,
        email_enabled: parsed.data.emailEnabled,
      },
      update: {
        in_app_enabled: parsed.data.inAppEnabled,
        email_enabled: parsed.data.emailEnabled,
      },
      select: {
        notification_type: true,
        in_app_enabled: true,
        email_enabled: true,
      },
    });
    return {
      ok: true,
      value: toPreferenceRow(row.notification_type, {
        inAppEnabled: row.in_app_enabled,
        emailEnabled: row.email_enabled,
        isDefault: false,
      }),
    };
  } catch {
    return unknownError("Failed to update notification preference.");
  }
}

export async function shouldDeliverToChannel(
  input: z.input<typeof ChannelSchema>,
  client: PreferencesServiceDatabase = database
): Promise<Result<boolean, PreferencesServiceError>> {
  const parsed = ChannelSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  if (!isKnownNotificationType(parsed.data.notificationType)) {
    return invalidType();
  }

  try {
    const row = await client.notificationPreference.findUnique({
      where: {
        user_id_organisation_id_notification_type: {
          user_id: parsed.data.userId,
          organisation_id: parsed.data.organisationId,
          notification_type: parsed.data.notificationType,
        },
      },
      select: {
        in_app_enabled: true,
        email_enabled: true,
      },
    });
    if (row) {
      return {
        ok: true,
        value:
          parsed.data.channel === "in_app"
            ? row.in_app_enabled
            : row.email_enabled,
      };
    }
    const defaults = getDefaultChannels(parsed.data.notificationType);
    return {
      ok: true,
      value: parsed.data.channel === "in_app" ? defaults.inApp : defaults.email,
    };
  } catch {
    return unknownError("Failed to check notification preference.");
  }
}

function toPreferenceRow(
  type: notification_type,
  values: {
    inAppEnabled: boolean;
    emailEnabled: boolean;
    isDefault: boolean;
  }
): NotificationPreferenceRow {
  const config = getTypeConfig(type);
  return {
    type,
    label: config.label,
    description: config.description,
    category: config.userFacingCategory,
    inAppEnabled: values.inAppEnabled,
    emailEnabled: values.emailEnabled,
    isDefault: values.isDefault,
  };
}

function invalidType(): Result<never, PreferencesServiceError> {
  return {
    ok: false,
    error: {
      code: "invalid_type",
      message: "Unknown notification type.",
    },
  };
}

function validationError(
  error: z.ZodError
): Result<never, PreferencesServiceError> {
  return {
    ok: false,
    error: {
      code: "validation_error",
      message:
        error.issues[0]?.message ?? "Invalid notification preference request.",
    },
  };
}

function unknownError(message: string): Result<never, PreferencesServiceError> {
  return { ok: false, error: { code: "unknown_error", message } };
}
