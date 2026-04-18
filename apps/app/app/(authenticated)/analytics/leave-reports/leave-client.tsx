import type {
  AnalyticsRecordListItem,
  LeaveReportsData,
} from "@repo/availability";
import { EmptyState } from "@/components/states/empty-state";
import {
  LeaveReportCharts,
  SummaryStats,
} from "../_components/analytics-charts";
import { AnalyticsFilterBar } from "../_components/analytics-filter-bar";
import { DrillDownDrawer } from "../_components/drill-down-drawer";
import { ReportActions } from "../_components/report-actions";
import type { LeaveReportsFilterInput } from "../_schemas";

interface FilterOption {
  id: string;
  name: string;
}

export function LeaveClient({
  canIncludeArchived,
  data,
  drilldown,
  exportInput,
  filters,
  locations,
  orgQueryValue,
  teams,
}: {
  canIncludeArchived: boolean;
  data: LeaveReportsData;
  drilldown: {
    calendarHref: string;
    closeHref: string;
    records: AnalyticsRecordListItem[];
    title: string;
  } | null;
  exportInput: Record<string, unknown>;
  filters: LeaveReportsFilterInput;
  locations: FilterOption[];
  orgQueryValue: string | null;
  teams: FilterOption[];
}) {
  const hasRecords = data.dataFreshness.recordCount > 0;
  return (
    <main className="flex flex-1 flex-col gap-6 p-6 pt-0">
      <section className="rounded-2xl bg-muted p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
              {data.range.label}
            </p>
            <h1 className="mt-2 font-semibold text-3xl text-foreground tracking-tight">
              Leave reports
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Generated just now from {data.dataFreshness.recordCount} records.
            </p>
          </div>
          <ReportActions exportInput={exportInput} reportType="leave" />
        </div>
      </section>

      <AnalyticsFilterBar
        canIncludeArchived={canIncludeArchived}
        filters={filters}
        filterType="leave"
        locations={locations}
        orgQueryValue={orgQueryValue}
        recordTypes={[
          "annual_leave",
          "personal_leave",
          "sick_leave",
          "long_service_leave",
          "unpaid_leave",
          "holiday",
        ]}
        teams={teams}
      />

      {hasRecords ? (
        <>
          <SummaryStats
            items={[
              {
                label: "Total leave days",
                value: String(data.summaryStats.totalLeaveDays),
              },
              {
                label: "People with leave",
                value: String(data.summaryStats.peopleWithLeaveInPeriod),
              },
              {
                label: "Average days per person",
                value: String(data.summaryStats.averageDaysPerPersonWithLeave),
              },
              {
                label: "P80 days per person",
                value: String(data.summaryStats.p80DaysPerPersonWithLeave),
              },
            ]}
          />
          <LeaveReportCharts
            data={data}
            filters={filters}
            orgQueryValue={orgQueryValue}
          />
        </>
      ) : (
        <div className="rounded-2xl bg-muted p-8">
          <EmptyState
            description="No leave records for this period. Try adjusting the date range or filters."
            title="No leave records"
          />
        </div>
      )}

      {drilldown && (
        <DrillDownDrawer
          calendarHref={drilldown.calendarHref}
          closeHref={drilldown.closeHref}
          orgQueryValue={orgQueryValue}
          records={drilldown.records}
          title={drilldown.title}
        />
      )}
    </main>
  );
}
