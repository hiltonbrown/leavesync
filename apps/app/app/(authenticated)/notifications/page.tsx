import type { Metadata } from "next";
import { loadNotificationsData } from "@/lib/server/load-notifications-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";
import { NotificationsClient } from "./notifications-client";

export const metadata: Metadata = {
  title: "Notifications — LeaveSync",
  description: "View and manage your notifications.",
};

interface NotificationsPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const NotificationsPage = async ({ searchParams }: NotificationsPageProps) => {
  const { org } = await searchParams;
  const { clerkOrgId, orgQueryValue } = await requireActiveOrgPageContext(org);
  const dataResult = await loadNotificationsData(clerkOrgId);

  if (!dataResult.ok) {
    throw new Error(dataResult.error.message);
  }

  const { notifications, preferences, unreadCount } = dataResult.value;

  return (
    <>
      <Header page="Notifications" />
      <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
        <NotificationsClient
          notifications={notifications.map((notification) => ({
            ...notification,
            createdAt: notification.createdAt.toISOString(),
          }))}
          orgQueryValue={orgQueryValue}
          preferences={preferences}
          unreadCount={unreadCount}
        />
      </div>
    </>
  );
};

export default NotificationsPage;
