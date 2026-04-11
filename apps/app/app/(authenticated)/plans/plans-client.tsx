"use client";

import { Button } from "@repo/design-system/components/ui/button";
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
import { toast } from "@repo/design-system/components/ui/sonner";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  BriefcaseIcon,
  CalendarRangeIcon,
  HomeIcon,
  InboxIcon,
  InfoIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  SunIcon,
  Trash2Icon,
} from "lucide-react";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { RecurrenceFields } from "../components/recurrence-fields";
import {
  createDefaultRecurrenceRule,
  describeRecurrenceRule,
  generateRecurrenceOccurrences,
  getSingleOccurrence,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from "../recurrence";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Executes a state update within a View Transition if supported by the browser.
 */
const startTransition = (fn: () => void) => {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    (
      document as Document & { startViewTransition: (fn: () => void) => void }
    ).startViewTransition(fn);
  } else {
    fn();
  }
};

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

interface CalendarOption {
  hint?: string;
  id: string;
  label: string;
}

interface PlanEntry {
  allDay: boolean;
  calendars: string[];
  createdAt: Date;
  customLabel?: string;
  endDate: string;
  endTime?: string;
  id: string;
  isNew?: boolean;
  notes: string;
  occurrenceCount?: number;
  occurrenceIndex?: number;
  recurrenceRule?: RecurrenceRule;
  seriesId?: string;
  startDate: string;
  startTime?: string;
  type: LeaveTypeId;
}

// ─── Static data ─────────────────────────────────────────────────────────────

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

const CALENDARS: CalendarOption[] = [
  { id: "personal", label: "Personal Calendar" },
  { id: "work", label: "Work Calendar" },
  { id: "team", label: "Team Calendar" },
  {
    id: "public-feed",
    label: "Public Feed",
    hint: "Visible to anyone with your organisation's calendar feed URL",
  },
];

const today = new Date().toISOString().split("T")[0] as string;

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

const sortByDate = (a: PlanEntry, b: PlanEntry) =>
  a.startDate.localeCompare(b.startDate);

// ─── Empty state ──────────────────────────────────────────────────────────────

interface EmptyPlansProps {
  onCreate: () => void;
}

const EmptyPlans = ({ onCreate }: EmptyPlansProps) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-muted/30 py-20 text-center">
    <div className="flex size-14 items-center justify-center rounded-2xl bg-background shadow-sm transition-colors group-hover:bg-accent">
      <CalendarRangeIcon className="size-7 text-primary" strokeWidth={1.25} />
    </div>
    <div className="max-w-[280px]">
      <p className="font-semibold text-foreground text-headline-sm tracking-tight">
        No plans yet
      </p>
      <p className="mt-1 text-body-sm text-muted-foreground leading-relaxed">
        Schedule your leave, WFH days, or time away to sync them across your
        calendars.
      </p>
    </div>
    <Button className="mt-4 px-8" onClick={onCreate} variant="default">
      <PlusIcon className="mr-2 size-4" strokeWidth={2.5} />
      Add your first plan
    </Button>
  </div>
);

// ─── Plan entry card ──────────────────────────────────────────────────────────

interface PlanCardProps {
  entry: PlanEntry;
  isEditing: boolean;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
  onSave: (id: string, updated: Partial<PlanEntry>) => void;
}

