import { AlertCircleIcon } from "lucide-react";
import { toDateOnly } from "@repo/core";

interface AvailabilityRecord {
  id: string;
  recordType: string;
  sourceType: string;
  startsAt: Date;
  endsAt: Date;
  approvalStatus: string;
  privacyMode: string;
}

interface LeaveHistoryProps {
  title: string;
  records: AvailabilityRecord[];
  isEmpty: boolean;
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

export function LeaveHistory({
  title,
  records,
  isEmpty,
}: LeaveHistoryProps) {
  if (isEmpty) {
    return (
      <div className="rounded-2xl bg-muted p-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            {title}
          </h3>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <AlertCircleIcon className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No recent leave history
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-muted p-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          {title}
        </h3>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex items-start justify-between gap-3 rounded-lg bg-background p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground">
                  {RECORD_TYPE_LABELS[record.recordType] || record.recordType}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {toDateOnly(record.startsAt)} – {toDateOnly(record.endsAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {record.sourceType === "xero" && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded whitespace-nowrap">
                    Xero
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-1 rounded whitespace-nowrap capitalize ${
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
