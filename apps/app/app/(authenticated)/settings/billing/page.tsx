import type { Metadata } from "next";
import { BillingClient } from "./billing-client";

export const metadata: Metadata = {
  title: "Billing — Settings — LeaveSync",
  description: "Manage your plan, usage, and billing history.",
};

const BillingPage = async () => {
  // Billing is not yet wired to a TenantSubscription DB table or Stripe customer.
  // Render the free-plan state with placeholder usage meters.
  const usage = [
    { label: "Employees", used: 0, limit: 5 },
    { label: "Connections", used: 0, limit: 1 },
    { label: "Feeds", used: 0, limit: 2 },
  ];

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
