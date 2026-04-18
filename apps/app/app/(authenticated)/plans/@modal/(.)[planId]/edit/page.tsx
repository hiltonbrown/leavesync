import { notFound } from "next/navigation";
import { loadAvailabilityRecordDetailData } from "@/lib/server/load-availability-record-detail-data";
import { loadManualAvailabilityPageData } from "@/lib/server/load-manual-availability-page-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { InterceptingModalShell } from "../../../../../components/modals/intercepting-modal-shell";
import { EditPlanClient } from "./edit-plan-client";

interface EditPlanModalPageProperties {
  readonly params: Promise<{ planId: string }>;
  readonly searchParams: Promise<{ org?: string }>;
}

const EditPlanModalPage = async ({
  params,
  searchParams,
}: EditPlanModalPageProperties) => {
  const { planId } = await params;
  const { org } = await searchParams;

  const { clerkOrgId, organisationId, orgQueryValue } =
    await requireActiveOrgPageContext(org);

  const [recordResult, peopleResult] = await Promise.all([
    loadAvailabilityRecordDetailData(clerkOrgId, organisationId, planId),
    loadManualAvailabilityPageData(clerkOrgId, organisationId),
  ]);

  if (!recordResult.ok) {
    return notFound();
  }

  if (!peopleResult.ok) {
    throw new Error(peopleResult.error.message);
  }

  const { record } = recordResult.value;

  return (
    <InterceptingModalShell title="Edit availability">
      <EditPlanClient
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
      />
    </InterceptingModalShell>
  );
};

export default EditPlanModalPage;

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
