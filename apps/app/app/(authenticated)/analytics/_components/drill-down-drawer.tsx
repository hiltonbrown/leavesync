import type { AnalyticsRecordListItem } from "@repo/availability";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import {
  buildCalendarDrillDownUrl,
  buildPeopleDrillDownUrl,
} from "../drill-down-url";

export function DrillDownDrawer({
  calendarHref,
  closeHref,
  orgQueryValue,
  records,
  title,
}: {
  calendarHref: string;
  closeHref: string;
  orgQueryValue: string | null;
  records: AnalyticsRecordListItem[];
  title: string;
}) {
  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-xl flex-col bg-background p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-foreground text-xl">{title}</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {records.length} records in this view.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={closeHref}>Close</Link>
        </Button>
      </div>
      <div className="mt-6 min-h-0 flex-1 space-y-3 overflow-y-auto">
        {records.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No records match this drill-down.
          </p>
        ) : (
          records.map((record) => (
            <div className="rounded-2xl bg-muted p-4" key={record.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">
                    {record.personFirstName} {record.personLastName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {labelForRecordType(record.recordType)},{" "}
                    {record.workingDays} days
                  </p>
                </div>
                <Link
                  className="text-primary text-sm"
                  href={buildPeopleDrillDownUrl({
                    org: orgQueryValue,
                    personId: record.personId,
                  })}
                >
                  Person
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-muted-foreground text-xs">
                <span>{record.startsAt.toISOString().slice(0, 10)}</span>
                <span>{record.endsAt.toISOString().slice(0, 10)}</span>
                {record.teamName && <span>{record.teamName}</span>}
                {record.locationName && <span>{record.locationName}</span>}
              </div>
              <Link
                className="mt-3 inline-flex text-primary text-sm"
                href={buildCalendarDrillDownUrl({
                  customEnd: record.endsAt.toISOString().slice(0, 10),
                  customStart: record.startsAt.toISOString().slice(0, 10),
                  org: orgQueryValue,
                  personId: record.personId,
                  preset: "custom",
                  recordType: record.recordType,
                })}
              >
                View in calendar
              </Link>
            </div>
          ))
        )}
      </div>
      <div className="mt-6">
        <Button asChild className="w-full">
          <Link href={calendarHref}>View in calendar</Link>
        </Button>
      </div>
    </aside>
  );
}

function labelForRecordType(recordType: string): string {
  return recordType
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
