import type { EmployeeDashboardView } from "@repo/availability";
import { ActionItemsCard } from "./action-items-card";
import { BalancesCard } from "./balances-card";
import { DashboardHeader } from "./dashboard-header";
import { DashboardLayout } from "./dashboard-layout";
import { NextPublicHolidayCard } from "./next-public-holiday-card";
import { QuickActionsCard } from "./quick-actions-card";
import { TodayStatusCard } from "./today-status-card";
import { UpcomingRecordsCard } from "./upcoming-records-card";
import { XeroDisconnectedBanner } from "./xero-disconnected-banner";

interface EmployeeViewProps {
  orgQueryValue: string | null;
  personId: string;
  showXeroBanner?: boolean;
  view: EmployeeDashboardView;
  xeroBannerHref?: string;
}

export function EmployeeView({
  view,
  orgQueryValue,
  personId,
  showXeroBanner = true,
  xeroBannerHref = "/settings/integrations",
}: EmployeeViewProps) {
  return (
    <div className="space-y-6">
      <DashboardHeader
        name={`${view.header.firstName} ${view.header.lastName}`}
        roleLabel={view.header.roleLabel}
        subtitle={
          view.header.locationName
            ? `${view.header.locationName}${view.header.timezone ? `, ${view.header.timezone}` : ""}`
            : "Your dashboard summary"
        }
        xeroConnected={view.header.hasActiveXeroConnection}
      />

      {showXeroBanner && !view.header.hasActiveXeroConnection ? (
        <XeroDisconnectedBanner
          connectHref={xeroBannerHref}
          orgQueryValue={orgQueryValue}
        />
      ) : null}

      <DashboardLayout>
        <ActionItemsCard
          orgQueryValue={orgQueryValue}
          state={view.actionItems}
        />
        <TodayStatusCard
          orgQueryValue={orgQueryValue}
          state={view.todayStatus}
        />
        <UpcomingRecordsCard
          orgQueryValue={orgQueryValue}
          state={view.upcoming}
        />
        <NextPublicHolidayCard
          orgQueryValue={orgQueryValue}
          state={view.publicHolidays}
        />
        <QuickActionsCard orgQueryValue={orgQueryValue} />
        {view.header.hasActiveXeroConnection ? (
          <BalancesCard
            orgQueryValue={orgQueryValue}
            personId={personId}
            state={view.balances}
          />
        ) : null}
      </DashboardLayout>
    </div>
  );
}
