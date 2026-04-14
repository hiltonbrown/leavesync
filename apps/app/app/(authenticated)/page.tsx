import { ClipboardListIcon, LinkIcon, UserIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "./components/header";
import { LivingTimelineModule } from "./components/living-timeline-module";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";
import { loadDashboardData } from "@/lib/server/load-dashboard-data";
import { toDateOnly } from "@repo/core";

export const metadata: Metadata = {
  title: "Dashboard — LeaveSync",
  description: "Overview of leave, availability, and sync status.",
};

interface DashboardPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const DashboardPage = async ({ searchParams }: DashboardPageProps) => {
  const { org } = await searchParams;

  // Step 1: Validate organisation context
  const contextResult = await getActiveOrgContext(org || "");

  if (!contextResult.ok) {
    return notFound();
  }

  const { clerkOrgId, organisationId } = contextResult.value;

  // Step 2: Load dashboard data
  const dataResult = await loadDashboardData(clerkOrgId, organisationId);

  if (!dataResult.ok) {
    throw new Error(dataResult.error.message);
  }

  const { stats, recentActivity } = dataResult.value;

  // Step 3: Transform recent activity for display
  const displayActivity = recentActivity.map((record) => ({
    from: toDateOnly(record.startsAt),
    name: record.personName || "Unknown",
    status: record.approvalStatus,
    to: toDateOnly(record.endsAt),
    type: record.recordType,
  }));

  const todayAbsences = recentActivity
    .filter((r) => ["leave", "wfh"].includes(r.recordType))
    .slice(0, 5);

  return (
    <>
      <Header page="Dashboard" />
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Row 1 — asymmetric hero + secondary stack */}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="relative z-30 md:col-span-2">
            <LivingTimelineModule
              todayAbsences={todayAbsences}
              total={stats.peopleUnavailableToday}
            />
          </div>
          <div className="flex flex-col gap-4">
            <ActionModule
              ctaHref="/plans"
              ctaLabel="Review"
              icon={<ClipboardListIcon className="size-3.5" strokeWidth={1.75} />}
              label="Pending approvals"
              sub=""
              value={String(stats.pendingApprovals)}
            />
            <ActionModule
              ctaHref="/feed"
              ctaLabel="Manage"
              icon={<LinkIcon className="size-3.5" strokeWidth={1.75} />}
              label="Active Calendar Feeds"
              sub=""
              value={String(stats.activeFeeds)}
            />
          </div>
        </div>

        {/* Row 2 — full-width recent requests */}
        <RecentRequestsCard entries={displayActivity} />
      </div>
    </>
  );
};

export default DashboardPage;

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

    {entries.length === 0 ? (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <p className="text-sm">No recent activity</p>
      </div>
    ) : (
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
    )}
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
