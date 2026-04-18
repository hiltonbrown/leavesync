import type { notification_type } from "@repo/database/generated/enums";
import type { NotificationCategory } from "../types/notification-type-registry";

export type NotificationSseEvent =
  | {
      type: "notification.created";
      payload: {
        notificationId: string;
        type: notification_type;
        category: NotificationCategory;
        title: string;
        body: string;
        actionUrl: string | null;
        createdAt: string;
        unreadCount: number;
      };
    }
  | {
      type: "notification.read";
      payload: {
        notificationId: string;
        readAt: string;
        unreadCount: number;
      };
    }
  | {
      type: "notification.all_read";
      payload: {
        unreadCount: 0;
      };
    };

type Listener = (event: NotificationSseEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function streamKey(input: {
  organisationId: string;
  userId: string;
}): string {
  return `${input.userId}:${input.organisationId}`;
}

export function subscribeToNotificationStream(
  input: { organisationId: string; userId: string },
  listener: Listener
): () => void {
  const key = streamKey(input);
  const existing = listeners.get(key) ?? new Set<Listener>();
  existing.add(listener);
  listeners.set(key, existing);

  return () => {
    const current = listeners.get(key);
    if (!current) {
      return;
    }
    current.delete(listener);
    if (current.size === 0) {
      listeners.delete(key);
    }
  };
}

export function publishNotificationEvent(
  input: { organisationId: string; userId: string },
  event: NotificationSseEvent
): void {
  const current = listeners.get(streamKey(input));
  if (!current) {
    return;
  }
  for (const listener of current) {
    listener(event);
  }
}

export function listenerCount(input: {
  organisationId: string;
  userId: string;
}): number {
  return listeners.get(streamKey(input))?.size ?? 0;
}
