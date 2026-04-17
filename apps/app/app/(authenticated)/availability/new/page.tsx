import type { Metadata } from "next";
import { loadManualAvailabilityPageData } from "@/lib/server/load-manual-availability-page-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../../components/header";
import { ManualAvailabilityForm } from "../manual-availability-form";

export const metadata: Metadata = {
  title: "New Availability — LeaveSync",
  description: "Create a new manual availability record.",
};

interface NewAvailabilityPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const NewAvailabilityPage = async ({
  searchParams,
}: NewAvailabilityPageProps) => {
  const { org } = await searchParams;

  const { clerkOrgId, organisationId, orgQueryValue } =
    await requireActiveOrgPageContext(org);

  // Load people for the form
  const dataResult = await loadManualAvailabilityPageData(
    clerkOrgId,
    organisationId
  );

  if (!dataResult.ok) {
    throw new Error(dataResult.error.message);
  }

  const { people } = dataResult.value;

  return (
    <>
      <Header page="New Availability" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <div className="max-w-2xl rounded-2xl bg-muted p-6">
          <h2 className="mb-4 font-semibold text-lg">
            Create Availability Record
          </h2>
          <p className="mb-6 text-muted-foreground text-sm">
            Add a new manual availability record (WFH, travel, training, etc).
          </p>

          <div className="rounded-2xl bg-background p-5">
            <ManualAvailabilityForm
              mode="create"
              organisationId={organisationId}
              orgQueryValue={orgQueryValue}
              people={people}
              redirectTo="/availability"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default NewAvailabilityPage;
