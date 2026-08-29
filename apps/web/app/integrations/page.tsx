import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingIcon } from "../(home)/components/marketing-icons";
import { integrationCapabilities } from "./capabilities";

export const metadata: Metadata = createMetadata({
  description:
    "How Team Calendar connects Xero Payroll to Outlook, Google Calendar, and Apple Calendar through secure calendar feeds.",
  title: "Integrations",
});

const regions = integrationCapabilities.xeroPayrollRegions.map((region) => ({
  ...region,
  detail:
    region.status === "shipped"
      ? "Annual leave, sick leave, long service leave, personal carer's leave, and public holidays."
      : "Planned for a future release.",
}));

const shippedRegionNames = integrationCapabilities.xeroPayrollRegions
  .filter((region) => region.status === "shipped")
  .map((region) => region.name);

const plannedRegionNames = integrationCapabilities.xeroPayrollRegions
  .filter((region) => region.status === "planned")
  .map((region) => region.name);

const flow = [
  {
    copy: "Employees, approved leave, and balances sync from your connected payroll file.",
    icon: "sync",
    label: "Source of truth",
    title: "Xero Payroll",
  },
  {
    copy: "Leave and manual entries are normalised into one privacy-controlled availability layer.",
    icon: "calendar",
    label: "Availability model",
    title: "Team Calendar",
  },
  {
    copy: "Secure ICS feeds subscribe into Outlook, Google Calendar, and Apple Calendar.",
    icon: "link",
    label: "Published view",
    title: "Calendar feeds",
  },
] as const;

const dataMoves = [
  {
    items: integrationCapabilities.inboundDataCategories.map(
      (category) => category.name
    ),
    title: "Reads from Xero",
  },
  {
    items: [
      "Leave applications submitted in Team Calendar",
      "Manager approval and decline decisions",
      "Leave application status updates",
    ],
    title: "Writes to Xero",
  },
  {
    items: [
      "Salary, banking, tax, or superannuation data",
      "Personal calendar contents",
    ],
    title: "Never reads",
  },
];

const setupSteps = [
  "Connect your organisation from Team Calendar settings.",
  "Authorise Team Calendar in Xero and choose the payroll file.",
  "Run the first sync for employees, leave, and balances.",
  "Publish secure feeds for teams, people, or locations.",
];

const destinationPresentation = {
  "apple-calendar": {
    copy: "Create a calendar subscription on macOS or iOS.",
    icon: "applecal",
  },
  "google-calendar": {
    copy: "Add the feed URL from calendar settings.",
    icon: "gcal",
  },
  outlook: {
    copy: "Subscribe from web in Microsoft 365 Calendar.",
    icon: "outlook",
  },
} as const;

const destinations = integrationCapabilities.calendarDestinations.map(
  (destination) => ({
    ...destination,
    ...destinationPresentation[destination.id],
  })
);

const syncDetails = [
  {
    copy: "Scheduled jobs keep employees, leave, balances, and approval state current for Australian Xero Payroll files.",
    title: "Inbound sync",
  },
  {
    copy: "Submitted, approved, declined, and withdrawn leave writes to Xero synchronously so payroll records stay correct.",
    title: "Write-back",
  },
  {
    copy: "Every feed is scoped, signed, and revocable. Team Calendar republishes after relevant changes; calendar clients refresh subscribed feeds on their own schedules.",
    title: "Feed publishing",
  },
];