const PlanCard = ({
  entry,
  isEditing,
  onCancel,
  onDelete,
  onEdit,
  onSave,
}: PlanCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef.current) {
      return;
    }
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const type = getLeaveType(entry.type);
  const label =
    entry.type === "custom" && entry.customLabel
      ? entry.customLabel
      : type.label;
  const recurrenceLabel =
    entry.seriesId && entry.recurrenceRule && entry.occurrenceCount
      ? `${describeRecurrenceRule(entry.recurrenceRule)} ${entry.occurrenceIndex ?? 1}/${entry.occurrenceCount}`
      : null;
  const calendarLabels = CALENDARS.filter((c) =>
    entry.calendars.includes(c.id)
  ).map((c) => c.label);

  let timeLabel = "";
  if (entry.allDay) {
    timeLabel = " · All day";
  } else if (entry.startTime && entry.endTime) {
    timeLabel = ` · ${entry.startTime} – ${entry.endTime}`;
  }

  // ── Inline edit state ──
  const [editType, setEditType] = useState<LeaveTypeId>(entry.type);
  const [editCustomLabel, setEditCustomLabel] = useState(
    entry.customLabel ?? ""
  );
  const [editStartDate, setEditStartDate] = useState(entry.startDate);
  const [editEndDate, setEditEndDate] = useState(entry.endDate);
  const [editAllDay, setEditAllDay] = useState(entry.allDay);
  const [editNotes, setEditNotes] = useState(entry.notes);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-sync from entry only when editing opens, not on every entry change
  useEffect(() => {
    if (isEditing) {
      setEditType(entry.type);
      setEditCustomLabel(entry.customLabel ?? "");
      setEditStartDate(entry.startDate);
      setEditEndDate(entry.endDate);
      setEditAllDay(entry.allDay);
      setEditNotes(entry.notes);
    }
  }, [isEditing]);

  const editValid =
    editStartDate &&
    editEndDate &&
    editEndDate >= editStartDate &&
    (editType !== "custom" || editCustomLabel.trim().length > 0);

  if (isEditing) {
    return (
      <motion.div
        className="flex flex-col gap-4 rounded-2xl bg-background p-5 shadow-lg ring-1 ring-border"
        layout
      >
        {/* Type picker */}
        <fieldset className="grid grid-cols-2 gap-2 border-0 p-0 sm:grid-cols-3">
          <legend className="sr-only">Leave type</legend>
          {LEAVE_TYPES.map((lt) => {
            const active = editType === lt.id;
            return (
              <button
                aria-pressed={active}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-label-sm transition-all active:scale-[0.98]"
                key={lt.id}
                onClick={() => setEditType(lt.id)}
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
                    color: active ? lt.textColor : "var(--muted-foreground)",
                  }}
                >
                  {lt.icon}
                </span>
                {lt.label}
              </button>
            );
          })}
        </fieldset>

        {editType === "custom" && (
          <Input
            onChange={(e) => setEditCustomLabel(e.target.value)}
            placeholder="e.g. Conference, Volunteer day…"
            value={editCustomLabel}
          />
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label
              className="font-medium text-label-sm text-muted-foreground uppercase tracking-wider"
              htmlFor={`edit-start-${entry.id}`}
            >
              Start date
            </Label>
            <Input
              id={`edit-start-${entry.id}`}
              onChange={(e) => {
                setEditStartDate(e.target.value);
                if (e.target.value > editEndDate) {
                  setEditEndDate(e.target.value);
                }
              }}
              type="date"
              value={editStartDate}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              className="font-medium text-label-sm text-muted-foreground uppercase tracking-wider"
              htmlFor={`edit-end-${entry.id}`}
            >
              End date
            </Label>
            <Input
              id={`edit-end-${entry.id}`}
              min={editStartDate}
              onChange={(e) => setEditEndDate(e.target.value)}
              type="date"
              value={editEndDate}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={editAllDay}
            id={`edit-allday-${entry.id}`}
            onCheckedChange={(v) => setEditAllDay(v === true)}
          />
          <Label
            className="cursor-pointer text-body-sm"
            htmlFor={`edit-allday-${entry.id}`}
          >
            All day
          </Label>
        </div>

        <Textarea
          className="min-h-[80px] resize-none text-body-sm"
          onChange={(e) => setEditNotes(e.target.value)}
          placeholder="Any context, coverage arrangements, contact details…"
          rows={2}
          value={editNotes}
        />

        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={!editValid}
            onClick={() =>
              onSave(entry.id, {
                type: editType,
                customLabel:
                  editType === "custom" ? editCustomLabel : undefined,
                startDate: editStartDate,
                endDate: editEndDate,
                allDay: editAllDay,
                notes: editNotes,
              })
            }
            type="button"
          >
            Save changes
          </Button>
          <Button onClick={onCancel} type="button" variant="outline">
            Cancel
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={[
        "group relative flex flex-col gap-3 rounded-2xl bg-muted/40 p-5 transition-all hover:bg-muted/60 hover:shadow-xl",
        entry.isNew
          ? "fade-in-0 slide-in-from-bottom-2 animate-in duration-300"
          : "",
      ]
        .join(" ")
        .trim()}
      layout
      onMouseEnter={() => x.set(0)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={cardRef}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="flex items-start justify-between gap-3"
        style={{ transform: "translateZ(15px)" }}
      >
        {/* Type badge */}
        <div
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold text-label-sm uppercase tracking-wider shadow-sm"
          style={{ background: type.color, color: type.textColor }}
        >
          {type.icon}
          {label}
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button
            aria-label={
              entry.seriesId
                ? "Recurring plans can only be deleted as a series"
                : "Edit plan"
            }
            className="rounded-md p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-background hover:text-foreground"
            disabled={!!entry.seriesId}
            onClick={onEdit}
            title={
              entry.seriesId
                ? "Recurring plans can only be deleted as a series"
                : "Edit plan"
            }
            type="button"
          >
            <PencilIcon className="size-3.5" strokeWidth={2} />
          </button>
          <button
            aria-label="Remove plan"
            className="rounded-md p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(entry.id)}
            type="button"
          >
            <Trash2Icon className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="min-w-0" style={{ transform: "translateZ(8px)" }}>
        <p className="font-medium text-label-md text-muted-foreground uppercase tracking-wider">
          {isSameDay(entry.startDate, entry.endDate)
            ? formatDate(entry.startDate)
            : `${formatDate(entry.startDate)} – ${formatDate(entry.endDate)}`}
          <span className="normal-case opacity-70">{timeLabel}</span>
        </p>

        {entry.notes && (
          <p className="mt-2 line-clamp-3 text-body-sm text-on-surface-variant leading-relaxed">
            {entry.notes}
          </p>
        )}

        {calendarLabels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {calendarLabels.map((cal) => (
              <span
                className="rounded-md bg-background/50 px-2 py-0.5 font-bold text-label-sm text-muted-foreground uppercase tracking-widest"
                key={cal}
              >
                {cal}
              </span>
            ))}
          </div>
        )}

        {recurrenceLabel && (
          <p className="mt-3 font-bold text-[10px] text-muted-foreground uppercase tracking-widest">
            {recurrenceLabel}
          </p>
        )}
      </div>
    </motion.div>
  );
};

