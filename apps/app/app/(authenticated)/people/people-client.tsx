"use client";

import type { PersonListItem } from "@repo/availability";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { useNotificationEvents } from "@repo/notifications/components/provider";
import {
  AlertTriangleIcon,
  LeafIcon,
  PencilIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { dispatchManualSyncAction } from "@/app/(authenticated)/sync/_actions";
import {
  statusToneClasses,
  toneForStatusKey,
} from "@/components/availability/availability-status";
import { EmptyState } from "@/components/states/empty-state";
import { withOrg } from "@/lib/navigation/org-url";
import { useFilterParams } from "@/lib/url-state/use-filter-params";
import { type PeopleFilterInput, PeopleFilterSchema } from "./_schemas";

interface FilterOption {
  id: string;
  name: string;
}

interface PeopleClientProps {
  canIncludeArchived: boolean;
  filters: PeopleFilterInput;
  hasActiveXeroConnection: boolean;
  locations: FilterOption[];
  nextCursor: string | null;
  organisationId: string;
  orgQueryValue: string | null;
  people: PersonListItem[];
  teams: FilterOption[];
  totalCount: number;
  xeroTenantId: string | null;
}

const statusLabels: Record<string, string> = {
  alternative_contact: "Alternative contact",
  another_office: "Another office",
  available: "Available",
  client_site: "Client site",
  limited_availability: "Limited availability",
  offsite_meeting: "Offsite meeting",
  on_leave: "On leave",
  other: "Unavailable",
  pending_leave: "Leave pending",
  public_holiday: "Public holiday",
  training: "Training",
  travelling: "Travelling",
  wfh: "Working from home",
};

function renderEmptyState({
  canIncludeArchived,
  hasActiveXeroConnection,
  onSync,
  orgQueryValue,
  syncPending,
  totalCount,
  xeroTenantId,
}: {
  canIncludeArchived: boolean;
  hasActiveXeroConnection: boolean;
  onSync: () => void;
  orgQueryValue: string | null;
  syncPending: boolean;
  totalCount: number;
  xeroTenantId: string | null;
}) {
  if (totalCount === 0) {
    const canSync =
      canIncludeArchived && hasActiveXeroConnection && Boolean(xeroTenantId);
    return (
      <EmptyState
        actionSlot={
          <div className="flex flex-wrap gap-2">
            {canSync ? (
              <Button
                disabled={syncPending}
                onClick={onSync}
                type="button"
                variant="default"
              >
                Sync from Xero
              </Button>
            ) : null}
            {canIncludeArchived ? (
              <Button asChild variant="outline">
                <Link href={withOrg("/people/new", orgQueryValue)}>
                  Add person manually
                </Link>
              </Button>
            ) : null}
          </div>
        }
        description="No people have been added yet. Connect Xero to sync your employees, or add someone manually."
        title="No people yet"
      />
    );
  }
  return (
    <EmptyState
      description="No people match the current filters."
      title="No people found"
    />
  );
}

export function PeopleClient({
  canIncludeArchived,
  filters,
  hasActiveXeroConnection,
  locations,
  nextCursor,
  organisationId,
  orgQueryValue,
  people,
  teams,
  totalCount,
  xeroTenantId,
}: PeopleClientProps) {
  const router = useRouter();
  const { subscribe } = useNotificationEvents();
  const [, setFilterParams] = useFilterParams(PeopleFilterSchema);
  const [search, setSearch] = useState(filters.search ?? "");
  const [isSyncPending, startSyncTransition] = useTransition();
  const [syncMessage, setSyncMessage] = useState<{
    text: string;
    tone: "error" | "status";
  } | null>(null);
  const nextHref = useMemo(
    () =>
      peopleHref(
        { ...filters, cursor: nextCursor ?? undefined },
        orgQueryValue
      ),
    [filters, nextCursor, orgQueryValue]
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (search !== (filters.search ?? "")) {
        setFilterParams({ cursor: undefined, search });
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [filters.search, search, setFilterParams]);

  useEffect(
    () =>
      subscribe((event) => {
        if (
          event.type === "sync.run_status_changed" &&
          event.payload.organisationId === organisationId
        ) {
          router.refresh();
        }
      }),
    [organisationId, router, subscribe]
  );

  const handleSyncFromXero = () => {
    if (!xeroTenantId) {
      return;
    }
    startSyncTransition(async () => {
      try {
        const result = await dispatchManualSyncAction({
          organisationId,
          runType: "people",
          xeroTenantId,
        });
        if (!result.ok) {
          setSyncMessage({ text: result.error.message, tone: "error" });
          return;
        }
        if (!result.value.queued) {
          setSyncMessage({
            text: "This sync is not available yet.",
            tone: "error",
          });
          return;
        }
        setSyncMessage({
          text: "Sync completed successfully.",
          tone: "status",
        });
        router.refresh();
      } catch (error) {
        setSyncMessage({
          text:
            error instanceof Error
              ? error.message
              : "Failed to sync from Xero.",
          tone: "error",
        });
      }
    });
  };

  return (
    <section className="flex flex-col gap-6">
      {syncMessage ? (
        <div
          aria-live={syncMessage.tone === "error" ? "assertive" : "polite"}
          className="rounded-2xl bg-muted px-4 py-3 text-sm"
          role={syncMessage.tone === "error" ? "alert" : "status"}
        >
          {syncMessage.text}
        </div>
      ) : null}
      <div className="rounded-2xl bg-muted p-6">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
          Directory
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-semibold text-3xl text-foreground tracking-tight">
              People
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {totalCount} {totalCount === 1 ? "member" : "members"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-muted-foreground text-sm">
              Profiles, balances and availability status for this organisation.
            </p>
            {canIncludeArchived && hasActiveXeroConnection && xeroTenantId ? (
              <Button
                disabled={isSyncPending}
                onClick={handleSyncFromXero}
                size="sm"
                type="button"
                variant="default"
              >
                Sync from Xero
              </Button>
            ) : null}
            {canIncludeArchived ? (
              <Button asChild size="sm" variant="outline">
                <Link href={withOrg("/people/new", orgQueryValue)}>
                  Add person
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <form
        className="grid gap-4 rounded-2xl bg-muted p-5 lg:grid-cols-6"
        method="get"
      >
        {orgQueryValue ? (
          <input name="org" type="hidden" value={orgQueryValue} />
        ) : null}
        <FilterField className="lg:col-span-2" label="Search">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              name="search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email"
              value={search}
            />
          </div>
        </FilterField>
        <FilterField label="Team">
          <Select defaultValue={filters.teamId?.[0] ?? "all"} name="teamId">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Location">
          <Select
            defaultValue={filters.locationId?.[0] ?? "all"}
            name="locationId"
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Person type">
          <Select defaultValue={filters.personType} name="personType">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              <SelectItem value="employee">Employees</SelectItem>
              <SelectItem value="contractor">Contractors</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Status">
          <Select defaultValue={filters.status?.[0] ?? "all"} name="status">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Xero link">
          <Select defaultValue={filters.xeroLinked} name="xeroLinked">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="true">Linked</SelectItem>
              <SelectItem value="false">Manual</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <div className="flex flex-wrap items-center gap-4 lg:col-span-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              defaultChecked={filters.xeroSyncFailedOnly}
              name="xeroSyncFailedOnly"
              type="checkbox"
              value="true"
            />
            Xero sync failed only
          </label>
          {canIncludeArchived ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                defaultChecked={filters.includeArchived}
                name="includeArchived"
                type="checkbox"
                value="true"
              />
              Include archived
            </label>
          ) : null}
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">Apply</Button>
          <Button asChild type="button" variant="ghost">
            <Link href={withOrg("/people", orgQueryValue)}>Clear</Link>
          </Button>
        </div>
      </form>

      {people.length === 0 ? (
        renderEmptyState({
          canIncludeArchived,
          hasActiveXeroConnection,
          onSync: handleSyncFromXero,
          orgQueryValue,
          syncPending: isSyncPending,
          totalCount,
          xeroTenantId,
        })
      ) : (
        <div className="overflow-hidden rounded-2xl bg-muted">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Xero</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {
                // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: table row renders provenance chip, status, and sync count
                people.map((person) => (
                  <TableRow className="bg-background/50" key={person.id}>
                    <TableCell>
                      <Link
                        className="flex items-center gap-3"
                        href={withOrg(`/people/${person.id}`, orgQueryValue)}
                      >
                        <Avatar person={person} />
                        <span className="min-w-0">
                          <span className="block truncate text-foreground">
                            <span className="font-normal">
                              {person.firstName}
                            </span>{" "}
                            <span className="font-semibold">
                              {person.lastName}
                            </span>
                          </span>
                          <span className="block truncate text-muted-foreground text-xs">
                            {person.email}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {person.jobTitle ?? labelForPersonType(person.personType)}
                      {person.archivedAt ? (
                        <Badge className="ml-2" variant="outline">
                          Archived
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {person.team?.name ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {locationLabel(person)}
                    </TableCell>
                    <TableCell>
                      <StatusChip
                        label={person.currentStatus.label}
                        statusKey={person.currentStatus.statusKey}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            person.xeroLinked
                              ? "border-transparent bg-secondary text-secondary-foreground ring-1 ring-secondary/60"
                              : "border-transparent bg-accent-container text-on-accent-container ring-1 ring-accent-container/60"
                          }
                          variant="secondary"
                        >
                          {person.xeroLinked ? (
                            <LeafIcon aria-hidden="true" className="size-3" />
                          ) : (
                            <PencilIcon aria-hidden="true" className="size-3" />
                          )}
                          {person.xeroLinked ? "Linked" : "Manual"}
                          <span className="sr-only">
                            Source:{" "}
                            {person.xeroLinked
                              ? "Synced from Xero"
                              : "Manual entry"}
                            .
                          </span>
                        </Badge>
                        {person.xeroSyncFailedCount > 0 && (
                          <span
                            className="inline-flex items-center gap-1 rounded-xl bg-destructive/10 px-2 py-1 font-medium text-destructive text-xs"
                            title={`${person.xeroSyncFailedCount} failed record${person.xeroSyncFailedCount === 1 ? "" : "s"}`}
                          >
                            <AlertTriangleIcon className="size-3" />
                            {person.xeroSyncFailedCount}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </div>
      )}

      {nextCursor ? (
        <div className="flex justify-center">
          <Button asChild variant="secondary">
            <Link href={nextHref}>Load more</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function FilterField({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-muted-foreground text-xs uppercase tracking-widest">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Avatar({ person }: { person: PersonListItem }) {
  const initials =
    `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase();
  if (person.avatarUrl) {
    return (
      <span
        aria-hidden="true"
        className="block size-11 rounded-full bg-center bg-cover"
        style={{ backgroundImage: `url("${person.avatarUrl}")` }}
      />
    );
  }
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-container font-semibold text-on-primary-container text-sm">
      {initials || "?"}
    </span>
  );
}

function StatusChip({
  label,
  statusKey,
}: {
  label: string;
  statusKey: string;
}) {
  const tone = statusTone(statusKey);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1 font-medium text-xs ring-1 ${tone}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function statusTone(statusKey: string): string {
  return statusToneClasses[toneForStatusKey({ statusKey })];
}

function locationLabel(person: PersonListItem): string {
  if (!person.location) {
    return "Unassigned";
  }
  const suffix = person.location.regionCode ?? person.location.countryCode;
  return suffix ? `${person.location.name} (${suffix})` : person.location.name;
}

function labelForPersonType(personType: string): string {
  return personType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function peopleHref(
  filters: PeopleFilterInput,
  orgQueryValue: string | null
): string {
  const params = new URLSearchParams();
  if (filters.cursor) {
    params.set("cursor", filters.cursor);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.pageSize && filters.pageSize !== 50) {
    params.set("pageSize", String(filters.pageSize));
  }
  if (filters.personType && filters.personType !== "all") {
    params.set("personType", filters.personType);
  }
  if (filters.xeroLinked && filters.xeroLinked !== "all") {
    params.set("xeroLinked", filters.xeroLinked);
  }
  if (filters.includeArchived) {
    params.set("includeArchived", "true");
  }
  if (filters.xeroSyncFailedOnly) {
    params.set("xeroSyncFailedOnly", "true");
  }
  for (const teamId of filters.teamId ?? []) {
    params.append("teamId", teamId);
  }
  for (const locationId of filters.locationId ?? []) {
    params.append("locationId", locationId);
  }
  for (const status of filters.status ?? []) {
    params.append("status", status);
  }
  const href = `/people${params.toString() ? `?${params.toString()}` : ""}`;
  return withOrg(href, orgQueryValue);
}
