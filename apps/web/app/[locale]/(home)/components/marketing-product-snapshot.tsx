"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TeamTone = "forest" | "plum" | "sage" | "slate";
type LeaveTypeId =
  | "annual"
  | "birthday"
  | "client"
  | "training"
  | "travel"
  | "wfh";
type SyncState = "idle" | "syncing" | "just-synced";
type IconId =
  | "briefcase"
  | "cake"
  | "calendar"
  | "home"
  | "leaf"
  | "mapPin"
  | "plane"
  | "shield"
  | "sync";

interface TeamMember {
  id: number;
  initials: string;
  location: string;
  name: string;
  role: string;
  tone: TeamTone;
}

interface ScheduleEntry {
  detail: string;
  person: number;
  span: number;
  start: number;
  type: LeaveTypeId;
}

interface WeekDay {
  fullLabel: string;
  isToday: boolean;
  key: string;
}

interface LeaveType {
  icon: IconId;
  label: string;
}

const team: TeamMember[] = [
  {
    id: 1,
    name: "Amelia Thorne",
    role: "Design",
    initials: "AT",
    location: "Melbourne",
    tone: "sage",
  },
  {
    id: 2,
    name: "Lachlan Cooper",
    role: "Engineering",
    initials: "LC",
    location: "Brisbane",
    tone: "slate",
  },
  {
    id: 3,
    name: "Charlotte Hughes",
    role: "Engineering",
    initials: "CH",
    location: "Auckland",
    tone: "plum",
  },
  {
    id: 4,
    name: "Hannah Wilson",
    role: "Product",
    initials: "HW",
    location: "Sydney",
    tone: "sage",
  },
  {
    id: 5,
    name: "Tom Williams",
    role: "Sales",
    initials: "TW",
    location: "Client site",
    tone: "forest",
  },
  {
    id: 6,
    name: "Peter Smith",
    role: "Sales",
    initials: "PS",
    location: "Wellington",
    tone: "plum",
  },
  {
    id: 7,
    name: "Jack Brown",
    role: "Admin",
    initials: "JB",
    location: "Payroll",
    tone: "slate",
  },
  {
    id: 8,
    name: "Chloe Bowen",
    role: "Admin",
    initials: "CB",
    location: "Remote",
    tone: "sage",
  },
];

const leaveTypes: Record<LeaveTypeId, LeaveType> = {
  annual: { icon: "plane", label: "Annual leave" },
  birthday: { icon: "cake", label: "Birthday leave" },
  client: { icon: "leaf", label: "Client site" },
  training: { icon: "briefcase", label: "Training" },
  travel: { icon: "mapPin", label: "Travelling" },
  wfh: { icon: "home", label: "Working from home" },
};

const baseSchedule: ScheduleEntry[] = [
  {
    person: 1,
    start: 1,
    span: 4,
    type: "annual",
    detail: "Approved in Xero",
  },
  {
    person: 2,
    start: 0,
    span: 5,
    type: "wfh",
    detail: "Calendar only",
  },
  {
    person: 3,
    start: 2,
    span: 1,
    type: "training",
    detail: "Leadership course",
  },
  {
    person: 4,
    start: 3,
    span: 3,
    type: "travel",
    detail: "Customer visits",
  },
  {
    person: 5,
    start: 0,
    span: 1,
    type: "client",
    detail: "On site",
  },
  {
    person: 5,
    start: 4,
    span: 1,
    type: "wfh",
    detail: "Focus day",
  },
  {
    person: 6,
    start: 1,
    span: 1,
    type: "training",
    detail: "Induction",
  },
  {
    person: 6,
    start: 3,
    span: 2,
    type: "wfh",
    detail: "Remote",
  },
  {
    person: 7,
    start: 0,
    span: 3,
    type: "annual",
    detail: "School holidays",
  },
  {
    person: 8,
    start: 2,
    span: 1,
    type: "birthday",
    detail: "Private feed label",
  },
];