// ─── Plan entry form ──────────────────────────────────────────────────────────

interface PlanFormProps {
  onAdd: (entries: PlanEntry[]) => void;
  onClose?: () => void;
}

const PlanForm = ({ onAdd, onClose }: PlanFormProps) => {
  const [selectedType, setSelectedType] = useState<LeaveTypeId>("holiday");
  const [customLabel, setCustomLabel] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([
    "work",
  ]);
  const [notes, setNotes] = useState("");
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<RecurrenceFrequency>("none");
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(
    createDefaultRecurrenceRule("weekly", today)
  );

  const toggleCalendar = (id: string) => {
    setSelectedCalendars((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const getDisabledReason = (): string | null => {
    if (!startDate) {
      return "Select a start and end date";
    }
    if (!endDate) {
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

  const handleAdd = () => {
    if (disabledReason) {
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
    const seriesId = isRecurring ? crypto.randomUUID() : undefined;
    const occurrenceCount = generated.occurrences.length;
    const entries: PlanEntry[] = generated.occurrences.map(
      (occurrence, index) => ({
        id: crypto.randomUUID(),
        type: selectedType,
        customLabel: selectedType === "custom" ? customLabel : undefined,
        startDate: occurrence.startDate,
        endDate: occurrence.endDate,
        allDay,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        calendars: selectedCalendars,
        notes,
        createdAt: new Date(),
        isNew: true,
        seriesId,
        recurrenceRule: isRecurring ? recurrenceRule : undefined,
        occurrenceIndex: isRecurring ? index + 1 : undefined,
        occurrenceCount: isRecurring ? occurrenceCount : undefined,
      })
    );

    onAdd(entries);
    setNotes("");
    setCustomLabel("");
    setRecurrenceFrequency("none");
    setRecurrenceRule(createDefaultRecurrenceRule("weekly", startDate));
    onClose?.();
  };

  return (
    <div className="flex flex-col gap-6">
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
                    color: active ? lt.textColor : "var(--muted-foreground)",
                  }}
                >
                  {lt.icon}
                </span>
                {lt.label}
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
              min={today}
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
              min={startDate || today}
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

      {/* Calendar selection */}
      <div className="flex flex-col gap-3">
        <Label className="font-bold text-label-sm text-muted-foreground uppercase tracking-widest">
          Add to calendars
        </Label>
        <div className="flex flex-col gap-1 rounded-2xl bg-muted/50 p-2">
          {CALENDARS.map((cal) => (
            <div
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-accent"
              key={cal.id}
            >
              <Checkbox
                checked={selectedCalendars.includes(cal.id)}
                id={`cal-${cal.id}`}
                onCheckedChange={() => toggleCalendar(cal.id)}
              />
              <label
                className="flex flex-1 cursor-pointer items-center gap-1.5 font-medium text-body-sm"
                htmlFor={`cal-${cal.id}`}
              >
                {cal.label}
              </label>
              {cal.hint && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                        type="button"
                      >
                        <InfoIcon className="size-3.5" strokeWidth={2} />
                        <span className="sr-only">About {cal.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[240px]">
                      {cal.hint}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          ))}
        </div>
        {selectedCalendars.length === 0 && (
          <p className="px-1 font-bold text-[10px] text-destructive uppercase tracking-widest">
            Select at least one calendar
          </p>
        )}
      </div>

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
          className="min-h-[100px] resize-none text-body-sm"
          id="notes"
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any context, coverage arrangements, contact details…"
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
                onClick={handleAdd}
                type="button"
              >
                <PlusIcon className="size-4" strokeWidth={3} />
                Add to plan
              </Button>
            </span>
          </TooltipTrigger>
          {disabledReason && <TooltipContent>{disabledReason}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// ─── Main client component ────────────────────────────────────────────────────

export const PlansClient = () => {
  const [plans, setPlans] = useState<PlanEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("leavesync_plans");
    if (saved) {
      try {
        setPlans(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load plans from localStorage", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when plans change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("leavesync_plans", JSON.stringify(plans));
    }
  }, [plans, isLoaded]);

  const handleAdd = (entries: PlanEntry[]) => {
    setPlans((prev) => [...prev, ...entries].sort(sortByDate));
    toast.success(
      entries.length === 1
        ? "Entry added to your plans"
        : `${entries.length} entries added to your plans`
    );
  };

  const handleDelete = (id: string) => {
    const entry = plans.find((p) => p.id === id);
    if (!entry) {
      return;
    }
    const removedEntries = entry.seriesId
      ? plans.filter((p) => p.seriesId === entry.seriesId)
      : [entry];
    setPlans((prev) =>
      prev.filter((p) =>
        entry.seriesId ? p.seriesId !== entry.seriesId : p.id !== id
      )
    );
    toast(entry.seriesId ? "Recurring series removed" : "Entry removed", {
      action: {
        label: "Undo",
        onClick: () =>
          setPlans((prev) => [...prev, ...removedEntries].sort(sortByDate)),
      },
    });
  };

  const handleSave = (id: string, updated: Partial<PlanEntry>) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p)).sort(sortByDate)
    );
    setEditingId(null);
    toast.success("Entry updated");
  };

  // Group plans by month
  const grouped = plans.reduce<Record<string, PlanEntry[]>>((acc, plan) => {
    const monthKey = plan.startDate.slice(0, 7); // YYYY-MM
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(plan);
    return acc;
  }, {});

  const formatMonthHeading = (key: string) => {
    const d = new Date(`${key}-01T00:00:00`);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  };

  const totalDays = plans.reduce((acc, plan) => {
    const start = new Date(plan.startDate);
    const end = new Date(plan.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return acc + diffDays;
  }, 0);

  const typeCounts = plans.reduce<Record<string, number>>((acc, plan) => {
    acc[plan.type] = (acc[plan.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="flex flex-col gap-8">
        {/* ── Header & Primary Action ───────────────────────────────── */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-bold text-label-sm text-muted-foreground uppercase tracking-[0.15em]">
              Timeline
            </p>
            <h2 className="mt-1 font-bold text-display-sm text-foreground tracking-tight">
              My plans
            </h2>
          </div>
          <Button
            className="hidden h-11 rounded-2xl px-6 sm:flex"
            onClick={() => startTransition(() => setSheetOpen(true))}
            style={{ viewTransitionName: "add-plan-trigger" }}
            variant="default"
          >
            <PlusIcon className="mr-2 size-4" strokeWidth={2.5} />
            New entry
          </Button>
        </div>

        {/* ── Summary Cards ──────────────────────────────────────────── */}
        {plans.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-1 rounded-2xl bg-muted/50 p-5 shadow-sm transition-all hover:bg-muted/70"
              initial={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4 }}
            >
              <p className="font-bold text-label-sm text-muted-foreground uppercase tracking-widest">
                Total Days
              </p>
              <p className="font-bold text-display-sm text-foreground leading-none tracking-tight">
                {totalDays}
              </p>
            </motion.div>
            {LEAVE_TYPES.slice(0, 3).map((type, idx) => (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-1 rounded-2xl p-5 shadow-sm transition-all hover:brightness-95"
                initial={{ opacity: 0, y: 10 }}
                key={type.id}
                style={{ background: type.color }}
                transition={{ duration: 0.4, delay: (idx + 1) * 0.1 }}
              >
                <p
                  className="font-bold text-label-sm uppercase tracking-widest opacity-80"
                  style={{ color: type.textColor }}
                >
                  {type.label.split(" ")[0]}
                </p>
                <p
                  className="font-bold text-display-sm leading-none tracking-tight"
                  style={{ color: type.textColor }}
                >
                  {typeCounts[type.id] || 0}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Plan Timeline ──────────────────────────────────────────── */}
        {plans.length === 0 ? (
          <EmptyPlans
            onCreate={() => startTransition(() => setSheetOpen(true))}
          />
        ) : (
          <div className="flex flex-col gap-8">
            {Object.entries(grouped).map(([monthKey, entries]) => (
              <div className="flex flex-col gap-3" key={monthKey}>
                <p className="font-bold text-muted-foreground text-xs uppercase tracking-widest">
                  {formatMonthHeading(monthKey)}
                </p>
                <motion.div
                  className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  layout
                >
                  <AnimatePresence mode="popLayout">
                    {entries.map((entry) => (
                      <PlanCard
                        entry={entry}
                        isEditing={editingId === entry.id}
                        key={entry.id}
                        onCancel={() => setEditingId(null)}
                        onDelete={handleDelete}
                        onEdit={() => setEditingId(entry.id)}
                        onSave={handleSave}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Mobile: floating add button ────────────────────────────── */}
      <div className="fixed right-6 bottom-6 z-10 sm:hidden">
        <Button
          aria-label="Add entry"
          className="size-14 rounded-full shadow-lg"
          onClick={() => startTransition(() => setSheetOpen(true))}
          style={{ viewTransitionName: "add-plan-trigger" }}
          type="button"
        >
          <PlusIcon className="size-6" strokeWidth={2.5} />
        </Button>
      </div>

      {/* ── Add entry modal ────────────────────────────────────────── */}
      <Dialog
        onOpenChange={(open) => startTransition(() => setSheetOpen(open))}
        open={sheetOpen}
      >
        <DialogContent
          className="max-h-[92dvh] w-full overflow-y-auto sm:max-w-[640px]"
          style={{ viewTransitionName: "add-plan-trigger" }}
        >
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl">Add to my plans</DialogTitle>
            <DialogDescription>
              Schedule your leave, WFH days, or time away.
            </DialogDescription>
          </DialogHeader>
          <PlanForm
            onAdd={handleAdd}
            onClose={() => startTransition(() => setSheetOpen(false))}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
