import { auth, currentUser } from "@repo/auth/server";
import {
  type AnalyticsRole,
  aggregateOutOfOffice,
  createAggregationCache,
  type LocalOnlyRecordType,
  listOutOfOfficeRecordsForDrilldown,
  type OutOfOfficeFilters,
  resolveDateRange,
} from "@repo/availability";
import { LOCAL_ONLY_TYPES } from "@repo/availability/src/records/record-type-categories";
import { database, scopedQuery } from "@repo/database";
import { getOrganisationById } from "@repo/database/src/queries/organisations";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FetchErrorState } from "@/components/states/fetch-error-state";
import { requirePageRole } from "@/lib/auth/require-page-role";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { parseFilterParams } from "@/lib/url-state/parse-filter-params";
import { Header } from "../../components/header";
import {
  type OutOfOfficeFilterInput,
  OutOfOfficeFilterSchema,
} from "../_schemas";
import { buildCalendarDrillDownUrl } from "../drill-down-url";
import { OooClient } from "./ooo-client";

export const metadata: Metadata = {
  description:
    "Out-of-office analytics from approved manual availability records.",
  title: "Out of office - LeaveSync",
};

interface OooReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const OooReportsPage = async ({ searchParams }: OooReportsPageProps) => {
  await requirePageRole("org:viewer");

  const params = await searchParams;
  const { org, ...filterParams } = params;
  const orgParam = Array.isArray(org) ? org[0] : org;
  const { clerkOrgId, organisationId, orgQueryValue } =
    await requireActiveOrgPageContext(orgParam);
  const [{ orgRole }, user, organisationResult, teams, locations] =
    await Promise.all([
      auth(),
      currentUser(),
      getOrganisationById(clerkOrgId, organisationId),
      database.team.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
        where: scopedQuery(clerkOrgId, organisationId),
      }),
      database.location.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
        where: scopedQuery(clerkOrgId, organisationId),
      }),
    ]);
  if (!user) {
    redirect("/");
  }
  if (!organisationResult.ok) {
    return (
      <>
        <Header organisationId={organisationId} page="Out of office" />
        <main className="flex flex-1 flex-col p-6 pt-0">
          <FetchErrorState entityName="out-of-office reports" />
        </main>
      </>
    );
  }

  const role = effectiveRole(orgRole);
  const filters = parseFilterParams(filterParams, OutOfOfficeFilterSchema) ?? {
    includeArchivedPeople: false,
    personType: "all",
    preset: "this_quarter",
  };
  const dateRangeResult = resolveDateRange({
    customEnd: filters.customEnd,
    customStart: filters.customStart,
    preset: filters.preset,
    timezone: organisationResult.value.timezone ?? "UTC",
  });
  if (!dateRangeResult.ok) {
    return (
      <>
        <Header organisationId={organisationId} page="Out of office" />
        <main className="flex flex-1 flex-col p-6 pt-0">
          <FetchErrorState entityName="date range" />
        </main>
      </>
    );
  }

  const serviceFilters = oooServiceFilters(filters, role);
  const cache = createAggregationCache();
  const dataResult = await aggregateOutOfOffice({
    actingUserId: user.id,
    cache,
    clerkOrgId,
    dateRange: dateRangeResult.value,
    filters: serviceFilters,
    organisationId,
    role,
  });
  if (!dataResult.ok) {
    return (
      <>
        <Header organisationId={organisationId} page="Out of office" />
        <main className="flex flex-1 flex-col p-6 pt-0">
          <FetchErrorState entityName="out-of-office reports" />
        </main>
      </>
    );
  }

  const drilldown = await loadDrilldown({
    cache,
    clerkOrgId,
    dateRange: dateRangeResult.value,
    filters,
    organisationId,
    orgQueryValue,
    role,
    userId: user.id,
  });

  return (
    <>
      <Header organisationId={organisationId} page="Out of office" />
      <OooClient
        canIncludeArchived={role === "admin" || role === "owner"}
        data={dataResult.value}
        drilldown={drilldown}
        exportInput={{ ...filters, organisationId }}
        filters={filters}
        locations={locations}
        orgQueryValue={orgQueryValue}
        teams={teams}
      />
    </>
  );
};

export default OooReportsPage;

function oooServiceFilters(
  filters: OutOfOfficeFilterInput,
  role: AnalyticsRole
): OutOfOfficeFilters {
  return {
    includeArchivedPeople:
      role === "admin" || role === "owner"
        ? filters.includeArchivedPeople
        : false,
    locationId: filters.locationId,
    personId: filters.personId,
    personType: filters.personType,
    recordType: filters.recordType?.filter(isLocalOnlyRecordType),
    teamId: filters.teamId,
  };
}

async function loadDrilldown({
  cache,
  clerkOrgId,
  dateRange,
  filters,
  organisationId,
  orgQueryValue,
  role,
  userId,
}: {
  cache: ReturnType<typeof createAggregationCache>;
  clerkOrgId: string;
  dateRange: { end: Date; label: string; start: Date };
  filters: OutOfOfficeFilterInput;
  organisationId: string;
  orgQueryValue: string | null;
  role: AnalyticsRole;
  userId: string;
}) {
  if (!(filters.drilldownKind && filters.drilldownValue)) {
    return null;
  }
  const adjusted = oooServiceFilters(filters, role);
  if (filters.drilldownKind === "person") {
    adjusted.personId = [filters.drilldownValue];
  }
  if (filters.drilldownKind === "record_type") {
    adjusted.recordType = isLocalOnlyRecordType(filters.drilldownValue)
      ? [filters.drilldownValue]
      : adjusted.recordType;
  }
  const records = await listOutOfOfficeRecordsForDrilldown({
    actingUserId: userId,
    cache,
    clerkOrgId,
    dateRange,
    filters: adjusted,
    organisationId,
    pageSize: 50,
    role,
  });
  if (!records.ok) {
    return null;
  }
  return {
    calendarHref: buildCalendarDrillDownUrl({
      customEnd: dateRange.end.toISOString().slice(0, 10),
      customStart: dateRange.start.toISOString().slice(0, 10),
      org: orgQueryValue,
      personId: adjusted.personId?.[0],
      preset: "custom",
      recordType: adjusted.recordType?.[0],
    }),
    closeHref: closeHref("/analytics/out-of-office", filters, orgQueryValue),
    records: records.value.records,
    title: "Out-of-office records",
  };
}

function closeHref(
  path: string,
  filters: OutOfOfficeFilterInput,
  orgQueryValue: string | null
): string {
  const params = new URLSearchParams();
  if (orgQueryValue) {
    params.set("org", orgQueryValue);
  }
  params.set("preset", filters.preset);
  if (filters.customStart) {
    params.set("customStart", filters.customStart);
  }
  if (filters.customEnd) {
    params.set("customEnd", filters.customEnd);
  }
  return `${path}?${params.toString()}`;
}

function effectiveRole(role: string | null | undefined): AnalyticsRole {
  if (role === "org:owner") {
    return "owner";
  }
  if (role === "org:admin") {
    return "admin";
  }
  if (role === "org:manager") {
    return "manager";
  }
  return "viewer";
}

function isLocalOnlyRecordType(value: string): value is LocalOnlyRecordType {
  return LOCAL_ONLY_TYPES.some((recordType) => recordType === value);
}
