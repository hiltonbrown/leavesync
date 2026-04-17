import {
  listFeedsForOrganisation,
  listPeopleForOrganisation,
} from "@repo/database/src/queries";
import type { Metadata } from "next";
import { getAvailableCountries } from "@/app/actions/holidays/get-countries";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";
import { PublicHolidaysClient } from "./public-holidays-client";

export const metadata: Metadata = {
  title: "Public Holidays — LeaveSync",
  description: "Browse public holidays by country and region.",
};

interface PublicHolidaysPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const PublicHolidaysPage = async ({
  searchParams,
}: PublicHolidaysPageProps) => {
  const { org } = await searchParams;
  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(org);

  const [result, feedsResult, peopleResult] = await Promise.all([
    getAvailableCountries(),
    listFeedsForOrganisation(clerkOrgId, organisationId),
    listPeopleForOrganisation(clerkOrgId, organisationId),
  ]);
  const countries = "data" in result ? result.data : [];

  if (!feedsResult.ok) {
    throw new Error(feedsResult.error.message);
  }

  if (!peopleResult.ok) {
    throw new Error(peopleResult.error.message);
  }

  const feeds = feedsResult.value.map((feed) => ({
    description: `Calendar feed: ${feed.slug}`,
    id: feed.id,
    name: feed.name,
    personCount: peopleResult.value.length,
    status:
      feed.status === "paused" ? ("paused" as const) : ("active" as const),
  }));

  return (
    <>
      <Header page="Public Holidays" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <PublicHolidaysClient
          countries={countries}
          feeds={feeds}
          organisationId={organisationId}
        />
      </div>
    </>
  );
};

export default PublicHolidaysPage;
