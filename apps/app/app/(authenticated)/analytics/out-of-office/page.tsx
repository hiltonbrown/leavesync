import type { Metadata } from "next";
import { Header } from "../../components/header";
import { OooClient } from "./ooo-client";

export const metadata: Metadata = {
  title: "Out Of Office Reports — LeaveSync",
  description:
    "Team location and availability tracking: upcoming travel and work from home status.",
};

const OooReportsPage = () => (
  <>
    <Header page="Out of Office" />
    <div className="flex flex-1 flex-col p-6 pt-0">
      <OooClient />
    </div>
  </>
);

export default OooReportsPage;
