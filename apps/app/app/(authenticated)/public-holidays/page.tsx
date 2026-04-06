import type { Metadata } from "next";
import { getAvailableCountries } from "@/app/actions/holidays/get-countries";
import { Header } from "../components/header";
import { PublicHolidaysClient } from "./public-holidays-client";

export const metadata: Metadata = {
  title: "Public Holidays — LeaveSync",
  description: "Browse public holidays by country and region.",
};

const PublicHolidaysPage = async () => {
  const result = await getAvailableCountries();
  const countries = "data" in result ? result.data : [];

  return (
    <>
      <Header page="Public Holidays" />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <PublicHolidaysClient countries={countries} />
      </div>
    </>
  );
};

export default PublicHolidaysPage;
