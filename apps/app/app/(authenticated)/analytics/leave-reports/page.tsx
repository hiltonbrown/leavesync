import type { Metadata } from "next";
import { Header } from "../../components/header";
import { LeaveClient } from "./leave-client";

export const metadata: Metadata = {
  title: "Leave Reports — LeaveSync",
  description:
    "Workforce leave analytics: absenteeism patterns, capacity risk, and policy compliance.",
};

const LeaveReportsPage = () => (
  <>
    <Header page="Leave Reports" />
    <div className="flex flex-1 flex-col p-6 pt-0">
      <LeaveClient />
    </div>
  </>
);

export default LeaveReportsPage;
