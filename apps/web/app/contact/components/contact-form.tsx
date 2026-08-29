"use client";

import { Check, Clock, Mail } from "lucide-react";
import { integrationCapabilities } from "../../integrations/capabilities";

const shippedRegionNames = integrationCapabilities.xeroPayrollRegions
  .filter((region) => region.status === "shipped")
  .map((region) => region.name);

const contactCopy = {
  benefits: [
    {
      description:
        "Connecting your Xero account takes minutes. We will walk you through the OAuth flow and first sync.",
      title: "Quick setup",
    },
    {
      description: `Our team understands Xero Payroll ${shippedRegionNames.join(" and ")}. We can help with region-specific leave configurations.`,
      title: "Xero expertise",
    },
    {
      description:
        "If something does not look right in your sync or feed, we will investigate and resolve it with you.",
      title: "Dedicated support",
    },
  ],
  description:
    "Talk to us about getting your Australian small business onto Team Calendar, connected to your Xero Payroll file.",
  title: "Get in touch",
};

export const ContactForm = () => (
  <div className="fmkt-page marketing-simple">
    <section className="marketing-simple__hero">
      <div className="fmkt-container">
        <div className="marketing-simple__grid marketing-simple__grid--two">
          <div className="marketing-simple__intro">
            <p className="marketing-simple__kicker">Contact</p>
            <h1 className="marketing-simple__title">{contactCopy.title}</h1>
            <p className="marketing-simple__lead">{contactCopy.description}</p>
            <div className="marketing-simple__section-copy">
              <ul className="marketing-simple__list">
                {contactCopy.benefits.map((benefit) => (
                  <li key={benefit.title}>
                    <Check size={16} strokeWidth={1.8} />
                    <span>
                      <strong>{benefit.title}</strong>
                      <br />
                      {benefit.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="marketing-simple__panel space-y-4">
            <h2 className="font-semibold text-xl">
              Early Access Contact & Support
            </h2>
            <p className="text-muted-foreground text-sm">
              Team Calendar is in closed early access for organisations using
              Xero Payroll {shippedRegionNames.join(" and ")}. Our team responds
              to all onboarding and technical enquiries directly.
            </p>

            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Support email:</span>
                <a
                  className="font-semibold text-primary text-sm underline"
                  href="mailto:support@teamcalendar.online"
                >
                  support@teamcalendar.online
                </a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Clock className="h-4 w-4" />
                <span>
                  Response hours: Monday – Friday, 9:00 AM – 5:00 PM AEST
                </span>
              </div>
            </div>

            <div className="space-y-1 text-muted-foreground text-xs">
              <p>
                <strong>Scope:</strong> Xero Payroll{" "}
                {shippedRegionNames.join(" and ")} only.
              </p>
              <p>
                <strong>Pricing:</strong> Confirmed with your organisation prior
                to any future paid billing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);
