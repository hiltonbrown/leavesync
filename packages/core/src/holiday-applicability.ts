export interface HolidayApplicabilityLocationAssignment {
  readonly archivedAt: Date | null;
  readonly classification: string;
  readonly locationId: string;
}

export interface HolidayApplicabilityHoliday {
  readonly archivedAt: Date | null;
  readonly countryCode: string;
  readonly defaultClassification: string;
  readonly locationAssignments: readonly HolidayApplicabilityLocationAssignment[];
  readonly regionCode: string | null;
}

export interface HolidayApplicabilitySubject {
  readonly countryCode: string | null;
  readonly locationId: string | null;
  readonly regionCode: string | null;
}

export interface HolidayApplicabilityInput {
  readonly holiday: HolidayApplicabilityHoliday;
  readonly subject: HolidayApplicabilitySubject;
}

/**
 * Pure predicate to determine whether a public holiday applies as a non-working day
 * for a given subject (person or location) according to the canonical product rules:
 *
 * 1. Archived holidays never apply.
 * 2. A matching active location assignment overrides default_classification.
 * 3. Otherwise the default must be non_working.
 * 4. CUSTOM bypasses country matching; every other holiday requires exact country,
 *    and a regional holiday requires exact region.
 * 5. A person without a location uses the Organisation country and null region.
 * 6. Organisation, team, person and feed assignments remain inert until a
 *    supported writer and UI productise them. include_in_feeds is not activated.
 */
export function holidayIsNonWorking(input: HolidayApplicabilityInput): boolean {
  const { holiday, subject } = input;

  if (holiday.archivedAt !== null) {
    return false;
  }

  if (subject.locationId !== null) {
    const matchingAssignment = holiday.locationAssignments.find(
      (assignment) =>
        assignment.archivedAt === null &&
        assignment.locationId === subject.locationId
    );

    if (matchingAssignment) {
      return matchingAssignment.classification === "non_working";
    }
  }

  if (holiday.defaultClassification !== "non_working") {
    return false;
  }

  if (
    holiday.countryCode !== "CUSTOM" &&
    (subject.countryCode === null ||
      holiday.countryCode !== subject.countryCode)
  ) {
    return false;
  }

  if (
    holiday.regionCode !== null &&
    (subject.regionCode === null || holiday.regionCode !== subject.regionCode)
  ) {
    return false;
  }

  return true;
}
