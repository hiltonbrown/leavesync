import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle,
  Clock,
  Link2,
  Lock,
  RefreshCw,
  Rss,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";

export const metadata: Metadata = createMetadata({
  title: "Features",
  description:
    "Leave submission, Xero Payroll sync, manual availability, ICS calendar feeds, and privacy controls. The full LeaveSync feature set.",
});

const featureSections = [
  {
    id: "submission-approval",
    label: "Leave submission and approval",
    heading: "A complete leave workflow, connected to Xero",
    description:
      "Employees submit leave requests inside LeaveSync. Managers approve or decline. Every decision writes back to Xero Payroll synchronously, so your payroll data is always current.",
    features: [
      {
        icon: UserCheck,
        title: "Employee leave submission",
        description:
          "Employees select leave type, dates, and notes, then submit for manager approval. Supported leave types are drawn directly from your Xero Payroll configuration.",
      },
      {
        icon: CheckCircle,
        title: "Manager approval and decline",
        description:
          "Managers review pending requests, approve, or decline with a reason. The decision writes back to Xero immediately, keeping payroll and availability in sync.",
      },
      {
        icon: RefreshCw,
        title: "Inbound Xero sync",
        description:
          "Leave approved directly in Xero is also synced into LeaveSync. There is no manual import step. Xero is the payroll source of truth.",
      },
      {
        icon: Clock,
        title: "Approval state machine",
        description:
          "Draft, submitted, approved, declined, and cancelled states are tracked with full audit history. No ambiguity about where a request stands.",
      },
    ],
  },
  {
    id: "xero-integration",
    label: "Xero Payroll integration",
    heading: "Designed exclusively for Xero Payroll",
    description:
      "LeaveSync connects to Xero Payroll via OAuth. It reads employee records and leave data, and writes leave submissions back when approved. Nothing else. Xero remains authoritative.",
    features: [
      {
        icon: Link2,
        title: "OAuth connection",
        description:
          "Authorise LeaveSync from your Xero account in minutes. No credentials are stored. Tokens are encrypted at rest and rotated proactively.",
      },
      {
        icon: Users,
        title: "Employee sync",
        description:
          "Employee records sync from Xero to LeaveSync. Name, employment type, and leave entitlements are kept current automatically.",
      },
      {
        icon: CalendarCheck,
        title: "AU, NZ, and UK payroll",
        description:
          "Xero Payroll Australia, New Zealand, and United Kingdom are each supported with their respective leave types and payroll structures handled correctly.",
      },
      {
        icon: RefreshCw,
        title: "Scheduled and on-demand sync",
        description:
          "Syncs run on a scheduled cadence and can also be triggered manually. Sync status and last-run metadata are visible in the admin panel.",
      },
    ],
  },
  {
    id: "availability",
    label: "Manual availability",
    heading: "More than just leave",
    description:
      "Alongside approved leave, employees can record manual availability entries. These appear in ICS feeds so managers always see the full picture, not just formal leave.",
    features: [
      {
        icon: CalendarDays,
        title: "WFH entries",
        description:
          "Mark days as working from home so managers and colleagues know where you are, without a leave request.",
      },
      {
        icon: CalendarDays,
        title: "Travelling",
        description:
          "Record travel dates for internal visibility. Useful for distributed teams and client-facing roles.",
      },
      {
        icon: CalendarDays,
        title: "Training",
        description:
          "Log training days or off-site learning events. They appear on the team feed so capacity planning stays accurate.",
      },
      {
        icon: CalendarDays,
        title: "Client site",
        description:
          "Indicate when you are working at a client location. All manual entries are distinct from payroll leave and do not write to Xero.",
      },
    ],
  },
  {
    id: "ics-feeds",
    label: "ICS calendar feeds",
    heading: "Availability in the calendar your team already uses",
    description:
      "LeaveSync publishes a secure ICS feed per person. Subscribe once in Outlook, Google Calendar, or Apple Calendar, and leave and availability data updates automatically.",
    features: [
      {
        icon: Rss,
        title: "Per-person feed URLs",
        description:
          "Each employee has a unique, signed feed URL. Feeds are scoped to that person's approved leave and manual availability entries.",
      },
      {
        icon: Lock,
        title: "Secure tokens",
        description:
          "Feed URLs are signed with a revocable token. If a URL is compromised, you can regenerate the token. Tokens are never stored in plaintext.",
      },
      {
        icon: Shield,
        title: "Privacy controls",
        description:
          "Configure which leave categories and availability types appear on published feeds. Sensitive categories can be hidden or shown as unavailable without detail.",
      },
      {
        icon: CalendarDays,
        title: "Outlook, Google, and Apple Calendar",
        description:
          "Feeds conform to the iCalendar standard (RFC 5545) and are compatible with all major calendar applications. No plugin or extension required.",
      },
    ],
  },
];

const FeaturesPage = () => (
  <div className="w-full">
    {/* Page header */}
    <div className="w-full bg-muted/50 py-20 lg:py-28">
      <div className="container mx-auto">
        <div className="flex flex-col gap-4 lg:max-w-2xl">
          <p className="font-medium text-primary text-sm uppercase tracking-widest">
            Features
          </p>
          <h1 className="font-semibold text-4xl tracking-tight md:text-6xl">
            Everything in one availability platform
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Leave submission and approval, Xero Payroll sync, manual
            availability, ICS calendar feeds, and privacy controls. All
            connected. All current.
          </p>
        </div>
      </div>
    </div>

    {/* Feature sections */}
    {featureSections.map((section, sectionIndex) => (
      <div
        className={`w-full py-20 lg:py-32 ${sectionIndex % 2 === 1 ? "bg-muted/30" : ""}`}
        id={section.id}
        key={section.id}
      >
        <div className="container mx-auto">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-3 lg:max-w-2xl">
              <p className="font-medium text-primary text-sm uppercase tracking-widest">
                {section.label}
              </p>
              <h2 className="font-semibold text-3xl tracking-tight md:text-4xl">
                {section.heading}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {section.description}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {section.features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    className="flex flex-col gap-4 rounded-2xl bg-background p-6"
                    key={feature.title}
                  >
                    <Icon
                      className="h-6 w-6 text-primary"
                      strokeWidth={1.5}
                    />
                    <div className="flex flex-col gap-2">
                      <h3 className="font-medium text-base">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default FeaturesPage;
