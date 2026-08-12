import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { PricingExperience } from "./components/pricing-experience";

// Pricing content depends on NEXT_PUBLIC_LAUNCH_MODE at runtime.
// Static prerendering fails when the env var is unavailable at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = createMetadata({
  description:
    "Team Calendar pricing for Xero Payroll teams. Compare Starter, Premium, and Enterprise plans for calendar availability publishing.",
  title: "Pricing",
});

const Pricing = () => <PricingExperience />;

export default Pricing;
