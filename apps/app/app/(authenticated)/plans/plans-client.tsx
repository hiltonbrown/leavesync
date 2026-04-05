"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  BriefcaseIcon,
  CalendarRangeIcon,
  HomeIcon,
  InboxIcon,
  MapPinIcon,
  PlusIcon,
  SparklesIcon,
  SunIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type LeaveTypeId =
  | "holiday"
  | "personal"
  | "out-of-office"
  | "wfh"
  | "travelling"
  | "custom";

interface LeaveType {
  id: LeaveTypeId;
  label: string;
  icon: React.ReactNode;
  color: string;
  textColor: string;
}

interface CalendarOption {
  id: string;
  label: string;
}

interface PlanEntry {
  id: string;
  type: LeaveTypeId;
  customLabel?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  calendars: string[];
  notes: string;
  createdAt: Date;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const LEAVE_TYPES: LeaveType[] = [
  {
    id: "holiday",
    label: "Holiday Leave",
    icon: <SunIcon className="size-3.5" strokeWidth={1.75} />,
    color: "color-mix(in srgb, var(--primary-container) 30%, transparent)",
    textColor: "var(--primary)",
  },
  {
    id: "personal",
    label: "Personal Leave",
    icon: <BriefcaseIcon className="size-3.5" strokeWidth={1.75} />,
    color: "color-mix(in srgb, var(--secondary-container) 40%, transparent)",
    textColor: "var(--secondary)",
  },
  {
    id: "out-of-office",
    label: "Out of Office",
    icon: <InboxIcon className="size-3.5" strokeWidth={1.75} />,
    color: "color-mix(in srgb, oklch(85% 0.12 60) 35%, transparent)",
    textColor: "oklch(48% 0.14 60)",
  },
  {
    id: "wfh",
    label: "Working From Home",
    icon: <HomeIcon className="size-3.5" strokeWidth={1.75} />,
    color: "color-mix(in srgb, oklch(85% 0.10 290) 35%, transparent)",
    textColor: "oklch(42% 0.14 290)",
  },
  {
    id: "travelling",
    label: "Travelling",
    icon: <MapPinIcon className="size-3.5" strokeWidth={1.75} />,
    color: "color-mix(in srgb, oklch(85% 0.10 200) 35%, transparent)",
    textColor: "oklch(42% 0.14 200)",
  },
  {
    id: "custom",
    label: "Custom",
    icon: <SparklesIcon className="size-3.5" strokeWidth={1.75} />,
    color: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)",
    textColor: "var(--muted-foreground)",
  },
];

const CALENDARS: CalendarOption[] = [
  { id: "personal", label: "Personal Calendar" },
  { id: "work", label: "Work Calendar" },
  { id: "team", label: "Team Calendar" },
  { id: "public-feed", label: "Public Feed" },
];

const today = new Date().toISOString().split("T")[0];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getLeaveType = (id: LeaveTypeId) =>
  LEAVE_TYPES.find((t) => t.id === id) ?? LEAVE_TYPES[0];

const formatDate = (dateStr: string) => {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const isSameDay = (a: string, b: string) => a === b;

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyPlans = () => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 text-center"
    style={{ borderColor: "var(--border)" }}
  >
    <div
      className="flex size-10 items-center justify-center rounded-xl"
      style={{ background: "var(--muted)" }}
    >
      <CalendarRangeIcon className="size-5 text-muted-foreground" strokeWidth={1.5} />
    </div>
    <div>
      <p className="text-[0.875rem] font-medium text-foreground">No plans yet</p>
      <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
        Add your first entry using the form.
      </p>
    </div>
  </div>
);

// ─── Plan entry card ──────────────────────────────────────────────────────────

