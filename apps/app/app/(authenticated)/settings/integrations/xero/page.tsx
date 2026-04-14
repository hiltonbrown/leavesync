import type { Metadata } from "next";
import { Header } from "../../../components/header";
import { XeroClient } from "./xero-client";

export const metadata: Metadata = {
  title: "Xero Integration — LeaveSync",
  description: "Manage your Xero Payroll connection.",
};

const XeroPage = () => (
  <>
    <Header page="Xero Integration" />
    <div className="flex flex-1 flex-col p-6 pt-0">
      <XeroClient />
    </div>
  </>
);

export default XeroPage;
