"use client";

import type { ReactNode } from "react";

interface NotificationsTriggerProperties {
  children?: ReactNode;
}

export const NotificationsTrigger = ({
  children,
}: NotificationsTriggerProperties) => <>{children ?? null}</>;
