"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { toast } from "@repo/design-system/components/ui/sonner";
import { Switch } from "@repo/design-system/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  updateNotificationPreferenceAction,
} from "@/app/actions/notifications/manage";

type NotificationType =
  | "feed_token_rotated"
  | "missing_alternative_contact"
  | "privacy_conflict"
  | "sync_failed";

interface NotificationItem {
  createdAt: string;
  id: string;
  isRead: boolean;
  payload: unknown;
  type: string;
}

interface NotificationPreference {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  notificationType: string;
}

interface NotificationsClientProps {
  notifications: NotificationItem[];
  orgQueryValue: null | string;
  preferences: NotificationPreference[];
  unreadCount: number;
}

const NOTIFICATION_TYPES: NotificationType[] = [
  "sync_failed",
  "feed_token_rotated",
  "privacy_conflict",
  "missing_alternative_contact",
];

export function NotificationsClient({
  notifications: initialNotifications,
  orgQueryValue,
  preferences,
  unreadCount: initialUnreadCount,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [preferenceState, setPreferenceState] = useState(preferences);
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | NotificationType>("all");
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;
  const displayedUnreadCount = unreadCount || initialUnreadCount;

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (readFilter === "unread" && notification.isRead) {
          return false;
        }
        if (typeFilter !== "all" && notification.type !== typeFilter) {
          return false;
        }
        return true;
      }),
    [notifications, readFilter, typeFilter]
  );

  const handleMarkRead = (notificationId: string) => {
    startTransition(async () => {
      const result = await markNotificationReadAction({
        notificationId,
        org: orgQueryValue ?? undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction({
        org: orgQueryValue ?? undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, isRead: true }))
      );
      toast.success("Notifications marked as read");
    });
  };

  const handlePreferenceChange = (
    notificationType: NotificationType,
    channel: "email" | "in_app",
    enabled: boolean
  ) => {
    const current = preferenceFor(preferenceState, notificationType);
    const next = {
      notificationType,
      inAppEnabled: channel === "in_app" ? enabled : current.inAppEnabled,
      emailEnabled: channel === "email" ? enabled : current.emailEnabled,
    };

    setPreferenceState((existing) => upsertPreference(existing, next));
    startTransition(async () => {
      const result = await updateNotificationPreferenceAction({
        ...next,
        org: orgQueryValue ?? undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        setPreferenceState((existing) =>
          upsertPreference(existing, {
            notificationType,
            inAppEnabled: current.inAppEnabled,
            emailEnabled: current.emailEnabled,
          })
        );
      }
    });
  };

  return (
    <Tabs className="flex flex-col gap-6" defaultValue="notifications">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        <Button
          disabled={isPending || unreadCount === 0}
          onClick={handleMarkAllRead}
          size="sm"
          variant="secondary"
        >
          Mark all as read
        </Button>
      </div>

      <TabsContent className="mt-0" value="notifications">
        <div className="rounded-2xl bg-muted p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
                Inbox
              </p>
              <h2 className="mt-0.5 font-semibold text-foreground text-title-lg tracking-tight">
                {displayedUnreadCount} unread
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={readFilter === "all"}
                onClick={() => setReadFilter("all")}
              >
                All
              </FilterButton>
              <FilterButton
                active={readFilter === "unread"}
                onClick={() => setReadFilter("unread")}
              >
                Unread
              </FilterButton>
              <select
                className="rounded-xl bg-background px-3 py-2 text-sm"
                onChange={(event) =>
                  setTypeFilter(
                    normaliseNotificationTypeFilter(event.currentTarget.value)
                  )
                }
                value={typeFilter}
              >
                <option value="all">All types</option>
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {labelForType(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredNotifications.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No notifications match these filters.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <article
                  className="rounded-2xl bg-background p-4"
                  key={notification.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-sm">
                          {labelForType(notification.type)}
                        </p>
                        {!notification.isRead && (
                          <span className="rounded-full bg-primary px-2 py-0.5 font-medium text-[0.6875rem] text-primary-foreground">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {formatPayload(notification.payload)}
                      </p>
                      <NotificationObjectLink payload={notification.payload} />
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-muted-foreground text-xs">
                        {formatDate(notification.createdAt)}
                      </span>
                      {!notification.isRead && (
                        <Button
                          disabled={isPending}
                          onClick={() => handleMarkRead(notification.id)}
                          size="sm"
                          variant="ghost"
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent className="mt-0" value="preferences">
        <div className="rounded-2xl bg-muted p-6">
          <div className="mb-5">
            <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
              Delivery
            </p>
            <h2 className="mt-0.5 font-semibold text-foreground text-title-lg tracking-tight">
              Notification preferences
            </h2>
          </div>
          <div className="space-y-3">
            {NOTIFICATION_TYPES.map((type) => {
              const preference = preferenceFor(preferenceState, type);
              return (
                <div
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-background p-4"
                  key={type}
                >
                  <div>
                    <p className="font-semibold text-sm">
                      {labelForType(type)}
                    </p>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {descriptionForType(type)}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <SwitchWithLabel
                      checked={preference.inAppEnabled}
                      label="In app"
                      onCheckedChange={(checked) =>
                        handlePreferenceChange(type, "in_app", checked)
                      }
                    />
                    <SwitchWithLabel
                      checked={preference.emailEnabled}
                      label="Email"
                      onCheckedChange={(checked) =>
                        handlePreferenceChange(type, "email", checked)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-xl px-3 py-2 font-medium text-sm"
      onClick={onClick}
      style={{
        background: active ? "var(--background)" : "transparent",
        color: active ? "var(--foreground)" : "var(--muted-foreground)",
      }}
      type="button"
    >
      {children}
    </button>
  );
}

function SwitchWithLabel({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <span className="flex items-center gap-2 text-sm">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      {label}
    </span>
  );
}

function NotificationObjectLink({ payload }: { payload: unknown }) {
  const link = objectLinkFromPayload(payload);
  if (!link) {
    return null;
  }
  return (
    <Link className="mt-2 inline-flex text-primary text-sm" href={link.href}>
      {link.label}
    </Link>
  );
}

function objectLinkFromPayload(
  payload: unknown
): { href: string; label: string } | null {
  if (!(payload && typeof payload === "object")) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const feedId = typeof record.feedId === "string" ? record.feedId : null;
  if (feedId) {
    return { href: `/feed/${feedId}`, label: "Open feed" };
  }
  const syncRunId =
    typeof record.syncRunId === "string" ? record.syncRunId : null;
  if (syncRunId) {
    return { href: `/sync/${syncRunId}`, label: "Open sync run" };
  }
  const availabilityRecordId =
    typeof record.availabilityRecordId === "string"
      ? record.availabilityRecordId
      : null;
  if (availabilityRecordId) {
    return {
      href: `/plans?record=${availabilityRecordId}`,
      label: "Open leave plan",
    };
  }
  return null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPayload(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = record.message ?? record.title ?? record.description;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Review this operational notification.";
}

function labelForType(type: string): string {
  return type.replaceAll("_", " ");
}

function descriptionForType(type: NotificationType): string {
  switch (type) {
    case "sync_failed":
      return "Xero sync failures and records that need attention.";
    case "feed_token_rotated":
      return "Feed token changes that affect calendar subscribers.";
    case "privacy_conflict":
      return "Availability records that need privacy review.";
    case "missing_alternative_contact":
      return "Records that need a backup contact before publishing.";
    default:
      return "Operational notifications for this workspace.";
  }
}

function normaliseNotificationTypeFilter(
  value: string
): "all" | NotificationType {
  if (value === "all") {
    return "all";
  }
  return NOTIFICATION_TYPES.includes(value as NotificationType)
    ? (value as NotificationType)
    : "all";
}

function preferenceFor(
  preferences: NotificationPreference[],
  notificationType: NotificationType
): NotificationPreference {
  return (
    preferences.find(
      (preference) => preference.notificationType === notificationType
    ) ?? {
      notificationType,
      inAppEnabled: true,
      emailEnabled: true,
    }
  );
}

function upsertPreference(
  preferences: NotificationPreference[],
  next: NotificationPreference
): NotificationPreference[] {
  const exists = preferences.some(
    (preference) => preference.notificationType === next.notificationType
  );
  if (!exists) {
    return [...preferences, next];
  }
  return preferences.map((preference) =>
    preference.notificationType === next.notificationType ? next : preference
  );
}
