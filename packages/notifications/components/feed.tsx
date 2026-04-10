"use client";

import { NotificationFeed } from "@knocklabs/react";
import { keys } from "../keys";

// Required CSS import
import "@knocklabs/react/dist/index.css";
import "../styles.css";

export const NotificationsFeed = () => {
  if (!keys().NEXT_PUBLIC_KNOCK_API_KEY) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        Notifications are not configured.
      </div>
    );
  }

  return <NotificationFeed />;
};
