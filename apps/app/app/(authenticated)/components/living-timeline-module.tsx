"use client";

import { UserIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { withOrg } from "@/lib/navigation/org-url";

interface LivingTimelineModuleProps {
  className?: string;
  orgQueryValue: null | string;
  todayAbsences: { name: string }[];
  total?: number;
}

interface Absence {
  name: string;
}

interface TimelineDay {
  absences: Absence[];
  date: Date;
  isWeekend: boolean;
}

const getAbsencesForDay = (
  i: number,
  isWeekend: boolean,
  todayAbsences: Absence[]
): Absence[] => {
  if (isWeekend) {
    return [];
  }

  switch (i) {
    case 0:
      return todayAbsences;
    default:
      return [];
  }
};

const generateTimelineData = (todayAbsences: Absence[]): TimelineDay[] =>
  Array.from({ length: 14 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    return {
      date,
      isWeekend,
      absences: getAbsencesForDay(i, isWeekend, todayAbsences),
    };
  });

const getBarClassName = (
  absenceCount: number,
  isToday: boolean,
  isWeekend: boolean
) => {
  const base = "w-full rounded-t-md transition-all duration-500 ease-out";
  if (absenceCount > 0) {
    if (isToday) {
      return `${base} bg-[var(--primary)] shadow-sm`;
    }
    return `${base} bg-[var(--primary)]/30 group-hover:bg-[var(--primary)]/60`;
  }
  if (isWeekend) {
    return `${base} h-1 bg-border/40`;
  }
  return `${base} h-1 bg-border group-hover:bg-border/70`;
};

const getLabelClassName = (isToday: boolean, isWeekend: boolean) => {
  const base = "text-[0.6875rem] uppercase";
  if (isToday) {
    return `${base} font-bold text-foreground`;
  }
  if (isWeekend) {
    return `${base} font-medium text-muted-foreground/50`;
  }
  return `${base} font-medium text-muted-foreground`;
};

export const LivingTimelineModule = ({
  className,
  orgQueryValue,
  total = 38,
  todayAbsences,
}: LivingTimelineModuleProps) => {
  const [mounted, setMounted] = useState(false);
  const [timeline, setTimeline] = useState<TimelineDay[]>([]);

  useEffect(() => {
    setTimeline(generateTimelineData(todayAbsences));
    setMounted(true);
  }, [todayAbsences]);

  const todayCount = todayAbsences.length;
  const nextWeekCount = timeline
    .slice(7, 14)
    .reduce((acc, day) => acc + day.absences.length, 0);

  return (
    <div
      className={`flex flex-col gap-6 rounded-2xl bg-muted p-6 ${
        className ?? ""
      }`}
    >
      {/* Header */}
      <div>
        <p className="font-medium text-label-sm text-muted-foreground uppercase tracking-widest">
          Coverage Overview
        </p>
        <div className="mt-1.5 flex items-baseline gap-3">
          <p className="font-semibold text-display-md text-foreground leading-none tracking-tight">
            {todayCount}
          </p>
          <p className="text-[0.875rem] text-muted-foreground">
            out today (of {total})
          </p>
        </div>
      </div>

      {/* The Living Timeline */}
      <div className="relative mt-auto flex h-[140px] items-end justify-between gap-1 sm:gap-2">
        {timeline.map((day, idx) => {
          const dayLabel = day.date
            .toLocaleDateString("en-US", { weekday: "short" })
            .charAt(0);
          const isToday = idx === 0;
          const absenceCount = day.absences.length;
          const heightPx =
            absenceCount > 0 ? Math.min(24 + absenceCount * 20, 100) : 4;
          const dateKey = day.date.toISOString();

          const isFirst = idx === 0;

          return (
            <div
              className="group relative flex flex-1 flex-col items-center justify-end"
              key={dateKey}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 40}ms`,
              }}
            >
              {absenceCount > 0 && (
                <div
                  className={`pointer-events-none absolute bottom-[calc(100%+8px)] z-50 hidden w-max min-w-[160px] flex-col rounded-xl border border-border bg-popover p-3 text-popover-foreground opacity-0 shadow-xl transition-all duration-200 group-hover:flex group-hover:opacity-100 ${
                    isFirst
                      ? "left-0 origin-bottom-left"
                      : "left-1/2 origin-bottom -translate-x-1/2"
                  }`}
                  style={{
                    animation:
                      "popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                  }}
                >
                  <p className="mb-2 border-border border-b pb-2 font-medium text-label-sm text-muted-foreground">
                    {day.date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <div className="flex flex-col gap-2">
                    {day.absences.map((person) => (
                      <div
                        className="flex items-center gap-2"
                        key={person.name}
                      >
                        <div
                          className="flex size-5 items-center justify-center rounded-full"
                          style={{ background: "var(--secondary-container)" }}
                        >
                          <UserIcon
                            className="size-3"
                            strokeWidth={2}
                            style={{ color: "var(--on-secondary-container)" }}
                          />
                        </div>
                        <span className="font-medium text-[0.8125rem]">
                          {person.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={getBarClassName(
                  absenceCount,
                  isToday,
                  day.isWeekend
                )}
                style={{ height: `${heightPx}px` }}
              />

              <div className="mt-2 flex h-5 w-full items-center justify-center">
                <span className={getLabelClassName(isToday, day.isWeekend)}>
                  {dayLabel}
                </span>
              </div>

              {isToday && (
                <div className="absolute -bottom-3 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[var(--primary)]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-label-md text-muted-foreground">
          {nextWeekCount} out next week
        </p>
        <Link
          className="font-medium text-[0.8125rem] transition-opacity hover:opacity-70"
          href={withOrg("/calendar", orgQueryValue)}
          style={{ color: "var(--primary)" }}
        >
          View team calendar &rarr;
        </Link>
      </div>
    </div>
  );
};
