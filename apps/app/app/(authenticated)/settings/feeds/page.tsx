import type { Metadata } from "next";
import { FeedsClient } from "./feeds-client";

export const metadata: Metadata = {
  title: "Feeds & Publishing — Settings — LeaveSync",
  description:
    "Manage calendar feeds and notification channels for your organisation.",
};

const FeedsPage = async () => {
  // CalendarFeed and NotificationChannel tables not yet in DB schema.
  return <FeedsClient channels={[]} feeds={[]} />;
};

export default FeedsPage;
