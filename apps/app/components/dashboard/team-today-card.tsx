import type { ManagerDashboardView } from "@repo/availability";
import { DashboardCardError, DashboardCardShell } from "./dashboard-card-shell";

interface TeamTodayCardProps {
  orgQueryValue: string | null;
  state: ManagerDashboardView["teamToday"];
}

export function TeamTodayCard({ state, orgQueryValue }: TeamTodayCardProps) {
  return (
    <DashboardCardShell
      ctaHref="/people"
      ctaLabel="View people"
      description="Status snapshot for your scope"
      orgQueryValue={orgQueryValue}
      title="Team today"
    >
      {state.status === "error" ? (
        <DashboardCardError entityName="team activity" />
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Metric label="On leave" value={state.data.peopleOnLeaveCount} />
          <Metric label="WFH" value={state.data.peopleWorkingFromHomeCount} />
          <Metric label="Travelling" value={state.data.peopleTravellingCount} />
          <Metric label="Other OOO" value={state.data.peopleOtherOooCount} />
          <Metric label="Available" value={state.data.peopleAvailableCount} />
          <Metric
            label="Sync failed"
            value={state.data.peopleWithXeroSyncFailedCount}
          />
        </div>
      )}
    </DashboardCardShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-semibold text-lg">{value}</p>
    </div>
  );
}
