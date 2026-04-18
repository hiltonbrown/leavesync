import type { LeaveReportsData, OutOfOfficeData } from "@repo/availability";
import Link from "next/link";
import type {
  LeaveReportsFilterInput,
  OutOfOfficeFilterInput,
} from "../_schemas";

export function LeaveReportCharts({
  data,
  filters,
  orgQueryValue,
}: {
  data: LeaveReportsData;
  filters: LeaveReportsFilterInput;
  orgQueryValue: string | null;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Leave days by type">
        <MonthlySeries
          months={data.leaveDaysByTypeMonthly.months}
          series={data.leaveDaysByTypeMonthly.series}
        />
      </Panel>
      <Panel title="Leave type distribution">
        <DonutList
          items={data.leaveTypeDonut.map((item) => ({
            href: drillHref(
              "/analytics/leave-reports",
              filters,
              orgQueryValue,
              "record_type",
              item.recordType
            ),
            label: item.label,
            percentage: item.percentage,
            value: item.days,
          }))}
        />
      </Panel>
      <Panel title="Top people by leave days">
        <HorizontalBars
          items={data.leaveDaysByPerson.map((person) => ({
            href:
              person.personId === "others"
                ? null
                : drillHref(
                    "/analytics/leave-reports",
                    filters,
                    orgQueryValue,
                    "person",
                    person.personId
                  ),
            label: `${person.firstName} ${person.lastName}`.trim(),
            value: person.days,
          }))}
        />
      </Panel>
      <Panel title="Leave days by team">
        <HorizontalBars
          items={data.leaveDaysByTeam.map((team) => ({
            href: drillHref(
              "/analytics/leave-reports",
              filters,
              orgQueryValue,
              "team",
              team.teamId
            ),
            label: team.teamName,
            value: team.days,
          }))}
        />
      </Panel>
      <Panel className="xl:col-span-2" title="Peak absence heatmap">
        <Heatmap
          days={data.peakAbsenceHeatmap.days}
          maxValue={data.peakAbsenceHeatmap.maxValue}
          weeks={data.peakAbsenceHeatmap.weeks}
        />
      </Panel>
    </div>
  );
}

export function OutOfOfficeCharts({
  data,
  filters,
  orgQueryValue,
}: {
  data: OutOfOfficeData;
  filters: OutOfOfficeFilterInput;
  orgQueryValue: string | null;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Availability types by month">
        <MonthlySeries
          months={data.oooDaysByTypeMonthly.months}
          series={data.oooDaysByTypeMonthly.series}
        />
      </Panel>
      <Panel title="Availability type distribution">
        <DonutList
          items={data.oooTypeDonut.map((item) => ({
            href: drillHref(
              "/analytics/out-of-office",
              filters,
              orgQueryValue,
              "record_type",
              item.recordType
            ),
            label: item.label,
            percentage: item.percentage,
            value: item.days,
          }))}
        />
      </Panel>
      <Panel title="WFH pattern by day">
        <HorizontalBars
          items={data.wfhPatternByDayOfWeek.map((day) => ({
            href: null,
            label: day.dayLabel,
            value: day.days,
          }))}
        />
      </Panel>
      <Panel title="Top travellers">
        <HorizontalBars
          items={data.travelFrequencyByPerson.map((person) => ({
            href: drillHref(
              "/analytics/out-of-office",
              filters,
              orgQueryValue,
              "person",
              person.personId
            ),
            label: `${person.firstName} ${person.lastName}`,
            value: person.days,
          }))}
        />
      </Panel>
      <Panel className="xl:col-span-2" title="Top WFH people">
        <HorizontalBars
          items={data.topWfhPeople.map((person) => ({
            href: drillHref(
              "/analytics/out-of-office",
              filters,
              orgQueryValue,
              "person",
              person.personId
            ),
            label: `${person.firstName} ${person.lastName} (${Math.round(
              person.wfhRatio * 100
            )}%)`,
            value: person.wfhDays,
          }))}
        />
      </Panel>
    </div>
  );
}

