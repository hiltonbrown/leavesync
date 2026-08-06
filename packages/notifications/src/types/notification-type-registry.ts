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
    actionLabel: "View record",
    defaultChannels: { email: true, inApp: true },
    description: "A submitted leave request has been approved.",
    emailTemplate: "LeaveApproved",
    iconKey: "check-circle",
    label: "Leave approved",
    shortLabel: "Leave approved",
    supportsActionUrl: true,
    type: "leave_approved",
    userFacingCategory: "leave_lifecycle",
  },
  {
    actionLabel: "View record",
    defaultChannels: { email: true, inApp: true },
    description: "A submitted leave request has been declined.",
    emailTemplate: "LeaveDeclined",
    iconKey: "x-circle",
    label: "Leave declined",
    shortLabel: "Leave declined",
    supportsActionUrl: true,
    type: "leave_declined",
    userFacingCategory: "leave_lifecycle",
  },
  {
    actionLabel: "View request",
    defaultChannels: { email: true, inApp: true },
    description: "A manager has asked for more information about leave.",
    emailTemplate: "LeaveInfoRequested",
    iconKey: "message-circle",
    label: "More information requested",
    shortLabel: "Info requested",
    supportsActionUrl: true,
    type: "leave_info_requested",
    userFacingCategory: "leave_lifecycle",
  },
  {
    actionLabel: "View record",
    defaultChannels: { email: true, inApp: true },
    description: "A record needs an alternative contact before publishing.",
    emailTemplate: "MissingAlternativeContact",
    iconKey: "user-plus",
    label: "Missing alternative contact",
    shortLabel: "Alternative contact",
    supportsActionUrl: true,
    type: "missing_alternative_contact",
    userFacingCategory: "leave_lifecycle",
  },
  {
    actionLabel: "View request",
    defaultChannels: { email: true, inApp: true },
    description: "A team member has submitted leave for approval.",
    emailTemplate: "LeaveSubmitted",
    iconKey: "inbox-in",
    label: "Leave submitted for approval",
    shortLabel: "Leave submitted",
    supportsActionUrl: true,
    type: "leave_submitted",
    userFacingCategory: "approval_flow",
  },
  {
    actionLabel: "View request",
    defaultChannels: { email: false, inApp: true },
    description: "A submitted leave request has been withdrawn.",
    emailTemplate: null,
    iconKey: "reply",
    label: "Leave withdrawn",
    shortLabel: "Leave withdrawn",
    supportsActionUrl: true,
    type: "leave_withdrawn",
    userFacingCategory: "approval_flow",
  },
  {
    actionLabel: "Review failure",
    defaultChannels: { email: true, inApp: true },
    description: "A leave action could not be written to Xero.",
    emailTemplate: "LeaveXeroSyncFailed",
    iconKey: "alert-triangle",
    label: "Xero sync failed",
    shortLabel: "Sync failed",
    supportsActionUrl: true,
    type: "leave_xero_sync_failed",
    userFacingCategory: "sync",
  },
  {
    actionLabel: "Open sync run",
    defaultChannels: { email: false, inApp: true },
    description: "Approval reconciliation has completed.",
    emailTemplate: null,
    iconKey: "refresh-check",
    label: "Approval reconciliation complete",
    shortLabel: "Reconciliation complete",
    supportsActionUrl: true,
    type: "sync_reconciliation_complete",
    userFacingCategory: "sync",
  },
  {
    actionLabel: "Open sync run",
    defaultChannels: { email: true, inApp: true },
    description: "A background Xero sync needs attention.",
    emailTemplate: "SyncFailed",
    iconKey: "alert-triangle",
    label: "Sync failed",
    shortLabel: "Sync failed",
    supportsActionUrl: true,
    type: "sync_failed",
    userFacingCategory: "sync",
  },
  {
    actionLabel: "Open feed",
    defaultChannels: { email: true, inApp: true },
    description: "A calendar feed token has been rotated.",
    emailTemplate: "FeedTokenRotated",
    iconKey: "key-round",
    label: "Feed token rotated",
    shortLabel: "Token rotated",
    supportsActionUrl: true,
    type: "feed_token_rotated",
    userFacingCategory: "system",
  },
  {
    actionLabel: "Review",
    defaultChannels: { email: true, inApp: true },
    description: "A publication rule needs privacy review.",
    emailTemplate: "PrivacyConflict",
    iconKey: "shield-alert",
    label: "Privacy conflict",
    shortLabel: "Privacy conflict",
    supportsActionUrl: true,
    type: "privacy_conflict",
    userFacingCategory: "system",
  },
] as const satisfies readonly NotificationTypeConfig[];

const registryByType = new Map<notification_type, NotificationTypeConfig>(
  REGISTRY.map((config) => [config.type, config])
);

const fallbackConfig: NotificationTypeConfig = {
  actionLabel: "View",
  defaultChannels: { email: true, inApp: true },
  description: "Operational notification.",
  emailTemplate: null,
  iconKey: "bell",
  label: "Notification",
  shortLabel: "Notification",
  supportsActionUrl: false,
  type: "sync_failed",
  userFacingCategory: "system",
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
