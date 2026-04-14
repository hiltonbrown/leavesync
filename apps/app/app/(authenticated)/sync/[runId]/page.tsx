import type { Metadata } from "next";
import { Header } from "../../components/header";
import { SyncRunDetailClient } from "./sync-run-detail-client";

export const metadata: Metadata = {
  title: "Sync Run Detail — LeaveSync",
  description: "View details of a synchronisation run.",
};

interface SyncRunDetailPageProperties {
  readonly params: Promise<{ runId: string }>;
}

const SyncRunDetailPage = async ({
  params,
}: SyncRunDetailPageProperties) => {
  const { runId } = await params;

  return (
    <>
      <Header page="Sync Run Detail" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <SyncRunDetailClient runId={runId} />
      </div>
    </>
  );
};

export default SyncRunDetailPage;
