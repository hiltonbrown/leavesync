import { Button } from "@repo/design-system/components/ui/button";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { withOrg } from "@/lib/navigation/org-url";
import { loadManualAvailabilityPageData } from "@/lib/server/load-manual-availability-page-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";

export const metadata: Metadata = {
  title: "Manual Availability — LeaveSync",
  description:
    "Create and manage manual availability records (WFH, travel, training).",
};

interface ManualAvailabilityPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const ManualAvailabilityPage = async ({
  searchParams,
}: ManualAvailabilityPageProps) => {
  const { org } = await searchParams;

  const { clerkOrgId, organisationId, orgQueryValue } =
    await requireActiveOrgPageContext(org);

  // Load manual availability records
  const dataResult = await loadManualAvailabilityPageData(
    clerkOrgId,
    organisationId,
    { includeArchived: false }
  );

  if (!dataResult.ok) {
    throw new Error(dataResult.error.message);
  }

  const { records } = dataResult.value;

  return (
    <>
      <Header page="Manual Availability" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        {/* Header with CTA */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Availability Records</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              {records.length} active record{records.length === 1 ? "" : "s"}
            </p>
          </div>
          <Link href={withOrg("/availability/new", orgQueryValue)}>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Record
            </Button>
          </Link>
        </div>

        {/* Records list */}
        <div className="rounded-lg border border-muted">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted">
                <th className="px-4 py-3 text-left font-medium text-sm">
                  Person
                </th>
                <th className="px-4 py-3 text-left font-medium text-sm">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-sm">
                  Date Range
                </th>
                <th className="px-4 py-3 text-left font-medium text-sm">
                  Title
                </th>
                <th className="px-4 py-3 text-left font-medium text-sm">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                    colSpan={6}
                  >
                    No manual availability records yet. Create one to get
                    started.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr className="border-b hover:bg-muted/50" key={record.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">
                        {record.personFirstName} {record.personLastName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{record.recordType}</td>
                    <td className="px-4 py-3 text-sm">
                      {record.startsAt.toLocaleDateString()} –{" "}
                      {record.endsAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">{record.title || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {record.approvalStatus}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="text-primary text-sm hover:underline"
                        href={withOrg(
                          `/availability/${record.id}/edit`,
                          orgQueryValue
                        )}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ManualAvailabilityPage;
