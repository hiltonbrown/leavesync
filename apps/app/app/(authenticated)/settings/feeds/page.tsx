import type { Metadata } from "next";
import { loadFeedManagementData } from "@/lib/server/load-feed-management-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { FeedsClient } from "./feeds-client";

export const metadata: Metadata = {
  title: "Feeds & Publishing — Settings — LeaveSync",
  description:
    "Manage calendar feeds and notification channels for your organisation.",
};

interface FeedsPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const FeedsPage = async ({ searchParams }: FeedsPageProps) => {
  const { org } = await searchParams;
  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(org);

  const feedsResult = await loadFeedManagementData(clerkOrgId, organisationId);

  if (!feedsResult.ok) {
    throw new Error(feedsResult.error.message);
  }

  return (
    <FeedsClient
      channels={[]}
      feeds={feedsResult.value.feeds.map((feed) => ({
        id: feed.id,
        name: feed.name,
        scope: feed.scopeType.replaceAll("_", " "),
        status: feed.status === "paused" ? "paused" : "active",
        type: "ics",
        url: null,
      }))}
    />
  );
};

export default FeedsPage;
