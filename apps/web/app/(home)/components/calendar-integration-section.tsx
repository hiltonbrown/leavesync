import Link from "next/link";
import { MarketingIcon } from "./marketing-icons";

const integrationPoints = [
  { status: "shipped" as const, text: "Connect Xero Payroll Australia." },
  {
    status: "planned" as const,
    text: "New Zealand and United Kingdom Xero Payroll support.",
  },
  {
    status: "shipped" as const,
    text: "Publish secure feeds for Outlook, Google Calendar, and Apple Calendar.",
  },
  {
    status: "shipped" as const,
    text: "Keep approved leave and manual availability in one calendar view.",
  },
];

export const CalendarIntegrationSection = () => (
  <section className="fmkt-integration-bridge" id="integrations">
    <div className="fmkt-container fmkt-integration-bridge__grid">
      <div>
        <h2 className="fmkt-section-title">
          Xero is the source. Calendars are where the team checks.
        </h2>
        <p className="fmkt-integration-bridge__lead">
          The full integration flow now lives in one place: what Team Calendar
          reads from Xero, what it writes back, and how secure ICS feeds reach
          the calendar apps your team already uses.
        </p>
      </div>
      <div className="fmkt-integration-bridge__panel">
        <ul>
          {integrationPoints.map((point) => (
            <li data-status={point.status} key={point.text}>
              {point.status === "shipped" ? (
                <MarketingIcon id="check" size={16} />
              ) : (
                <span className="fmkt-integration-bridge__badge">
                  Coming soon
                </span>
              )}
              <span>{point.text}</span>
            </li>
          ))}
        </ul>
        <Link
          className="marketing-btn marketing-btn--primary"
          href="/integrations"
        >
          View integrations
        </Link>
      </div>
    </div>
  </section>
);
