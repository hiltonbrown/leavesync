"use client";

import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
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
  CalendarPlusIcon,
  CheckIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  PlusIcon,
  RssIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type FeedStatus = "active" | "paused";
type DateType = "public-holiday" | "custom" | "closure";

type Person = {
  id: string;
  name: string;
  initials: string;
  role: string;
  dept: string;
};

type SpecialDate = {
  id: string;
  label: string;
  date: string; // YYYY-MM-DD
  type: DateType;
  recurring: boolean;
};

type Feed = {
  id: string;
  name: string;
  description: string;
  timezone: string;
  status: FeedStatus;
  token: string;
  personIds: string[];
  dates: SpecialDate[];
  createdAt: string;
  lastSynced: string;
};

// ─── Reference data ─────────────────────────────────────────────────────────

const ALL_PEOPLE: Person[] = [
  { id: "p1", name: "Priya Sharma", initials: "PS", role: "Senior Engineer", dept: "Engineering" },
  { id: "p2", name: "Marcus Webb", initials: "MW", role: "Backend Engineer", dept: "Engineering" },
  { id: "p3", name: "Yuki Tanaka", initials: "YT", role: "Product Manager", dept: "Product" },
  { id: "p4", name: "Aisha Okonkwo", initials: "AO", role: "UI Designer", dept: "Design" },
  { id: "p5", name: "Tom Eriksson", initials: "TE", role: "Frontend Engineer", dept: "Engineering" },
  { id: "p6", name: "Sofia Reyes", initials: "SR", role: "Data Analyst", dept: "Product" },
];

type HolidayPreset = { label: string; holidays: Omit<SpecialDate, "id" | "recurring">[] };

const HOLIDAY_PRESETS: Record<string, HolidayPreset> = {
  gb: {
    label: "United Kingdom",
    holidays: [
      { label: "New Year's Day", date: "2026-01-01", type: "public-holiday" },
      { label: "Good Friday", date: "2026-04-03", type: "public-holiday" },
      { label: "Easter Monday", date: "2026-04-06", type: "public-holiday" },
      { label: "Early May Bank Holiday", date: "2026-05-04", type: "public-holiday" },
      { label: "Spring Bank Holiday", date: "2026-05-25", type: "public-holiday" },
      { label: "Summer Bank Holiday", date: "2026-08-31", type: "public-holiday" },
      { label: "Christmas Day", date: "2026-12-25", type: "public-holiday" },
      { label: "Boxing Day", date: "2026-12-28", type: "public-holiday" },
    ],
  },
  us: {
    label: "United States",
    holidays: [
      { label: "New Year's Day", date: "2026-01-01", type: "public-holiday" },
      { label: "MLK Jr. Day", date: "2026-01-19", type: "public-holiday" },
      { label: "Presidents' Day", date: "2026-02-16", type: "public-holiday" },
      { label: "Memorial Day", date: "2026-05-25", type: "public-holiday" },
      { label: "Independence Day", date: "2026-07-04", type: "public-holiday" },
      { label: "Labor Day", date: "2026-09-07", type: "public-holiday" },
      { label: "Thanksgiving Day", date: "2026-11-26", type: "public-holiday" },
      { label: "Christmas Day", date: "2026-12-25", type: "public-holiday" },
    ],
  },
  au: {
    label: "Australia",
    holidays: [
      { label: "New Year's Day", date: "2026-01-01", type: "public-holiday" },
      { label: "Australia Day", date: "2026-01-26", type: "public-holiday" },
      { label: "Good Friday", date: "2026-04-03", type: "public-holiday" },
      { label: "Easter Monday", date: "2026-04-06", type: "public-holiday" },
      { label: "Anzac Day", date: "2026-04-25", type: "public-holiday" },
      { label: "Christmas Day", date: "2026-12-25", type: "public-holiday" },
      { label: "Boxing Day", date: "2026-12-28", type: "public-holiday" },
    ],
  },
};

const TIMEZONES = [
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "UTC", label: "UTC" },
];

