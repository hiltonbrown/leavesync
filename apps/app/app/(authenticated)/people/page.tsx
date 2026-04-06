import type { Metadata } from "next";
import { Header } from "../components/header";
import { PeopleClient } from "./people-client";

export const metadata: Metadata = {
  title: "People — LeaveSync",
  description:
    "Team directory with real-time availability and calendar status.",
};

const PeoplePage = () => (
  <>
    <Header page="People" />
    <div className="flex flex-1 flex-col p-6 pt-0">
      <PeopleClient />
    </div>
  </>
);

export default PeoplePage;
