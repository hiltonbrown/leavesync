import type { Metadata } from "next";
import { loadSyncHealthData } from "@/lib/server/load-sync-health-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { Header } from "../components/header";
import { SyncClient } from "./sync-client";

export const metadata: Metadata = {
  title: "Sync Health — LeaveSync",
  description: "Monitor Xero synchronisation health.",
};

interface SyncPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const SyncPage = async ({ searchParams }: SyncPageProps) => {
  const { org } = await searchParams;

  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(org);

  // Load sync health data
  const dataResult = await loadSyncHealthData(clerkOrgId, organisationId);

  if (!dataResult.ok) {
    throw new Error(dataResult.error.message);
  }

  const { latestRun, recentRuns, recentAuditEvents, hasXeroConnection } =
    dataResult.value;

  return (
    <>
      <Header page="Sync Health" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <SyncClient
          hasXeroConnection={hasXeroConnection}
          latestRun={latestRun}
          recentAuditEvents={recentAuditEvents}
          recentRuns={recentRuns}
        />
      </div>
    </>
  );
};

export default SyncPage;
