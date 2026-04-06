"use client";

import { Input } from "@repo/design-system/components/ui/input";
import { SearchIcon, UsersIcon } from "lucide-react";
import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = "in-office" | "remote" | "away" | "sick" | "travelling";
type Department = "Engineering" | "Product" | "Design";

type Person = {
  id: string;
  name: string;
  initials: string;
  title: string;
  dept: Department;
  location: string;
  status: Status;
  statusNote: string | null;
  avatarIdx: number;
};

// ─── Data ────────────────────────────────────────────────────────────────────

const PEOPLE: Person[] = [
  {
    id: "p1",
    name: "Priya Sharma",
    initials: "PS",
    title: "Senior Engineer",
    dept: "Engineering",
    location: "London, UK",
    status: "in-office",
    statusNote: null,
    avatarIdx: 0,
  },
  {
    id: "p2",
    name: "Marcus Webb",
    initials: "MW",
    title: "Backend Engineer",
    dept: "Engineering",
    location: "Manchester, UK",
    status: "sick",
    statusNote: "Back 7 Apr",
    avatarIdx: 1,
  },
  {
    id: "p3",
    name: "Yuki Tanaka",
    initials: "YT",
    title: "Product Manager",
    dept: "Product",
    location: "London, UK",
    status: "travelling",
    statusNote: "Berlin this week",
    avatarIdx: 2,
  },
  {
    id: "p4",
    name: "Aisha Okonkwo",
    initials: "AO",
    title: "UI Designer",
    dept: "Design",
    location: "London, UK",
    status: "remote",
    statusNote: null,
    avatarIdx: 3,
  },
  {
    id: "p5",
    name: "Tom Eriksson",
    initials: "TE",
    title: "Frontend Engineer",
    dept: "Engineering",
    location: "Stockholm, Sweden",
    status: "in-office",
    statusNote: null,
    avatarIdx: 4,
  },
  {
    id: "p6",
    name: "Sofia Reyes",
    initials: "SR",
    title: "Data Analyst",
    dept: "Product",
    location: "Madrid, Spain",
    status: "remote",
    statusNote: null,
    avatarIdx: 5,
  },
];

const DEPARTMENTS: Department[] = ["Engineering", "Product", "Design"];

// ─── Status config ────────────────────────────────────────────────────────────

type StatusConfig = { label: string; dot: string; bg: string; text: string };

const STATUS_CONFIG: Record<Status, StatusConfig> = {
  "in-office": {
    label: "In office",
    dot: "var(--primary)",
    bg: "color-mix(in srgb, var(--primary) 12%, transparent)",
    text: "var(--primary)",
  },
  remote: {
    label: "Working remotely",
    dot: "var(--tertiary)",
    bg: "color-mix(in srgb, var(--tertiary) 15%, transparent)",
    text: "var(--tertiary)",
  },
  away: {
    label: "On leave",
    dot: "var(--outline)",
    bg: "var(--accent)",
    text: "var(--muted-foreground)",
  },
  sick: {
    label: "Out sick",
    dot: "var(--destructive)",
    bg: "var(--error-container)",
    text: "var(--destructive)",
  },
  travelling: {
    label: "Travelling",
    dot: "var(--primary-container)",
    bg: "color-mix(in srgb, var(--primary-container) 30%, transparent)",
    text: "var(--on-primary-container)",
  },
};

// ─── Avatar palette ───────────────────────────────────────────────────────────

const AVATAR_PALETTE: { bg: string; text: string }[] = [
  { bg: "var(--primary)", text: "var(--primary-foreground)" },
  { bg: "var(--inverse-surface)", text: "var(--inverse-on-surface)" },
  { bg: "var(--primary-container)", text: "var(--on-primary-container)" },
  {
    bg: "color-mix(in srgb, var(--primary) 80%, var(--inverse-surface))",
    text: "var(--primary-foreground)",
  },
  {
    bg: "color-mix(in srgb, var(--inverse-surface) 80%, var(--primary))",
    text: "var(--inverse-on-surface)",
  },
  {
    bg: "color-mix(in srgb, var(--primary-container) 70%, var(--muted))",
    text: "var(--on-primary-container)",
  },
];

// ─── PersonCard ───────────────────────────────────────────────────────────────

