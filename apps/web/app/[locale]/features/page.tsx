import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { env } from "@/env";

export const metadata: Metadata = createMetadata({
  title: "LeaveSync — Features",
  description:
    "Every page of LeaveSync, from dashboard and planning through calendar feeds, approvals, sync health, and analytics.",
});

const signUpHref = env.NEXT_PUBLIC_APP_URL
  ? `${env.NEXT_PUBLIC_APP_URL}/sign-up`
  : "/";

const walkthroughHref = env.NEXT_PUBLIC_APP_URL
  ? `${env.NEXT_PUBLIC_APP_URL}/sign-up`
  : "/contact";

const iconPaths = {
  activity: <path d="M3 12h4l3-9 4 18 3-9h4" />,
  arrowUpRight: (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  calendar: (
    <>
      <rect height="16" rx="3" width="18" x="3" y="5" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  copy: (
    <>
      <rect height="12" rx="2.5" width="12" x="9" y="9" />
      <path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12" />
      <path d="m6 12 6 6 6-6" />
      <path d="M5 21h14" />
    </>
  ),
  filter: <path d="M3 5h18l-7 9v6l-4-2v-4z" />,
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
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66L11.5 7" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66L12.5 17" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  play: <path d="M7 5l13 7-13 7z" />,
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  shield: <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6z" />,
  sync: (
    <>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15" />
      <path d="M4 20v-5h5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 20V8" />
      <path d="m6 12 6-6 6 6" />
      <path d="M5 21h14" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.5-3.5 3.3-6 6.5-6s6 2.5 6.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 15c2.5 0 4.5 1.7 5 4" />
    </>
  ),
} as const;

type IconId = keyof typeof iconPaths;
type AvatarTone = "cream" | "ink" | "mauve" | "rose" | "sage" | "sky";

interface IconProps {
  readonly id: IconId;
  readonly size?: number;
  readonly stroke?: number;
}

interface AvatarProps {
  readonly initials: string;
  readonly size?: number;
  readonly tone?: AvatarTone;
}

interface FeatureBullet {
  readonly b: string;
  readonly t: string;
}

interface FeatureSection {
  readonly bullets: FeatureBullet[];
  readonly eyebrow: string;
  readonly flip?: boolean;
  readonly index: number;
  readonly mock: ReactNode;
  readonly summary: string;
  readonly title: string;
}

const heroSections = [
  "Dashboard",
  "My Plans",
  "Calendar",
  "Notifications",
  "People",
  "Calendar Feeds",
  "Leave Approvals",
  "Public Holidays",
  "Sync Health",
  "Leave Reports",
  "Out of Office",
] as const;

const Icon = ({ id, size = 20, stroke = 1.75 }: IconProps) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={stroke}
    viewBox="0 0 24 24"
    width={size}
  >
    {iconPaths[id]}
  </svg>
);

const Avatar = ({ initials, size = 32, tone = "sage" }: AvatarProps) => (
  <span
    className={`feature-avatar feature-avatar--${tone}`}
    style={{
      fontSize: Math.round(size * 0.36),
      height: size,
      width: size,
    }}
  >
    {initials}
  </span>
);

const FeaturesPage = () => (
  <main className="features-prototype">
    <FeaturesHero />
    {featureSections.map((section) => (
      <div key={section.eyebrow}>
        <div className="feat-divider-rule" />
        <FeatureBlock {...section} />
      </div>
    ))}
    <div className="features-prototype__pre-cta" />
    <FeaturesCTA />
  </main>
);

const FeaturesHero = () => (
  <section className="features-hero">
    <Image
      alt=""
      className="features-hero__botanical"
      height={400}
      src="/marketing/botanical-vine.svg"
      width={400}
    />
    <div className="features-hero__copy">
      <div className="feature-pill feature-pill--sage">
        <span className="feature-dot" />
        Eleven surfaces. One source of truth.
      </div>
      <h1>
        Every page of LeaveSync,
        <br />
        <span>doing one quiet job well.</span>
      </h1>
      <p>
        From the dashboard your team opens on Monday morning to the admin sync
        console nobody should have to look at, here is the whole product. Eleven
        surfaces, drawn from the live spec, in the order you would meet them.
      </p>
    </div>
    <div className="features-hero__chips">
      {heroSections.map((section, sectionIndex) => (
        <Link href={`#s${sectionIndex + 1}`} key={section}>
          <span className="feature-pill feature-pill--outline features-hero__chip">
            <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
            {section}
          </span>
        </Link>
      ))}
    </div>
  </section>
);

const FeatureBlock = ({
  index,
  eyebrow,
  title,
  summary,
  bullets,
  mock,
  flip = false,
}: FeatureSection) => (
  <section className="feat-section" id={`s${index}`}>
    <div className={flip ? "feat-grid feat-grid--flip" : "feat-grid"}>
      <div className="feat-mock">{mock}</div>
      <div className="feat-copy">
        <div className="feat-eyebrow">
          <span className="num">{String(index).padStart(2, "0")}</span>
          <span className="feat-eyebrow__rule" />
          {eyebrow}
        </div>
        <h2 className="feat-title">{title}</h2>
        <p className="feat-summary">{summary}</p>
        <ul className="feat-bullets">
          {bullets.map((bullet) => (
            <li key={bullet.t}>
              <Icon id="check" size={18} />
              <span>
                <strong>{bullet.t}.</strong> {bullet.b}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

const MockDashboard = () => {
  const stats = [
    { k: "Out today", s: "of 24", v: "4" },
    { k: "On leave", s: "incl. you Fri", v: "2" },
    { k: "Awaiting you", s: "requests", v: "3" },
  ];
  const people = [
    {
      i: "HW",
      kind: "Annual leave",
      n: "Hana Watanabe",
      t: "sage",
      until: "until Fri",
    },
    { i: "ML", kind: "WFH", n: "Marcus Lee", t: "mauve", until: "today" },
    {
      i: "EB",
      kind: "Travelling",
      n: "Esi Boateng",
      t: "cream",
      until: "Mel → Syd",
    },
  ] as const;

  return (
    <div className="feature-mock-card feature-mock-card--low">
      <div className="feature-row-between feature-mock-header">
        <div>
          <div className="feature-label muted">Tuesday 21 April</div>
          <div className="feature-mock-title">Good morning, Priya.</div>
        </div>
        <span className="feature-pill feature-pill--primary">Manager view</span>
      </div>

      <div className="feature-stat-grid">
        {stats.map((stat) => (
          <div className="feature-stat-card" key={stat.k}>
            <div className="feature-label muted tiny">{stat.k}</div>
            <div className="feature-num feature-num--small">{stat.v}</div>
            <div className="feature-small-copy">{stat.s}</div>
          </div>
        ))}
      </div>

      <div className="feature-panel">
        <div className="feature-row-between feature-gap-bottom">
          <div className="feature-label muted">Out today</div>
          <span className="feature-pill feature-pill--outline feature-pill--tiny">
            4 PEOPLE
          </span>
        </div>
        <div className="feature-stack">
          {people.map((person) => (
            <div className="feature-row-between" key={person.n}>
              <div className="feature-row">
                <Avatar
                  initials={person.i}
                  size={28}
                  tone={person.t as AvatarTone}
                />
                <span className="feature-body-strong">{person.n}</span>
              </div>
              <div className="feature-row feature-row--tight">
                <span className="feature-pill feature-pill--sage feature-pill--tiny">
                  {person.kind}
                </span>
                <span className="feature-small-copy">{person.until}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="feature-onboarding">
        <div>
          <div className="feature-label">Onboarding</div>
          <div className="feature-onboarding__copy">
            Connect Xero to import the last 90 days of leave.
          </div>
        </div>
        <button className="feature-btn feature-btn--inverse" type="button">
          CONNECT
        </button>
      </div>
    </div>
  );
};

const MockPlans = () => {
  const rows = [
    {
      d: "Mon 5 – Fri 9 May",
      d2: "5 days",
      s: "submitted",
      t: "Annual leave",
      tone: "primary",
    },
    { d: "Wed 14 May", d2: "1 day", s: "approved", t: "WFH", tone: "sage" },
    {
      d: "Mon 2 – Tue 3 Jun",
      d2: "2 days",
      s: "draft",
      t: "Training",
      tone: "outline",
    },
    {
      d: "Fri 12 Jun",
      d2: "1 day",
      s: "approved",
      t: "Travelling",
      tone: "sage",
    },
    {
      d: "Mon 14 Jul – Fri 25 Jul",
      d2: "10 days",
      s: "submitted",
      t: "Annual leave",
      tone: "primary",
    },
  ] as const;

  return (
    <div className="feature-window feature-scroll">
      <div className="feature-window__top">
        <div className="feature-row-between feature-window__bar">
          <div className="feature-row feature-row--tabs">
            <span className="feature-pill feature-pill--primary">
              My records
            </span>
            <span>Team records</span>
            <span>Archived</span>
          </div>
          <button className="feature-btn feature-btn--primary" type="button">
            <Icon id="plus" size={14} /> NEW PLAN
          </button>
        </div>
      </div>

      <div className="feature-filter-row">
        <span className="feature-pill feature-pill--outline">All types</span>
        <span className="feature-pill feature-pill--outline">
          <Icon id="filter" size={11} /> Status
        </span>
        <span className="feature-pill feature-pill--outline">2026</span>
        <span className="feature-pill feature-pill--sage">14 records</span>
      </div>

      <div className="feature-plan-list">
        {rows.map((row) => (
          <div className="feature-plan-row" key={`${row.d}-${row.t}`}>
            <div>
              <div className="feature-title-sm">{row.d}</div>
              <div className="feature-small-copy">{row.t}</div>
            </div>
            <div className="feature-small-copy">{row.d2}</div>
            <span
              className={`feature-pill feature-pill--${row.tone} feature-pill--tiny`}
            >
              {row.s}
            </span>
            <Icon id="chevronRight" size={16} stroke={1.5} />
          </div>
        ))}
      </div>
    </div>
  );
};

type CalendarTone = "primary" | "sage" | "slate";

const calendarToneBg: Record<CalendarTone, string> = {
  primary: "color-mix(in oklch, var(--primary-container) 65%, transparent)",
  sage: "var(--secondary-container)",
  slate: "var(--surface-container-highest)",
};

const calendarToneFg: Record<CalendarTone, string> = {
  primary: "var(--on-primary-container)",
  sage: "var(--on-secondary-container)",
  slate: "var(--on-surface)",
};

const MockCalendar = () => {
  const days = ["Mon 20", "Tue 21", "Wed 22", "Thu 23", "Fri 24"] as const;
  const people = [
    {
      cells: [{ label: "Annual leave", l: 5, s: 0, tone: "primary" }],
      i: "PM",
      n: "Priya M.",
      t: "mauve",
    },
    {
      cells: [{ label: "Annual leave", l: 5, s: 0, tone: "primary" }],
      i: "HW",
      n: "Hana W.",
      t: "sage",
    },
    {
      cells: [
        { label: "WFH", l: 1, s: 1, tone: "sage" },
        { label: "WFH", l: 1, s: 3, tone: "sage" },
      ],
      i: "ML",
      n: "Marcus L.",
      t: "mauve",
    },
    {
      cells: [{ label: "Travelling", l: 2, s: 0, tone: "slate" }],
      i: "EB",
      n: "Esi B.",
      t: "cream",
    },
    {
      cells: [{ label: "Training", l: 2, s: 2, tone: "sage" }],
      i: "TK",
      n: "Tom K.",
      t: "sky",
    },
    { cells: [], i: "RS", n: "Ravi S.", t: "rose" },
  ] as const;

  return (
    <div className="feature-window feature-calendar feature-scroll">
      <div className="feature-calendar__toolbar">
        <div className="feature-row feature-row--tight">
          <span className="feature-pill feature-pill--slate">Day</span>
          <span className="feature-pill feature-pill--primary">Week</span>
          <span className="feature-pill feature-pill--slate">Month</span>
        </div>
        <div className="feature-row">
          <span className="feature-title-md">20 – 24 April</span>
          <Icon id="chevronRight" size={16} />
        </div>
        <div className="feature-row feature-row--tight">
          <span className="feature-pill feature-pill--outline">
            Folder Creek
          </span>
          <span className="feature-pill feature-pill--outline">All types</span>
        </div>
      </div>

      <div className="feature-calendar__grid">
        <div className="feature-calendar__head">
          <div>Person</div>
          {days.map((day) => (
            <div className={day === "Tue 21" ? "is-active" : ""} key={day}>
              {day}
            </div>
          ))}
        </div>
        {people.map((person) => (
          <div className="feature-calendar__row" key={person.n}>
            <div className="feature-calendar__person">
              <Avatar
                initials={person.i}
                size={24}
                tone={person.t as AvatarTone}
              />
              <span>{person.n}</span>
            </div>
            {days.map((day) => (
              <div
                className="feature-calendar__cell"
                key={`${person.n}-${day}`}
              />
            ))}
            {person.cells.map((cell) => (
              <div
                className="feature-calendar__event"
                key={`${person.n}-${cell.label}-${cell.s}`}
                style={{
                  background: calendarToneBg[cell.tone as CalendarTone],
                  color: calendarToneFg[cell.tone as CalendarTone],
                  left: `calc(160px + ${cell.s} * (100% - 160px) / 5)`,
                  width: `calc(${cell.l} * (100% - 160px) / 5 - 6px)`,
                }}
              >
                {cell.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const MockNotifications = () => {
  const items = [
    {
      d: "Mon 5 – Fri 9 May. Awaiting your approval.",
      i: "leaf",
      t: "Hana Watanabe submitted annual leave",
      tone: "primary",
      unread: true,
      when: "2m",
    },
    {
      d: "Wed 14 May. Synced to calendars.",
      i: "check",
      t: "Marcus Lee approved your WFH",
      tone: "sage",
      unread: true,
      when: "1h",
    },
    {
      d: "14 records imported from the last run.",
      i: "sync",
      t: "Xero sync completed",
      tone: "slate",
      unread: false,
      when: "3h",
    },
    {
      d: "Mon 9 Jun. Auto-published to all feeds.",
      i: "bell",
      t: "Public holiday added — Kings Birthday",
      tone: "slate",
      unread: false,
      when: "1d",
    },
  ] as const;

  return (
    <div className="feature-window">
      <div className="feature-notifications__top">
        <div className="feature-row">
          <span className="feature-title-md">Notifications</span>
          <span className="feature-pill feature-pill--primary feature-pill--tiny">
            2 UNREAD
          </span>
        </div>
        <div className="feature-row feature-row--tight">
          <span className="feature-pill feature-pill--primary">Feed</span>
          <span className="feature-pill feature-pill--outline">
            Preferences
          </span>
        </div>
      </div>
      <div className="feature-notification-list">
        {items.map((item) => (
          <div className="feature-notification-row" key={item.t}>
            <span
              className={`feature-icon-disc feature-icon-disc--${item.tone}`}
            >
              <Icon id={item.i as IconId} size={16} />
            </span>
            <div>
              <div className="feature-title-sm feature-notification-title">
                {item.t}
                {item.unread && <span className="feature-unread-dot" />}
              </div>
              <div className="feature-small-copy">{item.d}</div>
            </div>
            <span className="feature-label muted">{item.when}</span>
          </div>
        ))}
      </div>
      <div className="feature-window__footer">
        <span>Mark all as read</span>
        <span>Settings →</span>
      </div>
    </div>
  );
};

const MockPeople = () => {
  const team = [
    {
      i: "HW",
      live: "Annual leave",
      loc: "Melbourne",
      n: "Hana Watanabe",
      role: "Head of People",
      t: "sage",
      tone: "primary",
      x: "linked",
    },
    {
      i: "ML",
      live: "WFH",
      loc: "Sydney",
      n: "Marcus Lee",
      role: "Senior Engineer",
      t: "mauve",
      tone: "sage",
      x: "linked",
    },
    {
      i: "EB",
      live: "Travelling",
      loc: "Melbourne",
      n: "Esi Boateng",
      role: "Operations Lead",
      t: "cream",
      tone: "slate",
      x: "linked",
    },
    {
      i: "TK",
      live: "In office",
      loc: "Auckland",
      n: "Tom Karangi",
      role: "Account Manager",
      t: "sky",
      tone: "outline",
      x: "pending",
    },
    {
      i: "RS",
      live: "In office",
      loc: "Sydney",
      n: "Ravi Sharma",
      role: "Product Designer",
      t: "rose",
      tone: "outline",
      x: "linked",
    },
  ] as const;

  return (
    <div className="feature-window feature-scroll">
      <div className="feature-people__top">
        <div className="feature-row feature-row--wrap">
          <div className="feature-search">
            <Icon id="search" size={14} />
            <span>Search 24 people</span>
          </div>
          <span className="feature-pill feature-pill--outline">
            Engineering
          </span>
          <span className="feature-pill feature-pill--outline">
            All locations
          </span>
        </div>
        <span className="feature-label muted">Page 1 / 3</span>
      </div>
      <div className="feature-people-table">
        <div className="feature-people-head">
          <span>Person</span>
          <span>Role</span>
          <span>Location</span>
          <span>Today</span>
          <span>Xero</span>
        </div>
        {team.map((person) => (
          <div className="feature-people-row" key={person.n}>
            <div className="feature-row">
              <Avatar
                initials={person.i}
                size={32}
                tone={person.t as AvatarTone}
              />
              <span className="feature-title-sm">{person.n}</span>
            </div>
            <span className="feature-small-copy">{person.role}</span>
            <span className="feature-row feature-row--tight feature-small-copy">
              <Icon id="mapPin" size={12} /> {person.loc}
            </span>
            <span
              className={`feature-pill feature-pill--${person.tone} feature-pill--tiny`}
            >
              {person.live}
            </span>
            <span
              className={
                person.x === "linked"
                  ? "feature-xero-state is-linked"
                  : "feature-xero-state"
              }
            >
              <span />
              {person.x}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockFeeds = () => {
  const feeds = [
    {
      name: "Whole org",
      privacy: "Names + types",
      scope: "All teams",
      status: "active",
      subs: 184,
    },
    {
      name: "Engineering",
      privacy: "Names + types",
      scope: "12 people",
      status: "active",
      subs: 47,
    },
    {
      name: "Engineering (busy)",
      privacy: "Busy only",
      scope: "12 people",
      status: "active",
      subs: 16,
    },
    {
      name: "Auckland office",
      privacy: "Names + types",
      scope: "Location",
      status: "paused",
      subs: 8,
    },
  ] as const;

  return (
    <div className="feature-mock-card feature-scroll">
      <div className="feature-row-between feature-mock-header">
        <div>
          <div className="feature-label muted">Calendar feeds</div>
          <div className="feature-mock-title">4 feeds, 255 subscribers</div>
        </div>
        <button className="feature-btn feature-btn--primary" type="button">
          <Icon id="plus" size={14} /> NEW FEED
        </button>
      </div>

      <div className="feature-feed-list">
        {feeds.map((feed) => (
          <div className="feature-feed-row" key={feed.name}>
            <div className="feature-row">
              <span className="feature-icon-square">
                <Icon id="link" size={16} />
              </span>
              <div>
                <div className="feature-title-sm">{feed.name}</div>
                <div className="feature-small-copy">{feed.scope}</div>
              </div>
            </div>
            <span className="feature-pill feature-pill--slate feature-pill--tiny">
              {feed.privacy}
            </span>
            <span className="feature-small-copy">{feed.subs} subscribers</span>
            <span
              className={`feature-pill feature-pill--${
                feed.status === "active" ? "sage" : "outline"
              } feature-pill--tiny`}
            >
              <span className="feature-dot" /> {feed.status}
            </span>
            <Icon id="copy" size={16} stroke={1.5} />
          </div>
        ))}
      </div>

      <div className="feature-help-note">
        <Icon id="shield" size={16} />
        <span>
          Subscribe URLs are signed and rotatable. Revoke any feed without
          breaking the others.
        </span>
      </div>
    </div>
  );
};

const MockApprovals = () => {
  const stats = [
    { k: "Awaiting", v: 7 },
    { k: "Approved", v: 23 },
    { k: "Declined", v: 1 },
    { k: "Failed sync", v: 1 },
  ];
  const rows = [
    {
      d: "Annual leave · Mon 5 – Fri 9 May (5 days)",
      i: "HW",
      n: "Hana Watanabe",
      sub: "Submitted 12 min ago",
      t: "sage",
    },
    {
      d: "Annual leave · Mon 14 – Fri 25 Jul (10 days)",
      i: "TK",
      n: "Tom Karangi",
      sub: "Submitted 1 h ago, retry needed",
      t: "sky",
    },
    {
      d: "WFH · Wed 14 May (1 day)",
      i: "RS",
      n: "Ravi Sharma",
      sub: "Submitted yesterday",
      t: "rose",
    },
  ] as const;

  return (
    <div className="feature-window feature-scroll">
      <div className="feature-approval-stats">
        {stats.map((stat) => (
          <div className="feature-stat-card" key={stat.k}>
            <div className="feature-label muted tiny">{stat.k}</div>
            <div className="feature-row feature-row--tight">
              <span className="feature-num feature-num--compact">{stat.v}</span>
              <span className="feature-pill feature-pill--outline feature-pill--tiny">
                this week
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="feature-filter-row feature-filter-row--split">
        <div className="feature-row feature-row--tight">
          <span className="feature-pill feature-pill--primary">Awaiting</span>
          <span className="feature-pill feature-pill--outline">All</span>
          <span className="feature-pill feature-pill--outline">Failed</span>
        </div>
        <span className="feature-label muted">Newest first</span>
      </div>

      {rows.map((row) => (
        <div className="feature-approval-row" key={row.n}>
          <Avatar initials={row.i} size={40} tone={row.t as AvatarTone} />
          <div>
            <div className="feature-title-sm">{row.n}</div>
            <div className="feature-small-copy">{row.d}</div>
            <div
              className={`feature-label ${
                row.n === "Tom Karangi" ? "danger" : "muted"
              }`}
            >
              {row.sub}
            </div>
          </div>
          <div className="feature-row feature-row--tight">
            {row.n === "Tom Karangi" ? (
              <button
                className="feature-btn feature-btn--secondary"
                type="button"
              >
                <Icon id="refresh" size={14} /> RETRY
              </button>
            ) : (
              <button
                className="feature-btn feature-btn--tertiary"
                type="button"
              >
                MORE INFO
              </button>
            )}
            <button className="feature-btn feature-btn--primary" type="button">
              APPROVE
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const MockHolidays = () => {
  const holidays = [
    {
      d: "Fri 25 Apr",
      loc: "AU · all",
      n: "Anzac Day",
      src: "imported",
      state: "active",
    },
    {
      d: "Mon 9 Jun",
      loc: "AU · all",
      n: "King's Birthday",
      src: "imported",
      state: "active",
    },
    {
      d: "Mon 6 Oct",
      loc: "AU · NSW",
      n: "Labour Day",
      src: "imported",
      state: "active",
    },
    {
      d: "Wed 24 Dec",
      loc: "All",
      n: "Office close (half)",
      src: "custom",
      state: "active",
    },
    {
      d: "Mon 27 Jan",
      loc: "AU · all",
      n: "Australia Day (obs)",
      src: "imported",
      state: "suppressed",
    },
  ] as const;

  return (
    <div className="feature-mock-card feature-scroll">
      <div className="feature-row-between feature-mock-header">
        <div>
          <div className="feature-label muted">Public holidays · 2026</div>
          <div className="feature-mock-title">14 holidays · AU + NZ</div>
        </div>
        <div className="feature-row feature-row--tight">
          <button className="feature-btn feature-btn--tertiary" type="button">
            <Icon id="upload" size={14} /> IMPORT
          </button>
          <button className="feature-btn feature-btn--primary" type="button">
            <Icon id="plus" size={14} /> CUSTOM
          </button>
        </div>
      </div>

      <div className="feature-holiday-head">
        <span>Date</span>
        <span>Holiday</span>
        <span>Location</span>
        <span>Source</span>
        <span>State</span>
      </div>
      <div className="feature-holiday-list">
        {holidays.map((holiday) => (
          <div
            className={
              holiday.state === "suppressed"
                ? "feature-holiday-row is-suppressed"
                : "feature-holiday-row"
            }
            key={`${holiday.d}-${holiday.n}`}
          >
            <span className="feature-title-sm">{holiday.d}</span>
            <span className="feature-body-strong">{holiday.n}</span>
            <span className="feature-small-copy">{holiday.loc}</span>
            <span
              className={`feature-pill feature-pill--${
                holiday.src === "imported" ? "slate" : "sage"
              } feature-pill--tiny`}
            >
              {holiday.src}
            </span>
            <span
              className={`feature-pill feature-pill--${
                holiday.state === "active" ? "primary" : "outline"
              } feature-pill--tiny`}
            >
              {holiday.state}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockSync = () => {
  const tenants = [
    {
      last: "2 min ago",
      n: "Folder Creek Pty Ltd",
      runs: 142,
      status: "healthy",
    },
    {
      last: "6 min ago",
      n: "North Harbour Group",
      runs: 312,
      status: "healthy",
    },
    { last: "1 h ago", n: "Oakline Studio", runs: 88, status: "warning" },
    { last: "4 h ago", n: "Mildura & Co", runs: 17, status: "failed" },
  ] as const;
  const bars = [12, 18, 14, 22, 19, 24, 21, 28, 26, 30, 27, 32].map(
    (height, index) => ({ height, id: `bar-${index}` })
  );

  return (
    <div className="feature-sync-card feature-scroll">
      <div className="feature-row-between feature-mock-header">
        <div>
          <div className="feature-label feature-label--inverse-muted">
            Sync health · admin
          </div>
          <div className="feature-mock-title inverse">
            4 tenants · 1 needs attention
          </div>
        </div>
        <button className="feature-btn feature-btn--primary" type="button">
          <Icon id="play" size={14} /> RUN ALL
        </button>
      </div>

      <div className="feature-sync-chart">
        <div className="feature-row-between feature-gap-bottom">
          <span className="feature-label feature-label--inverse-muted">
            Runs, last 12 hours
          </span>
          <span className="feature-label feature-label--success">
            ↑ 14% vs yesterday
          </span>
        </div>
        <div className="feature-bars">
          {bars.map((bar) => (
            <div
              className={bar.id === "bar-11" ? "is-latest" : ""}
              key={bar.id}
              style={{ height: bar.height * 2 }}
            />
          ))}
        </div>
      </div>

      <div className="feature-stack feature-stack--tight">
        {tenants.map((tenant) => (
          <div className="feature-sync-row" key={tenant.n}>
            <div className="feature-row">
              <span className={`feature-status-dot is-${tenant.status}`} />
              <span className="feature-title-sm inverse">{tenant.n}</span>
            </div>
            <span>Last run {tenant.last}</span>
            <span>{tenant.runs} runs</span>
            <button className="feature-text-button" type="button">
              VIEW
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockLeaveReports = () => {
  const months = [
    { label: "Jan", value: 22 },
    { label: "Feb", value: 18 },
    { label: "Mar", value: 26 },
    { label: "Apr", value: 31 },
    { label: "May", value: 28 },
    { label: "Jun", value: 24 },
    { label: "Jul", value: 38 },
    { label: "Aug", value: 41 },
    { label: "Sep", value: 29 },
  ];
  const stats = [
    { k: "Days taken", sub: "+12% YoY", v: "257" },
    { k: "Avg request", sub: "days", v: "3.2" },
    { k: "Outstanding", sub: "days accrued", v: "412" },
  ];
  const max = Math.max(...months.map((month) => month.value));

  return (
    <div className="feature-mock-card">
      <div className="feature-row-between feature-mock-header">
        <div>
          <div className="feature-label muted">Leave reports · YTD 2026</div>
          <div className="feature-mock-title">Approved leave, by month</div>
        </div>
        <button className="feature-btn feature-btn--tertiary" type="button">
          <Icon id="download" size={14} /> EXPORT CSV
        </button>
      </div>

      <div className="feature-stat-grid">
        {stats.map((stat) => (
          <div
            className="feature-stat-card feature-stat-card--lowest"
            key={stat.k}
          >
            <div className="feature-label muted tiny">{stat.k}</div>
            <div className="feature-num feature-num--small">{stat.v}</div>
            <div className="feature-small-copy">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="feature-report-chart">
        <div className="feature-row-between feature-gap-bottom">
          <span className="feature-label muted">Days, by month</span>
          <div className="feature-row feature-report-legend">
            <span className="feature-row feature-row--legend">
              <span className="is-annual" />
              Annual
            </span>
            <span className="feature-row feature-row--legend">
              <span className="is-other" />
              Other
            </span>
          </div>
        </div>
        <div className="feature-month-bars">
          {months.map((month) => (
            <div className="feature-month-bar" key={month.label}>
              <div style={{ height: `${(month.value / max) * 100}%` }}>
                <div className="is-other" />
                <div className="is-annual" />
              </div>
              <span>{month.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MockOOO = () => {
  const breakdown = [
    { c: "var(--primary)", k: "WFH", v: 188 },
    { c: "var(--secondary)", k: "Travelling", v: 64 },
    { c: "var(--primary-container)", k: "Training", v: 28 },
    { c: "var(--surface-container-highest)", k: "Client site", v: 21 },
  ];
  const total = breakdown.reduce((sum, item) => sum + item.v, 0);
  let accumulatedDash = 0;

  return (
    <div className="feature-mock-card feature-mock-card--lowest">
      <div className="feature-row-between feature-mock-header">
        <div>
          <div className="feature-label muted">Out of office · YTD 2026</div>
          <div className="feature-mock-title">301 approved records</div>
        </div>
        <button className="feature-btn feature-btn--tertiary" type="button">
          <Icon id="download" size={14} /> EXPORT
        </button>
      </div>

      <div className="feature-ooo-grid">
        <div className="feature-donut">
          <svg
            aria-hidden="true"
            focusable="false"
            height="220"
            style={{ transform: "rotate(-90deg)" }}
            viewBox="0 0 100 100"
            width="220"
          >
            {breakdown.map((item) => {
              const dash = (item.v / total) * 251.2;
              const offset = -accumulatedDash;
              accumulatedDash += dash;
              return (
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  key={item.k}
                  r="40"
                  stroke={item.c}
                  strokeDasharray={`${dash} 251.2`}
                  strokeDashoffset={offset}
                  strokeWidth="14"
                />
              );
            })}
          </svg>
          <div>
            <div className="feature-num">{total}</div>
            <div className="feature-label muted tiny">total days</div>
          </div>
        </div>

        <div className="feature-stack">
          {breakdown.map((item) => (
            <div className="feature-breakdown-row" key={item.k}>
              <span style={{ background: item.c }} />
              <span className="feature-title-sm">{item.k}</span>
              <span className="feature-small-copy">
                {Math.round((item.v / total) * 100)}%
              </span>
              <span className="feature-title-sm">{item.v}d</span>
            </div>
          ))}
          <div className="feature-insight">
            WFH overtook in-office mid-March. Drill in to see who, where, when.
          </div>
        </div>
      </div>
    </div>
  );
};

const FeaturesCTA = () => (
  <section className="feat-section features-cta-section">
    <div className="features-cta">
      <Image
        alt=""
        className="features-cta__botanical"
        height={400}
        src="/marketing/botanical-vine.svg"
        width={400}
      />
      <div className="features-cta__copy">
        <div className="feature-label features-cta__label">
          Eleven surfaces. One install.
        </div>
        <h2>Connect Xero this afternoon. See the dashboard tomorrow.</h2>
        <p>
          Trial Premium for 14 days. We import the last 90 days of approved
          leave so the calendars look real from day one.
        </p>
        <div className="features-cta__actions">
          <Link className="feature-btn feature-btn--primary" href={signUpHref}>
            START FREE TRIAL
          </Link>
          <Link
            className="feature-btn feature-btn--tertiary feature-btn--inverse-copy"
            href={walkthroughHref}
          >
            BOOK A WALKTHROUGH <Icon id="arrowUpRight" size={14} />
          </Link>
        </div>
      </div>
      <div className="features-cta__icons">
        {(
          [
            "home",
            "calendar",
            "users",
            "link",
            "bell",
            "sync",
            "leaf",
            "shield",
          ] as const
        ).map((icon) => (
          <span key={icon}>
            <Icon id={icon} size={20} />
          </span>
        ))}
      </div>
    </div>
  </section>
);

const featureSections: FeatureSection[] = [
  {
    bullets: [
      {
        b: "Three layouts derived from the same data, no extra configuration.",
        t: "Role aware",
      },
      {
        b: "Live availability for the people you actually work with.",
        t: "Out today",
      },
      {
        b: "Connect Xero, invite your team, set the first holidays. Dismissible the moment they are done.",
        t: "Quiet onboarding",
      },
    ],
    eyebrow: "Dashboard",
    index: 1,
    mock: <MockDashboard />,
    title: "A first screen that already knows the answer.",
    summary:
      "The dashboard reshapes itself by role. Staff see their next leave and any onboarding nudges; managers see what is awaiting them and who is out today; admins see sync health at a glance.",
  },
  {
    bullets: [
      {
        b: "Two scopes, one workspace. Permission-aware.",
        t: "My records and team records",
      },
      {
        b: "Every state transition is reversible until it is approved.",
        t: "Submit, withdraw, restore",
      },
      {
        b: "WFH, travelling, training, on-site. The record types your team actually has.",
        t: "Manual availability",
      },
    ],
    eyebrow: "My Plans · /plans",
    flip: true,
    index: 2,
    mock: <MockPlans />,
    title: "A planning workspace that stays out of the way.",
    summary:
      "Draft, submit, withdraw, archive, and restore leave or manual availability records. Toggle between your own records and the team view when you have permission to see both.",
  },
  {
    bullets: [
      {
        b: "Day for detail, week for planning, month for overview.",
        t: "Three densities",
      },
      {
        b: "Self, team, person, or location. Permissions enforced server side.",
        t: "Scope switcher",
      },
      {
        b: "Each record type has its own surface tone. No legends to memorise.",
        t: "Tonal blocks, not stripes",
      },
    ],
    eyebrow: "Calendar · /calendar",
    index: 3,
    mock: <MockCalendar />,
    title: "Day, week, month. Always the right scope.",
    summary:
      "Approved leave, manual availability, and public holidays in one tonal calendar. Switch scope between yourself, a team, a person, or a location, and filter by record type when the grid gets busy.",
  },
  {
    bullets: [
      {
        b: "Catch up after a week off without scrolling forever.",
        t: "Unread filters",
      },
      {
        b: "Per-event toggles, paired across both channels.",
        t: "In-app and email controls",
      },
      {
        b: "A single action, not a multi-step menu.",
        t: "Mark all as read",
      },
    ],
    eyebrow: "Notifications · /notifications",
    flip: true,
    index: 4,
    mock: <MockNotifications />,
    title: "A live feed, with a quiet preferences twin.",
    summary:
      "In-app events arrive in a chronological feed with unread filtering and one-click mark-as-read. The preferences tab beside it is where you decide what reaches your inbox and what stays in the app.",
  },
  {
    bullets: [
      {
        b: "In office, on leave, WFH, travelling. Read at a glance.",
        t: "Live availability",
      },
      {
        b: "Linked, pending, or unlinked. Shown on every row.",
        t: "Xero link state",
      },
      {
        b: "The two cuts you actually use, made first-class.",
        t: "Team and location filters",
      },
    ],
    eyebrow: "People · /people",
    index: 5,
    mock: <MockPeople />,
    title: "A directory that already knows who is around.",
    summary:
      "Every person, with team and location context, today's live availability, and a clear indicator of whether their Xero link is healthy. Filter, paginate, and drill into individuals without losing the list.",
  },
  {
    bullets: [
      {
        b: "Two privacy modes per feed. Mix as your culture allows.",
        t: "Names or busy only",
      },
      {
        b: "Revoke a feed without breaking any of the others.",
        t: "Signed and rotatable",
      },
      {
        b: "Copy-pasteable instructions for every common calendar.",
        t: "Subscribe in three clicks",
      },
    ],
    eyebrow: "Calendar Feeds · /feed",
    flip: true,
    index: 6,
    mock: <MockFeeds />,
    title: "ICS feeds your people subscribe to once.",
    summary:
      "Create and manage signed ICS subscriptions, with a privacy toggle between names-and-types and busy-only. Filter by status, copy the URL, rotate when needed. Subscribe guidance for Outlook, Google, and Apple is built in.",
  },
  {
    bullets: [
      {
        b: "The primary action is large. The rest are tucked away.",
        t: "Approve in one tap",
      },
      {
        b: "Xero outages do not become your problem.",
        t: "Retry failed writes",
      },
      {
        b: "A change of heart is a button, not a database query.",
        t: "Revert when needed",
      },
    ],
    eyebrow: "Leave Approvals · /leave-approvals",
    index: 7,
    mock: <MockApprovals />,
    title: "A review queue that respects your morning.",
    summary:
      "Summary counts at the top, the awaiting queue beneath. Approve, decline, request more info, or revert a decision. Failed payroll writes surface here too, with a one-click retry instead of a support ticket.",
  },
  {
    bullets: [
      {
        b: "Pre-built lists for AU, NZ, UK, and more.",
        t: "Import sources",
      },
      {
        b: "Christmas Eve half-day, all-hands offsite, anything you observe.",
        t: "Custom days",
      },
      {
        b: "Reverse a decision next year without re-importing.",
        t: "Suppress, do not delete",
      },
    ],
    eyebrow: "Public Holidays · /public-holidays",
    flip: true,
    index: 8,
    mock: <MockHolidays />,
    title: "The calendar your office actually keeps.",
    summary:
      "Import the holidays your tenants observe, add custom days for office closures, and suppress the ones that do not apply. Filter by year and location so you only see the ones that affect this office.",
  },
  {
    bullets: [
      {
        b: "Healthy, warning, failed, with last-run timestamps.",
        t: "Per-tenant status",
      },
      {
        b: "Twelve hours of activity at a glance, twelve weeks on demand.",
        t: "Run history",
      },
      {
        b: "Sync or reconcile any tenant without leaving the console.",
        t: "Manual dispatch",
      },
    ],
    eyebrow: "Sync Health · /sync",
    index: 9,
    mock: <MockSync />,
    title: "An admin console you visit on quiet weeks.",
    summary:
      "Monitor Xero sync health across every connected tenant. View run history, filter by status, and dispatch a manual sync or reconciliation when a tenant needs a nudge. Built for the people who fix things before anyone notices.",
  },
  {
    bullets: [
      {
        b: "The two comparisons leadership keeps asking for.",
        t: "Year-to-date and YoY",
      },
      {
        b: "Every chart segment is a list of approved entries.",
        t: "Drill into records",
      },
      {
        b: "Real columns, real dates, no Excel surprises.",
        t: "CSV that opens cleanly",
      },
    ],
    eyebrow: "Leave Reports · /analytics/leave-reports",
    flip: true,
    index: 10,
    mock: <MockLeaveReports />,
    title: "Approved leave, ready to read.",
    summary:
      "Summary stats on top, a stacked monthly chart in the middle, the underlying records one click away. Filter by date range, team, or location, then export the slice you need as CSV for whoever needs it next.",
  },
  {
    bullets: [
      {
        b: "The non-leave records that fill the gap between the calendar and reality.",
        t: "Beyond leave",
      },
      {
        b: "By team, by location, by month, with the percentages already worked out.",
        t: "Cuts that matter",
      },
      {
        b: "The pattern from leave reports, applied to the rest.",
        t: "Same export, same drill-down",
      },
    ],
    eyebrow: "Out of Office · /analytics/out-of-office",
    index: 11,
    mock: <MockOOO />,
    title: "The shape of how your team actually works.",
    summary:
      "WFH, travelling, training, and client site work, broken down by team, location, and time. Use it to plan office days, justify travel budgets, or simply notice the patterns that have crept in over the year.",
  },
];

export default FeaturesPage;
