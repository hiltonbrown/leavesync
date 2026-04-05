import type { Metadata } from "next";
import { Header } from "../components/header";
import { PublicHolidaysClient } from "./public-holidays-client";

export const metadata: Metadata = {
  title: "Public Holidays — LeaveSync",
  description: "Browse public holidays by country and region.",
};

const PublicHolidaysPage = () => (
  <>
    <Header page="Public Holidays" />
    <div className="flex flex-1 flex-col p-6 pt-0">
      <PublicHolidaysClient />
    </div>
  </>
);

export default PublicHolidaysPage;
