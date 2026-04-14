import type { Metadata } from "next";
import { Header } from "../../components/header";
import { NewPlanClient } from "./new-plan-client";

export const metadata: Metadata = {
  title: "New Plan — LeaveSync",
  description: "Create a new draft plan.",
};

const NewPlanPage = () => (
  <>
    <Header page="New Plan" />
    <div className="flex flex-1 flex-col p-6 pt-0">
      <NewPlanClient />
    </div>
  </>
);

export default NewPlanPage;
