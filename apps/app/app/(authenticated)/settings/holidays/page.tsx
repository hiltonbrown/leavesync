import { listForOrganisation } from "@repo/availability";
import type { Metadata } from "next";
import { requirePageRole } from "@/lib/auth/require-page-role";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { HolidaysClient } from "./holidays-client";

export const metadata: Metadata = {
  description: "Manage public holiday imports and custom holidays.",
  title: "Holidays - Settings - LeaveSync",
};

interface HolidaysPageProps {
  searchParams: Promise<{ org?: string }>;
}

const HolidaysPage = async ({ searchParams }: HolidaysPageProps) => {
  await requirePageRole("org:admin");
  const { org } = await searchParams;
  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(org);
  const holidaysResult = await listForOrganisation(clerkOrgId, organisationId);

  if (!holidaysResult.ok) {
    throw new Error(holidaysResult.error.message);
  }

  return (
    <HolidaysClient
      holidays={holidaysResult.value}
      organisationId={organisationId}
    />
  );
};

export default HolidaysPage;
