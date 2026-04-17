"use client";

interface SyncClientProps {
  hasXeroConnection: boolean;
  latestRun?: {
    completedAt: Date | null;
    entityType: string | null;
    id: string;
    recordsFailed: number;
    recordsSynced: number;
    startedAt: Date;
    status: string;
  } | null;
  recentAuditEvents?: Array<{
    action: string;
    actorUserId: string | null;
    createdAt: Date;
    id: string;
    payload: unknown;
    resourceId: string | null;
    resourceType: string;
  }>;
  recentRuns?: Array<{
    completedAt: Date | null;
    entityType: string | null;
    id: string;
    recordsFailed: number;
    recordsSynced: number;
    startedAt: Date;
    status: string;
  }>;
}

const SyncClient = ({
  hasXeroConnection,
  latestRun,
  recentRuns = [],
}: SyncClientProps) => (
  <div className="space-y-4 rounded-2xl bg-muted p-6">
    <div>
      <p className="font-medium text-sm">Sync status</p>
      <p className="mt-1 text-muted-foreground text-sm">
        Xero sync is disabled for the manual availability MVP.
      </p>
    </div>

    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      <div className="rounded-2xl bg-background p-4">
        <dt className="text-muted-foreground">Xero connection</dt>
        <dd className="mt-1 font-medium">
          {hasXeroConnection ? "Configured" : "Not connected"}
        </dd>
      </div>
      <div className="rounded-2xl bg-background p-4">
        <dt className="text-muted-foreground">Latest run</dt>
        <dd className="mt-1 font-medium">{latestRun?.status ?? "None"}</dd>
      </div>
      <div className="rounded-2xl bg-background p-4">
        <dt className="text-muted-foreground">Recent runs</dt>
        <dd className="mt-1 font-medium">{recentRuns.length}</dd>
      </div>
    </dl>
  </div>
);

export { SyncClient };