const arrivingPool: ScheduleEntry[] = [
  { person: 3, start: 5, span: 2, type: "wfh", detail: "Remote days" },
  {
    person: 7,
    start: 3,
    span: 1,
    type: "training",
    detail: "Compliance course",
  },
  { person: 1, start: 0, span: 1, type: "travel", detail: "Sydney visit" },
];

function entryKey(e: ScheduleEntry): string {
  return `${e.person}-${e.start}-${e.type}`;
}

const fallbackDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  weekday: "short",
});

const weekOfFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  weekday: "short",
});

const iconPaths: Record<IconId, ReactNode> = {
  briefcase: (
    <>
      <rect height="13" rx="2" width="18" x="3" y="7" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </>
  ),
  cake: (
    <>
      <path d="M4 20h16V12H4z" />
      <path d="M4 15c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1" />
      <path d="M12 3v5" />
    </>
  ),
  calendar: (
    <>
      <rect height="16" rx="2" width="18" x="3" y="5" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
    </>
  ),
  home: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16z" />
      <path d="M4 20l8-8" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  plane: <path d="M3 12l18-7-7 18-2-8-9-3z" />,
  shield: <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6z" />,
  sync: (
    <>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15" />
      <path d="M4 20v-5h5" />
    </>
  ),
};

export const MarketingProductSnapshot = () => {
  const [today, setToday] = useState<Date | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMinutes, setSyncMinutes] = useState(0);
  const [arrivingIndex, setArrivingIndex] = useState(-1);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapRef = useRef<HTMLDivElement>(null);

  const onSnapMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = snapRef.current;
    if (!el) {
      return;
    }
    const r = el.getBoundingClientRect();
    el.style.setProperty(
      "--snap-cx",
      ((e.clientX - r.left) / r.width).toFixed(3)
    );
    el.style.setProperty(
      "--snap-cy",
      ((e.clientY - r.top) / r.height).toFixed(3)
    );
    el.style.setProperty("--snap-active", "1");
  }, []);

  const onSnapLeave = useCallback(() => {
    const el = snapRef.current;
    if (!el) {
      return;
    }
    el.style.setProperty("--snap-cx", "0.5");
    el.style.setProperty("--snap-cy", "0.5");
    el.style.setProperty("--snap-active", "0");
  }, []);

  useEffect(() => {
    const refreshToday = () => setToday(new Date());
    refreshToday();
    const todayInterval = window.setInterval(refreshToday, 60_000);

    // Minute counter for sync badge
    const minuteInterval = window.setInterval(() => {
      setSyncMinutes((m) => m + 1);
    }, 60_000);

    // Live sync simulation: every 9 seconds
    const syncInterval = window.setInterval(() => {
      setSyncState("syncing");

      syncTimerRef.current = setTimeout(() => {
        setArrivingIndex((i) => i + 1);
        setSyncState("just-synced");
        setSyncMinutes(0);

        syncTimerRef.current = setTimeout(() => {
          setSyncState("idle");
        }, 2500);
      }, 1200);
    }, 9000);

    return () => {
      window.clearInterval(todayInterval);
      window.clearInterval(minuteInterval);
      window.clearInterval(syncInterval);
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  const week = useMemo(() => {
    if (!today) {
      return null;
    }

    const monday = getMonday(today);
    const dayKeys = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const isToday = isSameLocalDate(date, today);

      return {
        key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        fullLabel: `${weekdayFormatter.format(date)}${isToday ? " · Today" : ""}`,
        isToday,
      };
    });

    return {
      days: dayKeys,
      weekOf: weekOfFormatter.format(monday),
    };
  }, [today]);

  const days: WeekDay[] =
    week?.days ??
    fallbackDays.map((day) => ({
      key: day,
      fullLabel: day,
      isToday: false,
    }));

  const schedule = useMemo(() => {
    if (arrivingIndex < 0) {
      return baseSchedule;
    }
    const arriving = arrivingPool[arrivingIndex % arrivingPool.length];
    return [...baseSchedule, arriving];
  }, [arrivingIndex]);

  const arrivingKey =
    arrivingIndex >= 0
      ? entryKey(arrivingPool[arrivingIndex % arrivingPool.length])
      : null;

  let syncLabel = `Synced ${syncMinutes} min ago`;
  if (syncState === "syncing") {
    syncLabel = "Syncing...";
  } else if (syncState === "just-synced" || syncMinutes === 0) {
    syncLabel = "Synced just now";
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: mouse tracking for visual depth effect only
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: mouse tracking for visual depth effect only
    <div
      className="marketing-product-snapshot"
      onMouseLeave={onSnapLeave}
      onMouseMove={onSnapMove}
      ref={snapRef}
    >
      <div className="marketing-card marketing-card--low">
        <div className="marketing-browser-bar">
          <div aria-hidden="true" className="marketing-browser-dots">
            <span />
            <span />
            <span />
          </div>
          <span>
            {week
              ? `${week.weekOf} · Folder Creek`
              : "This week · Folder Creek"}
          </span>
          <div className="marketing-browser-meta">
            <span data-syncing={syncState === "syncing" ? true : undefined}>
              <MarketingSnapshotIcon id="sync" size={14} />
              {syncLabel}
            </span>
            <span>
              <MarketingSnapshotIcon id="shield" size={14} />
              Private ICS
            </span>
          </div>
        </div>
        <div className="marketing-week-shell">
          <div className="marketing-week-summary">
            <span>
              <MarketingSnapshotIcon id="calendar" size={14} />8 people
            </span>
            <span>12 published events</span>
            <span>3 calendar feeds</span>
          </div>
          <WeekGrid
            arrivingKey={arrivingKey}
            days={days}
            schedule={schedule}
            weekOf={week?.weekOf ?? "This week"}
          />
        </div>
      </div>
    </div>
  );
};

