import type { Metadata } from "next";
import { loadManualAvailabilityPageData } from "@/lib/server/load-manual-availability-page-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";
import { PlansClient } from "./plans-client";

export const metadata: Metadata = {
  title: "My Plans — LeaveSync",
  description: "Plan your leave, time off, and availability across calendars.",
};

interface MyPlansPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const MyPlansPage = async ({ searchParams }: MyPlansPageProps) => {
  const { org } = await searchParams;
  const { clerkOrgId, organisationId, orgQueryValue } =
    await requireActiveOrgPageContext(org);

  const dataResult = await loadManualAvailabilityPageData(
    clerkOrgId,
    organisationId,
    { includeArchived: false }
  );

  if (!dataResult.ok) {
    throw new Error(dataResult.error.message);
  }

  return (
    <>
      <Header page="My Plans" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <PlansClient
          initialRecords={dataResult.value.records}
          organisationId={organisationId}
          orgQueryValue={orgQueryValue}
          people={dataResult.value.people}
        />
      </div>
    </>
  );
};

export default MyPlansPage;
