"use client";

import { cn } from "@repo/design-system/lib/utils";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { withOrg } from "@/lib/navigation/org-url";

interface CalendarCreateLauncherProps {
  children?: ReactNode;
  className?: string;
  date?: Date;
  personId: string | null;
  startsAt: string;
}

function formatAccessibleDate(startsAt: string, date?: Date): string {
  if (date) {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
  const datePart = startsAt.split("T")[0] ?? "";
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const year = Number.parseInt(parts[0] ?? "0", 10);
    const month = Number.parseInt(parts[1] ?? "1", 10) - 1;
    const day = Number.parseInt(parts[2] ?? "1", 10);
    const d = new Date(Date.UTC(year, month, day));
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  }
  return startsAt;
}

export function CalendarCreateLauncher({
  children,
  className,
  date,
  personId,
  startsAt,
}: CalendarCreateLauncherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const org = searchParams.get("org");

  const navigate = () => {
    const params = new URLSearchParams({ startsAt });
    if (personId) {
      params.set("personId", personId);
    }
    router.push(withOrg(`/plans/new?${params.toString()}`, org));
  };

  const formattedDate = formatAccessibleDate(startsAt, date);
  const accessibleLabel = `Add availability for ${formattedDate}`;

  return (
    <button
      aria-label={accessibleLabel}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-lg border border-border border-dashed px-2 py-1 font-medium text-muted-foreground text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
      onClick={navigate}
      type="button"
    >
      {children ?? (
        <>
          <Plus className="size-3.5" />
          <span>Add</span>
        </>
      )}
    </button>
  );
}
