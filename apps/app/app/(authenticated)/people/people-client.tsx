"use client";

import type {
  AvailabilityRecordData,
  PersonData,
} from "@repo/database/src/queries";
import { Input } from "@repo/design-system/components/ui/input";
import { SearchIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { derivePersonStatus } from "@/lib/availability-record-types";

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = "in-office" | "remote" | "away" | "sick" | "travelling";

interface PersonDisplay {
  avatarIdx: number;
  id: string;
  initials: string;
  location: string;
  name: string;
  status: Status;
  statusNote: string | null;
  title: string;
}

interface PeopleClientProps {
  orgQueryValue: null | string;
  people: PersonData[];
  todayAvailability: AvailabilityRecordData[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getAvatarIdx(id: string): number {
  return id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function deriveStatus(
  personId: string,
  availability: AvailabilityRecordData[]
): Status {
  const todayRecords = availability.filter((a) => a.personId === personId);
  if (todayRecords.length === 0) {
    return "in-office";
  }
  return derivePersonStatus(todayRecords[0].recordType);
}

// ─── Status config ────────────────────────────────────────────────────────────

interface StatusConfig {
  bg: string;
  dot: string;
  label: string;
  text: string;
}

const STATUS_CONFIG: Record<Status, StatusConfig> = {
  "in-office": {
    bg: "color-mix(in srgb, var(--primary) 12%, transparent)",
    dot: "var(--primary)",
    label: "In office",
    text: "var(--primary)",
  },
  away: {
    bg: "var(--accent)",
    dot: "var(--outline)",
    label: "On leave",
    text: "var(--muted-foreground)",
  },
  remote: {
    bg: "color-mix(in srgb, var(--tertiary) 15%, transparent)",
    dot: "var(--tertiary)",
    label: "Working remotely",
    text: "var(--tertiary)",
  },
  sick: {
    bg: "var(--error-container)",
    dot: "var(--destructive)",
    label: "Out sick",
    text: "var(--destructive)",
  },
  travelling: {
    bg: "color-mix(in srgb, var(--primary-container) 30%, transparent)",
    dot: "var(--primary-container)",
    label: "Travelling",
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

function PersonCard({ person }: { person: PersonDisplay }) {
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

      {/* Location */}
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
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

interface FilterChipProps {
  active: boolean;
  children: React.ReactNode;
  dot?: string;
  onClick: () => void;
}

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
      type="button"
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

export function PeopleClient({
  people,
  todayAvailability,
  orgQueryValue: _orgQueryValue,
}: PeopleClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  // Transform database people to display format
  const displayPeople: PersonDisplay[] = people.map((p) => ({
    avatarIdx: getAvatarIdx(p.id),
    id: p.id,
    initials: getInitials(p.firstName, p.lastName),
    location: "Unknown",
    name: `${p.firstName} ${p.lastName}`,
    status: deriveStatus(p.id, todayAvailability),
    statusNote: null,
    title: p.employmentType,
  }));

  const filtered = displayPeople.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Only show status filters that have at least one person
  const presentStatuses = (Object.keys(STATUS_CONFIG) as Status[]).filter((s) =>
    displayPeople.some((p) => p.status === s)
  );

  // Summary counts across all people (not filtered) for context
  const summaryCounts = (Object.keys(STATUS_CONFIG) as Status[])
    .map((s) => ({
      status: s,
      count: displayPeople.filter((p) => p.status === s).length,
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
            {displayPeople.length} team members
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
              setStatusFilter("all");
            }}
            style={{ color: "var(--primary)" }}
            type="button"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          {filtered.length !== displayPeople.length && (
            <p className="text-[0.75rem] text-muted-foreground">
              Showing {filtered.length} of {displayPeople.length} people
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
