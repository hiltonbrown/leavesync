import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { env } from "@/env";
import { CursorDepthGrid } from "./components/cursor-depth-grid";
import { MarketingProductSnapshot } from "./components/marketing-product-snapshot";

export const metadata: Metadata = createMetadata({
  title: "LeaveSync — Team availability, synchronised with Xero",
  description:
    "Streamlined calendar and leave management. Publish staff leave, travel and team availability to every Outlook, Google, and Apple calendar your organisation already uses.",
});

const signUpHref = env.NEXT_PUBLIC_APP_URL
  ? `${env.NEXT_PUBLIC_APP_URL}/sign-up`
  : "/";

interface Feature {
  body: string;
  icon: keyof typeof iconPaths;
  title: string;
}

interface PricingTier {
  featured?: boolean;
  features: string[];
  name: string;
  price: string;
  sub: string;
}

interface WorkflowStep {
  body: string;
  kicker: string;
  title: string;
}

const features: Feature[] = [
  {
    icon: "sync",
    title: "Secure calendar feed",
    body: "Calendar subscriptions per team, tag, or the whole organisation. View staff from Outlook, Google or Apple calendars.",
  },
  {
    icon: "leaf",
    title: "Next generation shared calendar",
    body: "Annual leave, working from home, travelling, training, on-site. Standardised into one availability layer your whole org can read.",
  },
  {
    icon: "link",
    title: "Staff, contractors & others included",
    body: "Customisable and extensible to cover staff, external contractors and others beyond payroll.",
  },
  {
    icon: "shield",
    title: "Privacy by design",
    body: "Feeds are revocable, never guessable and never indexed.",
  },
];

const pricingTiers: PricingTier[] = [
  {
    name: "Basic",
    price: "$9/month",
    sub: "Up to 10 people",
    features: [
      "Xero Payroll sync",
      "Single team calendar feed",
      "30-day history",
    ],
  },
  {
    name: "Premium",
    price: "$19/month",
    sub: "Up to 50 people",
    features: [
      "Everything in Basic",
      "Unlimited team calendar feeds",
      "1-year calendar history",
    ],
    featured: true,
  },
  {
    name: "Custom",
    price: "Talk to us",
    sub: "For 50+ people",
    features: [
      "Everything in Premium",
      "Dedicated environment",
      "Priority Support",
    ],
  },
];

const workflowSteps: WorkflowStep[] = [
  {
    kicker: "Capture",
    title: "Enter it once in LeaveSync.",
    body: "Add annual leave, travel or client site visits to the app as soon as plans change.",
  },
  {
    kicker: "Publish",
    title: "Update Outlook for the team.",
    body: "Details are automatically populated to team calendars in Outlook for the whole team.",
  },
  {
    kicker: "Sync",
    title: "Keep Xero ready.",
    body: "Annual leave is entered into Xero automatically, or prepared for approval when your workflow requires it.",
  },
];