const IntegrationsPage = () => (
  <main className="fmkt-page fmkt-integrations">
    <section className="fmkt-integrations__hero">
      <div className="fmkt-container">
        <p className="fmkt-overline">Integrations</p>
        <div className="fmkt-integrations__hero-grid">
          <div>
            <h1 className="fmkt-integrations__title">
              Xero Payroll to every calendar your team already uses.
            </h1>
            <p className="fmkt-integrations__lead">
              Connect your Xero Payroll file once, and Team Calendar keeps leave
              and availability flowing to the calendars your team already uses.
            </p>
            <p className="fmkt-integrations__copy">
              Team Calendar connects to Xero Payroll, turns approved leave and
              manual availability into one canonical view, then publishes it to
              Outlook, Google Calendar, and Apple Calendar through secure ICS
              feeds.
            </p>
            <div className="fmkt-integrations__actions">
              <Link
                className="marketing-btn marketing-btn--primary"
                href="/contact"
              >
                Talk to us
              </Link>
              <Link
                className="marketing-btn marketing-btn--tertiary"
                href="/security"
              >
                Review security
              </Link>
            </div>
          </div>

          <ol
            aria-label="Integration path from Xero Payroll to calendar feeds"
            className="fmkt-integrations__path"
          >
            {flow.map((item, index) => (
              <li className="fmkt-integrations__path-item" key={item.title}>
                <span className="fmkt-integrations__path-icon">
                  <MarketingIcon id={item.icon} size={20} />
                </span>
                <span className="fmkt-integrations__path-label">
                  {item.label}
                </span>
                <strong>{item.title}</strong>
                <p>{item.copy}</p>
                {index < flow.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="fmkt-integrations__path-line"
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>

    <section className="fmkt-integrations__section">
      <div className="fmkt-container fmkt-integrations__split">
        <div className="fmkt-section-header">
          <h2 className="fmkt-section-title">
            Australian Xero Payroll support at launch.
          </h2>
          <p className="fmkt-integrations__copy">
            Team Calendar currently supports Xero Payroll{" "}
            {shippedRegionNames.join(" and ")}.{" "}
            {plannedRegionNames.join(" and ")} support is planned for future
            releases.
          </p>
        </div>
        <div className="fmkt-integrations__region-list">
          {regions.map((region) => (
            <article className="fmkt-integrations__region" key={region.code}>
              <span>{region.code}</span>
              <div>
                <h3>{region.name}</h3>
                <p>{region.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="fmkt-integrations__section fmkt-integrations__section--tonal">
      <div className="fmkt-container">
        <div className="fmkt-integrations__compact-header">
          <h2 className="fmkt-section-title">What moves between systems.</h2>
          <p className="fmkt-integrations__copy">
            The connection is narrow by design. Team Calendar reads and writes
            payroll leave information, then publishes availability, not payroll
            records, into calendar clients.
          </p>
        </div>
        <div className="fmkt-integrations__data-grid">
          {dataMoves.map((group) => (
            <article
              className="fmkt-integrations__data-panel"
              key={group.title}
            >
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>
                    <MarketingIcon id="check" size={16} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="fmkt-integrations__section">
      <div className="fmkt-container fmkt-integrations__workflow">
        <div>
          <h2 className="fmkt-section-title">
            From first connect to live feeds.
          </h2>
          <p className="fmkt-integrations__copy">
            Setup follows the standard Xero OAuth flow. After authorisation,
            Team Calendar syncs source data, applies feed scope and privacy
            rules, and gives each calendar a secure subscription URL.
          </p>
        </div>
        <ol className="fmkt-integrations__steps">
          {setupSteps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>

    <section className="fmkt-integrations__section fmkt-integrations__section--tonal">
      <div className="fmkt-container fmkt-integrations__destination-grid">
        <div>
          <h2 className="fmkt-section-title">
            Subscribe once in the calendar app.
          </h2>
          <p className="fmkt-integrations__copy">
            Feeds work with common calendar clients because they publish
            standard ICS. Teams see approved leave, WFH, travel, training, and
            client-site entries without installing another calendar app.
          </p>
        </div>
        <div className="fmkt-integrations__destinations">
          {destinations.map((destination) => (
            <article
              className="fmkt-integrations__destination"
              key={destination.name}
            >
              <span>
                <MarketingIcon id={destination.icon} size={20} />
              </span>
              <div>
                <h3>{destination.name}</h3>
                <p>{destination.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="fmkt-integrations__section">
      <div className="fmkt-container">
        <div className="fmkt-integrations__sync-panel">
          <div className="fmkt-integrations__sync-heading">
            <span>
              <MarketingIcon id="shieldCheck" size={24} />
            </span>
            <div>
              <h2>Sync, tokens, and publication stay server-side.</h2>
              <p>
                OAuth tokens are encrypted at rest, feed tokens are signed and
                revocable, and raw Xero payloads stay out of client-side code.
              </p>
            </div>
          </div>
          <div className="fmkt-integrations__sync-list">
            {syncDetails.map((detail) => (
              <article key={detail.title}>
                <h3>{detail.title}</h3>
                <p>{detail.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  </main>
);

export default IntegrationsPage;
