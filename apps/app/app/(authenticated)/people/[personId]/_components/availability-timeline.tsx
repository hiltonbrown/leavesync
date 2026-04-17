import { toDateOnly } from "@repo/core";
import { AlertCircleIcon } from "lucide-react";

interface AvailabilityRecord {
  approvalStatus: string;
  endsAt: Date;
  id: string;
  privacyMode: string;
  recordType: string;
  sourceType: string;
  startsAt: Date;
}

interface AvailabilityTimelineProps {
  isEmpty: boolean;
  records: AvailabilityRecord[];
  title: string;
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  leave: "Leave",
  wfh: "Work from Home",
  training: "Training",
  travel: "Travel",
  "client-site": "Client Site",
};

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  submitted: "bg-yellow-100 text-yellow-800",
  draft: "bg-gray-100 text-gray-800",
  declined: "bg-red-100 text-red-800",
};

export function AvailabilityTimeline({
  title,
  records,
  isEmpty,
}: AvailabilityTimelineProps) {
  if (isEmpty) {
    return (
      <div className="rounded-2xl bg-muted p-6">
        <div className="space-y-4">
          <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-widest">
            {title}
          </h3>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <AlertCircleIcon className="size-5 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No upcoming availability
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-muted p-6">
      <div className="space-y-4">
        <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-widest">
          {title}
        </h3>

        <div className="space-y-3">
          {records.map((record) => (
            <div
              className="flex items-start justify-between gap-3 rounded-lg bg-background p-3"
              key={record.id}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm">
                  {RECORD_TYPE_LABELS[record.recordType] || record.recordType}
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {toDateOnly(record.startsAt)} – {toDateOnly(record.endsAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {record.sourceType === "xero" && (
                  <span className="whitespace-nowrap rounded bg-blue-50 px-2 py-1 text-blue-700 text-xs">
                    Xero
                  </span>
                )}
                <span
                  className={`whitespace-nowrap rounded px-2 py-1 text-xs capitalize ${
                    STATUS_COLORS[record.approvalStatus] ||
                    "bg-gray-100 text-gray-800"
                  }`}
                >
                  {record.approvalStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
