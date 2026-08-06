import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { PricingExperience } from "./components/pricing-experience";

export const metadata: Metadata = createMetadata({
  description:
    "Team Calendar pricing for Xero Payroll teams. Compare Starter, Premium, and Enterprise plans for calendar availability publishing.",
  title: "Pricing",
});

const Pricing = () => <PricingExperience />;

export default Pricing;
