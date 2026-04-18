"use client";

import { NotificationsProvider as RawNotificationsProvider } from "@repo/notifications/components/provider";
import type { ReactNode } from "react";

interface NotificationsProviderProperties {
  children: ReactNode;
  organisationId: string | null;
}

export const NotificationsProvider = ({
  children,
  organisationId,
}: NotificationsProviderProperties) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const streamUrl = organisationId
    ? `${apiUrl}/api/notifications/stream?organisationId=${organisationId}`
    : null;

  return (
    <RawNotificationsProvider streamUrl={streamUrl}>
      {children}
    </RawNotificationsProvider>
  );
};
