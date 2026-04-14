"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
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
import { Switch } from "@repo/design-system/components/ui/switch";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  BriefcaseIcon,
  HomeIcon,
  InboxIcon,
  MapPinIcon,
  SparklesIcon,
  SunIcon,
} from "lucide-react";
import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type LeaveTypeId =
  | "holiday"
  | "personal"
  | "out-of-office"
  | "wfh"
  | "travelling"
  | "custom";

interface LeaveType {
  color: string;
  icon: React.ReactNode;
  id: LeaveTypeId;
  label: string;
  textColor: string;
}

interface PlanEntry {
  allDay: boolean;
  endDate: string;
  endTime?: string;
  id: string;
  notes: string;
  startDate: string;
  startTime?: string;
  type: LeaveTypeId;
}

// ─── Data ────────────────────────────────────────────────────────────────────

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

const LEAVE_BALANCES: Record<LeaveTypeId, { remaining: number; total: number }> =
  {
    holiday: { remaining: 14, total: 25 },
    personal: { remaining: 3, total: 5 },
    "out-of-office": { remaining: 8, total: 10 },
    wfh: { remaining: 12, total: 12 },
    travelling: { remaining: 5, total: 10 },
    custom: { remaining: 0, total: 0 },
  };

const MOCK_PLANS: Record<string, PlanEntry> = {
  plan_1: {
    id: "plan_1",
    type: "holiday",
    startDate: "2026-04-20",
    endDate: "2026-04-24",
    allDay: true,
    notes: "Easter break",
  },
  plan_2: {
    id: "plan_2",
    type: "wfh",
    startDate: "2026-04-13",
    endDate: "2026-04-13",
    allDay: true,
    notes: "Team retrospective meeting",
  },
  plan_3: {
    id: "plan_3",
    type: "travelling",
    startDate: "2026-05-10",
    endDate: "2026-05-17",
    allDay: true,
    notes: "Conference in Berlin",
  },
  plan_4: {
    id: "plan_4",
    type: "personal",
    startDate: "2026-06-01",
    endDate: "2026-06-03",
    allDay: false,
    startTime: "14:00",
    endTime: "18:00",
    notes: "Doctor appointment",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getLeaveType = (id: LeaveTypeId) =>
  LEAVE_TYPES.find((t) => t.id === id) ?? LEAVE_TYPES[0];

const calculateDuration = (start: string, end: string): number => {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

interface EditPlanClientProperties {
  readonly planId: string;
}

const EditPlanClient = ({ planId }: EditPlanClientProperties) => {
  const mockPlan = MOCK_PLANS[planId] ?? MOCK_PLANS.plan_1;
  const leaveType = getLeaveType(mockPlan.type);
  const balance = LEAVE_BALANCES[mockPlan.type];

  const [type, setType] = useState<LeaveTypeId>(mockPlan.type);
  const [startDate, setStartDate] = useState(mockPlan.startDate);
  const [endDate, setEndDate] = useState(mockPlan.endDate);
  const [allDay, setAllDay] = useState(mockPlan.allDay);
  const [startTime, setStartTime] = useState(mockPlan.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(mockPlan.endTime ?? "17:00");
  const [notes, setNotes] = useState(mockPlan.notes);

  const duration = calculateDuration(startDate, endDate);
  const selectedBalance = LEAVE_BALANCES[type];
  const remainingAfter = selectedBalance.remaining - duration;

  return (
    <>
      <DialogHeader className="mb-6">
        <DialogTitle>Edit plan</DialogTitle>
        <DialogDescription>{leaveType.label}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Leave Type Select */}
        <div className="space-y-2">
          <Label htmlFor="leave-type">Leave type</Label>
          <Select value={type} onValueChange={(v) => setType(v as LeaveTypeId)}>
            <SelectTrigger id="leave-type" className="h-11 w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAVE_TYPES.map((lt) => (
                <SelectItem key={lt.id} value={lt.id}>
                  {lt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        {/* All-day toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="all-day">All day</Label>
          <Switch
            id="all-day"
            checked={allDay}
            onCheckedChange={setAllDay}
          />
        </div>

        {/* Time inputs (conditional) */}
        {!allDay && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Balance panel */}
        <div className="rounded-lg bg-muted p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Duration</div>
              <div className="font-semibold">{duration} days</div>
            </div>
            <div>
              <div className="text-muted-foreground">Remaining balance</div>
              <div className="font-semibold">{selectedBalance.remaining} days</div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground">After this request</div>
              <div
                className={`font-semibold ${
                  remainingAfter < 0 ? "text-destructive" : ""
                }`}
              >
                {remainingAfter} days
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about this plan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl"
            rows={3}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button variant="outline" className="flex-1">
            Save draft
          </Button>
          <Button className="flex-1">Save and submit</Button>
        </div>
      </div>
    </>
  );
};

export { EditPlanClient };
