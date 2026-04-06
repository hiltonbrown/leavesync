import type { Metadata } from "next";
import { getAvailableCountries } from "@/app/actions/holidays/get-countries";
import { HolidaysClient } from "./holidays-client";

export const metadata: Metadata = {
  title: "Public Holidays — Settings — LeaveSync",
  description: "Configure public holiday jurisdictions for your organisation.",
};

const HolidaysPage = async () => {
  const result = await getAvailableCountries();
  const countries = "data" in result ? result.data : [];

  // OrganisationHolidaySetting table not yet in DB — start with empty
  return <HolidaysClient countries={countries} enabledJurisdictions={[]} />;
};

export default HolidaysPage;