const INITIAL_FEEDS: Feed[] = [
  {
    id: "feed_1",
    name: "Engineering Team",
    description: "All leave for the engineering department",
    timezone: "Europe/London",
    status: "active",
    token: "org_k8s92j_eng",
    personIds: ["p1", "p2", "p5"],
    dates: [
      { id: "d1", label: "Good Friday", date: "2026-04-03", type: "public-holiday", recurring: true },
      { id: "d2", label: "Easter Monday", date: "2026-04-06", type: "public-holiday", recurring: true },
      { id: "d3", label: "Company Away Day", date: "2026-06-12", type: "custom", recurring: false },
    ],
    createdAt: "2026-01-15",
    lastSynced: "3 min ago",
  },
  {
    id: "feed_2",
    name: "Product & Design",
    description: "Leave calendar for product and design",
    timezone: "Europe/London",
    status: "active",
    token: "org_k8s92j_prd",
    personIds: ["p3", "p4", "p6"],
    dates: [
      { id: "d4", label: "Good Friday", date: "2026-04-03", type: "public-holiday", recurring: true },
      { id: "d5", label: "Design Sprint Week", date: "2026-09-14", type: "custom", recurring: false },
    ],
    createdAt: "2026-02-03",
    lastSynced: "12 min ago",
  },
  {
    id: "feed_3",
    name: "All Staff",
    description: "Company-wide leave feed for all employees",
    timezone: "Europe/London",
    status: "paused",
    token: "org_k8s92j_all",
    personIds: ["p1", "p2", "p3", "p4", "p5", "p6"],
    dates: [
      { id: "d6", label: "Christmas Day", date: "2026-12-25", type: "public-holiday", recurring: true },
      { id: "d7", label: "Boxing Day", date: "2026-12-28", type: "public-holiday", recurring: true },
    ],
    createdAt: "2025-11-20",
    lastSynced: "2 days ago",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function feedUrl(token: string): string {
  return `https://app.leavesync.com/api/feeds/${token}/calendar.ics`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const DATE_TYPE_LABELS: Record<DateType, string> = {
  "public-holiday": "Public holiday",
  "custom": "Custom date",
  "closure": "Office closure",
};

// ─── PersonAvatar ─────────────────────────────────────────────────────────────

function PersonAvatar({ person, size = "sm" }: { person: Person; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-7 w-7 text-[0.625rem]" : "h-9 w-9 text-[0.75rem]";
  return (
    <div
      title={person.name}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sz}`}
      style={{
        background: "color-mix(in srgb, var(--primary) 14%, transparent)",
        color: "var(--primary)",
        border: "2px solid var(--background)",
      }}
    >
      {person.initials}
    </div>
  );
}

// ─── FeedCard ────────────────────────────────────────────────────────────────

type FeedCardProps = {
  feed: Feed;
  onManage: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
};

function FeedCard({ feed, onManage, onToggleStatus, onDelete }: FeedCardProps) {
  const [copied, setCopied] = useState(false);
  const people = feed.personIds.map((id) => ALL_PEOPLE.find((p) => p.id === id)!).filter(Boolean);
  const url = feedUrl(feed.token);
  const isActive = feed.status === "active";

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-6"
      style={{ background: "var(--muted)" }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: isActive
                ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                : "var(--accent)",
              color: isActive ? "var(--primary)" : "var(--muted-foreground)",
            }}
          >
            <RssIcon className="size-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[0.9375rem] font-semibold text-foreground leading-tight">
                {feed.name}
              </h3>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-widest"
                style={
                  isActive
                    ? {
                        background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                        color: "var(--primary)",
                      }
                    : {
                        background: "var(--accent)",
                        color: "var(--muted-foreground)",
                      }
                }
              >
                {isActive ? (
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--primary)" }} />
                ) : (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                )}
                {isActive ? "Active" : "Paused"}
              </span>
            </div>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground leading-snug">
              {feed.description}
            </p>
          </div>
        </div>

        {/* 3-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Feed options"
            >
              <MoreHorizontalIcon className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onManage}>
              <RssIcon className="size-4" />
              Edit feed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleStatus}>
              {isActive ? (
                <>
                  <PauseCircleIcon className="size-4" />
                  Pause feed
                </>
              ) : (
                <>
                  <PlayCircleIcon className="size-4" />
                  Resume feed
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon className="size-4" />
              Delete feed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* People + dates meta row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* People avatars */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {people.slice(0, 4).map((p) => (
              <PersonAvatar key={p.id} person={p} />
            ))}
          </div>
          {people.length > 4 && (
            <span className="text-[0.75rem] text-muted-foreground">+{people.length - 4}</span>
          )}
          <span className="text-[0.75rem] text-muted-foreground">
            {people.length} {people.length === 1 ? "person" : "people"}
          </span>
        </div>

        <span
          className="text-muted-foreground"
          aria-hidden
          style={{ fontSize: "0.5rem" }}
        >
          ●
        </span>

        {/* Dates count */}
        <span className="text-[0.75rem] text-muted-foreground">
          {feed.dates.length} {feed.dates.length === 1 ? "date" : "dates"}
        </span>

        {/* Last synced */}
        <span
          className="ml-auto text-[0.75rem] text-muted-foreground"
        >
          Synced {feed.lastSynced}
        </span>
      </div>

      {/* Feed URL row */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: "var(--background)" }}
      >
        <code className="min-w-0 flex-1 truncate font-mono text-[0.75rem] text-muted-foreground">
          {url}
        </code>
        <button
          onClick={copy}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[0.6875rem] font-medium transition-colors hover:bg-accent"
          style={{ color: "var(--muted-foreground)" }}
          title="Copy feed URL"
        >
          {copied ? (
            <CheckIcon className="size-3.5" style={{ color: "var(--primary)" }} />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onManage}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[0.8125rem] font-medium transition-colors"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          Manage feed
        </button>
      </div>
    </div>
  );
}

// ─── CreateFeedDialog ────────────────────────────────────────────────────────

type CreateFeedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (feed: Feed) => void;
};

function CreateFeedDialog({ open, onOpenChange, onCreate }: CreateFeedDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("Europe/London");

  // Step 2
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [peopleSearch, setPeopleSearch] = useState("");

  // Step 3
  const [holidayCountry, setHolidayCountry] = useState<string>("gb");
  const [selectedHolidays, setSelectedHolidays] = useState<string[]>([]);
  const [customDates, setCustomDates] = useState<{ label: string; date: string; type: DateType; recurring: boolean }[]>([]);
  const [newDateLabel, setNewDateLabel] = useState("");
  const [newDateValue, setNewDateValue] = useState("");
  const [newDateType, setNewDateType] = useState<DateType>("custom");
  const [newDateRecurring, setNewDateRecurring] = useState(false);

  const reset = () => {
    setStep(1);
    setName("");
    setDescription("");
    setTimezone("Europe/London");
    setSelectedPeople([]);
    setPeopleSearch("");
    setHolidayCountry("gb");
    setSelectedHolidays([]);
    setCustomDates([]);
    setNewDateLabel("");
    setNewDateValue("");
    setNewDateType("custom");
    setNewDateRecurring(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const togglePerson = (id: string) =>
    setSelectedPeople((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleHoliday = (dateStr: string) =>
    setSelectedHolidays((prev) =>
      prev.includes(dateStr) ? prev.filter((x) => x !== dateStr) : [...prev, dateStr]
    );

  const addCustomDate = () => {
    if (!newDateLabel.trim() || !newDateValue) return;
    setCustomDates((prev) => [
      ...prev,
      { label: newDateLabel.trim(), date: newDateValue, type: newDateType, recurring: newDateRecurring },
    ]);
    setNewDateLabel("");
    setNewDateValue("");
    setNewDateRecurring(false);
  };

  const removeCustomDate = (idx: number) =>
    setCustomDates((prev) => prev.filter((_, i) => i !== idx));

  const handleCreate = () => {
    const preset = HOLIDAY_PRESETS[holidayCountry];
    const holidayDates: SpecialDate[] = preset.holidays
      .filter((h) => selectedHolidays.includes(h.date))
      .map((h) => ({ ...h, id: uid(), recurring: true }));

    const customSpecialDates: SpecialDate[] = customDates.map((d) => ({ ...d, id: uid() }));

    const token = `org_k8s92j_${name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 12)}_${uid().slice(0, 4)}`;

    const newFeed: Feed = {
      id: uid(),
      name: name.trim(),
      description: description.trim(),
      timezone,
      status: "active",
      token,
      personIds: selectedPeople,
      dates: [...holidayDates, ...customSpecialDates],
      createdAt: new Date().toISOString().slice(0, 10),
      lastSynced: "just now",
    };

    onCreate(newFeed);
    handleOpenChange(false);
  };

  const canNext =
    step === 1
      ? name.trim().length > 0
      : step === 2
        ? true
        : true;

  const filteredPeople = ALL_PEOPLE.filter(
    (p) =>
      p.name.toLowerCase().includes(peopleSearch.toLowerCase()) ||
      p.dept.toLowerCase().includes(peopleSearch.toLowerCase())
  );

  const currentHolidays = HOLIDAY_PRESETS[holidayCountry]?.holidays ?? [];

  const STEPS = ["Details", "People", "Dates"];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        {/* Step indicator */}
        <div className="flex items-center gap-0 border-b" style={{ borderColor: "var(--border)" }}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const current = step === n;
            return (
              <div
                key={label}
                className="flex flex-1 flex-col items-center gap-1 py-4"
                style={{
                  borderBottom: current ? `2px solid var(--primary)` : "2px solid transparent",
                }}
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[0.6875rem] font-semibold"
                  style={
                    done
                      ? { background: "var(--primary)", color: "var(--primary-foreground)" }
                      : current
                        ? { background: "color-mix(in srgb, var(--primary) 14%, transparent)", color: "var(--primary)" }
                        : { background: "var(--accent)", color: "var(--muted-foreground)" }
                  }
                >
                  {done ? <CheckIcon className="size-3" strokeWidth={3} /> : n}
                </div>
                <span
                  className="text-[0.6875rem] font-medium"
                  style={{ color: current ? "var(--primary)" : "var(--muted-foreground)" }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex flex-col gap-5 p-6">
          {/* ── Step 1: Details ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[1.125rem]">Feed details</DialogTitle>
                <DialogDescription>
                  Name your feed and set the timezone. You can change these later.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="feed-name" className="text-[0.8125rem]">
                    Feed name <span style={{ color: "var(--destructive)" }}>*</span>
                  </Label>
                  <Input
                    id="feed-name"
                    placeholder="e.g. Engineering Team"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="feed-description" className="text-[0.8125rem]">
                    Description
                  </Label>
                  <Textarea
                    id="feed-description"
                    placeholder="Briefly describe who or what this feed covers"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[72px] resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[0.8125rem]">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: People ──────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[1.125rem]">Assign people</DialogTitle>
                <DialogDescription>
                  Choose who appears in this feed. You can update this at any time.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Search by name or department..."
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                />

                <div
                  className="flex flex-col divide-y overflow-y-auto rounded-xl"
                  style={{
                    maxHeight: "260px",
                    divideColor: "var(--border)",
                    background: "var(--muted)",
                  }}
                >
                  {filteredPeople.length === 0 && (
                    <p className="py-8 text-center text-[0.875rem] text-muted-foreground">
                      No people match your search
                    </p>
                  )}
                  {filteredPeople.map((person) => {
                    const checked = selectedPeople.includes(person.id);
                    return (
                      <label
                        key={person.id}
                        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                        htmlFor={`person-${person.id}`}
                      >
                        <Checkbox
                          id={`person-${person.id}`}
                          checked={checked}
                          onCheckedChange={() => togglePerson(person.id)}
                        />
                        <PersonAvatar person={person} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.875rem] font-medium text-foreground leading-tight">
                            {person.name}
                          </p>
                          <p className="text-[0.75rem] text-muted-foreground">
                            {person.role} · {person.dept}
                          </p>
                        </div>
                        {checked && (
                          <CheckIcon
                            className="size-4 shrink-0"
                            style={{ color: "var(--primary)" }}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>

                {selectedPeople.length > 0 && (
                  <p className="text-[0.75rem] text-muted-foreground">
                    {selectedPeople.length} {selectedPeople.length === 1 ? "person" : "people"} selected
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── Step 3: Dates ───────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[1.125rem]">Add dates</DialogTitle>
                <DialogDescription>
                  Add public holidays and any custom dates to include in this feed.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-5">
                {/* Public holidays */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[0.8125rem] font-medium text-foreground">Public holidays</p>
                    <Select value={holidayCountry} onValueChange={setHolidayCountry}>
                      <SelectTrigger className="h-8 w-auto text-[0.75rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gb">United Kingdom</SelectItem>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="au">Australia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div
                    className="flex flex-col divide-y overflow-y-auto rounded-xl"
                    style={{ maxHeight: "180px", background: "var(--muted)" }}
                  >
                    {currentHolidays.map((h) => (
                      <label
                        key={h.date}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent"
                        htmlFor={`holiday-${h.date}`}
                      >
                        <Checkbox
                          id={`holiday-${h.date}`}
                          checked={selectedHolidays.includes(h.date)}
                          onCheckedChange={() => toggleHoliday(h.date)}
                        />
                        <span className="flex-1 text-[0.8125rem] text-foreground">{h.label}</span>
                        <span className="text-[0.75rem] text-muted-foreground">{formatDate(h.date)}</span>
                      </label>
                    ))}
                  </div>

                  {selectedHolidays.length > 0 && (
                    <p className="text-[0.75rem] text-muted-foreground">
                      {selectedHolidays.length} {selectedHolidays.length === 1 ? "holiday" : "holidays"} selected
                    </p>
                  )}
                </div>

                {/* Custom dates */}
                <div className="flex flex-col gap-3">
                  <p className="text-[0.8125rem] font-medium text-foreground">Custom dates</p>

                  {customDates.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {customDates.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg px-3 py-2"
                          style={{ background: "var(--muted)" }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.8125rem] font-medium text-foreground leading-tight">
                              {d.label}
                            </p>
                            <p className="text-[0.6875rem] text-muted-foreground">
                              {formatDate(d.date)} · {DATE_TYPE_LABELS[d.type]}
                              {d.recurring ? " · Recurring" : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => removeCustomDate(i)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <XIcon className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add form */}
                  <div
                    className="flex flex-col gap-2 rounded-xl p-3"
                    style={{ background: "var(--muted)" }}
                  >
                    <div className="flex gap-2">
                      <Input
                        placeholder="Date label (e.g. Company Retreat)"
                        value={newDateLabel}
                        onChange={(e) => setNewDateLabel(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="date"
                        value={newDateValue}
                        onChange={(e) => setNewDateValue(e.target.value)}
                        className="w-[150px]"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Select
                          value={newDateType}
                          onValueChange={(v) => setNewDateType(v as DateType)}
                        >
                          <SelectTrigger className="h-8 w-auto text-[0.75rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">Custom date</SelectItem>
                            <SelectItem value="closure">Office closure</SelectItem>
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground">
                          <Switch
                            checked={newDateRecurring}
                            onCheckedChange={setNewDateRecurring}
                          />
                          Recurring
                        </label>
                      </div>
                      <button
                        onClick={addCustomDate}
                        disabled={!newDateLabel.trim() || !newDateValue}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.75rem] font-medium transition-colors disabled:opacity-40"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                          color: "var(--primary)",
                        }}
                      >
                        <PlusIcon className="size-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : handleOpenChange(false)}
            className="rounded-xl px-4 py-2 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as 2 | 3)}
              disabled={!canNext}
              className="rounded-xl px-5 py-2 text-[0.8125rem] font-medium transition-colors disabled:opacity-40"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="rounded-xl px-5 py-2 text-[0.8125rem] font-medium transition-colors disabled:opacity-40"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              Create feed
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ManageFeedDialog ────────────────────────────────────────────────────────

type ManageFeedDialogProps = {
  feed: Feed | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (feed: Feed) => void;
};

type ManageTab = "details" | "people" | "dates";

function ManageFeedDialog({ feed, onOpenChange, onUpdate }: ManageFeedDialogProps) {
  const [tab, setTab] = useState<ManageTab>("details");

  // Details state
  const [name, setName] = useState(feed?.name ?? "");
  const [description, setDescription] = useState(feed?.description ?? "");
  const [timezone, setTimezone] = useState(feed?.timezone ?? "Europe/London");
  const [status, setStatus] = useState<FeedStatus>(feed?.status ?? "active");

  // People state
  const [personIds, setPersonIds] = useState<string[]>(feed?.personIds ?? []);

  // Dates state
  const [dates, setDates] = useState<SpecialDate[]>(feed?.dates ?? []);
  const [newDateLabel, setNewDateLabel] = useState("");
  const [newDateValue, setNewDateValue] = useState("");
  const [newDateType, setNewDateType] = useState<DateType>("custom");
  const [newDateRecurring, setNewDateRecurring] = useState(false);
  const [showAddHolidays, setShowAddHolidays] = useState(false);
  const [holidayCountry, setHolidayCountry] = useState("gb");

  // Copy URL state
  const [copied, setCopied] = useState(false);

  if (!feed) return null;

  const url = feedUrl(feed.token);

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePerson = (id: string) =>
    setPersonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const removeDate = (id: string) =>
    setDates((prev) => prev.filter((d) => d.id !== id));

  const addCustomDate = () => {
    if (!newDateLabel.trim() || !newDateValue) return;
    setDates((prev) => [
      ...prev,
      {
        id: uid(),
        label: newDateLabel.trim(),
        date: newDateValue,
        type: newDateType,
        recurring: newDateRecurring,
      },
    ]);
    setNewDateLabel("");
    setNewDateValue("");
    setNewDateRecurring(false);
  };

  const addHoliday = (h: Omit<SpecialDate, "id" | "recurring">) => {
    if (dates.some((d) => d.date === h.date && d.type === "public-holiday")) return;
    setDates((prev) => [...prev, { ...h, id: uid(), recurring: true }]);
  };

  const handleSave = () => {
    onUpdate({
      ...feed,
      name: name.trim() || feed.name,
      description: description.trim(),
      timezone,
      status,
      personIds,
      dates,
    });
    onOpenChange(false);
  };

  const TAB_ITEMS: { id: ManageTab; label: string; icon: React.ReactNode }[] = [
    { id: "details", label: "Details", icon: <RssIcon className="size-3.5" /> },
    { id: "people", label: "People", icon: <UsersIcon className="size-3.5" /> },
    { id: "dates", label: "Dates", icon: <CalendarPlusIcon className="size-3.5" /> },
  ];

  return (
    <Dialog open={!!feed} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl gap-0 p-0 overflow-hidden">
        {/* Dialog header */}
        <DialogHeader className="border-b px-6 py-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
              }}
            >
              <RssIcon className="size-4" strokeWidth={1.75} />
            </div>
            <div>
              <DialogTitle className="text-[1rem] leading-tight">{feed.name}</DialogTitle>
              <DialogDescription className="text-[0.75rem]">
                Manage feed settings, people, and dates
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
          {TAB_ITEMS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex flex-1 items-center justify-center gap-1.5 py-3 text-[0.8125rem] font-medium transition-colors"
              style={
                tab === t.id
                  ? {
                      color: "var(--primary)",
                      borderBottom: "2px solid var(--primary)",
                      background: "var(--background)",
                    }
                  : {
                      color: "var(--muted-foreground)",
                      borderBottom: "2px solid transparent",
                    }
              }
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex flex-col gap-5 overflow-y-auto p-6" style={{ maxHeight: "420px" }}>

          {/* ── Details tab ─────────────────────────────────────────────── */}
          {tab === "details" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mg-name" className="text-[0.8125rem]">Feed name</Label>
                <Input
                  id="mg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mg-desc" className="text-[0.8125rem]">Description</Label>
                <Textarea
                  id="mg-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[68px] resize-none"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-[0.8125rem]">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[0.8125rem]">Status</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      checked={status === "active"}
                      onCheckedChange={(v) => setStatus(v ? "active" : "paused")}
                    />
                    <span className="text-[0.8125rem] text-foreground">
                      {status === "active" ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feed URL */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[0.8125rem]">Feed URL</Label>
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: "var(--muted)" }}
                >
                  <code className="min-w-0 flex-1 truncate font-mono text-[0.75rem] text-muted-foreground">
                    {url}
                  </code>
                  <button
                    onClick={copyUrl}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[0.6875rem] font-medium transition-colors hover:bg-accent"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {copied ? (
                      <CheckIcon className="size-3.5" style={{ color: "var(--primary)" }} />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── People tab ──────────────────────────────────────────────── */}
          {tab === "people" && (
            <div className="flex flex-col gap-4">
              <p className="text-[0.8125rem] text-muted-foreground">
                Toggle people to include or exclude them from this feed.
              </p>

              <div
                className="flex flex-col divide-y overflow-y-auto rounded-xl"
                style={{ background: "var(--muted)" }}
              >
                {ALL_PEOPLE.map((person) => {
                  const included = personIds.includes(person.id);
                  return (
                    <label
                      key={person.id}
                      htmlFor={`mg-person-${person.id}`}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                    >
                      <Checkbox
                        id={`mg-person-${person.id}`}
                        checked={included}
                        onCheckedChange={() => togglePerson(person.id)}
                      />
                      <PersonAvatar person={person} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.875rem] font-medium text-foreground leading-tight">
                          {person.name}
                        </p>
                        <p className="text-[0.75rem] text-muted-foreground">
                          {person.role} · {person.dept}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-widest"
                        style={
                          included
                            ? {
                                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                                color: "var(--primary)",
                              }
                            : { background: "var(--accent)", color: "var(--muted-foreground)" }
                        }
                      >
                        {included ? "Included" : "Excluded"}
                      </span>
                    </label>
                  );
                })}
              </div>

              <p className="text-[0.75rem] text-muted-foreground">
                {personIds.length} of {ALL_PEOPLE.length} people included
              </p>
            </div>
          )}

          {/* ── Dates tab ───────────────────────────────────────────────── */}
          {tab === "dates" && (
            <div className="flex flex-col gap-5">
              {/* Existing dates */}
              <div className="flex flex-col gap-2">
                <p className="text-[0.8125rem] font-medium text-foreground">
                  Dates in this feed ({dates.length})
                </p>

                {dates.length === 0 ? (
                  <div
                    className="flex items-center justify-center rounded-xl py-8"
                    style={{ background: "var(--muted)" }}
                  >
                    <p className="text-[0.875rem] text-muted-foreground">No dates added yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {dates.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{ background: "var(--muted)" }}
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.625rem] font-bold"
                          style={
                            d.type === "public-holiday"
                              ? {
                                  background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                                  color: "var(--primary)",
                                }
                              : d.type === "closure"
                                ? {
                                    background: "var(--error-container)",
                                    color: "var(--destructive)",
                                  }
                                : { background: "var(--secondary)", color: "var(--secondary-foreground)" }
                          }
                        >
                          {new Date(d.date).getDate()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.875rem] font-medium text-foreground leading-tight">
                            {d.label}
                          </p>
                          <p className="text-[0.75rem] text-muted-foreground">
                            {formatDate(d.date)} · {DATE_TYPE_LABELS[d.type]}
                            {d.recurring ? " · Recurring annually" : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => removeDate(d.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          title="Remove date"
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add public holidays */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[0.8125rem] font-medium text-foreground">Add public holidays</p>
                  <button
                    onClick={() => setShowAddHolidays((v) => !v)}
                    className="flex items-center gap-1 text-[0.75rem] font-medium transition-colors"
                    style={{ color: "var(--primary)" }}
                  >
                    <PlusIcon className="size-3.5" />
                    {showAddHolidays ? "Hide" : "Browse"}
                  </button>
                </div>

                {showAddHolidays && (
                  <div
                    className="flex flex-col gap-2 rounded-xl p-3"
                    style={{ background: "var(--muted)" }}
                  >
                    <Select value={holidayCountry} onValueChange={setHolidayCountry}>
                      <SelectTrigger className="h-8 w-auto text-[0.75rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gb">United Kingdom</SelectItem>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="au">Australia</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex flex-col gap-1">
                      {HOLIDAY_PRESETS[holidayCountry].holidays.map((h) => {
                        const already = dates.some((d) => d.date === h.date && d.type === "public-holiday");
                        return (
                          <div
                            key={h.date}
                            className="flex items-center justify-between rounded-lg px-3 py-2"
                            style={{ background: "var(--background)" }}
                          >
                            <div>
                              <p className="text-[0.8125rem] font-medium text-foreground">{h.label}</p>
                              <p className="text-[0.6875rem] text-muted-foreground">{formatDate(h.date)}</p>
                            </div>
                            {already ? (
                              <span
                                className="text-[0.6875rem] font-medium"
                                style={{ color: "var(--primary)" }}
                              >
                                Added
                              </span>
                            ) : (
                              <button
                                onClick={() => addHoliday(h)}
                                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[0.6875rem] font-medium transition-colors"
                                style={{
                                  background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                                  color: "var(--primary)",
                                }}
                              >
                                <PlusIcon className="size-3" />
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Add custom date */}
              <div className="flex flex-col gap-2">
                <p className="text-[0.8125rem] font-medium text-foreground">Add custom date</p>
                <div
                  className="flex flex-col gap-2 rounded-xl p-3"
                  style={{ background: "var(--muted)" }}
                >
                  <div className="flex gap-2">
                    <Input
                      placeholder="Label (e.g. Company Retreat)"
                      value={newDateLabel}
                      onChange={(e) => setNewDateLabel(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="date"
                      value={newDateValue}
                      onChange={(e) => setNewDateValue(e.target.value)}
                      className="w-[150px]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Select
                        value={newDateType}
                        onValueChange={(v) => setNewDateType(v as DateType)}
                      >
                        <SelectTrigger className="h-8 w-auto text-[0.75rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom date</SelectItem>
                          <SelectItem value="closure">Office closure</SelectItem>
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground">
                        <Switch
                          checked={newDateRecurring}
                          onCheckedChange={setNewDateRecurring}
                        />
                        Recurring
                      </label>
                    </div>
                    <button
                      onClick={addCustomDate}
                      disabled={!newDateLabel.trim() || !newDateValue}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.75rem] font-medium transition-colors disabled:opacity-40"
                      style={{
                        background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      <PlusIcon className="size-3.5" />
                      Add date
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-4 py-2 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl px-5 py-2 text-[0.8125rem] font-medium transition-colors"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Save changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── FeedClient (main) ───────────────────────────────────────────────────────

export function FeedClient() {
  const [feeds, setFeeds] = useState<Feed[]>(INITIAL_FEEDS);
  const [createOpen, setCreateOpen] = useState(false);
  const [managingFeed, setManagingFeed] = useState<Feed | null>(null);

  const activeCount = feeds.filter((f) => f.status === "active").length;
  const totalPeople = new Set(feeds.flatMap((f) => f.personIds)).size;

  const handleCreate = (feed: Feed) => setFeeds((prev) => [feed, ...prev]);

  const handleUpdate = (updated: Feed) =>
    setFeeds((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));

  const handleToggleStatus = (id: string) =>
    setFeeds((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: f.status === "active" ? "paused" : "active" } : f
      )
    );

  const handleDelete = (id: string) =>
    setFeeds((prev) => prev.filter((f) => f.id !== id));

  return (
    <div className="flex flex-col gap-8">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-medium uppercase tracking-widest text-muted-foreground">
            Calendar feeds
          </p>
          <h1 className="mt-0.5 text-[1.375rem] font-semibold tracking-tight text-foreground">
            Feeds
          </h1>
          <p className="mt-1 text-[0.875rem] text-muted-foreground">
            Publish and manage iCal feeds for your team's leave and availability.
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[0.8125rem] font-medium transition-colors"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <PlusIcon className="size-4" />
          New feed
        </button>
      </div>

      {/* ── Summary strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total feeds", value: feeds.length },
          { label: "Active", value: activeCount },
          { label: "People subscribed", value: totalPeople },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-2xl px-5 py-4"
            style={{ background: "var(--muted)" }}
          >
            <p className="text-[0.6875rem] font-medium uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-[2rem] font-semibold leading-none tracking-tight text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Feeds list ────────────────────────────────────────────────────── */}
      {feeds.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl py-20"
          style={{ background: "var(--muted)" }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: "color-mix(in srgb, var(--primary) 10%, transparent)",
              color: "var(--primary)",
            }}
          >
            <RssIcon className="size-6" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-[1rem] font-semibold text-foreground">No feeds yet</p>
            <p className="mt-1 text-[0.875rem] text-muted-foreground">
              Create your first feed to start publishing leave calendars.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[0.8125rem] font-medium transition-colors"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <PlusIcon className="size-4" />
            Create your first feed
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {feeds.map((feed) => (
            <FeedCard
              key={feed.id}
              feed={feed}
              onManage={() => setManagingFeed(feed)}
              onToggleStatus={() => handleToggleStatus(feed.id)}
              onDelete={() => handleDelete(feed.id)}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <CreateFeedDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <ManageFeedDialog
        feed={managingFeed}
        onOpenChange={(open) => !open && setManagingFeed(null)}
        onUpdate={(updated) => {
          handleUpdate(updated);
          setManagingFeed(null);
        }}
      />
    </div>
  );
}
