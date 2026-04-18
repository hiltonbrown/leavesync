import type { CalendarEvent } from "@repo/availability";
import { cn } from "@repo/design-system/lib/utils";
import { AlertTriangleIcon } from "lucide-react";
import { CalendarEventPopover } from "./calendar-event-popover";

interface CalendarEventChipProps {
  event: CalendarEvent;
  orgQueryValue: string | null;
}

const categoryStyles = {
  // Calendar colours stay in the UI: leave uses green, local availability uses blue, private blocks use neutral, and failed sync overrides with amber.
  local_only:
    "bg-sky-100 text-sky-950 ring-sky-200 dark:bg-sky-950 dark:text-sky-100 dark:ring-sky-800",
  private: "bg-muted text-muted-foreground ring-muted-foreground/15",
  xero_leave:
    "bg-emerald-100 text-emerald-950 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-800",
};

export function CalendarEventChip({
  event,
  orgQueryValue,
}: CalendarEventChipProps) {
  const isPrivate = event.recordType === "private";
  const style = isPrivate
    ? categoryStyles.private
    : categoryStyles[event.recordTypeCategory];
  const microLabel = treatmentLabel(event.renderTreatment);

  return (
    <CalendarEventPopover event={event} orgQueryValue={orgQueryValue}>
      <button
        className={cn(
          "flex w-full min-w-0 items-center gap-1.5 rounded-xl px-2 py-1 text-left text-xs ring-1 transition hover:brightness-95",
          style,
          event.renderTreatment === "dashed" &&
            "border border-dashed opacity-85",
          event.renderTreatment === "draft" && "opacity-65",
          event.renderTreatment === "failed" &&
            "bg-amber-100 text-amber-950 ring-amber-300 dark:bg-amber-950 dark:text-amber-100"
        )}
        onClick={(event) => event.stopPropagation()}
        type="button"
      >
        {event.renderTreatment === "failed" && (
          <AlertTriangleIcon className="size-3 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">
          {event.displayName}
        </span>
        {microLabel && (
          <span className="shrink-0 rounded-lg bg-background/60 px-1.5 py-0.5 font-medium">
            {microLabel}
          </span>
        )}
      </button>
    </CalendarEventPopover>
  );
}

function treatmentLabel(treatment: CalendarEvent["renderTreatment"]) {
  if (treatment === "dashed") {
    return "Pending";
  }
  if (treatment === "draft") {
    return "Draft";
  }
  if (treatment === "failed") {
    return "Sync failed";
  }
  return null;
}