const PlanCard = ({
  entry,
  onDelete,
}: {
  entry: PlanEntry;
  onDelete: (id: string) => void;
}) => {
  const type = getLeaveType(entry.type);
  const label =
    entry.type === "custom" && entry.customLabel ? entry.customLabel : type.label;
  const calendarLabels = CALENDARS.filter((c) =>
    entry.calendars.includes(c.id)
  ).map((c) => c.label);

  return (
    <div
      className="group flex items-start gap-4 rounded-2xl p-4 transition-colors hover:bg-accent"
      style={{ background: "var(--card)" }}
    >
      {/* Type badge */}
      <div
        className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5"
        style={{ background: type.color }}
      >
        <span style={{ color: type.textColor }}>{type.icon}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[0.875rem] font-semibold leading-tight text-foreground">
              {label}
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
              {isSameDay(entry.startDate, entry.endDate)
                ? formatDate(entry.startDate)
                : `${formatDate(entry.startDate)} – ${formatDate(entry.endDate)}`}
              {entry.allDay
                ? " · All day"
                : entry.startTime && entry.endTime
                  ? ` · ${entry.startTime} – ${entry.endTime}`
                  : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            aria-label="Remove plan"
          >
            <Trash2Icon className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>

        {entry.notes && (
          <p className="mt-1.5 text-[0.8125rem] text-muted-foreground line-clamp-2">
            {entry.notes}
          </p>
        )}

        {calendarLabels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {calendarLabels.map((cal) => (
              <span
                key={cal}
                className="rounded-md px-2 py-0.5 text-[0.6875rem] font-medium"
                style={{
                  background: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
                {cal}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main client component ────────────────────────────────────────────────────

export const PlansClient = () => {
  const [plans, setPlans] = useState<PlanEntry[]>([]);

  // Form state
  const [selectedType, setSelectedType] = useState<LeaveTypeId>("holiday");
  const [customLabel, setCustomLabel] = useState("");
  const [startDate, setStartDate] = useState(today ?? "");
  const [endDate, setEndDate] = useState(today ?? "");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(["work"]);
  const [notes, setNotes] = useState("");

  const toggleCalendar = (id: string) => {
    setSelectedCalendars((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    if (!startDate || !endDate) return;
    if (endDate < startDate) return;

    const entry: PlanEntry = {
      id: crypto.randomUUID(),
      type: selectedType,
      customLabel: selectedType === "custom" ? customLabel : undefined,
      startDate,
      endDate,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      calendars: selectedCalendars,
      notes,
      createdAt: new Date(),
    };

    setPlans((prev) =>
      [...prev, entry].sort((a, b) => a.startDate.localeCompare(b.startDate))
    );

    // Reset form
    setNotes("");
    setCustomLabel("");
  };

  const handleDelete = (id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  // Group plans by month
  const grouped = plans.reduce<Record<string, PlanEntry[]>>((acc, plan) => {
    const monthKey = plan.startDate.slice(0, 7); // YYYY-MM
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(plan);
    return acc;
  }, {});

  const formatMonthHeading = (key: string) => {
    const d = new Date(`${key}-01T00:00:00`);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  };

  const isFormValid =
    startDate &&
    endDate &&
    endDate >= startDate &&
    (selectedType !== "custom" || customLabel.trim().length > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">

      {/* ── Add Entry Form ─────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-5 rounded-2xl p-6"
        style={{ background: "var(--muted)" }}
      >
        <div>
          <p className="text-[0.6875rem] font-medium tracking-widest uppercase text-muted-foreground">
            New Entry
          </p>
          <h2 className="mt-0.5 text-[1.25rem] font-semibold tracking-tight text-foreground">
            Add to my plans
          </h2>
        </div>

        {/* Leave type picker */}
        <div className="flex flex-col gap-2">
          <Label className="text-[0.8125rem] font-medium">Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {LEAVE_TYPES.map((lt) => {
              const active = selectedType === lt.id;
              return (
                <button
                  key={lt.id}
                  type="button"
                  onClick={() => setSelectedType(lt.id)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[0.8125rem] font-medium transition-all"
                  style={
                    active
                      ? {
                          background: lt.color,
                          color: lt.textColor,
                          boxShadow: `0 0 0 1.5px ${lt.textColor}`,
                        }
                      : {
                          background: "var(--background)",
                          color: "var(--on-surface-variant)",
                        }
                  }
                >
                  <span style={{ color: active ? lt.textColor : "var(--muted-foreground)" }}>
                    {lt.icon}
                  </span>
                  {lt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom label */}
        {selectedType === "custom" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-label" className="text-[0.8125rem] font-medium">
              Custom label
            </Label>
            <Input
              id="custom-label"
              placeholder="e.g. Conference, Volunteer day…"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
            />
          </div>
        )}

        {/* Dates */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start-date" className="text-[0.8125rem] font-medium">
                Start date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-date" className="text-[0.8125rem] font-medium">
                End date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="all-day"
              checked={allDay}
              onCheckedChange={(v) => setAllDay(v === true)}
            />
            <Label htmlFor="all-day" className="text-[0.8125rem] cursor-pointer">
              All day
            </Label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="start-time" className="text-[0.8125rem] font-medium">
                  Start time
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="end-time" className="text-[0.8125rem] font-medium">
                  End time
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Calendar selection */}
        <div className="flex flex-col gap-2">
          <Label className="text-[0.8125rem] font-medium">Add to calendars</Label>
          <div
            className="flex flex-col gap-0.5 rounded-xl p-3"
            style={{ background: "var(--background)" }}
          >
            {CALENDARS.map((cal) => (
              <label
                key={cal.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
              >
                <Checkbox
                  checked={selectedCalendars.includes(cal.id)}
                  onCheckedChange={() => toggleCalendar(cal.id)}
                />
                <span className="text-[0.8125rem]">{cal.label}</span>
              </label>
            ))}
          </div>
          {selectedCalendars.length === 0 && (
            <p className="text-[0.75rem] text-muted-foreground">
              Select at least one calendar to sync this entry.
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes" className="text-[0.8125rem] font-medium">
            Notes{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="notes"
            placeholder="Any context, coverage arrangements, contact details…"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none"
          />
        </div>

        <Button
          onClick={handleAdd}
          disabled={!isFormValid}
          className="w-full gap-2"
          style={
            isFormValid
              ? { background: "var(--primary)", color: "var(--on-primary)" }
              : undefined
          }
        >
          <PlusIcon className="size-4" strokeWidth={2} />
          Add to plan
        </Button>
      </div>

      {/* ── Plan Timeline ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[0.6875rem] font-medium tracking-widest uppercase text-muted-foreground">
            Planned
          </p>
          <h2 className="mt-0.5 text-[1.25rem] font-semibold tracking-tight text-foreground">
            My upcoming time
          </h2>
        </div>

        {plans.length === 0 ? (
          <EmptyPlans />
        ) : (
          <div className="flex flex-col gap-6">
            {Object.entries(grouped).map(([monthKey, entries]) => (
              <div key={monthKey} className="flex flex-col gap-2">
                <p
                  className="text-[0.75rem] font-semibold tracking-widest uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {formatMonthHeading(monthKey)}
                </p>
                <div className="flex flex-col gap-2">
                  {entries.map((entry) => (
                    <PlanCard key={entry.id} entry={entry} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
