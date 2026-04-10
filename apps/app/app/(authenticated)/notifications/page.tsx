import { NotificationsFeed } from "@repo/notifications/components/feed";
import type { Metadata } from "next";
import { Header } from "../components/header";

export const metadata: Metadata = {
  title: "Notifications — LeaveSync",
  description: "View and manage your notifications.",
};

const NotificationsPage = () => {
  return (
    <>
      <Header page="Notifications" />
      <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
        <div className="rounded-2xl bg-muted p-6">
          <NotificationsFeed />
        </div>
      </div>
    </>
  );
};

export default NotificationsPage;
