import type { Metadata } from "next";
import { Header } from "../components/header";
import { SyncClient } from "./sync-client";

export const metadata: Metadata = {
  title: "Sync Health — LeaveSync",
  description: "Monitor Xero synchronisation health.",
};

const SyncPage = () => (
  <>
    <Header page="Sync Health" />
    <div className="flex flex-1 flex-col p-6 pt-0">
      <SyncClient />
    </div>
  </>
);

export default SyncPage;
