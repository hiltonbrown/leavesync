import type { notification_type } from "@repo/database/generated/enums";
import { notification_type as notificationTypes } from "@repo/database/generated/enums";

export type NotificationCategory =
  | "approval_flow"
  | "leave_lifecycle"
  | "sync"
  | "system";

export interface NotificationTypeConfig {
  actionLabel: string;
  defaultChannels: { inApp: boolean; email: boolean };
  description: string;
  emailTemplate: string | null;
  iconKey: string;
  label: string;
  shortLabel: string;
  supportsActionUrl: boolean;
  type: notification_type;
  userFacingCategory: NotificationCategory;
}

const CATEGORY_ORDER: NotificationCategory[] = [
  "leave_lifecycle",
  "approval_flow",
  "sync",
  "system",
];

const REGISTRY = [
  {
    type: "leave_approved",
    label: "Leave approved",
    shortLabel: "Leave approved",
    iconKey: "check-circle",
    description: "A submitted leave request has been approved.",
    defaultChannels: { inApp: true, email: true },
    supportsActionUrl: true,
    userFacingCategory: "leave_lifecycle",
    emailTemplate: "LeaveApproved",
    actionLabel: "View record",
  },
  {
    type: "leave_declined",
    label: "Leave declined",
    shortLabel: "Leave declined",
    iconKey: "x-circle",
    description: "A submitted leave request has been declined.",
    defaultChannels: { inApp: true, email: true },
    supportsActionUrl: true,
    userFacingCategory: "leave_lifecycle",
    emailTemplate: "LeaveDeclined",
    actionLabel: "View record",
  },
  {
    type: "leave_info_requested",
    label: "More information requested",
    shortLabel: "Info requested",
    iconKey: "message-circle",
    description: "A manager has asked for more information about leave.",
    defaultChannels: { inApp: true, email: true },
    supportsActionUrl: true,
    userFacingCategory: "leave_lifecycle",
    emailTemplate: "LeaveInfoRequested",
    actionLabel: "View request",
  },
  {
    type: "missing_alternative_contact",
    label: "Missing alternative contact",
    shortLabel: "Alternative contact",
    iconKey: "user-plus",
    description: "A record needs an alternative contact before publishing.",
    defaultChannels: { inApp: true, email: true },
    supportsActionUrl: true,
    userFacingCategory: "leave_lifecycle",
    emailTemplate: "MissingAlternativeContact",
    actionLabel: "View record",
  },
  {
    type: "leave_submitted",
    label: "Leave submitted for approval",
    shortLabel: "Leave submitted",
    iconKey: "inbox-in",
    description: "A team member has submitted leave for approval.",
    defaultChannels: { inApp: true, email: true },
    supportsActionUrl: true,
    userFacingCategory: "approval_flow",
    emailTemplate: "LeaveSubmitted",
    actionLabel: "View request",
  },
  {
    type: "leave_withdrawn",
    label: "Leave withdrawn",
    shortLabel: "Leave withdrawn",
    iconKey: "reply",
    description: "A submitted leave request has been withdrawn.",
    defaultChannels: { inApp: true, email: false },
    supportsActionUrl: true,
    userFacingCategory: "approval_flow",
    emailTemplate: null,
    actionLabel: "View request",
  },
  {
    type: "leave_xero_sync_failed",
    label: "Xero sync failed",
    shortLabel: "Sync failed",
    iconKey: "alert-triangle",
    description: "A leave action could not be written to Xero.",
    defaultChannels: { inApp: true, email: true },
    supportsActionUrl: true,
    userFacingCategory: "sync",
    emailTemplate: "LeaveXeroSyncFailed",
    actionLabel: "Review failure",
  },
  {
    type: "sync_failed",
    label: "Sync failed",
    shortLabel: "Sync failed",
    iconKey: "alert-triangle",
    description: "A background Xero sync needs attention.",
    defaultChannels: { inApp: true, email: true },
    supportsActionUrl: true,
    userFacingCategory: "sync",
    emailTemplate: "SyncFailed",
    actionLabel: "Open sync run",
  },
  {
    type: "feed_token_rotated",
    label: "Feed token rotated",
    shortLabel: "Token rotated",
    iconKey: "key-round",
    description: "A calendar feed token has been rotated.",
    defaultChannels: { inApp: true, email: true },
    supportsActionUrl: true,
    userFacingCategory: "system",
    emailTemplate: "FeedTokenRotated",
    actionLabel: "Open feed",
  },
  {
    type: "privacy_conflict",
    label: "Privacy conflict",
    shortLabel: "Privacy conflict",
    iconKey: "shield-alert",
    description: "A publication rule needs privacy review.",
    defaultChannels: { inApp: true, email: true },
    supportsActionUrl: true,
    userFacingCategory: "system",
    emailTemplate: "PrivacyConflict",
    actionLabel: "Review",
  },
] as const satisfies readonly NotificationTypeConfig[];

const registryByType = new Map<notification_type, NotificationTypeConfig>(
  REGISTRY.map((config) => [config.type, config])
);

const fallbackConfig: NotificationTypeConfig = {
  type: "sync_failed",
  label: "Notification",
  shortLabel: "Notification",
  iconKey: "bell",
  description: "Operational notification.",
  defaultChannels: { inApp: true, email: true },
  supportsActionUrl: false,
  userFacingCategory: "system",
  emailTemplate: null,
  actionLabel: "View",
};

export function getTypeConfig(type: notification_type): NotificationTypeConfig {
  return registryByType.get(type) ?? { ...fallbackConfig, type };
}

export function listAllTypes(): NotificationTypeConfig[] {
  return [...REGISTRY].sort((left, right) => {
    const categoryDelta =
      CATEGORY_ORDER.indexOf(left.userFacingCategory) -
      CATEGORY_ORDER.indexOf(right.userFacingCategory);
    return categoryDelta === 0
      ? left.label.localeCompare(right.label)
      : categoryDelta;
  });
}

export function listKnownNotificationTypes(): notification_type[] {
  return Object.values(notificationTypes);
}

export function getDefaultChannels(type: notification_type): {
  inApp: boolean;
  email: boolean;
} {
  return getTypeConfig(type).defaultChannels;
}

export function emailTemplateForType(type: notification_type): string | null {
  return getTypeConfig(type).emailTemplate;
}

export function isKnownNotificationType(
  value: string
): value is notification_type {
  return Object.values(notificationTypes).includes(value as notification_type);
}

export function categoryLabel(category: NotificationCategory): string {
  switch (category) {
    case "leave_lifecycle":
      return "Leave lifecycle";
    case "approval_flow":
      return "Approval flow";
    case "sync":
      return "Sync";
    case "system":
      return "System";
    default:
      return "System";
  }
}
