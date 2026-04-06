import type { Metadata } from "next";
import { IntegrationsClient } from "./integrations-client";

export const metadata: Metadata = {
  title: "Integrations — Settings — LeaveSync",
  description:
    "Connect your payroll and HR systems to sync leave data into LeaveSync.",
};

const IntegrationsPage = async () => {
  // ProviderConnection table not yet in DB schema — pass empty array.
  // All four provider cards render with "Not connected" status.
  return <IntegrationsClient connections={[]} />;
};

export default IntegrationsPage;
