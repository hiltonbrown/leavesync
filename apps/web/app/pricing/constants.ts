/**
 * NOTE: If plans, features, or limits change in the database seed catalogue
 * (packages/database/src/seed/plans.ts), update these constants accordingly.
 */
export interface PlanCardDetails {
  readonly ctaHref: string;
  readonly ctaText: string;
  readonly description: string;
  readonly features: string[];
  readonly highlighted: boolean;
  readonly interval: string;
  readonly name: string;
  readonly price: string;
}

export const MARKETING_PLANS: readonly PlanCardDetails[] = [
  {
    ctaHref: "/sign-up",
    ctaText: "Get started",
    description: "For small teams starting with calendar publishing",
    features: [
      "1 Xero Payroll organisation",
      "Up to 2 calendar feeds",
      "Up to 10 user seats",
      "Manual availability entries",
      "Basic sync health dashboard",
    ],
    highlighted: false,
    interval: "mo",
    name: "Basic",
    price: "$19",
  },
  {
    ctaHref: "/sign-up",
    ctaText: "Get started",
    description: "For growing teams needing advanced coverage",
    features: [
      "2 Xero Payroll organisations",
      "Unlimited calendar feeds",
      "Up to 50 user seats",
      "Manual availability entries",
      "Advanced sync health dashboard",
      "Analytics & leave reports",
      "Priority support",
    ],
    highlighted: true,
    interval: "mo",
    name: "Premium",
    price: "$49",
  },
  {
    ctaHref: "#contact",
    ctaText: "Talk to us",
    description: "For multi-entity payroll and guided rollout support",
    features: [
      "Multiple Xero Payroll organisations",
      "Custom calendar feeds",
      "Unlimited user seats",
      "Manual availability entries",
      "Advanced sync health dashboard",
      "Implementation partner support",
      "Guided rollout & onboarding",
    ],
    highlighted: false,
    interval: "",
    name: "Enterprise",
    price: "Custom",
  },
] as const;
