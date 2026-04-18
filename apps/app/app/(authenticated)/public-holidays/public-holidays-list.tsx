"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { cn } from "@repo/design-system/lib/utils";
import { PlusIcon, RotateCcwIcon, TrashIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  deleteCustomHolidayAction,
  restoreHolidayAction,
  suppressHolidayAction,
} from "./_actions";

type PublicHolidayFromDB = {
  id: string;
  organisation_id: string;
  source: "nager" | "manual";
  holiday_date: Date;
  name: string;
  holiday_type: string;
  archived_at: Date | null;
  jurisdiction?: {
    country_code: string;
    region_code: string | null;
  } | null;
};

interface PublicHolidaysListProps {
  holidays: PublicHolidayFromDB[];
}

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> =
  {
    public: {
      label: "Public holiday",
      bg: "color-mix(in srgb, var(--primary) 12%, transparent)",
      text: "var(--primary)",
    },
    bank: {
      label: "Bank holiday",
      bg: "color-mix(in srgb, var(--primary) 8%, transparent)",
      text: "var(--primary)",
    },
    school: {
      label: "School",
      bg: "color-mix(in srgb, var(--tertiary, var(--primary)) 12%, transparent)",
      text: "var(--tertiary, var(--primary))",
    },
    authorities: {
      label: "Authorities",
      bg: "var(--accent)",
      text: "var(--muted-foreground)",
    },
    optional: {
      label: "Optional",
      bg: "var(--accent)",
      text: "var(--muted-foreground)",
    },
    observance: {
      label: "Observance",
      bg: "var(--muted)",
      text: "var(--muted-foreground)",
    },
    custom: {
      label: "Custom",
      bg: "color-mix(in srgb, var(--primary) 12%, transparent)",
      text: "var(--primary)",
    },
  };

const FALLBACK_TYPE_CONFIG = {
  label: "Holiday",
  bg: "var(--muted)",
  text: "var(--muted-foreground)",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDayOfWeek(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "long" });
}

export function PublicHolidaysList({ holidays }: PublicHolidaysListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSuppress = (id: string, orgId: string) => {
    startTransition(async () => {
      const result = await suppressHolidayAction({
        holidayId: id,
        organisationId: orgId,
      });
      if (result.ok) {
        toast.success("Holiday suppressed");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleRestore = (id: string, orgId: string) => {
    startTransition(async () => {
      const result = await restoreHolidayAction({
        holidayId: id,
        organisationId: orgId,
      });
      if (result.ok) {
        toast.success("Holiday restored");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = (id: string, orgId: string) => {
    startTransition(async () => {
      const result = await deleteCustomHolidayAction({
        holidayId: id,
        organisationId: orgId,
      });
      if (result.ok) {
        toast.success("Custom holiday deleted");
      } else {
        toast.error(result.error);
      }
    });
  };

  if (holidays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
        <h3 className="font-semibold text-lg">No public holidays</h3>
        <p className="mt-2 text-muted-foreground text-sm">
          Import holidays from a source or add custom ones.
        </p>
        <div className="mt-6 flex gap-4">
          <Button asChild>
            <Link href="/public-holidays/import">
              <PlusIcon className="mr-2 h-4 w-4" /> Import holidays
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/public-holidays/holidays/new">
              <PlusIcon className="mr-2 h-4 w-4" /> Add custom holiday
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end gap-4">
        <Button asChild variant="outline">
          <Link href="/public-holidays/import">
            <PlusIcon className="mr-2 h-4 w-4" /> Import holidays
          </Link>
        </Button>
        <Button asChild>
          <Link href="/public-holidays/holidays/new">
            <PlusIcon className="mr-2 h-4 w-4" /> Add custom holiday
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.map((holiday) => {
              const typeConfig =
                TYPE_CONFIG[holiday.holiday_type.toLowerCase()] ??
                FALLBACK_TYPE_CONFIG;
              const isSuppressed = holiday.archived_at !== null;

              let sourceLabel =
                holiday.source === "nager" ? "Nager.Date" : "Manual";
              if (holiday.jurisdiction?.country_code) {
                sourceLabel += ` (${holiday.jurisdiction.country_code}${holiday.jurisdiction.region_code ? `-${holiday.jurisdiction.region_code}` : ""})`;
              }

              return (
                <TableRow
                  className={cn(isSuppressed && "opacity-60")}
                  key={holiday.id}
                >
                  <TableCell
                    className={cn(
                      "whitespace-nowrap font-medium",
                      isSuppressed && "line-through"
                    )}
                  >
                    {formatDate(new Date(holiday.holiday_date))}
                  </TableCell>
                  <TableCell className={cn(isSuppressed && "line-through")}>
                    {formatDayOfWeek(new Date(holiday.holiday_date))}
                  </TableCell>
                  <TableCell className={cn(isSuppressed && "line-through")}>
                    {holiday.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "whitespace-nowrap font-normal",
                        isSuppressed && "opacity-50"
                      )}
                      style={{
                        backgroundColor: typeConfig.bg,
                        color: typeConfig.text,
                      }}
                      variant="secondary"
                    >
                      {typeConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {sourceLabel}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {isSuppressed ? (
                        <Button
                          disabled={isPending}
                          onClick={() =>
                            handleRestore(holiday.id, holiday.organisation_id)
                          }
                          size="icon"
                          title="Restore holiday"
                          variant="ghost"
                        >
                          <RotateCcwIcon className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          disabled={isPending}
                          onClick={() =>
                            handleSuppress(holiday.id, holiday.organisation_id)
                          }
                          size="icon"
                          title="Suppress holiday"
                          variant="ghost"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {holiday.source === "manual" && (
                        <Button
                          disabled={isPending}
                          onClick={() =>
                            handleDelete(holiday.id, holiday.organisation_id)
                          }
                          size="icon"
                          title="Delete custom holiday"
                          variant="ghost"
                        >
                          <TrashIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
