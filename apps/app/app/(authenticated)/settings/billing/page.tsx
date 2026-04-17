import type { Metadata } from "next";
import { BillingClient } from "./billing-client";

export const metadata: Metadata = {
  title: "Billing — Settings — LeaveSync",
  description: "Manage your plan, usage, and billing history.",
};

const BillingPage = async () => {
  const usage: Array<{ label: string; limit: number | null; used: number }> =
    [];

  return (
    <BillingClient
      invoices={[]}
      planName="Free"
      planPrice={null}
      renewalDate={null}
      usage={usage}
    />
  );
};

export default BillingPage;
