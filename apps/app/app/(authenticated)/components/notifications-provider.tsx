"use client";

import { NotificationsProvider as RawNotificationsProvider } from "@repo/notifications/components/provider";
import type { ReactNode } from "react";
import { getPublicApiUrl } from "@/lib/public-api-url";

interface NotificationsProviderProperties {
  children: ReactNode;
  organisationId: string | null;
}

export const NotificationsProvider = ({
  children,
  organisationId,
}: NotificationsProviderProperties) => {
  const streamUrl = organisationId
    ? getPublicApiUrl(
        `/api/notifications/stream?organisationId=${encodeURIComponent(organisationId)}`
      )
    : null;

  return (
    <RawNotificationsProvider streamUrl={streamUrl}>
      {children}
    </RawNotificationsProvider>
  );
};
