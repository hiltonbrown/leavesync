import type { Metadata } from "next";
import { Header } from "../components/header";
import { CalendarClient } from "./calendar-client";

export const metadata: Metadata = {
  title: "Calendar — LeaveSync",
  description:
    "View team leave and availability as a calendar. Subscribe to keep it in sync with your calendar app.",
};

const CalendarPage = () => (
  <>
    <Header page="Calendar" />
    <div className="flex flex-1 flex-col gap-0 p-6 pt-0">
      <CalendarClient />
    </div>
  </>
);

export default CalendarPage;
