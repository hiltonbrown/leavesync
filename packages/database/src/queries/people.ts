import type { ClerkOrgId, OrganisationId, PersonId, Result } from "@repo/core";
import { appError } from "@repo/core";
import { database } from "../client";
import { scopedQuery } from "../tenant-query";

export interface PersonData {
  clerkOrgId: string;
  createdAt: Date;
  email: string;
  employmentType: string;
  firstName: string;
  id: PersonId;
  isActive: boolean;
  lastName: string;
  locationId: string | null;
  organisationId: OrganisationId;
  sourcePersonKey: string | null;
  sourceSystem: string;
  teamId: string | null;
  updatedAt: Date;
}

interface PeopleFilters {
  isActive?: boolean;
  locationId?: string;
  teamId?: string;
}

export async function listPeopleForOrganisation(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  filters?: PeopleFilters
): Promise<Result<PersonData[]>> {
  try {
    const people = await database.person.findMany({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        ...(filters?.teamId && { team_id: filters.teamId }),
        ...(filters?.locationId && { location_id: filters.locationId }),
        ...(filters?.isActive !== undefined && { is_active: filters.isActive }),
      },
      select: {
        id: true,
        clerk_org_id: true,
        organisation_id: true,
        team_id: true,
        location_id: true,
        source_system: true,
        source_person_key: true,
        first_name: true,
        last_name: true,
        email: true,
        employment_type: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { first_name: "asc" },
    });

    return {
      ok: true,
      value: people.map(toPerson),
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to list people"),
    };
  }
}

export async function getPersonProfile(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  personId: PersonId
): Promise<
  Result<
    PersonData & {
      team: { id: string; name: string } | null;
      location: { id: string; name: string } | null;
    }
  >
> {
  try {
    const person = await database.person.findFirst({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        id: personId,
      },
      select: {
        id: true,
        clerk_org_id: true,
        organisation_id: true,
        team_id: true,
        location_id: true,
        source_system: true,
        source_person_key: true,
        first_name: true,
        last_name: true,
        email: true,
        employment_type: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!person) {
      return {
        ok: false,
        error: appError("not_found", "Person not found"),
      };
    }

    return {
      ok: true,
      value: {
        ...toPerson(person),
        team: person.team,
        location: person.location,
      },
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to get person profile"),
    };
  }
}

function toPerson(p: {
  id: string;
  clerk_org_id: string;
  organisation_id: string;
  team_id: string | null;
  location_id: string | null;
  source_system: string;
  source_person_key: string | null;
  first_name: string;
  last_name: string;
  email: string;
  employment_type: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}): PersonData {
  return {
    id: p.id as PersonId,
    clerkOrgId: p.clerk_org_id,
    organisationId: p.organisation_id as OrganisationId,
    teamId: p.team_id,
    locationId: p.location_id,
    sourceSystem: p.source_system,
    sourcePersonKey: p.source_person_key,
    firstName: p.first_name,
    lastName: p.last_name,
    email: p.email,
    employmentType: p.employment_type,
    isActive: p.is_active,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}
