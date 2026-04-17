import {
  listFeedsForOrganisation,
  listPeopleForOrganisation,
} from "@repo/database/src/queries";
import type { Metadata } from "next";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";
import { FeedClient } from "./feed-client";

export const metadata: Metadata = {
  title: "Feeds — LeaveSync",
  description:
    "Create and manage iCal calendar feeds for your team's leave and availability.",
};

interface FeedPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const FeedPage = async ({ searchParams }: FeedPageProps) => {
  const { org } = await searchParams;

  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(org);

  // Load feeds and people
  const [feedsResult, peopleResult] = await Promise.all([
    listFeedsForOrganisation(clerkOrgId, organisationId),
    listPeopleForOrganisation(clerkOrgId, organisationId),
  ]);

  if (!feedsResult.ok) {
    throw new Error(feedsResult.error.message);
  }

  if (!peopleResult.ok) {
    throw new Error(peopleResult.error.message);
  }

  return (
    <>
      <Header page="Feed" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <FeedClient
          initialFeeds={feedsResult.value}
          organisationId={organisationId}
          people={peopleResult.value}
        />
      </div>
    </>
  );
};

export default FeedPage;