export function SummaryStats({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div className="rounded-2xl bg-muted p-5" key={item.label}>
          <p className="text-muted-foreground text-sm">{item.label}</p>
          <p className="mt-2 font-semibold text-3xl text-foreground">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function Panel({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={`rounded-2xl bg-muted p-6 ${className ?? ""}`}>
      <h2 className="font-semibold text-foreground text-xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MonthlySeries({
  months,
  series,
}: {
  months: string[];
  series: Array<{ recordType: string; values: number[] }>;
}) {
  const totals = months.map((_, index) =>
    series.reduce((total, item) => total + (item.values[index] ?? 0), 0)
  );
  const max = Math.max(1, ...totals);
  return (
    <div className="flex min-h-72 items-end gap-3 overflow-x-auto pb-3">
      {months.map((month, index) => (
        <div
          className="flex w-20 shrink-0 flex-col items-center gap-2"
          key={month}
        >
          <div className="flex h-56 w-full flex-col justify-end overflow-hidden rounded-2xl bg-background">
            {series.map((item, seriesIndex) => {
              const value = item.values[index] ?? 0;
              return (
                <div
                  aria-label={`${item.recordType} ${value} days`}
                  className={chartFillClass(seriesIndex)}
                  key={item.recordType}
                  role="img"
                  style={{ height: `${(value / max) * 100}%` }}
                />
              );
            })}
          </div>
          <span className="text-muted-foreground text-xs">{month}</span>
        </div>
      ))}
    </div>
  );
}

function DonutList({
  items,
}: {
  items: Array<{
    href: string | null;
    label: string;
    percentage: number;
    value: number;
  }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ChartLink href={item.href} key={item.label}>
          <span>{item.label}</span>
          <span className="text-muted-foreground">
            {item.value} days, {item.percentage}%
          </span>
        </ChartLink>
      ))}
    </div>
  );
}

function HorizontalBars({
  items,
}: {
  items: Array<{ href: string | null; label: string; value: number }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ChartLink href={item.href} key={item.label}>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <span className="h-3 w-1/3 overflow-hidden rounded-2xl bg-background">
            <span
              className="block h-full rounded-2xl bg-primary"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </span>
          <span className="w-16 text-right text-muted-foreground">
            {item.value}
          </span>
        </ChartLink>
      ))}
    </div>
  );
}

function Heatmap({
  days,
  maxValue,
  weeks,
}: {
  days: number[][];
  maxValue: number;
  weeks: string[];
}) {
  if (weeks.length === 0) {
    return <p className="text-muted-foreground text-sm">No heatmap data.</p>;
  }
  const dayLabels = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${weeks.length}, minmax(1.25rem, 1fr))`,
        }}
      >
        {days.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => (
            <div
              aria-label={`${weeks[columnIndex]} day ${rowIndex + 1}: ${value}`}
              className="aspect-square rounded-md bg-primary"
              key={`${dayLabels[rowIndex]}-${weeks[columnIndex]}`}
              role="img"
              style={{
                opacity:
                  maxValue === 0 ? 0.08 : 0.08 + (value / maxValue) * 0.72,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ChartLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string | null;
}) {
  const className =
    "flex items-center justify-between gap-3 rounded-2xl bg-background px-4 py-3 text-sm";
  if (!href) {
    return <div className={className}>{children}</div>;
  }
  return (
    <Link
      className={`${className} transition-colors hover:bg-surface-container-high`}
      href={href}
    >
      {children}
    </Link>
  );
}

function drillHref(
  path: string,
  filters: LeaveReportsFilterInput | OutOfOfficeFilterInput,
  orgQueryValue: string | null,
  kind: string,
  value: string
): string {
  const params = new URLSearchParams();
  if (orgQueryValue) {
    params.set("org", orgQueryValue);
  }
  params.set("preset", filters.preset);
  if (filters.customStart) {
    params.set("customStart", filters.customStart);
  }
  if (filters.customEnd) {
    params.set("customEnd", filters.customEnd);
  }
  if (filters.personType !== "all") {
    params.set("personType", filters.personType);
  }
  for (const teamId of filters.teamId ?? []) {
    params.append("teamId", teamId);
  }
  for (const locationId of filters.locationId ?? []) {
    params.append("locationId", locationId);
  }
  params.set("drilldownKind", kind);
  params.set("drilldownValue", value);
  return `${path}?${params.toString()}`;
}

function chartFillClass(index: number): string {
  const classes = [
    "bg-primary",
    "bg-secondary",
    "bg-tertiary",
    "bg-primary/60",
    "bg-secondary/60",
    "bg-tertiary/60",
  ];
  return classes[index % classes.length] ?? "bg-primary";
}
