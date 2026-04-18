"use client";

import type { ReactNode } from "react";

interface NotificationsFeedProperties {
  children?: ReactNode;
}

export const NotificationsFeed = ({
  children,
}: NotificationsFeedProperties) => {
  return <>{children ?? null}</>;
};
