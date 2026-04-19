import type { ManagerDashboardView } from "@repo/availability";
import { EmptyState } from "@/components/states/empty-state";
import { DashboardCardError, DashboardCardShell } from "./dashboard-card-shell";
import { formatDate } from "./dashboard-format";

interface ApprovalQueueCardProps {
  orgQueryValue: string | null;
  state: ManagerDashboardView["approvalQueue"];
}

export function ApprovalQueueCard({
  state,
  orgQueryValue,
}: ApprovalQueueCardProps) {
  if (state.status === "error") {
    return (
      <DashboardCardShell
        ctaHref="/leave-approvals?status=submitted"
        ctaLabel="Review"
        description="Pending leave approvals"
        orgQueryValue={orgQueryValue}
        title="Approval queue"
      >
        <DashboardCardError entityName="approval queue" />
      </DashboardCardShell>
    );
  }

  const isEmpty = state.data.pendingCount === 0 && state.data.failedCount === 0;

  return (
    <DashboardCardShell
      ctaHref="/leave-approvals?status=submitted"
      ctaLabel="Review"
      description="Pending leave approvals"
      orgQueryValue={orgQueryValue}
      title="Approval queue"
    >
      {isEmpty ? (
        <EmptyState
          description="No team approvals are waiting right now."
          title="Queue is clear"
        />
      ) : (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground">Pending</p>
              <p className="font-semibold text-xl">{state.data.pendingCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Failed</p>
              <p className="font-semibold text-xl">{state.data.failedCount}</p>
            </div>
          </div>
          {state.data.mostRecent.map((record) => (
            <div key={record.recordId}>
              <p className="font-medium">
                {record.personFirstName} {record.personLastName}
              </p>
              <p className="text-muted-foreground">
                {record.recordType.replaceAll("_", " ")} from{" "}
                {formatDate(record.startsAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardCardShell>
  );
}
