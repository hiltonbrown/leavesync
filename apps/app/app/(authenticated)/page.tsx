import {
  CalendarX2Icon,
  CheckCircle2Icon,
  ClockIcon,
  RssIcon,
  TrendingUpIcon,
  UserIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { Header } from "./components/header";

export const metadata: Metadata = {
  title: "Dashboard — LeaveSync",
  description: "Overview of leave, availability, and sync status.",
};

// ─── Placeholder data ──────────────────────────────────────────────────────
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
    name: "Tom Eriksson",
    type: "Annual Leave",
    from: "Apr 28",
    to: "May 2",
    status: "pending",
  },
];

const upcoming = [
  { name: "Yuki Tanaka", days: "Mon 14 – Fri 18 Apr", type: "Annual Leave" },
  {
    name: "Aisha Okonkwo",
    days: "Tue 22 Apr – Mon 30 Jun",
    type: "Parental Leave",
  },
  {
    name: "Tom Eriksson",
    days: "Mon 28 Apr – Fri 2 May",
    type: "Annual Leave",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

const Dashboard = () => (
  <>
    <Header page="Dashboard" />
    <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
      {/* Row 1 — 3 stat cards */}
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          icon={<CalendarX2Icon className="size-4" strokeWidth={1.75} />}
          label="Out today"
          sub="of 38 employees"
          trend="+1 from yesterday"
          trendUp
          value="4"
        />
        <StatCard
          icon={<CheckCircle2Icon className="size-4" strokeWidth={1.75} />}
          label="Pending approvals"
          sub="awaiting review"
          value="2"
        />
        <StatCard
          icon={<RssIcon className="size-4" strokeWidth={1.75} />}
          label="Active feeds"
          sub="syncing now"
          trend="Last sync 3 min ago"
          trendUp
          value="6"
        />
      </div>

      {/* Row 2 — 2 larger cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Recent leave */}
        <div className="flex flex-col gap-5 rounded-2xl bg-muted p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
                Recent Leave
              </p>
              <h2 className="mt-0.5 font-semibold text-[1.375rem] text-foreground tracking-tight">
                Latest requests
              </h2>
            </div>
            <ClockIcon
              className="size-4 text-muted-foreground"
              strokeWidth={1.75}
            />
          </div>

          <div className="flex flex-col gap-1">
            {recentLeave.map((entry) => (
              <div
                className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-accent"
                key={`${entry.name}-${entry.from}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex size-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--secondary)" }}
                  >
                    <UserIcon
                      className="size-3.5"
                      strokeWidth={2}
                      style={{ color: "var(--secondary-foreground)" }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[0.875rem] text-foreground leading-tight">
                      {entry.name}
                    </p>
                    <p className="text-[0.75rem] text-muted-foreground">
                      {entry.type} · {entry.from} – {entry.to}
                    </p>
                  </div>
                </div>
                <StatusBadge status={entry.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming absences */}
        <div className="flex flex-col gap-5 rounded-2xl bg-muted p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
                Coming up
              </p>
              <h2 className="mt-0.5 font-semibold text-[1.375rem] text-foreground tracking-tight">
                Upcoming absences
              </h2>
            </div>
            <TrendingUpIcon
              className="size-4 text-muted-foreground"
              strokeWidth={1.75}
            />
          </div>

          <div className="flex flex-col gap-3">
            {upcoming.map((entry, i) => (
              <div
                className="flex items-start gap-4 rounded-xl p-3 transition-colors hover:bg-accent"
                key={entry.name}
              >
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg font-semibold text-[0.75rem]"
                  style={{
                    background: "var(--primary-container)",
                    color: "var(--on-primary-container)",
                  }}
                >
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[0.875rem] text-foreground leading-tight">
                    {entry.name}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                    {entry.days}
                  </p>
                  <p
                    className="mt-1 inline-block rounded-md px-2 py-0.5 font-medium text-[0.6875rem]"
                    style={{
                      background: "var(--secondary)",
                      color: "var(--secondary-foreground)",
                    }}
                  >
                    {entry.type}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-auto rounded-xl px-4 py-3"
            style={{ background: "var(--accent)" }}
          >
            <p className="font-medium text-[0.75rem] text-foreground">
              3 employees absent next week
            </p>
            <p className="text-[0.6875rem] text-muted-foreground">
              Week of 14 Apr · highest absence period this month
            </p>
          </div>
        </div>
      </div>
    </div>
  </>
);

export default Dashboard;

// ─── Sub-components ─────────────────────────────────────────────────────────

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  trend?: string;
  trendUp?: boolean;
};

const StatCard = ({
  icon,
  label,
  value,
  sub,
  trend,
  trendUp,
}: StatCardProps) => (
  <div className="flex flex-col gap-4 rounded-2xl bg-muted p-6">
    <div className="flex items-center justify-between">
      <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
        {label}
      </p>
      <span className="text-muted-foreground">{icon}</span>
    </div>
    <div>
      <p className="font-semibold text-[2.75rem] text-foreground leading-none tracking-tight">
        {value}
      </p>
      <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">{sub}</p>
    </div>
    {trend && (
      <p
        className="font-medium text-[0.75rem]"
        style={{ color: trendUp ? "var(--primary)" : "var(--destructive)" }}
      >
        {trend}
      </p>
    )}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const isApproved = status === "approved";
  return (
    <span
      className="shrink-0 rounded-md px-2 py-0.5 font-medium text-[0.6875rem]"
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
