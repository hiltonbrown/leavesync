import { auth, currentUser } from "@repo/auth/server";
import {
  type AnalyticsRole,
  aggregateLeaveReports,
  createAggregationCache,
  type LeaveReportsFilters,
  listLeaveReportRecordsForDrilldown,
  resolveDateRange,
  type XeroLeaveRecordType,
} from "@repo/availability";
import { XERO_LEAVE_TYPES } from "@repo/availability/src/records/record-type-categories";
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
  type LeaveReportsFilterInput,
  LeaveReportsFilterSchema,
} from "../_schemas";
import { buildCalendarDrillDownUrl } from "../drill-down-url";
import { LeaveClient } from "./leave-client";

export const metadata: Metadata = {
  description: "Workforce leave analytics from approved availability records.",
  title: "Leave reports - LeaveSync",
};

interface LeaveReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const LeaveReportsPage = async ({ searchParams }: LeaveReportsPageProps) => {
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
        <Header organisationId={organisationId} page="Leave reports" />
        <main className="flex flex-1 flex-col p-6 pt-0">
          <FetchErrorState entityName="leave reports" />
        </main>
      </>
    );
  }

  const role = effectiveRole(orgRole);
  const filters = parseFilterParams(filterParams, LeaveReportsFilterSchema) ?? {
    includeArchivedPeople: false,
    includePublicHolidays: false,
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
        <Header organisationId={organisationId} page="Leave reports" />
        <main className="flex flex-1 flex-col p-6 pt-0">
          <FetchErrorState entityName="date range" />
        </main>
      </>
    );
  }

  const serviceFilters = leaveServiceFilters(filters, role);
  const cache = createAggregationCache();
  const dataResult = await aggregateLeaveReports({
    actingUserId: user.id,
    cache,
    clerkOrgId,
    dateRange: dateRangeResult.value,
    filters: serviceFilters,
    includePublicHolidays: filters.includePublicHolidays,
    organisationId,
    role,
  });
  if (!dataResult.ok) {
    return (
      <>
        <Header organisationId={organisationId} page="Leave reports" />
        <main className="flex flex-1 flex-col p-6 pt-0">
          <FetchErrorState entityName="leave reports" />
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
      <Header organisationId={organisationId} page="Leave reports" />
      <LeaveClient
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

export default LeaveReportsPage;

function leaveServiceFilters(
  filters: LeaveReportsFilterInput,
  role: AnalyticsRole
): LeaveReportsFilters {
  return {
    includeArchivedPeople:
      role === "admin" || role === "owner"
        ? filters.includeArchivedPeople
        : false,
    leaveType: filters.leaveType?.filter(isXeroLeaveRecordType),
    locationId: filters.locationId,
    personId: filters.personId,
    personType: filters.personType,
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
  filters: LeaveReportsFilterInput;
  organisationId: string;
  orgQueryValue: string | null;
  role: AnalyticsRole;
  userId: string;
}) {
  if (!(filters.drilldownKind && filters.drilldownValue)) {
    return null;
  }
  const adjusted = leaveServiceFilters(filters, role);
  if (filters.drilldownKind === "person") {
    adjusted.personId = [filters.drilldownValue];
  }
  if (filters.drilldownKind === "team") {
    adjusted.teamId = [filters.drilldownValue];
  }
  if (filters.drilldownKind === "record_type") {
    adjusted.leaveType = isXeroLeaveRecordType(filters.drilldownValue)
      ? [filters.drilldownValue]
      : adjusted.leaveType;
  }
  const records = await listLeaveReportRecordsForDrilldown({
    actingUserId: userId,
    cache,
    clerkOrgId,
    dateRange,
    filters: adjusted,
    includePublicHolidays: filters.includePublicHolidays,
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
      recordType: adjusted.leaveType?.[0],
      teamId: adjusted.teamId?.[0],
    }),
    closeHref: closeHref("/analytics/leave-reports", filters, orgQueryValue),
    records: records.value.records,
    title: "Leave records",
  };
}

function closeHref(
  path: string,
  filters: LeaveReportsFilterInput,
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

function isXeroLeaveRecordType(value: string): value is XeroLeaveRecordType {
  return XERO_LEAVE_TYPES.some((recordType) => recordType === value);
}