function PersonCard({ person }: { person: Person }) {
  const avatar = AVATAR_PALETTE[person.avatarIdx % AVATAR_PALETTE.length];
  const status = STATUS_CONFIG[person.status];

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-muted p-6 transition-colors hover:bg-accent">
      {/* Avatar + status dot */}
      <div className="relative">
        <div
          className="flex h-20 w-20 select-none items-center justify-center rounded-full font-semibold text-[1.375rem] tracking-tight"
          style={{ background: avatar.bg, color: avatar.text }}
        >
          {person.initials}
        </div>

        {/* Status indicator ring */}
        <div className="absolute -right-0.5 -bottom-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-background">
          <div
            className="h-3.5 w-3.5 rounded-full"
            style={{ background: status.dot }}
          />
        </div>
      </div>

      {/* Name + title */}
      <div className="flex flex-col items-center gap-0.5 text-center">
        <h3 className="font-semibold text-[0.9375rem] text-foreground leading-tight">
          {person.name}
        </h3>
        <p className="text-[0.8125rem] text-muted-foreground">{person.title}</p>
      </div>

      {/* Dept + location */}
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span
          className="rounded-full px-2.5 py-0.5 font-semibold text-[0.625rem] uppercase tracking-widest"
          style={{
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
          }}
        >
          {person.dept}
        </span>
        <span className="text-[0.75rem] text-muted-foreground">
          {person.location}
        </span>
      </div>

      {/* Status chip */}
      <div
        className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2"
        style={{ background: status.bg }}
      >
        <div
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: status.dot }}
        />
        <span
          className="font-medium text-[0.75rem]"
          style={{ color: status.text }}
        >
          {status.label}
          {person.statusNote && (
            <span className="font-normal opacity-75">
              {" "}
              · {person.statusNote}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

type FilterChipProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string; // optional colored dot
};

function FilterChip({ active, onClick, children, dot }: FilterChipProps) {
  return (
    <button
      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-medium text-[0.75rem] transition-all"
      onClick={onClick}
      style={
        active
          ? { background: "var(--primary)", color: "var(--primary-foreground)" }
          : { background: "var(--muted)", color: "var(--muted-foreground)" }
      }
    >
      {dot && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: active ? "var(--primary-foreground)" : dot }}
        />
      )}
      {children}
    </button>
  );
}

// ─── PeopleClient (main) ─────────────────────────────────────────────────────

export function PeopleClient() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<Department | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const filtered = PEOPLE.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.dept.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q);
    const matchDept = deptFilter === "all" || p.dept === deptFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  // Only show status filters that have at least one person
  const presentStatuses = (Object.keys(STATUS_CONFIG) as Status[]).filter((s) =>
    PEOPLE.some((p) => p.status === s)
  );

  // Summary counts across all people (not filtered) for context
  const summaryCounts = (Object.keys(STATUS_CONFIG) as Status[])
    .map((s) => ({
      status: s,
      count: PEOPLE.filter((p) => p.status === s).length,
    }))
    .filter((s) => s.count > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
            Team
          </p>
          <h1 className="mt-0.5 font-semibold text-[1.375rem] text-foreground tracking-tight">
            People
          </h1>
          <p className="mt-1 text-[0.875rem] text-muted-foreground">
            {PEOPLE.length} team members
            {summaryCounts.map((s, i) => (
              <span key={s.status}>
                {i === 0 ? " · " : " · "}
                <span
                  className="font-medium"
                  style={{ color: STATUS_CONFIG[s.status].dot }}
                >
                  {s.count} {STATUS_CONFIG[s.status].label.toLowerCase()}
                </span>
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, or location..."
            value={search}
          />
        </div>

        {/* Department chips */}
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={deptFilter === "all"}
            onClick={() => setDeptFilter("all")}
          >
            All departments
          </FilterChip>
          {DEPARTMENTS.map((dept) => (
            <FilterChip
              active={deptFilter === dept}
              key={dept}
              onClick={() => setDeptFilter(dept)}
            >
              {dept}
            </FilterChip>
          ))}
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          >
            Any status
          </FilterChip>
          {presentStatuses.map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <FilterChip
                active={statusFilter === s}
                dot={cfg.dot}
                key={s}
                onClick={() => setStatusFilter(s)}
              >
                {cfg.label}
              </FilterChip>
            );
          })}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl py-20"
          style={{ background: "var(--muted)" }}
        >
          <UsersIcon
            className="size-8 text-muted-foreground"
            strokeWidth={1.25}
          />
          <div className="text-center">
            <p className="font-medium text-[0.9375rem] text-foreground">
              No people found
            </p>
            <p className="mt-0.5 text-[0.875rem] text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
          <button
            className="mt-1 font-medium text-[0.8125rem] transition-colors"
            onClick={() => {
              setSearch("");
              setDeptFilter("all");
              setStatusFilter("all");
            }}
            style={{ color: "var(--primary)" }}
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          {filtered.length !== PEOPLE.length && (
            <p className="text-[0.75rem] text-muted-foreground">
              Showing {filtered.length} of {PEOPLE.length} people
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
