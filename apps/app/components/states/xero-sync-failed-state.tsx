import { Badge } from "@repo/design-system/components/ui/badge";
import { AlertTriangleIcon } from "lucide-react";
import type { ReactNode } from "react";

interface XeroSyncFailedStateProps {
  readonly message: string;
  readonly retrySlot?: ReactNode;
  readonly revertSlot?: ReactNode;
}

export const XeroSyncFailedState = ({
  message,
  retrySlot,
  revertSlot,
}: XeroSyncFailedStateProps) => (
  <div className="flex flex-col gap-3 rounded-lg border-border border-y border-r border-l-2 border-l-amber-500 bg-amber-50/50 p-4 dark:bg-amber-950/20">
    <div className="flex items-center gap-2">
      <Badge
        className="gap-1 border-transparent bg-amber-500 text-white shadow-none hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
        variant="destructive"
      >
        <AlertTriangleIcon className="size-3" />
        Xero sync failed
      </Badge>
    </div>
    <p className="text-muted-foreground text-sm">{message}</p>
    {(retrySlot || revertSlot) && (
      <div className="mt-1 flex items-center gap-2">
        {retrySlot}
        {revertSlot}
      </div>
    )}
  </div>
);
