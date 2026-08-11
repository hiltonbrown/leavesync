import type { Event, EventHint } from "@sentry/nextjs";

const SENSITIVE_PATTERNS = [
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /access_token/i,
  /refresh_token/i,
  /code/i,
  /xero/i,
  /payload/i,
  /calendar/i,
  /ics/i,
  /summary/i,
  /description/i,
  /email/i,
  /password/i,
  /encryption_key/i,
  /clerk/i,
  /stripe/i,
];

export const isSensitiveKey = (key: string): boolean =>
  SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));

export const sanitizeObject = (
  obj: Record<string, unknown>
): Record<string, unknown> => {
  if (typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = "[SCRUBBED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const scrubSentryEvent = (event: Event, _hint?: EventHint): Event => {
  if (!event) {
    return event;
  }

  if (event.request) {
    if (event.request.headers) {
      event.request.headers = sanitizeObject(
        event.request.headers as Record<string, unknown>
      ) as Record<string, string>;
    }
    if (event.request.cookies) {
      event.request.cookies = sanitizeObject(
        event.request.cookies as Record<string, unknown>
      ) as Record<string, string>;
    }
    if (event.request.data) {
      if (typeof event.request.data === "object") {
        event.request.data = sanitizeObject(
          event.request.data as Record<string, unknown>
        );
      } else {
        event.request.data = "[SCRUBBED]";
      }
    }
  }

  if (event.extra) {
    event.extra = sanitizeObject(event.extra);
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      data: b.data ? sanitizeObject(b.data) : undefined,
    }));
  }

  if (event.user) {
    event.user.email = undefined;
    event.user.username = undefined;
    event.user.ip_address = undefined;
  }

  return event;
};
