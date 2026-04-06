"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/design-system/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import {
  CalendarDaysIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  LaptopIcon,
  Link2Icon,
  MailIcon,
  RssIcon,
  SmartphoneIcon,
} from "lucide-react";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type View = "day" | "week" | "month";
type LeaveType = "Annual Leave" | "Sick Leave" | "Parental Leave";
type FeedStatus = "active" | "paused";

type LeaveEntry = {
  id: number;
  personId: string;
  name: string;
  initials: string;
  type: LeaveType;
  start: string; // YYYY-MM-DD
  end: string;
};

type CalendarFeed = {
  id: string;
  name: string;
  description: string;
  status: FeedStatus;
  token: string;
  personIds: string[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TODAY = new Date(2026, 3, 5); // April 5, 2026

const ALL_LEAVE_DATA: LeaveEntry[] = [
  {
    id: 1,
    personId: "p1",
    name: "Priya Sharma",
    initials: "PS",
    type: "Annual Leave",
    start: "2026-04-07",
    end: "2026-04-11",
  },
  {
    id: 2,
    personId: "p2",
    name: "Marcus Webb",
    initials: "MW",
    type: "Sick Leave",
    start: "2026-04-05",
    end: "2026-04-06",
  },
  {
    id: 3,
    personId: "p3",
    name: "Yuki Tanaka",
    initials: "YT",
    type: "Annual Leave",
    start: "2026-04-14",
    end: "2026-04-18",
  },
  {
    id: 4,
    personId: "p4",
    name: "Aisha Okonkwo",
    initials: "AO",
    type: "Parental Leave",
    start: "2026-04-22",
    end: "2026-06-30",
  },
  {
    id: 5,
    personId: "p5",
    name: "Tom Eriksson",
    initials: "TE",
    type: "Annual Leave",
    start: "2026-04-28",
    end: "2026-05-02",
  },
];

const CALENDAR_FEEDS: CalendarFeed[] = [
  {
    id: "feed_all",
    name: "All Staff",
    description: "Company-wide leave feed for all employees",
    status: "active",
    token: "org_k8s92j_all",
    personIds: ["p1", "p2", "p3", "p4", "p5", "p6"],
  },
  {
    id: "feed_eng",
    name: "Engineering Team",
    description: "All leave for the engineering department",
    status: "active",
    token: "org_k8s92j_eng",
    personIds: ["p1", "p2", "p5"],
  },
  {
    id: "feed_prd",
    name: "Product & Design",
    description: "Leave calendar for product and design",
    status: "active",
    token: "org_k8s92j_prd",
    personIds: ["p3", "p4", "p6"],
  },
  {
    id: "feed_mgmt",
    name: "Leadership",
    description: "Senior leadership and management leave",
    status: "paused",
    token: "org_k8s92j_mgmt",
    personIds: ["p3"],
  },
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const FULL_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const LEAVE_STYLES: Record<LeaveType, { bg: string; text: string }> = {
  "Annual Leave": {
    bg: "color-mix(in srgb, var(--primary) 14%, transparent)",
    text: "var(--primary)",
  },
  "Sick Leave": { bg: "var(--error-container)", text: "var(--destructive)" },
  "Parental Leave": {
    bg: "var(--secondary)",
    text: "var(--secondary-foreground)",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getLeaveForDate(date: Date, leaveData: LeaveEntry[]): LeaveEntry[] {
  const ds = toDateStr(date);
  return leaveData.filter((e) => e.start <= ds && e.end >= ds);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1).getDay();
  const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
  const days: Date[] = [];
  let current = new Date(year, month, 1 - mondayOffset);
  while (days.length < 35 || current.getMonth() === month) {
    days.push(new Date(current));
    current = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + 1
    );
  }
  while (days.length % 7 !== 0) {
    days.push(new Date(current));
    current = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + 1
    );
  }
  return days;
}

function getWeekDays(anchor: Date): Date[] {
  const day = anchor.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() - mondayOffset
  );
  return Array.from(
    { length: 7 },
    (_, i) =>
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
  );
}

function formatEndDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function feedHttpsUrl(token: string): string {
  return `https://app.leavesync.com/api/feeds/${token}/calendar.ics`;
}

function feedWebcalUrl(token: string): string {
  return `webcal://app.leavesync.com/api/feeds/${token}/calendar.ics`;
}

// ─── FeedSelector ─────────────────────────────────────────────────────────────

type FeedSelectorProps = {
  feeds: CalendarFeed[];
  selectedId: string;
  onSelect: (id: string) => void;
};

function FeedSelector({ feeds, selectedId, onSelect }: FeedSelectorProps) {
  const selected = feeds.find((f) => f.id === selectedId) ?? feeds[0];
  const isActive = selected.status === "active";
  const peopleCount = selected.personIds.length;

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
      style={{ background: "var(--muted)" }}
    >
      {/* Selector trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: isActive
                  ? "color-mix(in srgb, var(--primary) 14%, transparent)"
                  : "var(--accent)",
                color: isActive ? "var(--primary)" : "var(--muted-foreground)",
              }}
            >
              <RssIcon className="size-4" strokeWidth={1.75} />
            </div>

            <div className="flex flex-col items-start">
              <span className="font-semibold text-[0.9375rem] text-foreground leading-tight">
                {selected.name}
              </span>
              <span className="text-[0.75rem] text-muted-foreground">
                {peopleCount} {peopleCount === 1 ? "person" : "people"}
              </span>
            </div>

            <ChevronDownIcon
              className="ml-0.5 size-4 text-muted-foreground"
              strokeWidth={1.75}
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-80 p-1.5">
          {feeds.map((feed, i) => {
            const isCurrent = feed.id === selectedId;
            const active = feed.status === "active";
            const count = feed.personIds.length;
            return (
              <div key={feed.id}>
                {i > 0 && feeds[i - 1].status !== feed.status && (
                  <DropdownMenuSeparator className="my-1" />
                )}
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                  onClick={() => onSelect(feed.id)}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: active
                        ? "color-mix(in srgb, var(--primary) 14%, transparent)"
                        : "var(--accent)",
                      color: active
                        ? "var(--primary)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    <RssIcon className="size-3.5" strokeWidth={1.75} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[0.875rem] text-foreground leading-tight">
                      {feed.name}
                    </p>
                    <p className="mt-0.5 truncate text-[0.75rem] text-muted-foreground">
                      {feed.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[0.5625rem] uppercase tracking-widest"
                      style={
                        active
                          ? {
                              background:
                                "color-mix(in srgb, var(--primary) 12%, transparent)",
                              color: "var(--primary)",
                            }
                          : {
                              background: "var(--accent)",
                              color: "var(--muted-foreground)",
                            }
                      }
                    >
                      {active ? "Active" : "Paused"}
                    </span>
                    {isCurrent && (
                      <CheckIcon
                        className="size-3.5"
                        strokeWidth={2.5}
                        style={{ color: "var(--primary)" }}
                      />
                    )}
                  </div>
                </DropdownMenuItem>
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Right-side meta */}
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-[0.625rem] uppercase tracking-widest"
          style={
            isActive
              ? {
                  background:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                }
              : {
                  background: "var(--accent)",
                  color: "var(--muted-foreground)",
                }
          }
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: isActive
                ? "var(--primary)"
                : "var(--muted-foreground)",
            }}
          />
          {isActive ? "Active" : "Paused"}
        </span>

        <span className="hidden text-[0.75rem] text-muted-foreground sm:block">
          {selected.description}
        </span>
      </div>
    </div>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({
  anchor,
  leaveData,
}: {
  anchor: Date;
  leaveData: LeaveEntry[];
}) {
  const days = getMonthDays(anchor.getFullYear(), anchor.getMonth());

  return (
    <div>
      <div className="grid grid-cols-7">
        {DAY_NAMES.map((d) => (
          <div
            className="py-2.5 text-center font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest"
            key={d}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-px"
        style={{
          background:
            "color-mix(in srgb, var(--muted-foreground) 8%, transparent)",
        }}
      >
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, anchor);
          const isToday = isSameDay(day, TODAY);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const leaves = getLeaveForDate(day, leaveData);

          return (
            <div
              className="flex min-h-[88px] flex-col gap-1 p-2"
              key={i}
              style={{
                background: isWeekend
                  ? "color-mix(in srgb, var(--muted) 70%, var(--background))"
                  : "var(--background)",
                opacity: isCurrentMonth ? 1 : 0.38,
              }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center self-end rounded-full font-medium text-[0.75rem]"
                style={
                  isToday
                    ? {
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }
                    : { color: "var(--foreground)" }
                }
              >
                {day.getDate()}
              </span>

              {leaves.slice(0, 2).map((entry) => {
                const s = LEAVE_STYLES[entry.type];
                return (
                  <div
                    className="flex items-center gap-1 truncate rounded px-1.5 py-0.5"
                    key={entry.id}
                    style={{ background: s.bg }}
                  >
                    <span
                      className="truncate font-semibold text-[0.625rem]"
                      style={{ color: s.text }}
                    >
                      {entry.initials}
                    </span>
                  </div>
                );
              })}

              {leaves.length > 2 && (
                <span className="px-1 text-[0.625rem] text-muted-foreground">
                  +{leaves.length - 2}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  anchor,
  leaveData,
}: {
  anchor: Date;
  leaveData: LeaveEntry[];
}) {
  const week = getWeekDays(anchor);

  return (
    <div>
      <div
        className="grid grid-cols-7 gap-px"
        style={{
          background:
            "color-mix(in srgb, var(--muted-foreground) 8%, transparent)",
        }}
      >
        {week.map((day, i) => {
          const isToday = isSameDay(day, TODAY);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <div
              className="flex flex-col items-center gap-1.5 py-3"
              key={i}
              style={{
                background: isWeekend
                  ? "color-mix(in srgb, var(--muted) 70%, var(--background))"
                  : "var(--background)",
              }}
            >
              <span className="font-medium text-[0.625rem] text-muted-foreground uppercase tracking-widest">
                {DAY_NAMES[i]}
              </span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full font-semibold text-[0.9375rem]"
                style={
                  isToday
                    ? {
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }
                    : { color: "var(--foreground)" }
                }
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="grid grid-cols-7 gap-px"
        style={{
          background:
            "color-mix(in srgb, var(--muted-foreground) 8%, transparent)",
        }}
      >
        {week.map((day, i) => {
          const leaves = getLeaveForDate(day, leaveData);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <div
              className="flex min-h-[140px] flex-col gap-1.5 p-2"
              key={i}
              style={{
                background: isWeekend
                  ? "color-mix(in srgb, var(--muted) 70%, var(--background))"
                  : "var(--background)",
              }}
            >
              {leaves.map((entry) => {
                const s = LEAVE_STYLES[entry.type];
                return (
                  <div
                    className="rounded-lg px-2 py-1.5"
                    key={entry.id}
                    style={{ background: s.bg }}
                  >
                    <p
                      className="font-semibold text-[0.6875rem] leading-tight"
                      style={{ color: s.text }}
                    >
                      {entry.initials}
                    </p>
                    <p
                      className="mt-0.5 truncate text-[0.5625rem] leading-tight"
                      style={{ color: s.text, opacity: 0.75 }}
                    >
                      {entry.type}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({
  anchor,
  leaveData,
}: {
  anchor: Date;
  leaveData: LeaveEntry[];
}) {
  const leaves = getLeaveForDate(anchor, leaveData);
  const isToday = isSameDay(anchor, TODAY);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 flex-col items-center justify-center rounded-xl"
          style={
            isToday
              ? {
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }
              : { background: "var(--accent)", color: "var(--foreground)" }
          }
        >
          <span className="font-medium text-[0.5625rem] uppercase leading-none tracking-widest">
            {MONTH_NAMES[anchor.getMonth()].slice(0, 3)}
          </span>
          <span className="font-semibold text-[1.625rem] leading-tight">
            {anchor.getDate()}
          </span>
        </div>
        <div>
          <p className="font-semibold text-[1.125rem] text-foreground">
            {FULL_DAY_NAMES[anchor.getDay()]}
          </p>
          <p className="text-[0.875rem] text-muted-foreground">
            {isToday
              ? "Today"
              : `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getDate()}, ${anchor.getFullYear()}`}
          </p>
        </div>
        {leaves.length > 0 && (
          <div
            className="ml-auto rounded-xl px-4 py-2"
            style={{
              background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
          >
            <p
              className="font-semibold text-[0.875rem]"
              style={{ color: "var(--primary)" }}
            >
              {leaves.length}
            </p>
            <p className="text-[0.6875rem] text-muted-foreground">
              {leaves.length === 1 ? "person" : "people"} out
            </p>
          </div>
        )}
      </div>

      {leaves.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-2xl py-16"
          style={{ background: "var(--accent)" }}
        >
          <CalendarIcon
            className="size-8 text-muted-foreground"
            strokeWidth={1.25}
          />
          <p className="text-[0.875rem] text-muted-foreground">
            No one on leave this day
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {leaves.map((entry) => {
            const s = LEAVE_STYLES[entry.type];
            return (
              <div
                className="flex items-center gap-3 rounded-xl p-4"
                key={entry.id}
                style={{ background: "var(--accent)" }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-[0.75rem]"
                  style={{ background: s.bg, color: s.text }}
                >
                  {entry.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[0.9375rem] text-foreground leading-tight">
                    {entry.name}
                  </p>
                  <p className="text-[0.75rem] text-muted-foreground">
                    until {formatEndDate(entry.end)}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-lg px-2.5 py-1 font-medium text-[0.6875rem]"
                  style={{ background: s.bg, color: s.text }}
                >
                  {entry.type}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── iCal subscription section ───────────────────────────────────────────────

function ICalSection({
  feedToken,
  feedName,
}: {
  feedToken: string;
  feedName: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const httpsUrl = feedHttpsUrl(feedToken);
  const webcalUrl = feedWebcalUrl(feedToken);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const providers = [
    {
      key: "gmail",
      label: "Google Calendar",
      description: "Subscribe from URL",
      icon: <MailIcon className="size-5" strokeWidth={1.75} />,
      href: `https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(httpsUrl)}`,
      copyUrl: httpsUrl,
      actionLabel: "Open",
    },
    {
      key: "outlook",
      label: "Microsoft Outlook",
      description: "Subscribe from web",
      icon: <CalendarDaysIcon className="size-5" strokeWidth={1.75} />,
      href: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}&name=${encodeURIComponent(feedName)}`,
      copyUrl: httpsUrl,
      actionLabel: "Open",
    },
    {
      key: "apple",
      label: "Apple Calendar",
      description: "Opens with webcal://",
      icon: <LaptopIcon className="size-5" strokeWidth={1.75} />,
      href: webcalUrl,
      copyUrl: webcalUrl,
      actionLabel: "Subscribe",
    },
    {
      key: "ical",
      label: "Generic iCal",
      description: "Any calendar app",
      icon: <Link2Icon className="size-5" strokeWidth={1.75} />,
      href: httpsUrl,
      copyUrl: httpsUrl,
      actionLabel: "Open",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
          Subscribe
        </p>
        <h2 className="mt-0.5 font-semibold text-[1.375rem] text-foreground tracking-tight">
          Add to your calendar
        </h2>
        <p className="mt-1 text-[0.875rem] text-muted-foreground">
          Subscribe to this feed so team leave automatically appears in your
          calendar app and stays up to date.
        </p>
      </div>

      {/* Feed URL bar */}
      <div
        className="flex items-center gap-3 rounded-xl p-4"
        style={{ background: "var(--muted)" }}
      >
        <code className="min-w-0 flex-1 truncate font-mono text-[0.8125rem] text-foreground">
          {httpsUrl}
        </code>
        <button
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-[0.75rem] transition-colors"
          onClick={() => copy(httpsUrl, "url-bar")}
          style={{ background: "var(--accent)", color: "var(--foreground)" }}
        >
          {copied === "url-bar" ? (
            <CheckIcon className="size-3.5" strokeWidth={2.5} />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          {copied === "url-bar" ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Provider tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {providers.map((p) => (
          <div
            className="flex flex-col gap-4 rounded-2xl p-5"
            key={p.key}
            style={{ background: "var(--muted)" }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
            >
              {p.icon}
            </div>

            <div className="flex-1">
              <p className="font-semibold text-[0.9375rem] text-foreground">
                {p.label}
              </p>
              <p className="text-[0.75rem] text-muted-foreground">
                {p.description}
              </p>
            </div>

            <div className="flex gap-2">
              <a
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-medium text-[0.8125rem] transition-colors"
                href={p.href}
                rel="noopener noreferrer"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
                target="_blank"
              >
                <ExternalLinkIcon className="size-3" />
                {p.actionLabel}
              </a>
              <button
                className="flex items-center justify-center rounded-xl px-3 transition-colors"
                onClick={() => copy(p.copyUrl, p.key)}
                style={{
                  background: "var(--accent)",
                  color: "var(--muted-foreground)",
                }}
                title="Copy URL"
              >
                {copied === p.key ? (
                  <CheckIcon
                    className="size-3.5"
                    strokeWidth={2.5}
                    style={{ color: "var(--primary)" }}
                  />
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Setup instructions ───────────────────────────────────────────────────────

type Step = { text: string; highlight?: boolean };

type Platform = {
  id: string;
  label: string;
  icon: React.ReactNode;
  steps: Step[];
};

const PLATFORMS: Platform[] = [
  {
    id: "google",
    label: "Google Calendar",
    icon: <MailIcon className="size-4" strokeWidth={1.75} />,
    steps: [
      {
        text: "Open Google Calendar — on desktop go to calendar.google.com, or open the mobile app.",
      },
      {
        text: 'In the left sidebar, find "Other calendars" and click the + icon next to it.',
      },
      { text: 'Select "From URL" from the dropdown menu.' },
      {
        text: "Paste the calendar feed URL from above into the field provided.",
        highlight: true,
      },
      {
        text: 'Click "Add calendar" to confirm. The feed will appear in your calendar within a few minutes.',
      },
      {
        text: "Google Calendar refreshes subscribed calendars automatically. New leave entries will appear as they are approved.",
      },
    ],
  },
  {
    id: "outlook",
    label: "Microsoft Outlook",
    icon: <CalendarDaysIcon className="size-4" strokeWidth={1.75} />,
    steps: [
      {
        text: "Open Outlook and switch to the Calendar view using the icons in the bottom left.",
      },
      { text: 'Click "Add calendar" in the left-hand panel.' },
      { text: 'Select "Subscribe from web" from the options presented.' },
      {
        text: "Paste the calendar feed URL into the URL field.",
        highlight: true,
      },
      {
        text: 'Give the calendar a name such as "Team Leave" and set a colour if you like.',
      },
      {
        text: 'Click "Import". Outlook will sync the calendar and refresh it automatically every few hours.',
      },
    ],
  },
  {
    id: "apple",
    label: "Apple Calendar (Mac)",
    icon: <LaptopIcon className="size-4" strokeWidth={1.75} />,
    steps: [
      { text: "Open the Calendar app on your Mac." },
      {
        text: 'From the menu bar at the top of your screen, click File then "New Calendar Subscription...".',
      },
      {
        text: "Paste the webcal:// or https:// feed URL into the field.",
        highlight: true,
      },
      { text: 'Click "Subscribe" to proceed to the settings screen.' },
      {
        text: 'Set a name like "Team Leave", choose how often to refresh (recommended: every hour), then click "OK".',
      },
      {
        text: "If you use iCloud, select iCloud as the location so the calendar syncs to your iPhone and iPad automatically.",
      },
    ],
  },
  {
    id: "phone",
    label: "iPhone or Android",
    icon: <SmartphoneIcon className="size-4" strokeWidth={1.75} />,
    steps: [
      {
        text: "iPhone: Open the Settings app, scroll down to Calendar, then tap Accounts, Add Account, Other, and finally Add Subscribed Calendar.",
      },
      {
        text: "Android: Open Google Calendar, tap your profile photo, select Manage calendars, then Add calendar and From URL.",
      },
      {
        text: "Paste the calendar feed URL into the server or URL field.",
        highlight: true,
      },
      { text: "Tap Subscribe, Next, or Save depending on your device." },
      {
        text: "The leave calendar will appear alongside your personal calendars and sync automatically.",
      },
    ],
  },
];

function SetupInstructions() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
          Setup guide
        </p>
        <h2 className="mt-0.5 font-semibold text-[1.375rem] text-foreground tracking-tight">
          How to subscribe
        </h2>
        <p className="mt-1 text-[0.875rem] text-muted-foreground">
          Step-by-step instructions for every major calendar application.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: "var(--muted)" }}
      >
        <Accordion collapsible type="single">
          {PLATFORMS.map((platform) => (
            <AccordionItem
              className="border-b px-6 last:border-b-0"
              key={platform.id}
              value={platform.id}
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 10%, transparent)",
                      color: "var(--primary)",
                    }}
                  >
                    {platform.icon}
                  </div>
                  <span className="font-medium text-[0.9375rem] text-foreground">
                    {platform.label}
                  </span>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <ol className="flex flex-col gap-3 pb-2">
                  {platform.steps.map((step, si) => (
                    <li className="flex items-start gap-3" key={si}>
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-semibold text-[0.625rem]"
                        style={
                          step.highlight
                            ? {
                                background: "var(--primary)",
                                color: "var(--primary-foreground)",
                              }
                            : {
                                background:
                                  "color-mix(in srgb, var(--muted-foreground) 15%, transparent)",
                                color: "var(--muted-foreground)",
                              }
                        }
                      >
                        {si + 1}
                      </span>
                      <span className="text-[0.875rem] text-foreground leading-relaxed">
                        {step.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export function CalendarClient() {
  const [selectedFeedId, setSelectedFeedId] = useState<string>(
    CALENDAR_FEEDS[0].id
  );
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState<Date>(new Date(TODAY));

  const selectedFeed =
    CALENDAR_FEEDS.find((f) => f.id === selectedFeedId) ?? CALENDAR_FEEDS[0];
  const leaveData = ALL_LEAVE_DATA.filter((e) =>
    selectedFeed.personIds.includes(e.personId)
  );

  const navigate = (dir: -1 | 1) => {
    setAnchor((prev) => {
      if (view === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
      }
      if (view === "week") {
        return new Date(
          prev.getFullYear(),
          prev.getMonth(),
          prev.getDate() + dir * 7
        );
      }
      return new Date(
        prev.getFullYear(),
        prev.getMonth(),
        prev.getDate() + dir
      );
    });
  };

  const periodLabel = (): string => {
    if (view === "month") {
      return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }
    if (view === "week") {
      const week = getWeekDays(anchor);
      const first = week[0];
      const last = week[6];
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()} – ${last.getDate()} ${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
      }
      return `${first.getDate()} ${MONTH_NAMES[first.getMonth()].slice(0, 3)} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;
    }
    const dayIdx = (anchor.getDay() + 6) % 7;
    return `${DAY_NAMES[dayIdx]}, ${anchor.getDate()} ${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  };

  const isAtToday =
    view === "day"
      ? isSameDay(anchor, TODAY)
      : view === "week"
        ? isSameDay(getWeekDays(anchor)[0], getWeekDays(TODAY)[0])
        : isSameMonth(anchor, TODAY);

  return (
    <div className="flex flex-col gap-10">
      {/* ── Calendar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Feed selector */}
        <FeedSelector
          feeds={CALENDAR_FEEDS}
          onSelect={setSelectedFeedId}
          selectedId={selectedFeedId}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => navigate(-1)}
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <h2 className="min-w-52 text-center font-semibold text-[0.9375rem] text-foreground tabular-nums">
              {periodLabel()}
            </h2>
            <button
              aria-label="Next"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => navigate(1)}
            >
              <ChevronRightIcon className="size-4" />
            </button>

            {!isAtToday && (
              <button
                className="ml-2 rounded-lg px-3 py-1 font-medium text-[0.75rem] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setAnchor(new Date(TODAY))}
              >
                Today
              </button>
            )}
          </div>

          {/* View toggle */}
          <div
            className="flex gap-1 rounded-xl p-1"
            style={{ background: "var(--muted)" }}
          >
            {(["Day", "Week", "Month"] as const).map((label) => {
              const val = label.toLowerCase() as View;
              const active = view === val;
              return (
                <button
                  className="rounded-lg px-4 py-1.5 font-medium text-[0.8125rem] transition-all"
                  key={label}
                  onClick={() => setView(val)}
                  style={
                    active
                      ? {
                          background: "var(--background)",
                          color: "var(--foreground)",
                          boxShadow: "0 1px 4px rgba(53,51,64,0.08)",
                        }
                      : { color: "var(--muted-foreground)" }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar body */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{ background: "var(--muted)" }}
        >
          {view === "month" && (
            <MonthView anchor={anchor} leaveData={leaveData} />
          )}
          {view === "week" && (
            <WeekView anchor={anchor} leaveData={leaveData} />
          )}
          {view === "day" && (
            <div className="p-5">
              <DayView anchor={anchor} leaveData={leaveData} />
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-5">
          {(
            Object.entries(LEAVE_STYLES) as [
              LeaveType,
              { bg: string; text: string },
            ][]
          ).map(([type, s]) => (
            <div className="flex items-center gap-2" key={type}>
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: s.text }}
              />
              <span className="text-[0.75rem] text-muted-foreground">
                {type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── iCal links ───────────────────────────────────────────────────── */}
      <ICalSection
        feedName={selectedFeed.name}
        feedToken={selectedFeed.token}
      />

      {/* ── Setup instructions ───────────────────────────────────────────── */}
      <SetupInstructions />
    </div>
  );
}
