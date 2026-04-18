import { auth, currentUser } from "@repo/auth/server";
import {
  computeWorkingDays,
  hasActiveXeroConnection,
  listMyRecords,
  listTeamRecords,
  type RecordListItem,
} from "@repo/availability";
import { database, scopedQuery } from "@repo/database";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/states/empty-state";
import { FetchErrorState } from "@/components/states/fetch-error-state";
import { requirePageRole } from "@/lib/auth/require-page-role";
import { withOrg } from "@/lib/navigation/org-url";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { parseFilterParams } from "@/lib/url-state/parse-filter-params";
import { Header } from "../components/header";
import { PlansFilterSchema } from "./_schemas";
import { PlansClient, type PlansClientRecord } from "./plans-client";

export const metadata: Metadata = {
  description: "Plan leave and availability across calendars.",
  title: "Plans - LeaveSync",
};

interface PlansPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const PlansPage = async ({ searchParams }: PlansPageProps) => {
  await requirePageRole("org:viewer");

  const params = await searchParams;
  const { org, ...filterParams } = params;
  const orgParam = Array.isArray(org) ? org[0] : org;
  const { clerkOrgId, organisationId, orgQueryValue } =
    await requireActiveOrgPageContext(orgParam);
  const filters = parseFilterParams(filterParams, PlansFilterSchema) ?? {
    includeArchived: false,
    recordTypeCategory: "all",
    tab: "my",
  };
  const { orgRole } = await auth();
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  const canViewTeam = isManagerOrAbove(orgRole);
  if (filters.tab === "team" && !canViewTeam) {
    redirect(withOrg("/plans?tab=my", orgQueryValue));
  }

  const currentPerson = await database.person.findFirst({
    where: {
      ...scopedQuery(clerkOrgId, organisationId),
      archived_at: null,
      clerk_user_id: user.id,
    },
    select: { id: true },
  });

  const serviceFilters = {
    approvalStatus: filters.approvalStatus,
    dateRange: {
      from: filters.dateFrom
        ? new Date(`${filters.dateFrom}T00:00:00.000Z`)
        : undefined,
      to: filters.dateTo
        ? new Date(`${filters.dateTo}T23:59:59.999Z`)
        : undefined,
    },
    includeArchived: filters.includeArchived,
    personId: filters.tab === "team" ? filters.personId : undefined,
    recordType: filters.recordType,
    recordTypeCategory: filters.recordTypeCategory,
    sourceType: filters.sourceType,
  };

  const [recordsResult, hasXero] = await Promise.all([
    filters.tab === "team"
      ? listTeamRecords({
          actingOrgRole: orgRole,
          clerkOrgId,
          filters: serviceFilters,
          managerPersonId: currentPerson?.id ?? "",
          organisationId,
        })
      : listMyRecords({
          clerkOrgId,
          filters: serviceFilters,
          organisationId,
          userId: user.id,
        }),
    hasActiveXeroConnection({ clerkOrgId, organisationId }),
  ]);

  if (!recordsResult.ok) {
    return (
      <>
        <Header page="Plans" />
        <main className="flex flex-1 flex-col p-6 pt-0">
          <FetchErrorState entityName="plans" />
        </main>
      </>
    );
  }

  const records = await Promise.all(
    recordsResult.value.map(async (record) => {
      const duration = await computeWorkingDays({
        allDay: record.allDay,
        clerkOrgId,
        endsAt: record.endsAt,
        locationId: record.person.locationId,
        organisationId,
        startsAt: record.startsAt,
      });

      return toClientRecord(
        record,
        duration.ok ? duration.value : null,
        duration.ok ? null : duration.error.message
      );
    })
  );

  return (
    <>
      <Header page="Plans" />
      <main className="flex flex-1 flex-col gap-6 p-6 pt-0">
        {!hasXero && (
          <div className="rounded-2xl bg-muted p-5 text-muted-foreground text-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p>
                Xero is not connected. Leave records will save locally only.
                Connect Xero in Settings &gt; Integrations to enable submission
                for approval.
              </p>
              {isAdminOrOwner(orgRole) && (
                <a
                  className="font-medium text-primary"
                  href={withOrg("/settings/integrations/xero", orgQueryValue)}
                >
                  Connect Xero
                </a>
              )}
            </div>
          </div>
        )}

        <PlansClient
          canViewTeam={canViewTeam}
          filters={filters}
          hasActiveXeroConnection={hasXero}
          organisationId={organisationId}
          orgQueryValue={orgQueryValue}
          records={records}
        />

        {records.length === 0 && (
          <EmptyState
            description="No records match the current filters."
            title="No plans found"
          />
        )}
      </main>
    </>
  );
};

export default PlansPage;

function toClientRecord(
  record: RecordListItem,
  workingDays: number | null,
  workingDaysError: string | null
): PlansClientRecord {
  return {
    allDay: record.allDay,
    approvalStatus: record.approvalStatus,
    archivedAt: record.archivedAt?.toISOString() ?? null,
    balanceChip: record.balanceChip,
    editableActions: record.editableActions,
    endsAt: record.endsAt.toISOString(),
    id: record.id,
    personName: `${record.person.firstName} ${record.person.lastName}`,
    recordType: record.recordType,
    sourceType: record.sourceType,
    startsAt: record.startsAt.toISOString(),
    workingDays,
    workingDaysError,
    xeroWriteError: record.xeroWriteError,
  };
}

function isManagerOrAbove(role: string | null | undefined): boolean {
  return role === "org:manager" || role === "org:admin" || role === "org:owner";
}

function isAdminOrOwner(role: string | null | undefined): boolean {
  return role === "org:admin" || role === "org:owner";
}
