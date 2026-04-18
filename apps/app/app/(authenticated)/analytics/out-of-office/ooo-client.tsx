import type {
  AnalyticsRecordListItem,
  OutOfOfficeData,
} from "@repo/availability";
import { EmptyState } from "@/components/states/empty-state";
import {
  OutOfOfficeCharts,
  SummaryStats,
} from "../_components/analytics-charts";
import { AnalyticsFilterBar } from "../_components/analytics-filter-bar";
import { DrillDownDrawer } from "../_components/drill-down-drawer";
import { ReportActions } from "../_components/report-actions";
import type { OutOfOfficeFilterInput } from "../_schemas";

interface FilterOption {
  id: string;
  name: string;
}

export function OooClient({
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
  data: OutOfOfficeData;
  drilldown: {
    calendarHref: string;
    closeHref: string;
    records: AnalyticsRecordListItem[];
    title: string;
  } | null;
  exportInput: Record<string, unknown>;
  filters: OutOfOfficeFilterInput;
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
              Out of office
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Generated just now from {data.dataFreshness.recordCount} records.
            </p>
          </div>
          <ReportActions exportInput={exportInput} reportType="ooo" />
        </div>
      </section>

      <AnalyticsFilterBar
        canIncludeArchived={canIncludeArchived}
        filters={filters}
        filterType="ooo"
        locations={locations}
        orgQueryValue={orgQueryValue}
        recordTypes={[
          "wfh",
          "travelling",
          "training",
          "client_site",
          "another_office",
          "offsite_meeting",
          "contractor_unavailable",
          "limited_availability",
          "alternative_contact",
          "other",
        ]}
        teams={teams}
      />

      {hasRecords ? (
        <>
          <SummaryStats
            items={[
              {
                label: "Total OOO days",
                value: String(data.summaryStats.totalOooDays),
              },
              {
                label: "People with OOO",
                value: String(data.summaryStats.peopleWithOooInPeriod),
              },
              {
                label: "Average days per person",
                value: String(data.summaryStats.averageDaysPerPersonWithOoo),
              },
              {
                label: "Most common type",
                value: data.summaryStats.mostCommonOooType
                  ? labelForRecordType(data.summaryStats.mostCommonOooType)
                  : "None",
              },
            ]}
          />
          <OutOfOfficeCharts
            data={data}
            filters={filters}
            orgQueryValue={orgQueryValue}
          />
        </>
      ) : (
        <div className="rounded-2xl bg-muted p-8">
          <EmptyState
            description="No out-of-office records for this period. Try adjusting the date range or filters."
            title="No out-of-office records"
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

function labelForRecordType(recordType: string): string {
  return recordType
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
