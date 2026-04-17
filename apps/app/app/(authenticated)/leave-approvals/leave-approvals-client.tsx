"use client";

import {
  Avatar,
  AvatarFallback,
} from "@repo/design-system/components/ui/avatar";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { toast } from "@repo/design-system/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  BriefcaseIcon,
  CheckIcon,
  HomeIcon,
  InboxIcon,
  MapPinIcon,
  SparklesIcon,
  SunIcon,
  XIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { updateAvailabilityApprovalAction } from "@/app/actions/availability/approval";

type LeaveTypeId =
  | "holiday"
  | "personal"
  | "out-of-office"
  | "wfh"
  | "travelling"
  | "custom";

interface PendingRecord {
  approvalStatus: string;
  createdAt: Date;
  endsAt: Date;
  id: string;
  personFirstName: string;
  personId: string;
  personLastName: string;
  recordType: string;
  startsAt: Date;
}

interface LeaveType {
  color: string;
  icon: React.ReactNode;
  id: LeaveTypeId;
  label: string;
  textColor: string;
}

const LEAVE_TYPES: LeaveType[] = [
  {
    id: "holiday",
    label: "Annual leave",
    icon: <SunIcon className="size-3.5" strokeWidth={1.75} />,
    color: "var(--primary-container)",
    textColor: "var(--on-primary-container)",
  },
  {
    id: "personal",
    label: "Personal leave",
    icon: <BriefcaseIcon className="size-3.5" strokeWidth={1.75} />,
    color: "var(--secondary-container)",
    textColor: "var(--on-secondary-container)",
  },
  {
    id: "out-of-office",
    label: "Out of office",
    icon: <InboxIcon className="size-3.5" strokeWidth={1.75} />,
    color: "oklch(92% 0.04 60)",
    textColor: "oklch(45% 0.05 60)",
  },
  {
    id: "wfh",
    label: "Working from home",
    icon: <HomeIcon className="size-3.5" strokeWidth={1.75} />,
    color: "oklch(92% 0.04 250)",
    textColor: "oklch(45% 0.05 250)",
  },
  {
    id: "travelling",
    label: "Travelling",
    icon: <MapPinIcon className="size-3.5" strokeWidth={1.75} />,
    color: "oklch(92% 0.04 180)",
    textColor: "oklch(45% 0.05 180)",
  },
  {
    id: "custom",
    label: "Custom",
    icon: <SparklesIcon className="size-3.5" strokeWidth={1.75} />,
    color: "var(--surface-variant)",
    textColor: "var(--on-surface-variant)",
  },
];

const formatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const TRAILING_ZERO_REGEX = /\.0$/;

const typeForRecord = (recordType: string): LeaveType => {
  const typeId = mapRecordType(recordType);
  return LEAVE_TYPES.find((type) => type.id === typeId) ?? LEAVE_TYPES[5];
};

const mapRecordType = (recordType: string): LeaveTypeId => {
  switch (recordType) {
    case "leave":
      return "holiday";
    case "wfh":
      return "wfh";
    case "travel":
    case "client_site":
    case "training":
      return "travelling";
    default:
      return "custom";
  }
};

const getInitials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const countInclusiveDays = (startsAt: Date, endsAt: Date): number => {
  const start = Date.UTC(
    startsAt.getUTCFullYear(),
    startsAt.getUTCMonth(),
    startsAt.getUTCDate()
  );
  const end = Date.UTC(
    endsAt.getUTCFullYear(),
    endsAt.getUTCMonth(),
    endsAt.getUTCDate()
  );
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
};

export const LeaveApprovalsClient = ({
  organisationId,
  pendingRecords,
  reportingUnit,
  workingHoursPerDay,
}: {
  organisationId: string;
  pendingRecords: PendingRecord[];
  reportingUnit: string;
  workingHoursPerDay: number;
}) => {
  const [optimisticRecords, setOptimisticRecords] = useState(pendingRecords);
  const [pendingRecordId, setPendingRecordId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const formatDuration = (record: PendingRecord): string => {
    const days = countInclusiveDays(record.startsAt, record.endsAt);
    if (reportingUnit === "days") {
      return `${days} ${days === 1 ? "day" : "days"}`;
    }
    const hours = days * workingHoursPerDay;
    return `${hours.toFixed(1).replace(TRAILING_ZERO_REGEX, "")}h`;
  };

  const handleAction = (
    record: PendingRecord,
    approvalStatus: "approved" | "declined"
  ) => {
    setPendingRecordId(record.id);
    startTransition(async () => {
      const result = await updateAvailabilityApprovalAction({
        approvalStatus,
        organisationId,
        recordId: record.id,
      });

      setPendingRecordId(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setOptimisticRecords((current) =>
        current.filter((item) => item.id !== record.id)
      );
      toast.success(
        `${record.personFirstName} ${record.personLastName}'s request ${
          approvalStatus === "approved" ? "approved" : "declined"
        }.`
      );
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 transition-all duration-500 ease-in-out">
      <div>
        <h2 className="font-semibold text-foreground text-title-lg tracking-tight">
          Leave Approvals
        </h2>
        <p className="text-label-md text-muted-foreground">
          Manage and approve submitted availability requests from your team.
        </p>
      </div>

      <Card className="border-none bg-muted/50 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-headline-sm">Pending Requests</CardTitle>
          <CardDescription>
            You have {optimisticRecords.length} requests awaiting your review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-sidebar-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[220px]">Team Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optimisticRecords.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="h-24 text-center text-muted-foreground"
                      colSpan={5}
                    >
                      No pending requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  optimisticRecords.map((record) => {
                    const personName =
                      `${record.personFirstName} ${record.personLastName}`.trim();
                    const typeInfo = typeForRecord(record.recordType);
                    const isRecordPending =
                      isPending && pendingRecordId === record.id;

                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(personName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-[0.875rem]">
                                {personName}
                              </span>
                              <span className="text-[0.75rem] text-muted-foreground">
                                Submitted {formatter.format(record.createdAt)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-3.5"
                              style={{ color: typeInfo.textColor }}
                            >
                              {typeInfo.icon}
                            </span>
                            <span className="text-[0.875rem]">
                              {typeInfo.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-[0.875rem]">
                            {formatter.format(record.startsAt)} to{" "}
                            {formatter.format(record.endsAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">
                            {formatDuration(record)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              className="size-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={isPending}
                              onClick={() => handleAction(record, "declined")}
                              size="sm"
                              variant="outline"
                            >
                              <XIcon className="size-4" />
                              <span className="sr-only">Decline</span>
                            </Button>
                            <Button
                              className="size-8 p-0"
                              disabled={isPending}
                              onClick={() => handleAction(record, "approved")}
                              size="sm"
                            >
                              <CheckIcon className="size-4" />
                              <span className="sr-only">
                                {isRecordPending ? "Saving" : "Approve"}
                              </span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
