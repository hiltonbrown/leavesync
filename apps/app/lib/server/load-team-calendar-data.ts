import "server-only";

import type { ClerkOrgId, OrganisationId, PersonId, Result } from "@repo/core";
import { appError } from "@repo/core";
import {
  listPeopleForOrganisation,
  listAvailabilityForCalendar,
} from "@repo/database/src/queries";

/**
 * Loads team calendar data for a date range.
 * Includes all people and their availability in the specified period.
 */
export async function loadTeamCalendarData(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  dateRange: {
    startDate: Date;
    endDate: Date;
  },
  filters?: {
    teamId?: string;
    locationId?: string;
  }
): Promise<
  Result<{
    people: Array<{
      id: PersonId;
      firstName: string;
      lastName: string;
      email: string;
      teamId: string | null;
      locationId: string | null;
    }>;
    availability: Array<{
      id: string;
      personId: PersonId;
      recordType: string;
      startsAt: Date;
      endsAt: Date;
      privacyMode: string;
      contactability: string;
    }>;
  }>
> {
  try {
    // Load people
    const peopleResult = await listPeopleForOrganisation(
      clerkOrgId,
      organisationId,
      filters
    );

    if (!peopleResult.ok) {
      return {
        ok: false,
        error: peopleResult.error,
      };
    }

    // Load availability for the date range
    const availabilityResult = await listAvailabilityForCalendar(
      clerkOrgId,
      organisationId,
      dateRange,
      filters?.teamId
        ? { personIds: peopleResult.value.map((p) => p.id as PersonId) }
        : undefined
    );

    if (!availabilityResult.ok) {
      return {
        ok: false,
        error: availabilityResult.error,
      };
    }

    return {
      ok: true,
      value: {
        people: peopleResult.value.map((person) => ({
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          teamId: person.teamId,
          locationId: person.locationId,
        })),
        availability: availabilityResult.value.map((record) => ({
          id: record.id,
          personId: record.personId,
          recordType: record.recordType,
          startsAt: record.startsAt,
          endsAt: record.endsAt,
          privacyMode: record.privacyMode,
          contactability: record.contactability,
        })),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: appError("internal", "Failed to load team calendar data"),
    };
  }
}
