import type { Metadata } from "next";
import { Header } from "../components/header";
import { WorkspacesClient } from "./workspaces-client";

export const metadata: Metadata = {
  title: "Workspaces — LeaveSync",
  description: "Select or create a workspace.",
};

const WorkspacesPage = () => (
  <>
    <Header page="Workspaces" />
    <div className="flex flex-1 flex-col p-6 pt-0">
      <WorkspacesClient />
    </div>
  </>
);

export default WorkspacesPage;
