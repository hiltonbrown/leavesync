import { endOfUtcDay, startOfUtcDay, toDateOnly } from "@repo/core";
import {
  listAvailabilityForCalendar,
  listPeopleForOrganisation,
} from "@repo/database/src/queries";
import type { Metadata } from "next";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";
import { PeopleClient } from "./people-client";

export const metadata: Metadata = {
  title: "People — LeaveSync",
  description:
    "Team directory with real-time availability and calendar status.",
};

interface PeoplePageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const PeoplePage = async ({ searchParams }: PeoplePageProps) => {
  const { org } = await searchParams;

  const { clerkOrgId, organisationId, orgQueryValue } =
    await requireActiveOrgPageContext(org);

  // Load people and today's availability
  const today = toDateOnly(new Date());
  const todayStart = startOfUtcDay(today);
  const todayEnd = endOfUtcDay(today);

  const [peopleResult, availabilityResult] = await Promise.all([
    listPeopleForOrganisation(clerkOrgId, organisationId),
    listAvailabilityForCalendar(clerkOrgId, organisationId, {
      startDate: todayStart,
      endDate: todayEnd,
    }),
  ]);

  if (!peopleResult.ok) {
    throw new Error(peopleResult.error.message);
  }

  if (!availabilityResult.ok) {
    throw new Error(availabilityResult.error.message);
  }

  return (
    <>
      <Header page="People" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <PeopleClient
          orgQueryValue={orgQueryValue}
          people={peopleResult.value}
          todayAvailability={availabilityResult.value}
        />
      </div>
    </>
  );
};

export default PeoplePage;
