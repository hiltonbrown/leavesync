import { auth, clerkClient } from "@repo/auth/server";
import { getOrganisationById } from "@repo/database/src/queries/organisations";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { GeneralClient } from "./general-client";

export const metadata: Metadata = {
  title: "General — Settings — LeaveSync",
  description: "Manage organisation name, timezone, and locale settings.",
};

interface GeneralPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const GeneralPage = async ({ searchParams }: GeneralPageProps) => {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/");
  }

  const { org: orgParam } = await searchParams;
  const { clerkOrgId, organisationId } =
    await requireActiveOrgPageContext(orgParam);
  const organisationResult = await getOrganisationById(
    clerkOrgId,
    organisationId
  );

  if (!organisationResult.ok) {
    throw new Error(organisationResult.error.message);
  }

  const clerk = await clerkClient();
  const org = await clerk.organizations.getOrganization({
    organizationId: orgId,
  });

  const meta = (org.publicMetadata ?? {}) as Record<string, unknown>;
  const organisation = organisationResult.value;

  const timezone =
    organisation.timezone ??
    (typeof meta.timezone === "string" ? meta.timezone : "UTC");
  const locale =
    organisation.locale ??
    (typeof meta.locale === "string" ? meta.locale : "en-AU");
  const fiscalYearStart =
    organisation.fiscalYearStart ??
    (typeof meta.fiscalYearStart === "number" ? meta.fiscalYearStart : 7);
  const reportingUnit =
    organisation.reportingUnit ??
    (typeof meta.reportingUnit === "string" ? meta.reportingUnit : "hours");
  const workingHoursPerDay =
    organisation.workingHoursPerDay ??
    (typeof meta.workingHoursPerDay === "number"
      ? meta.workingHoursPerDay
      : 7.6);

  return (
    <GeneralClient
      fiscalYearStart={fiscalYearStart}
      locale={locale}
      organisationId={organisationId}
      orgName={org.name}
      reportingUnit={reportingUnit}
      timezone={timezone}
      workingHoursPerDay={workingHoursPerDay}
    />
  );
};

export default GeneralPage;
