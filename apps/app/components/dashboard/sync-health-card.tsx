import type { AdminDashboardView } from "@repo/availability";
import { EmptyState } from "@/components/states/empty-state";
import { DashboardCardError, DashboardCardShell } from "./dashboard-card-shell";
import { formatDateTime } from "./dashboard-format";

interface SyncHealthCardProps {
  orgQueryValue: string | null;
  state: AdminDashboardView["syncHealth"];
}

export function SyncHealthCard({ state, orgQueryValue }: SyncHealthCardProps) {
  if (state.status === "error") {
    return (
      <DashboardCardShell
        ctaHref="/sync"
        ctaLabel="Open sync"
        description="Xero connection and run status"
        orgQueryValue={orgQueryValue}
        title="Sync health"
      >
        <DashboardCardError entityName="sync health" />
      </DashboardCardShell>
    );
  }

  return (
    <DashboardCardShell
      ctaHref="/sync"
      ctaLabel="Open sync"
      description="Xero connection and run status"
      orgQueryValue={orgQueryValue}
      title="Sync health"
    >
      {state.data.hasActiveXeroConnection ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Tenants" value={state.data.tenantCount} />
          <Metric label="Active" value={state.data.activeTenantCount} />
          <Metric label="Runs 24h" value={state.data.runsLast24h} />
          <Metric label="Failed 24h" value={state.data.failedRunsLast24h} />
          <Metric
            label="Failed records"
            value={state.data.pendingFailedRecords}
          />
          <div className="rounded-xl bg-muted p-3">
            <p className="text-muted-foreground text-xs">Last success</p>
            <p className="font-medium">
              {state.data.lastSuccessfulSync
                ? formatDateTime(state.data.lastSuccessfulSync)
                : "Never"}
            </p>
          </div>
        </div>
      ) : (
        <EmptyState
          description="No active Xero connection is configured."
          title="Xero not connected"
        />
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
