import { auth, currentUser } from "@repo/auth/server";
import { listFeeds, normaliseRole } from "@repo/feeds";
import type { Metadata } from "next";
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
  const [{ orgRole }, user] = await Promise.all([auth(), currentUser()]);
  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(org);

  const feedsResult = user
    ? await listFeeds({
        actingRole: normaliseRole(orgRole),
        actingUserId: user.id,
        clerkOrgId,
        organisationId,
      })
    : {
        ok: false as const,
        error: {
          code: "not_authorised" as const,
          message: "You must be signed in to view feeds.",
        },
      };

  if (!feedsResult.ok) {
    throw new Error(feedsResult.error.message);
  }

  return (
    <FeedsClient
      channels={[]}
      feeds={feedsResult.value.map((feed) => ({
        id: feed.id,
        name: feed.name,
        scope: feed.scopeSummary,
        status: feed.status === "paused" ? "paused" : "active",
        type: "ics",
        url: null,
      }))}
    />
  );
};

export default FeedsPage;
