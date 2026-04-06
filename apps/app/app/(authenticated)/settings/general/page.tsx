import { auth, clerkClient } from "@repo/auth/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GeneralClient } from "./general-client";

export const metadata: Metadata = {
  title: "General — Settings — LeaveSync",
  description: "Manage organisation name, timezone, and locale settings.",
};

const GeneralPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/");
  }

  const clerk = await clerkClient();
  const org = await clerk.organizations.getOrganization({ organizationId: orgId });

  const meta = (org.publicMetadata ?? {}) as Record<string, unknown>;

  const timezone = typeof meta.timezone === "string" ? meta.timezone : "UTC";
  const locale = typeof meta.locale === "string" ? meta.locale : "en-AU";
  const fiscalYearStart =
    typeof meta.fiscalYearStart === "number" ? meta.fiscalYearStart : 7;

  return (
    <GeneralClient
      fiscalYearStart={fiscalYearStart}
      locale={locale}
      orgName={org.name}
      timezone={timezone}
    />
  );
};

export default GeneralPage;
