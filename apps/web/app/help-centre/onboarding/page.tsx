import { createMetadata } from "@repo/seo/metadata";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  FileCheck,
  Globe,
  Lock,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  supportEmail,
  supportHoursCompact,
  supportMailtoHref,
} from "@/src/data/support";

export const metadata: Metadata = createMetadata({
  description:
    "Complete step-by-step onboarding guide for closed AU Early Access on Team Calendar.",
  title: "AU Early Access Onboarding Guide - Help Centre",
});

const steps = [
  {
    copy: "Accept your invitation email or select your organisation from the organisation switcher in the top navigation bar. Every payroll entity, team member, and leave record belongs to a specific Clerk Organisation boundary.",
    icon: Building2,
    number: "1",
    title: "Join the correct Clerk Organisation",
  },
  {
    copy: "Navigate to Settings > Integrations > Xero. Click 'Connect Xero' to authenticate with your Xero Payroll Australia file. Grant access to your organisation. Note: Launch scope is Australian Xero Payroll only.",
    icon: Globe,
    number: "2",
    title: "Connect an Australian Xero organisation",
  },
  {
    copy: "Navigate to Sync to review initial inbound sync status. Verify that employee names, historical leave applications, and current leave balances have imported accurately from Xero Payroll.",
    icon: CheckCircle2,
    number: "3",
    title: "Confirm the first people, leave, and balance sync",
  },
  {
    copy: "In Settings > Members, assign roles (Owner, Admin, Manager, Member). In People, match unlinked Clerk users to Xero employee records so staff can submit leave and managers can review approvals.",
    icon: Users,
    number: "4",
    title: "Link people and assign manager roles",
  },
  {
    copy: "Staff submit leave from the top navigation CTA or Calendar page. Managers review pending requests in Leave Approvals. Approved leave writes back synchronously to Xero Payroll within 60 seconds; declines require a reason if configured.",
    icon: FileCheck,
    number: "5",
    title: "Submit, approve, and decline leave",
  },
  {
    copy: "Navigate to Feeds and click 'New Feed'. Select team or location filters and copy the secure ICS URL into Outlook, Google Calendar, or Apple Calendar. If a token is compromised, click 'Revoke Token' to invalidate it instantly.",
    icon: CalendarDays,
    number: "6",
    title: "Create and revoke calendar feeds",
  },
  {
    copy: "Configure feed privacy levels: Named (shows employee name and leave type), Masked (shows generic 'Out of Office'), or Private (shows simple 'Busy'). Sensitive leave details are never published unless configured by an admin.",
    icon: Lock,
    number: "7",
    title: "Understand privacy modes & visibility",
  },
  {
    copy: `If you observe a sync discrepancy, Xero write error, or privacy concern, email our support team immediately at ${supportEmail} with your organisation name and details. Business hours response target: ${supportHoursCompact}.`,
    icon: ShieldAlert,
    number: "8",
    title: "Reporting sync, payroll-write, or privacy incidents",
  },
];

const GuidedOnboardingPage = () => (
  <div className="fmkt-page marketing-simple">
    <header className="marketing-simple__hero">
      <div className="fmkt-container">
        <div className="marketing-simple__intro">
          <p className="marketing-simple__kicker">
            <Link className="underline" href="/help-centre">
              Help centre
            </Link>{" "}
            / Onboarding
          </p>
          <h1 className="marketing-simple__title">
            AU Early Access Guided Onboarding Guide
          </h1>
          <p className="marketing-simple__lead">
            Follow this 8-step guide to get your Australian team set up on Team
            Calendar with Xero Payroll, manager roles, and secure calendar
            feeds.
          </p>
        </div>
      </div>
    </header>

    <section className="marketing-simple__section">
      <div className="fmkt-container">
        <div className="space-y-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article
                className="marketing-simple__panel flex items-start gap-4"
                key={step.number}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {step.number}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-xl">{step.title}</h2>
                  </div>
                  <p className="marketing-simple__section-copy">{step.copy}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>

    <section className="marketing-simple__section marketing-simple__section--tonal">
      <div className="fmkt-container">
        <div className="marketing-simple__callout">
          <div className="marketing-simple__intro">
            <h2 className="marketing-simple__section-title">
              Need assistance with your setup?
            </h2>
            <p className="marketing-simple__section-copy">
              Our team provides direct guided setup for early access accounts.
              Contact us at{" "}
              <a className="marketing-simple__link" href={supportMailtoHref}>
                {supportEmail}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default GuidedOnboardingPage;
