import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadAvailabilityRecordDetailData } from "@/lib/server/load-availability-record-detail-data";
import { loadManualAvailabilityPageData } from "@/lib/server/load-manual-availability-page-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../../../components/header";
import { ManualAvailabilityForm } from "../../manual-availability-form";

export const metadata: Metadata = {
  title: "Edit Availability — LeaveSync",
  description: "Edit a manual availability record.",
};

interface EditAvailabilityPageProps {
  params: Promise<{
    recordId: string;
  }>;
  searchParams: Promise<{
    org?: string;
  }>;
}

const EditAvailabilityPage = async ({
  params,
  searchParams,
}: EditAvailabilityPageProps) => {
  const { recordId } = await params;
  const { org } = await searchParams;

  const { clerkOrgId, organisationId, orgQueryValue } =
    await requireActiveOrgPageContext(org);

  // Load record detail (will error if not found or not editable)
  const recordResult = await loadAvailabilityRecordDetailData(
    clerkOrgId,
    organisationId,
    recordId
  );

  if (!recordResult.ok) {
    if (recordResult.error.code === "forbidden") {
      // Record is Xero-sourced, show read-only view
      return (
        <>
          <Header page="View Availability" />
          <div className="flex flex-1 flex-col p-6 pt-0">
            <div className="rounded-lg border border-destructive bg-destructive/5 p-6">
              <p className="font-medium text-destructive text-sm">
                This is a Xero-synced record and cannot be edited. Xero-synced
                records reflect your official leave data. To make changes,
                please update the record in Xero.
              </p>
            </div>
          </div>
        </>
      );
    }
    return notFound();
  }

  // Load people for the form
  const peopleResult = await loadManualAvailabilityPageData(
    clerkOrgId,
    organisationId
  );

  if (!peopleResult.ok) {
    throw new Error(peopleResult.error.message);
  }

  const { record } = recordResult.value;

  return (
    <>
      <Header page="Edit Availability" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <div className="max-w-2xl rounded-2xl bg-muted p-6">
          <h2 className="mb-4 font-semibold text-lg">
            Edit Availability Record
          </h2>
          <p className="mb-6 text-muted-foreground text-sm">
            Update the details below and click save when done.
          </p>

          <div className="rounded-2xl bg-background p-5">
            <ManualAvailabilityForm
              mode="edit"
              organisationId={organisationId}
              orgQueryValue={orgQueryValue}
              people={peopleResult.value.people}
              record={{
                allDay: record.allDay,
                contactability: normaliseContactability(record.contactability),
                endsAt: toDateInputValue(record.endsAt),
                id: record.id,
                includeInFeed: record.includeInFeed,
                notesInternal: record.notesInternal ?? "",
                personId: record.personId,
                privacyMode: normalisePrivacyMode(record.privacyMode),
                recordType: normaliseRecordType(record.recordType),
                startsAt: toDateInputValue(record.startsAt),
                title: record.title ?? "",
                workingLocation: record.workingLocation ?? "",
              }}
              redirectTo="/availability"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default EditAvailabilityPage;

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normaliseContactability(
  value: string
): "contactable" | "limited" | "unavailable" {
  switch (value) {
    case "limited":
    case "unavailable":
    case "contactable":
      return value;
    default:
      return "contactable";
  }
}

function normalisePrivacyMode(value: string): "masked" | "named" | "private" {
  switch (value) {
    case "masked":
    case "private":
    case "named":
      return value;
    default:
      return "named";
  }
}

function normaliseRecordType(
  value: string
): "client_site" | "leave" | "training" | "travel" | "wfh" {
  switch (value) {
    case "client_site":
    case "leave":
    case "training":
    case "travel":
    case "wfh":
      return value;
    default:
      return "wfh";
  }
}
