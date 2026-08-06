import type { CalendarRange } from "@repo/availability";
import { cn } from "@repo/design-system/lib/utils";
import { statusToneClasses } from "@/components/availability/availability-status";
import { CalendarCreateLauncher } from "./calendar-create-launcher";
import { CalendarEventChip } from "./calendar-event-chip";

interface CalendarWeekViewProps {
  actingPersonId: string | null;
  data: CalendarRange;
  orgQueryValue: string | null;
  selectedPersonId: string | null;
}

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarWeekView({
  actingPersonId,
  data,
  orgQueryValue,
  selectedPersonId,
}: CalendarWeekViewProps) {
  const createPersonId = selectedPersonId ?? actingPersonId;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a CSS grid calendar cannot be a real <table> without losing the grid-cols-7 layout, so the ARIA grid pattern is the correct approach here.
    <div
      aria-label="Calendar week view"
      className="overflow-x-auto rounded-2xl bg-muted p-1"
      role="grid"
    >
      {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid pattern, see the grid container above. */}
      <div
        className="grid min-w-[56rem] grid-cols-7 gap-1"
        role="row"
        tabIndex={-1}
      >
        {data.days.map((day) => (
          // biome-ignore lint/a11y/useSemanticElements: ARIA grid pattern, see the grid container above.
          <div
            aria-current={day.isToday ? "date" : undefined}
            className={cn(
              "rounded-xl bg-background p-3 text-center",
              day.isToday && "bg-primary text-primary-foreground"
            )}
            key={`header-${day.date.toISOString()}`}
            role="columnheader"
            tabIndex={-1}
          >
            <p className="font-medium text-xs uppercase tracking-wide">
              {dayLabels[day.dayOfWeek]}
            </p>
            <p className="mt-1 font-semibold text-lg tabular-nums">
              {day.date.getUTCDate()}
            </p>
          </div>
        ))}
      </div>

      {data.days.some((day) => day.publicHolidays.length > 0) && (
        // biome-ignore lint/a11y/useSemanticElements: ARIA grid pattern, see the grid container above.
        <div
          className="mt-1 grid min-w-[56rem] grid-cols-7 gap-1"
          role="row"
          tabIndex={-1}
        >
          {data.days.map((day) => (
            // biome-ignore lint/a11y/useSemanticElements: ARIA grid pattern, see the grid container above.
            <div
              className={`min-h-12 rounded-xl p-2 text-xs ${statusToneClasses.holiday}`}
              key={`holidays-${day.date.toISOString()}`}
              role="gridcell"
              tabIndex={-1}
            >
              {day.publicHolidays.map((holiday) => (
                <p className="truncate font-medium" key={holiday.name}>
                  {holiday.name}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid pattern, see the grid container above. */}
      <div
        className="mt-1 grid min-w-[56rem] grid-cols-7 gap-1"
        role="row"
        tabIndex={-1}
      >
        {data.days.map((day) => {
          const dateOnly = day.date.toISOString().slice(0, 10);
          const allDayEvents = day.events.filter((event) => event.allDay);
          const timedEvents = day.events.filter((event) => !event.allDay);
          return (
            // biome-ignore lint/a11y/useSemanticElements: ARIA grid pattern, see the grid container above.
            <div
              aria-label={`${dayLabels[day.dayOfWeek]} ${day.date.getUTCDate()} events`}
              className={cn(
                "flex min-h-72 flex-col justify-between rounded-xl bg-background p-2",
                day.isToday && "ring-2 ring-primary/30"
              )}
              key={dateOnly}
              role="gridcell"
              tabIndex={-1}
            >
              <div className="space-y-2">
                {allDayEvents.map((event) => (
                  <CalendarEventChip
                    event={event}
                    key={`${event.id}-${dateOnly}-all-day`}
                    orgQueryValue={orgQueryValue}
                  />
                ))}
                {timedEvents.map((event) => (
                  <CalendarEventChip
                    event={event}
                    key={`${event.id}-${dateOnly}-timed`}
                    orgQueryValue={orgQueryValue}
                  />
                ))}
              </div>
              <CalendarCreateLauncher
                className="mt-2 w-full"
                date={day.date}
                personId={createPersonId}
                startsAt={dateOnly}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
