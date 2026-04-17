import type { Metadata } from "next";
import { loadLeaveBalancesPageData } from "@/lib/server/load-leave-balances-page-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";

export const metadata: Metadata = {
  title: "Leave Balances — LeaveSync",
  description: "View and manage team member leave balances.",
};

interface LeaveBalancesPageProps {
  searchParams: Promise<{
    org?: string;
    personId?: string;
  }>;
}

const LeaveBalancesPage = async ({ searchParams }: LeaveBalancesPageProps) => {
  const { org, personId } = await searchParams;

  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(org);

  // Load leave balances
  const dataResult = await loadLeaveBalancesPageData(
    clerkOrgId,
    organisationId,
    personId ? { personId } : undefined
  );

  if (!dataResult.ok) {
    throw new Error(dataResult.error.message);
  }

  const { balances } = dataResult.value;

  return (
    <>
      <Header page="Leave Balances" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <div className="rounded-lg border border-muted">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted">
                <th className="px-4 py-3 text-left font-medium text-sm">
                  Person
                </th>
                <th className="px-4 py-3 text-left font-medium text-sm">
                  Leave Type
                </th>
                <th className="px-4 py-3 text-right font-medium text-sm">
                  Balance
                </th>
                <th className="px-4 py-3 text-left font-medium text-sm">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {balances.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                    colSpan={4}
                  >
                    No leave balances found
                  </td>
                </tr>
              ) : (
                balances.map((balance) => (
                  <tr className="border-b hover:bg-muted/50" key={balance.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">
                        {balance.personFirstName} {balance.personLastName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {balance.leaveTypeXeroId}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-sm">
                      {balance.balance.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {balance.updatedAt.toLocaleDateString()}
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

export default LeaveBalancesPage;
