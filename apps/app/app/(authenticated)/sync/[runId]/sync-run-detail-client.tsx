"use client";

interface SyncRunDetailClientProperties {
  readonly runId: string;
}

const SyncRunDetailClient = ({
  runId,
}: SyncRunDetailClientProperties) => (
  <div className="rounded-2xl bg-muted p-6">
    <p className="text-muted-foreground text-sm">Coming soon.</p>
  </div>
);

export { SyncRunDetailClient };
