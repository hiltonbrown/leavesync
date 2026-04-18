import { listForOrganisation } from "@repo/availability";
import type { Metadata } from "next";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";
import { PublicHolidaysList } from "./public-holidays-list";

export const metadata: Metadata = {
  title: "Public Holidays — LeaveSync",
  description: "Manage public holidays for your organisation.",
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

  const holidaysResult = await listForOrganisation(clerkOrgId, organisationId);

  if (!holidaysResult.ok) {
    throw new Error(holidaysResult.error.message);
  }

  return (
    <>
      <Header page="Public Holidays" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <PublicHolidaysList holidays={holidaysResult.value} />
      </div>
    </>
  );
};

export default PublicHolidaysPage;
