import type { ClerkOrgId, OrganisationId, Result } from "@repo/core";
import { appError } from "@repo/core";
import { database } from "../client";
import { scopedQuery } from "../tenant-query";

export async function listOrganisationsByClerkOrg(
  clerkOrgId: ClerkOrgId
): Promise<
  Result<
    Array<{
      id: OrganisationId;
      clerkOrgId: string;
      name: string;
      countryCode: string;
      fiscalYearStart: number | null;
      locale: string | null;
      createdAt: Date;
      reportingUnit: string | null;
      timezone: string | null;
      updatedAt: Date;
      workingHoursPerDay: number | null;
    }>
  >
> {
  try {
    const organisations = await database.organisation.findMany({
      where: { archived_at: null, clerk_org_id: clerkOrgId },
      orderBy: [{ created_at: "asc" }, { name: "asc" }],
      select: {
        id: true,
        clerk_org_id: true,
        name: true,
        country_code: true,
        fiscal_year_start: true,
        locale: true,
        reporting_unit: true,
        timezone: true,
        created_at: true,
        updated_at: true,
        working_hours_per_day: true,
      },
    });

    return {
      ok: true,
      value: organisations.map((o) => ({
        id: o.id as OrganisationId,
        clerkOrgId: o.clerk_org_id,
        name: o.name,
        countryCode: o.country_code,
        fiscalYearStart: o.fiscal_year_start,
        locale: o.locale,
        reportingUnit: o.reporting_unit,
        timezone: o.timezone,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        workingHoursPerDay:
          o.working_hours_per_day === null
            ? null
            : Number(o.working_hours_per_day),
      })),
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to list organisations"),
    };
  }
}

export async function getOrganisationById(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId
): Promise<
  Result<{
    id: OrganisationId;
    clerkOrgId: string;
    name: string;
    countryCode: string;
    fiscalYearStart: number | null;
    locale: string | null;
    createdAt: Date;
    reportingUnit: string | null;
    timezone: string | null;
    updatedAt: Date;
    workingHoursPerDay: number | null;
  }>
> {
  try {
    const organisation = await database.organisation.findFirst({
      where: {
        archived_at: null,
        clerk_org_id: clerkOrgId,
        id: organisationId,
      },
      select: {
        id: true,
        clerk_org_id: true,
        name: true,
        country_code: true,
        fiscal_year_start: true,
        locale: true,
        reporting_unit: true,
        timezone: true,
        created_at: true,
        updated_at: true,
        working_hours_per_day: true,
      },
    });

    if (!organisation) {
      return {
        ok: false,
        error: appError("not_found", "Organisation not found"),
      };
    }

    return {
      ok: true,
      value: {
        id: organisation.id as OrganisationId,
        clerkOrgId: organisation.clerk_org_id,
        name: organisation.name,
        countryCode: organisation.country_code,
        fiscalYearStart: organisation.fiscal_year_start,
        locale: organisation.locale,
        reportingUnit: organisation.reporting_unit,
        timezone: organisation.timezone,
        createdAt: organisation.created_at,
        updatedAt: organisation.updated_at,
        workingHoursPerDay:
          organisation.working_hours_per_day === null
            ? null
            : Number(organisation.working_hours_per_day),
      },
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to get organisation"),
    };
  }
}

export async function hasXeroConnection(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId
): Promise<Result<boolean>> {
  try {
    const connection = await database.xeroConnection.findFirst({
      where: scopedQuery(clerkOrgId, organisationId),
      select: { id: true },
    });

    return {
      ok: true,
      value: !!connection,
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to check Xero connection"),
    };
  }
}
