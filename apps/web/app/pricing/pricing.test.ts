import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PricingPlans } from "./components/pricing-plans";

describe("Pricing components", () => {
  it("renders closed early-access card and canonical sign-up CTA in early_access mode", () => {
    vi.stubEnv("NEXT_PUBLIC_LAUNCH_MODE", "early_access");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.teamcalendar.online");

    const html = renderToStaticMarkup(React.createElement(PricingPlans));
    expect(html).toContain("Closed Early Access");
    expect(html).toContain("AU Early Access");
    expect(html).toContain("Early Access");
    expect(html).toContain("https://app.teamcalendar.online/sign-up");
    expect(html).not.toContain("$19");
    expect(html).not.toContain("$49");

    vi.unstubAllEnvs();
  });
});
