import { toDateOnly } from "@repo/core";
import { AlertCircleIcon } from "lucide-react";
import {
  getAvailabilityRecordLabel,
  isXeroSourceType,
} from "@/lib/availability-record-types";

interface AvailabilityRecord {
  approvalStatus: string;
  endsAt: Date;
  id: string;
  privacyMode: string;
  recordType: string;
  sourceType: string;
  startsAt: Date;
}

interface LeaveHistoryProps {
  isEmpty: boolean;
  records: AvailabilityRecord[];
  title: string;
}

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  submitted: "bg-yellow-100 text-yellow-800",
  draft: "bg-gray-100 text-gray-800",
  declined: "bg-red-100 text-red-800",
};

export function LeaveHistory({ title, records, isEmpty }: LeaveHistoryProps) {
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
        <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-widest">
          {title}
        </h3>

        <div className="max-h-96 space-y-3 overflow-y-auto">
          {records.map((record) => (
            <div
              className="flex items-start justify-between gap-3 rounded-lg bg-background p-3"
              key={record.id}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm">
                  {getAvailabilityRecordLabel(record.recordType)}
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {toDateOnly(record.startsAt)} – {toDateOnly(record.endsAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isXeroSourceType(record.sourceType) && (
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
