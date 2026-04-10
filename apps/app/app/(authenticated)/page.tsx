import { ClipboardListIcon, LinkIcon, UserIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "./components/header";
import { LivingTimelineModule } from "./components/living-timeline-module";

export const metadata: Metadata = {
  title: "Dashboard — LeaveSync",
  description: "Overview of leave, availability, and sync status.",
};

// ─── Placeholder data ──────────────────────────────────────────────────────

const todayAbsences = [
  { name: "Priya Sharma" },
  { name: "Marcus Webb" },
  { name: "Aisha Okonkwo" },
  { name: "Tom Eriksson" },
];

const recentLeave = [
  {
    name: "Priya Sharma",
    type: "Annual Leave",
    from: "Apr 7",
    to: "Apr 11",
    status: "approved",
  },
  {
    name: "Marcus Webb",
    type: "Sick Leave",
    from: "Apr 5",
    to: "Apr 6",
    status: "approved",
  },
  {
    name: "Yuki Tanaka",
    type: "Annual Leave",
    from: "Apr 14",
    to: "Apr 18",
    status: "pending",
  },
  {
    name: "Aisha Okonkwo",
    type: "Parental Leave",
    from: "Apr 22",
    to: "Jun 30",
    status: "approved",
  },
  {
    name: "Elena Rossi",
    type: "Annual Leave",
    from: "May 2",
    to: "May 10",
    status: "approved",
  },
  {
    name: "Sofia Reyes",
    type: "Annual Leave",
    from: "May 15",
    to: "May 22",
    status: "pending",
  },
  {
    name: "Marcus Webb",
    type: "Annual Leave",
    from: "Jun 1",
    to: "Jun 5",
    status: "approved",
  },
  {
    name: "Tom Eriksson",
    type: "Sick Leave",
    from: "Jun 10",
    to: "Jun 11",
    status: "approved",
  },
  {
    name: "Priya Sharma",
    type: "Annual Leave",
    from: "Jun 15",
    to: "Jun 20",
    status: "pending",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

const Dashboard = () => (
  <>
    <Header page="Dashboard" />
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Row 1 — asymmetric hero + secondary stack */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="relative z-30 md:col-span-2">
          <LivingTimelineModule todayAbsences={todayAbsences} total={38} />
        </div>
        <div className="flex flex-col gap-4">
          <ActionModule
            ctaHref="/plans"
            ctaLabel="Review"
            icon={<ClipboardListIcon className="size-3.5" strokeWidth={1.75} />}
            label="Pending approvals"
            sub="awaiting review"
            value="2"
          />
          <ActionModule
            ctaHref="/feed"
            ctaLabel="Manage"
            icon={<LinkIcon className="size-3.5" strokeWidth={1.75} />}
            label="Active Calendar Feeds"
            sub="Last sync 3 min ago"
            value="6"
          />
        </div>
      </div>

      {/* Row 2 — full-width recent requests */}
      <RecentRequestsCard entries={recentLeave} />
    </div>
  </>
);

export default Dashboard;

// ─── Sub-components ─────────────────────────────────────────────────────────

interface ActionModuleProps {
  ctaHref: string;
  ctaLabel: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: string;
}

const ActionModule = ({
  ctaHref,
  ctaLabel,
  icon,
  label,
  sub,
  value,
}: ActionModuleProps) => (
  <div className="flex flex-1 flex-col gap-3 rounded-2xl bg-muted p-5">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <p className="font-medium text-label-sm uppercase tracking-widest">
        {label}
      </p>
    </div>
    <div>
      <p className="font-semibold text-foreground text-headline-md leading-none tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-label-md text-muted-foreground">{sub}</p>
    </div>
    <div className="mt-auto flex justify-end">
      <Link
        className="font-medium text-[0.8125rem] transition-opacity hover:opacity-70"
        href={ctaHref}
        style={{ color: "var(--primary)" }}
      >
        {ctaLabel} &rarr;
      </Link>
    </div>
  </div>
);

interface RecentRequestsCardProps {
  entries: {
    from: string;
    name: string;
    status: string;
    to: string;
    type: string;
  }[];
}

const RecentRequestsCard = ({ entries }: RecentRequestsCardProps) => (
  <div className="flex flex-col gap-5 rounded-2xl bg-muted p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-label-sm text-muted-foreground uppercase tracking-widest">
          Leave requests
        </p>
        <h2 className="mt-0.5 font-semibold text-foreground text-title-lg tracking-tight">
          Recent activity
        </h2>
      </div>
      <Link
        className="font-medium text-[0.8125rem] transition-opacity hover:opacity-70"
        href="/people"
        style={{ color: "var(--primary)" }}
      >
        View all &rarr;
      </Link>
    </div>

    <div className="flex flex-col gap-1">
      {entries.map((entry) => (
        <div
          className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-accent"
          key={`${entry.name}-${entry.from}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--secondary-container)" }}
            >
              <UserIcon
                className="size-3.5"
                strokeWidth={2}
                style={{ color: "var(--on-secondary-container)" }}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-[0.875rem] text-foreground leading-tight">
                {entry.name}
              </p>
              <p className="text-label-md text-muted-foreground">
                {entry.type} &middot; {entry.from} &ndash; {entry.to}
              </p>
            </div>
          </div>
          <StatusBadge status={entry.status} />
        </div>
      ))}
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const isApproved = status === "approved";
  return (
    <span
      className="shrink-0 rounded-xl px-2 py-0.5 font-medium text-label-sm"
      style={
        isApproved
          ? {
              background:
                "color-mix(in srgb, var(--primary-container) 20%, transparent)",
              color: "var(--primary)",
            }
          : {
              background:
                "color-mix(in srgb, var(--muted-foreground) 12%, transparent)",
              color: "var(--muted-foreground)",
            }
      }
    >
      {isApproved ? "Approved" : "Pending"}
    </span>
  );
};
