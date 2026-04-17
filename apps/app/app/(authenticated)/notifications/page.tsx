import type { Metadata } from "next";
import { loadNotificationsData } from "@/lib/server/load-notifications-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";

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
  const { clerkOrgId } = await requireActiveOrgPageContext(org);
  const dataResult = await loadNotificationsData(clerkOrgId);

  if (!dataResult.ok) {
    throw new Error(dataResult.error.message);
  }

  const { notifications, unreadCount } = dataResult.value;

  return (
    <>
      <Header page="Notifications" />
      <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
        <div className="rounded-2xl bg-muted p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
                Inbox
              </p>
              <h2 className="mt-0.5 font-semibold text-foreground text-title-lg tracking-tight">
                {unreadCount} unread
              </h2>
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No notifications yet.
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <article
                  className="rounded-2xl bg-background p-4"
                  key={notification.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm">
                        {notification.type.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {formatPayload(notification.payload)}
                      </p>
                    </div>
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {notification.createdAt.toLocaleDateString("en-AU")}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsPage;

function formatPayload(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = record.message ?? record.title ?? record.description;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Review this operational notification.";
}
