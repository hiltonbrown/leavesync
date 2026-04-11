"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { toast } from "@repo/design-system/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import { cn } from "@repo/design-system/lib/utils";
import { format } from "date-fns";
import {
  BriefcaseIcon,
  CheckIcon,
  HomeIcon,
  InboxIcon,
  MapPinIcon,
  PlusIcon,
  SparklesIcon,
  SunIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { RecurrenceFields } from "../components/recurrence-fields";
import {
  createDefaultRecurrenceRule,
  type DateRangeOccurrence,
  describeRecurrenceRule,
  generateRecurrenceOccurrences,
  getSingleOccurrence,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from "../recurrence";

// ─── Types ───────────────────────────────────────────────────────────────────

type LeaveTypeId =
  | "holiday"
  | "personal"
  | "out-of-office"
  | "wfh"
  | "travelling"
  | "custom";

interface LeaveRequest {
  allDay?: boolean;
  avatarUrl?: string;
  balanceHours: number;
  days: number;
  endDate: string;
  endTime?: string;
  hours: number;
  id: string;
  notes?: string;
  occurrenceCount?: number;
  occurrenceIndex?: number;
  recurrenceRule?: RecurrenceRule;
  seriesId?: string;
  startDate: string;
  startTime?: string;
  status: "pending" | "approved" | "rejected";
  type: LeaveTypeId;
  userEmail: string;
  userName: string;
}

interface LeaveType {
  color: string;
  icon: React.ReactNode;
  id: LeaveTypeId;
  label: string;
  textColor: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_REQUESTS: LeaveRequest[] = [
  {
    id: "req_1",
    userName: "Yuki Tanaka",
    userEmail: "yuki@example.com",
    type: "holiday",
    startDate: "2026-04-14",
    endDate: "2026-04-18",
    days: 5,
    hours: 38,
    balanceHours: 124.5,
    status: "pending",
    notes: "Spring break trip to Kyoto.",
  },
  {
    id: "req_2",
    userName: "Sofia Reyes",
    userEmail: "sofia@example.com",
    type: "holiday",
    startDate: "2026-05-15",
    endDate: "2026-05-22",
    days: 8,
    hours: 60.8,
    balanceHours: 85.0,
    status: "pending",
    notes: "Visiting family in Madrid.",
  },
  {
    id: "req_3",
    userName: "Priya Sharma",
    userEmail: "priya@example.com",
    type: "holiday",
    startDate: "2026-06-15",
    endDate: "2026-06-20",
    days: 6,
    hours: 45.6,
    balanceHours: 210.2,
    status: "pending",
  },
  {
    id: "req_4",
    userName: "Marcus Webb",
    userEmail: "marcus@example.com",
    type: "personal",
    startDate: "2026-04-20",
    endDate: "2026-04-20",
    days: 1,
    hours: 7.6,
    balanceHours: 12.0,
    status: "pending",
    notes: "Doctor appointment.",
  },
];

const LEAVE_TYPES: LeaveType[] = [
  {
    id: "holiday",
    label: "Holiday Leave",
    icon: <SunIcon className="size-3.5" strokeWidth={1.75} />,
    color: "var(--primary-container)",
    textColor: "var(--on-primary-container)",
  },
  {
    id: "personal",
    label: "Personal Leave",
    icon: <BriefcaseIcon className="size-3.5" strokeWidth={1.75} />,
    color: "var(--secondary-container)",
    textColor: "var(--on-secondary-container)",
  },
  {
    id: "out-of-office",
    label: "Out of Office",
    icon: <InboxIcon className="size-3.5" strokeWidth={1.75} />,
    color: "oklch(92% 0.04 60)",
    textColor: "oklch(45% 0.05 60)",
  },
  {
    id: "wfh",
    label: "Working From Home",
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

const today = format(new Date(), "yyyy-MM-dd");

const countInclusiveDays = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const rangesOverlap = (
  first: DateRangeOccurrence,
  second: DateRangeOccurrence
) =>
  (first.startDate >= second.startDate && first.startDate <= second.endDate) ||
  (first.endDate >= second.startDate && first.endDate <= second.endDate) ||
  (second.startDate >= first.startDate && second.startDate <= first.endDate);

// ─── Component ───────────────────────────────────────────────────────────────

const TRAILING_ZERO_REGEX = /\.0$/;

export const LeaveApprovalsClient = ({
  reportingUnit = "hours",
  workingHoursPerDay = 7.6,
}: {
  reportingUnit?: string;
  workingHoursPerDay?: number;
}) => {
  const [requests, setRequests] = useState<LeaveRequest[]>(MOCK_REQUESTS);
  const [modalOpen, setModalOpen] = useState(false);

  const formatVal = useMemo(
    () => (val: number) => {
      return `${val.toFixed(1).replace(TRAILING_ZERO_REGEX, "")}h`;
    },
    []
  );

  // Form state
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedType, setSelectedType] = useState<LeaveTypeId>("holiday");
  const [customLabel, setCustomLabel] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<RecurrenceFrequency>("none");
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(
    createDefaultRecurrenceRule("weekly", today)
  );

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: action } : req))
    );

    const request = requests.find((r) => r.id === id);
    toast.success(
      `Request for ${request?.userName} ${action === "approved" ? "approved" : "rejected"}.`
    );
  };

  const getDisabledReason = (): string | null => {
    if (!selectedUser) {
      return "Select a team member";
    }
    if (!(startDate && endDate)) {
      return "Select a start and end date";
    }
    if (endDate < startDate) {
      return "End date must be after start date";
    }
    if (selectedType === "custom" && !customLabel.trim()) {
      return "Enter a label for your custom entry";
    }
    if (recurrenceFrequency !== "none") {
      const generated = generateRecurrenceOccurrences(
        startDate,
        endDate,
        recurrenceRule
      );
      if (!generated.ok) {
        return generated.error;
      }
    }
    return null;
  };

  const disabledReason = getDisabledReason();

  const handleAddLeave = () => {
    if (disabledReason) {
      toast.error(disabledReason);
      return;
    }

    const generated: ReturnType<typeof generateRecurrenceOccurrences> =
      recurrenceFrequency === "none"
        ? { occurrences: getSingleOccurrence(startDate, endDate), ok: true }
        : generateRecurrenceOccurrences(startDate, endDate, recurrenceRule);

    if (!generated.ok) {
      toast.error(generated.error);
      return;
    }

    const isRecurring = recurrenceFrequency !== "none";
    const seriesId = isRecurring ? `series_${Date.now()}` : undefined;
    const occurrenceCount = generated.occurrences.length;
    const newRequests: LeaveRequest[] = generated.occurrences.map(
      (occurrence, index) => {
        const d = countInclusiveDays(occurrence.startDate, occurrence.endDate);
        return {
          id: `req_${Date.now()}_${index}`,
          userName: selectedUser,
          userEmail: `${selectedUser.toLowerCase().replace(" ", ".")}@example.com`,
          type: selectedType,
          startDate: occurrence.startDate,
          endDate: occurrence.endDate,
          days: d,
          hours: d * workingHoursPerDay,
          balanceHours: 120, // Mock current balance
          status: "approved",
          notes: notes || undefined,
          allDay,
          startTime: allDay ? undefined : startTime,
          endTime: allDay ? undefined : endTime,
          seriesId,
          recurrenceRule: isRecurring ? recurrenceRule : undefined,
          occurrenceIndex: isRecurring ? index + 1 : undefined,
          occurrenceCount: isRecurring ? occurrenceCount : undefined,
        };
      }
    );

    setRequests((prev) => [...newRequests, ...prev]);
    toast.success(
      newRequests.length === 1
        ? `Leave added for ${selectedUser}.`
        : `${newRequests.length} leave entries added for ${selectedUser}.`
    );
    setModalOpen(false);

    // Reset form
    setSelectedUser("");
    setSelectedType("holiday");
    setCustomLabel("");
    setStartDate(today);
    setEndDate(today);
    setAllDay(true);
    setNotes("");
    setRecurrenceFrequency("none");
    setRecurrenceRule(createDefaultRecurrenceRule("weekly", today));
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");

  // Calculate impact preview (conflicts)
  const previewOccurrences =
    recurrenceFrequency === "none"
      ? getSingleOccurrence(startDate, endDate)
      : (() => {
          const generated = generateRecurrenceOccurrences(
            startDate,
            endDate,
            recurrenceRule
          );
          return generated.ok ? generated.occurrences : [];
        })();
  const conflicts =
    startDate && endDate
      ? requests.filter((request) => {
          if (request.status !== "approved") {
            return false;
          }
          const requestRange = {
            startDate: request.startDate,
            endDate: request.endDate,
          };

          return previewOccurrences.some((occurrence) =>
            rangesOverlap(occurrence, requestRange)
          );
        })
      : [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-0 transition-all duration-500 ease-in-out">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground text-title-lg tracking-tight">
            Leave Approvals
          </h2>
          <p className="text-label-md text-muted-foreground">
            Manage and approve leave requests from your team.
          </p>
        </div>
        <Button
          className="group h-11 rounded-2xl px-6"
          onClick={() => setModalOpen(true)}
        >
          <PlusIcon
            className="mr-2 size-4 transition-transform group-hover:rotate-90"
            strokeWidth={2.5}
          />
          Add Leave
        </Button>
      </div>

      <Card className="border-none bg-muted/50 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-headline-sm">Pending Requests</CardTitle>
          <CardDescription>
            You have {pendingRequests.length} requests awaiting your review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-sidebar-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[200px]">Team Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="h-24 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      No pending requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingRequests.map((request) => {
                    const typeInfo =
                      LEAVE_TYPES.find((t) => t.id === request.type) ||
                      LEAVE_TYPES[0];
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarImage src={request.avatarUrl} />
                              <AvatarFallback className="text-[10px]">
                                {request.userName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-[0.875rem]">
                                {request.userName}
                              </span>
                              <span className="text-[0.75rem] text-muted-foreground">
                                {request.userEmail}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="size-3.5"
                              style={{ color: typeInfo.textColor }}
                            >
                              {typeInfo.icon}
                            </div>
                            <span className="text-[0.875rem]">
                              {typeInfo.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[0.875rem]">
                              {format(new Date(request.startDate), "MMM d")}
                              &ndash;{" "}
                              {format(new Date(request.endDate), "MMM d, yyyy")}
                            </span>
                            {request.notes && (
                              <span className="max-w-[150px] truncate text-[0.75rem] text-muted-foreground">
                                &ldquo;{request.notes}&rdquo;
                              </span>
                            )}
                            {request.seriesId && request.recurrenceRule && (
                              <span className="text-[0.7rem] text-muted-foreground">
                                {describeRecurrenceRule(request.recurrenceRule)}{" "}
                                {request.occurrenceIndex ?? 1}/
                                {request.occurrenceCount ?? 1}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">
                            {formatVal(request.hours)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5 leading-none">
                              <span className="text-muted-foreground text-[10px] uppercase tracking-tighter opacity-60">
                                Current
                              </span>
                              <span className="font-medium text-body-sm">
                                {formatVal(request.balanceHours)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 leading-none">
                              <span className="text-muted-foreground text-[10px] uppercase tracking-tighter opacity-60">
                                Projected
                              </span>
                              <span className="font-bold text-primary text-sm">
                                {formatVal(
                                  request.balanceHours - request.hours
                                )}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              className="size-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                handleAction(request.id, "rejected")
                              }
                              size="sm"
                              variant="outline"
                            >
                              <XIcon className="size-4" />
                              <span className="sr-only">Reject</span>
                            </Button>
                            <Button
                              className="size-8 p-0"
                              onClick={() =>
                                handleAction(request.id, "approved")
                              }
                              size="sm"
                            >
                              <CheckIcon className="size-4" />
                              <span className="sr-only">Approve</span>
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

      {/* Add Leave Modal (Dialog) */}
      <Dialog onOpenChange={setModalOpen} open={modalOpen}>
        <DialogContent className="max-h-[92dvh] w-full overflow-y-auto sm:max-w-[640px]">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl">Add Leave</DialogTitle>
            <DialogDescription>
              Record a leave entry for a team member.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            {/* Team Member Selection */}
            <div className="flex flex-col gap-3">
              <Label className="font-bold text-label-sm text-muted-foreground uppercase tracking-widest">
                Team Member
              </Label>
              <Select onValueChange={setSelectedUser} value={selectedUser}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select staff member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yuki Tanaka">Yuki Tanaka</SelectItem>
                  <SelectItem value="Sofia Reyes">Sofia Reyes</SelectItem>
                  <SelectItem value="Priya Sharma">Priya Sharma</SelectItem>
                  <SelectItem value="Marcus Webb">Marcus Webb</SelectItem>
                  <SelectItem value="Jameson Lee">Jameson Lee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Leave type picker */}
            <div className="flex flex-col gap-3">
              <Label className="font-bold text-label-sm text-muted-foreground uppercase tracking-widest">
                Type
              </Label>
              <fieldset className="grid grid-cols-2 gap-2 border-0 p-0 sm:grid-cols-3">
                <legend className="sr-only">Leave type</legend>
                {LEAVE_TYPES.map((lt) => {
                  const active = selectedType === lt.id;
                  return (
                    <button
                      aria-pressed={active}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left font-bold text-label-sm transition-all active:scale-[0.98]"
                      key={lt.id}
                      onClick={() => setSelectedType(lt.id)}
                      style={
                        active
                          ? {
                              background: lt.color,
                              color: lt.textColor,
                              boxShadow: `0 0 0 2px ${lt.textColor}`,
                            }
                          : {
                              background: "var(--muted)",
                              color: "var(--muted-foreground)",
                            }
                      }
                      type="button"
                    >
                      <span
                        style={{
                          color: active
                            ? lt.textColor
                            : "var(--muted-foreground)",
                        }}
                      >
                        {lt.icon}
                      </span>
                      {lt.label.split(" ")[0]}
                    </button>
                  );
                })}
              </fieldset>
            </div>

            {/* Custom label */}
            {selectedType === "custom" && (
              <div className="flex flex-col gap-2">
                <Label
                  className="font-bold text-label-sm text-muted-foreground uppercase tracking-widest"
                  htmlFor="custom-label"
                >
                  Custom label
                </Label>
                <Input
                  id="custom-label"
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Conference, Volunteer day…"
                  value={customLabel}
                />
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label
                    className="font-bold text-label-sm text-muted-foreground uppercase tracking-widest"
                    htmlFor="start-date"
                  >
                    Start date
                  </Label>
                  <Input
                    id="start-date"
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value > endDate) {
                        setEndDate(e.target.value);
                      }
                    }}
                    type="date"
                    value={startDate}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label
                    className="font-bold text-label-sm text-muted-foreground uppercase tracking-widest"
                    htmlFor="end-date"
                  >
                    End date
                  </Label>
                  <Input
                    id="end-date"
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    type="date"
                    value={endDate}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={allDay}
                  id="all-day"
                  onCheckedChange={(v) => setAllDay(v === true)}
                />
                <Label
                  className="cursor-pointer font-medium text-body-sm"
                  htmlFor="all-day"
                >
                  All day entry
                </Label>
              </div>

              {!allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label
                      className="font-bold text-label-sm text-muted-foreground uppercase tracking-widest"
                      htmlFor="start-time"
                    >
                      Start time
                    </Label>
                    <Input
                      id="start-time"
                      onChange={(e) => setStartTime(e.target.value)}
                      type="time"
                      value={startTime}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      className="font-bold text-label-sm text-muted-foreground uppercase tracking-widest"
                      htmlFor="end-time"
                    >
                      End time
                    </Label>
                    <Input
                      id="end-time"
                      onChange={(e) => setEndTime(e.target.value)}
                      type="time"
                      value={endTime}
                    />
                  </div>
                </div>
              )}
            </div>

            <RecurrenceFields
              endDate={endDate}
              frequency={recurrenceFrequency}
              onFrequencyChange={setRecurrenceFrequency}
              onRuleChange={setRecurrenceRule}
              rule={recurrenceRule}
              startDate={startDate}
            />

            {/* Impact Preview */}
            {startDate && endDate && (
              <div className="flex flex-col gap-3 rounded-2xl bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-label-sm text-muted-foreground uppercase tracking-widest">
                    Impact Preview
                  </Label>
                  <span
                    className={cn(
                      "rounded-lg px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider",
                      conflicts.length > 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {conflicts.length} Overlaps
                  </span>
                </div>

                {conflicts.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-tight">
                      Team overlaps:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {conflicts.map((c) => (
                        <div
                          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 shadow-sm"
                          key={c.id}
                        >
                          <Avatar className="size-4">
                            <AvatarFallback className="text-[6px]">
                              {c.userName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-[10px] text-foreground">
                            {c.userName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-primary">
                    <CheckIcon className="size-3.5" strokeWidth={3} />
                    <span className="font-bold text-[10px] uppercase tracking-wider">
                      No team overlaps
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <Label
                className="font-bold text-label-sm text-muted-foreground uppercase tracking-widest"
                htmlFor="notes"
              >
                Notes{" "}
                <span className="font-normal lowercase tracking-normal opacity-60">
                  (optional)
                </span>
              </Label>
              <Textarea
                className="min-h-[100px] resize-none rounded-xl text-body-sm"
                id="notes"
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any context, coverage arrangements…"
                rows={3}
                value={notes}
              />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full" tabIndex={disabledReason ? 0 : -1}>
                    <Button
                      className="h-12 w-full gap-2 rounded-2xl font-bold text-label-lg shadow-sm"
                      disabled={!!disabledReason}
                      onClick={handleAddLeave}
                      type="button"
                    >
                      <PlusIcon className="size-4" strokeWidth={3} />
                      Add Leave
                    </Button>
                  </span>
                </TooltipTrigger>
                {disabledReason && (
                  <TooltipContent>{disabledReason}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