const iconPaths = {
  sync: (
    <>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15" />
      <path d="M4 20v-5h5" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66L11.5 7" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66L12.5 17" />
    </>
  ),
  home: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16z" />
      <path d="M4 20l8-8" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  shield: <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6z" />,
  plane: <path d="M3 12l18-7-7 18-2-8-9-3z" />,
  briefcase: (
    <>
      <rect height="13" rx="2" width="18" x="3" y="7" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </>
  ),
  cake: (
    <>
      <path d="M4 20h16V12H4z" />
      <path d="M4 15c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1" />
      <path d="M12 3v5" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
} as const;

const Home = () => (
  <main className="marketing-home">
    <Hero />
    <WorkflowSection />
    <ImageShowcase />
    <FeatureSection />
    <PricingSection />
  </main>
);

const Hero = () => (
  <section className="marketing-hero">
    <CursorDepthGrid>
      <div>
        <div className="marketing-pill">
          <span aria-hidden="true" />
          Now syncing with Xero Payroll
        </div>
        <h1 className="marketing-hero__title">
          <span className="marketing-hero__title-wrap">
            <span className="marketing-hero__title-line">
              Team availability,
            </span>
          </span>
          <span className="marketing-hero__title-wrap">
            <span className="marketing-hero__title-line marketing-hero__title-line--2">
              synchronised with your calendar.
            </span>
          </span>
        </h1>
        <p className="marketing-hero__copy">
          Streamlined calendar and leave management. Publish staff leave, travel
          and team availability to every Outlook, Google, and Apple calendar
          your organisation already uses.
        </p>
        <div className="marketing-actions">
          <Link
            className="marketing-btn marketing-btn--primary"
            href={signUpHref}
          >
            START FREE TRIAL
          </Link>
          <Link
            className="marketing-btn marketing-btn--tertiary"
            href="/contact"
          >
            BOOK A WALKTHROUGH
            <MarketingIcon id="arrowUpRight" size={14} />
          </Link>
        </div>
      </div>

      <div className="marketing-portrait-wrap">
        <div className="marketing-portrait-backdrop" />
        <div className="marketing-portrait">
          <Image
            alt="A manager reviewing this week's team availability"
            height={1536}
            src="/marketing/hero_image.png"
            width={1024}
          />
        </div>
      </div>
    </CursorDepthGrid>

    <div className="marketing-snapshot-intro">
      <SectionIntro
        copy="No manual data entry in several places, no missed emails or text messages"
        eyebrow="The day to day"
        title="Better than a shared calendar."
      />
    </div>
    <MarketingProductSnapshot />
  </section>
);

const ImageShowcase = () => (
  <section className="marketing-section">
    <SectionIntro
      copy="The boring part is the point. Your calendar stays up to date automatically so you can stop chasing spreadsheets and manual updates."
      eyebrow="How it works"
      title={
        <>
          Staff leave and availability.
          <br />
          Published to calendars and synchronised to payroll.
        </>
      }
    />
    <div className="marketing-showcase-grid">
      <article className="marketing-image-card marketing-image-card--wide">
        <div className="marketing-image-card__copy">
          <p className="marketing-overline">01 · Plan the week</p>
          <h3>One view of the whole team.</h3>
          <p>
            Working from home, travelling, training or on leave. Everything
            available at a glance.
          </p>
        </div>
        <div className="marketing-image-card__media">
          <Image
            alt="Manager planning across team scenarios"
            height={1024}
            src="/marketing/week-planning.png"
            width={1536}
          />
        </div>
      </article>

      <article className="marketing-image-card marketing-image-card--sage">
        <div className="marketing-image-card__media">
          <Image
            alt="A team member on leave while the calendar stays in sync"
            height={1536}
            src="/marketing/approval-review.png"
            width={1024}
          />
        </div>
        <div className="marketing-image-card__copy">
          <p className="marketing-overline">
            02 · APPROVE AND REVIEW LEAVE REQUESTS
          </p>
          <h3>Already in your calendar.</h3>
          <p>No second system to update, no reminder to send.</p>
        </div>
      </article>
    </div>

    <article className="marketing-calendar-card">
      <div>
        <p className="marketing-overline">03 · Subscribed feeds</p>
        <h3>Team calendar</h3>
        <p>
          Outlook, Google, Apple and other iCal calendars.
          <br />
          Your team subscribe once and forget about it.
        </p>
        <div className="marketing-feed-tags">
          {["ICS", "Google", "Outlook", "Apple"].map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      <div className="marketing-calendar-card__media">
        <Image
          alt=""
          height={1024}
          src="/marketing/team-calendar.png"
          width={1536}
        />
      </div>
    </article>
  </section>
);

const WorkflowSection = () => (
  <section className="marketing-section marketing-workflow-section">
    <div className="marketing-workflow">
      <div className="marketing-workflow__intro">
        <p className="marketing-overline">Workflow</p>
        <h2>From request to calendar to payroll.</h2>
        <p>
          LeaveSync keeps the operational loop short: the team sees the plan,
          Outlook stays current and Xero gets the annual leave details it needs.
        </p>
      </div>
      <ol className="marketing-workflow__steps">
        {workflowSteps.map((step, index) => (
          <li key={step.title}>
            <div className="marketing-workflow__marker">
              {String(index + 1).padStart(2, "0")}
            </div>
            <p>{step.kicker}</p>
            <h3>{step.title}</h3>
            <span>{step.body}</span>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

const FeatureSection = () => (
  <section className="marketing-section">
    <div className="marketing-feature-grid">
      {features.map((feature) => (
        <MarketingCard key={feature.title}>
          <span className="marketing-feature-icon">
            <MarketingIcon id={feature.icon} size={22} />
          </span>
          <h3>{feature.title}</h3>
          <p>{feature.body}</p>
        </MarketingCard>
      ))}
    </div>
  </section>
);

const PricingSection = () => (
  <section className="marketing-section">
    <div className="marketing-pricing-heading">
      <p className="marketing-overline">Pricing</p>
      <h2>Fair and affordable pricing.</h2>
    </div>
    <div className="marketing-pricing-grid">
      {pricingTiers.map((tier) => (
        <article
          className={
            tier.featured
              ? "marketing-price-card marketing-price-card--featured"
              : "marketing-price-card"
          }
          key={tier.name}
        >
          {tier.featured && (
            <span className="marketing-price-badge">MOST TEAMS</span>
          )}
          <h3>{tier.name}</h3>
          <p className="marketing-price-card__price">{tier.price}</p>
          <p className="marketing-price-card__sub">{tier.sub}</p>
          <div className="marketing-price-card__features">
            {tier.features.map((feature) => (
              <div key={feature}>
                <MarketingIcon id="check" size={18} />
                {feature}
              </div>
            ))}
          </div>
          <Link
            className={
              tier.featured
                ? "marketing-btn marketing-btn--primary marketing-price-card__button"
                : "marketing-btn marketing-btn--outline marketing-price-card__button"
            }
            href={tier.price === "Talk to us" ? "/contact" : signUpHref}
          >
            {tier.price === "Talk to us" ? "CONTACT SALES" : "START TRIAL"}
          </Link>
        </article>
      ))}
    </div>
  </section>
);

const SectionIntro = ({
  copy,
  eyebrow,
  title,
}: {
  copy: string;
  eyebrow: string;
  title: ReactNode;
}) => (
  <div className="marketing-section-intro">
    <p className="marketing-overline">{eyebrow}</p>
    <h2>{title}</h2>
    <p>{copy}</p>
  </div>
);

const MarketingCard = ({
  children,
  tier = "container",
}: {
  children: ReactNode;
  tier?: "container" | "low";
}) => (
  <div className={`marketing-card marketing-card--${tier}`}>{children}</div>
);

const MarketingIcon = ({
  id,
  size = 20,
}: {
  id: keyof typeof iconPaths;
  size?: number;
}) => (
  <svg
    aria-hidden="true"
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.75"
    viewBox="0 0 24 24"
    width={size}
  >
    {iconPaths[id]}
  </svg>
);

export default Home;
