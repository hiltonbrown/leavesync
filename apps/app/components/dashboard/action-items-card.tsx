import type { EmployeeDashboardView } from "@repo/availability";
import Link from "next/link";
import { EmptyState } from "@/components/states/empty-state";
import { withOrg } from "@/lib/navigation/org-url";
import { DashboardCardError, DashboardCardShell } from "./dashboard-card-shell";
import { formatDateTime } from "./dashboard-format";

interface ActionItemsCardProps {
  orgQueryValue: string | null;
  state: EmployeeDashboardView["actionItems"];
}

export function ActionItemsCard({
  state,
  orgQueryValue,
}: ActionItemsCardProps) {
  if (state.status === "error") {
    return (
      <DashboardCardShell
        description="Items that need your attention"
        orgQueryValue={orgQueryValue}
        title="Action items"
      >
        <DashboardCardError entityName="action items" />
      </DashboardCardShell>
    );
  }

  const isEmpty =
    state.data.xeroSyncFailedRecords.length === 0 &&
    state.data.declinedRecords.length === 0 &&
    state.data.infoRequestedNotifications.length === 0;

  return (
    <DashboardCardShell
      description="Items that need your attention"
      orgQueryValue={orgQueryValue}
      title="Action items"
    >
      {isEmpty ? (
        <EmptyState
          description="Nothing needs your attention right now."
          title="All clear"
        />
      ) : (
        <div className="space-y-4 text-sm">
          {state.data.xeroSyncFailedRecords.map((record) => (
            <div key={record.recordId}>
              <p className="font-medium">Xero sync failed</p>
              <p className="text-muted-foreground">
                {record.recordType.replaceAll("_", " ")}
                {record.xeroWriteError ? `, ${record.xeroWriteError}` : ""}
              </p>
            </div>
          ))}
          {state.data.declinedRecords.map((record) => (
            <div key={record.recordId}>
              <p className="font-medium">Declined request</p>
              <p className="text-muted-foreground">
                {record.recordType.replaceAll("_", " ")}
                {record.declinedAt
                  ? `, ${formatDateTime(record.declinedAt)}`
                  : ""}
              </p>
            </div>
          ))}
          {state.data.infoRequestedNotifications.map((notification) => (
            <Link
              className="block"
              href={withOrg(
                notification.actionUrl ??
                  "/notifications?type=leave_info_requested&unreadOnly=true",
                orgQueryValue
              )}
              key={notification.notificationId}
            >
              <p className="font-medium">{notification.title}</p>
              <p className="text-muted-foreground">{notification.body}</p>
            </Link>
          ))}
        </div>
      )}
    </DashboardCardShell>
  );
}
