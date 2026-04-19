import type { ManagerDashboardView } from "@repo/availability";
import { ApprovalQueueCard } from "./approval-queue-card";
import { EmployeeView } from "./employee-view";
import { TeamThisWeekCard } from "./team-this-week-card";
import { TeamTodayCard } from "./team-today-card";
import { TeamXeroSyncFailedCard } from "./team-xero-sync-failed-card";
import { UpcomingPeaksCard } from "./upcoming-peaks-card";

interface ManagerViewProps {
  orgQueryValue: string | null;
  personId: string;
  view: ManagerDashboardView;
}

export function ManagerView({
  view,
  orgQueryValue,
  personId,
}: ManagerViewProps) {
  return (
    <div className="space-y-6">
      <EmployeeView
        orgQueryValue={orgQueryValue}
        personId={personId}
        view={view}
        xeroBannerHref="/settings/integrations"
      />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {view.header.hasActiveXeroConnection ? (
          <ApprovalQueueCard
            orgQueryValue={orgQueryValue}
            state={view.approvalQueue}
          />
        ) : null}
        <TeamTodayCard orgQueryValue={orgQueryValue} state={view.teamToday} />
        <TeamThisWeekCard
          orgQueryValue={orgQueryValue}
          state={view.teamThisWeek}
        />
        <UpcomingPeaksCard
          orgQueryValue={orgQueryValue}
          state={view.upcomingPeaks}
        />
        <TeamXeroSyncFailedCard
          orgQueryValue={orgQueryValue}
          state={view.teamXeroSyncFailed}
        />
      </div>
    </div>
  );
}