const WeekGrid = ({
  arrivingKey,
  days,
  schedule,
  weekOf,
}: {
  arrivingKey: string | null;
  days: WeekDay[];
  schedule: ScheduleEntry[];
  weekOf: string;
}) => (
  <div className="marketing-week-card">
    <div className="marketing-week-header">
      <div>
        <span>Week of</span>
        {weekOf}
      </div>
      {days.map((day) => (
        <span
          className={
            day.isToday ? "marketing-week-day is-today" : "marketing-week-day"
          }
          key={day.key}
        >
          {day.fullLabel}
        </span>
      ))}
    </div>
    <div>
      {team.map((person, index) => {
        const entries = schedule.filter((entry) => entry.person === person.id);
        return (
          <div
            className={
              index % 2 === 0
                ? "marketing-week-row"
                : "marketing-week-row marketing-week-row--alt"
            }
            key={person.id}
          >
            <div className="marketing-week-person">
              <Avatar initials={person.initials} tone={person.tone} />
              <div>
                <p>{person.name}</p>
                <span>{person.role}</span>
              </div>
            </div>
            <div aria-hidden="true" className="marketing-week-days">
              {days.map((day) => (
                <span
                  className={day.isToday ? "is-today" : undefined}
                  key={day.key}
                />
              ))}
            </div>
            <div className="marketing-week-events">
              {entries.map((entry) => {
                const leave = leaveTypes[entry.type];
                const key = entryKey(entry);
                const isArriving = key === arrivingKey;
                return (
                  <div
                    className={`marketing-event marketing-event--${entry.type}`}
                    data-arriving={isArriving ? true : undefined}
                    key={key}
                    style={{
                      gridColumn: `${entry.start + 1} / span ${entry.span}`,
                    }}
                  >
                    <MarketingSnapshotIcon id={leave.icon} size={14} />
                    <span>{leave.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const Avatar = ({ initials, tone }: { initials: string; tone: TeamTone }) => (
  <div className={`marketing-avatar marketing-avatar--${tone}`}>{initials}</div>
);

const MarketingSnapshotIcon = ({
  id,
  size = 20,
}: {
  id: IconId;
  size?: number;
}) => (
  <svg
    aria-hidden="true"
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.75"
    viewBox="0 0 24 24"
    width={size}
  >
    {iconPaths[id]}
  </svg>
);

function getMonday(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);

  const day = monday.getDay();
  const distanceFromMonday = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + distanceFromMonday);

  return monday;
}

function isSameLocalDate(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
