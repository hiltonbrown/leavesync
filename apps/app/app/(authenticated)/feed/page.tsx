import type { Metadata } from "next";
import { Header } from "../components/header";
import { FeedClient } from "./feed-client";

export const metadata: Metadata = {
  title: "Feeds — LeaveSync",
  description:
    "Create and manage iCal calendar feeds for your team's leave and availability.",
};

const FeedPage = () => (
  <>
    <Header page="Feed" />
    <div className="flex flex-1 flex-col p-6 pt-0">
      <FeedClient />
    </div>
  </>
);

export default FeedPage;
