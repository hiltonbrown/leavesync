"use client";

import { toast } from "@repo/design-system/components/ui/sonner";
import { useNotificationEvents } from "@repo/notifications/components/provider";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface DashboardLiveUpdatesProps {
  organisationId: string;
}

export function DashboardLiveUpdates({
  organisationId,
}: DashboardLiveUpdatesProps) {
  const router = useRouter();
  const { subscribe } = useNotificationEvents();
  const shownToast = useRef<string | null>(null);
  const liveText = useRef<HTMLDivElement | null>(null);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: two distinct SSE branches sharing toast logic
  useEffect(
    () =>
      subscribe((event) => {
        if (
          event.type === "notification.created" &&
          (event.payload.type === "leave_submitted" ||
            event.payload.type === "leave_xero_sync_failed")
        ) {
          if (shownToast.current === event.payload.notificationId) {
            return;
          }
          shownToast.current = event.payload.notificationId;
          toast.message("New activity on the dashboard.", {
            action: {
              label: "Refresh",
              onClick: () => router.refresh(),
            },
          });
          if (liveText.current) {
            liveText.current.textContent =
              "New activity on the dashboard. Refresh available.";
          }
        }

        if (
          event.type === "sync.run_status_changed" &&
          event.payload.organisationId === organisationId
        ) {
          const toastKey = `${event.payload.runId}:${event.payload.status}`;
          if (shownToast.current === toastKey) {
            return;
          }
          shownToast.current = toastKey;
          toast.message("Sync activity updated.", {
            action: {
              label: "Refresh",
              onClick: () => router.refresh(),
            },
          });
          if (liveText.current) {
            liveText.current.textContent =
              "Sync activity updated. Refresh available.";
          }
        }
      }),
    [organisationId, router, subscribe]
  );

  return (
    <div aria-live="polite" className="sr-only" ref={liveText} role="status" />
  );
}
