import type { Metadata } from "next";
import { Header } from "../components/header";
import { PlansClient } from "./plans-client";

export const metadata: Metadata = {
  title: "My Plans — LeaveSync",
  description: "Plan your leave, time off, and availability across calendars.",
};

const MyPlansPage = () => (
  <>
    <Header page="My Plans" />
    <div className="flex flex-1 flex-col p-6 pt-0">
      <PlansClient />
    </div>
  </>
);

export default MyPlansPage;
