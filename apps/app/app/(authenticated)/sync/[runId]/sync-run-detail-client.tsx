"use client";

interface SyncRunDetailClientProperties {
  readonly runId: string;
}

const SyncRunDetailClient = ({ runId }: SyncRunDetailClientProperties) => (
  <div className="rounded-2xl bg-muted p-6">
    <p className="font-medium text-sm">Sync run details are unavailable.</p>
    <p className="text-muted-foreground text-sm">
      Xero sync is disabled for the manual availability MVP. No detail view is
      available for run {runId}.
    </p>
  </div>
);

export { SyncRunDetailClient };
