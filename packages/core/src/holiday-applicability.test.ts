import { describe, expect, it } from "vitest";
import {
  type HolidayApplicabilityHoliday,
  type HolidayApplicabilityInput,
  type HolidayApplicabilitySubject,
  holidayIsNonWorking,
} from "./holiday-applicability";

describe("holidayIsNonWorking", () => {
  const baseHoliday: HolidayApplicabilityHoliday = {
    archivedAt: null,
    countryCode: "AU",
    defaultClassification: "non_working",
    locationAssignments: [],
    regionCode: null,
  };

  const baseSubject: HolidayApplicabilitySubject = {
    countryCode: "AU",
    locationId: "loc_brisbane",
    regionCode: "QLD",
  };

  describe("Rule 1: Archived holidays never apply", () => {
    it("returns false when holiday is archived, regardless of matching jurisdiction", () => {
      const input: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          archivedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        subject: baseSubject,
      };
      expect(holidayIsNonWorking(input)).toBe(false);
    });

    it("returns false when holiday is archived, even with active non-working location override", () => {
      const input: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          archivedAt: new Date("2026-01-01T00:00:00.000Z"),
          locationAssignments: [
            {
              archivedAt: null,
              classification: "non_working",
              locationId: "loc_brisbane",
            },
          ],
        },
        subject: baseSubject,
      };
      expect(holidayIsNonWorking(input)).toBe(false);
    });

    it("returns false when holiday is archived and country is CUSTOM", () => {
      const input: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          archivedAt: new Date("2026-01-01T00:00:00.000Z"),
          countryCode: "CUSTOM",
        },
        subject: baseSubject,
      };
      expect(holidayIsNonWorking(input)).toBe(false);
    });
  });

  describe("Rule 2: Matching active location assignment overrides default_classification", () => {
    it("returns true when matching location assignment is non_working, overriding working default", () => {
      const input: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          defaultClassification: "working",
          locationAssignments: [
            {
              archivedAt: null,
              classification: "non_working",
              locationId: "loc_brisbane",
            },
          ],
          regionCode: "NSW", // Different region from subject
        },
        subject: baseSubject, // QLD
      };
      expect(holidayIsNonWorking(input)).toBe(true);
    });

    it("returns true when matching location assignment is non_working, overriding mismatched country", () => {
      const input: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "NZ",
          defaultClassification: "working",
          locationAssignments: [
            {
              archivedAt: null,
              classification: "non_working",
              locationId: "loc_brisbane",
            },
          ],
        },
        subject: baseSubject,
      };
      expect(holidayIsNonWorking(input)).toBe(true);
    });

    it("returns false when matching location assignment is working, overriding non_working default", () => {
      const input: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          defaultClassification: "non_working",
          locationAssignments: [
            {
              archivedAt: null,
              classification: "working",
              locationId: "loc_brisbane",
            },
          ],
        },
        subject: baseSubject,
      };
      expect(holidayIsNonWorking(input)).toBe(false);
    });

    it("ignores archived location assignment and falls back to default classification & jurisdiction", () => {
      const inputWithMatchingJurisdiction: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          defaultClassification: "non_working",
          locationAssignments: [
            {
              archivedAt: new Date("2026-01-01T00:00:00.000Z"),
              classification: "working",
              locationId: "loc_brisbane",
            },
          ],
          regionCode: "QLD",
        },
        subject: baseSubject,
      };
      expect(holidayIsNonWorking(inputWithMatchingJurisdiction)).toBe(true);

      const inputWithOverriddenNonWorkingArchived: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "NZ",
          defaultClassification: "working",
          locationAssignments: [
            {
              archivedAt: new Date("2026-01-01T00:00:00.000Z"),
              classification: "non_working",
              locationId: "loc_brisbane",
            },
          ],
        },
        subject: baseSubject,
      };
      expect(holidayIsNonWorking(inputWithOverriddenNonWorkingArchived)).toBe(
        false
      );
    });

    it("ignores assignments for other locations", () => {
      const input: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          defaultClassification: "non_working",
          locationAssignments: [
            {
              archivedAt: null,
              classification: "working",
              locationId: "loc_sydney",
            },
          ],
          regionCode: "QLD",
        },
        subject: baseSubject, // loc_brisbane
      };
      expect(holidayIsNonWorking(input)).toBe(true);
    });
  });

  describe("Rule 3: Otherwise the default must be non_working", () => {
    it("returns false when defaultClassification is working and no location override exists", () => {
      const input: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          defaultClassification: "working",
        },
        subject: baseSubject,
      };
      expect(holidayIsNonWorking(input)).toBe(false);
    });
  });

  describe("Rule 4: CUSTOM bypasses country; other holidays require exact country and region", () => {
    it("returns true for CUSTOM national holiday for any country and region", () => {
      const inputAU: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "CUSTOM",
          regionCode: null,
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_1",
          regionCode: "QLD",
        },
      };
      expect(holidayIsNonWorking(inputAU)).toBe(true);

      const inputNZ: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "CUSTOM",
          regionCode: null,
        },
        subject: {
          countryCode: "NZ",
          locationId: null,
          regionCode: null,
        },
      };
      expect(holidayIsNonWorking(inputNZ)).toBe(true);
    });

    it("evaluates region on CUSTOM regional holiday", () => {
      const inputMatching: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "CUSTOM",
          regionCode: "QLD",
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_1",
          regionCode: "QLD",
        },
      };
      expect(holidayIsNonWorking(inputMatching)).toBe(true);

      const inputMismatched: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "CUSTOM",
          regionCode: "NSW",
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_1",
          regionCode: "QLD",
        },
      };
      expect(holidayIsNonWorking(inputMismatched)).toBe(false);

      const inputNullSubjectRegion: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "CUSTOM",
          regionCode: "NSW",
        },
        subject: {
          countryCode: "AU",
          locationId: null,
          regionCode: null,
        },
      };
      expect(holidayIsNonWorking(inputNullSubjectRegion)).toBe(false);
    });

    it("requires exact country match for standard holidays", () => {
      const inputMatchingCountry: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          regionCode: null,
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_1",
          regionCode: "VIC",
        },
      };
      expect(holidayIsNonWorking(inputMatchingCountry)).toBe(true);

      const inputMismatchedCountry: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          regionCode: null,
        },
        subject: {
          countryCode: "NZ",
          locationId: "loc_2",
          regionCode: "AUK",
        },
      };
      expect(holidayIsNonWorking(inputMismatchedCountry)).toBe(false);

      const inputNullSubjectCountry: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          regionCode: null,
        },
        subject: {
          countryCode: null,
          locationId: null,
          regionCode: null,
        },
      };
      expect(holidayIsNonWorking(inputNullSubjectCountry)).toBe(false);
    });

    it("requires exact region match for regional holidays", () => {
      const inputMatchingRegion: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          regionCode: "NSW",
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_syd",
          regionCode: "NSW",
        },
      };
      expect(holidayIsNonWorking(inputMatchingRegion)).toBe(true);

      const inputMismatchedRegion: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          regionCode: "NSW",
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_bne",
          regionCode: "QLD",
        },
      };
      expect(holidayIsNonWorking(inputMismatchedRegion)).toBe(false);

      const inputMissingRegionOnSubject: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          regionCode: "NSW",
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_unknown_region",
          regionCode: null,
        },
      };
      expect(holidayIsNonWorking(inputMissingRegionOnSubject)).toBe(false);
    });
  });

  describe("Rule 5: Person without location uses Organisation country and null region", () => {
    const unlocatedSubject: HolidayApplicabilitySubject = {
      countryCode: "AU",
      locationId: null,
      regionCode: null,
    };

    it("matches national holiday for the organisation country", () => {
      const input: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          regionCode: null,
        },
        subject: unlocatedSubject,
      };
      expect(holidayIsNonWorking(input)).toBe(true);
    });

    it("does not match regional holiday in the same country", () => {
      const input: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          regionCode: "NSW",
        },
        subject: unlocatedSubject,
      };
      expect(holidayIsNonWorking(input)).toBe(false);
    });

    it("does not match location overrides because locationId is null", () => {
      const input: HolidayApplicabilityInput = {
        holiday: {
          ...baseHoliday,
          countryCode: "AU",
          defaultClassification: "working",
          locationAssignments: [
            {
              archivedAt: null,
              classification: "non_working",
              locationId: "loc_brisbane",
            },
          ],
          regionCode: null,
        },
        subject: unlocatedSubject,
      };
      expect(holidayIsNonWorking(input)).toBe(false);
    });
  });

  describe("Table-driven resolved-rule matrix", () => {
    interface MatrixRow {
      description: string;
      expected: boolean;
      holiday: HolidayApplicabilityHoliday;
      subject: HolidayApplicabilitySubject;
    }

    const matrix: MatrixRow[] = [
      {
        description: "National AU holiday applies to AU subject",
        expected: true,
        holiday: {
          archivedAt: null,
          countryCode: "AU",
          defaultClassification: "non_working",
          locationAssignments: [],
          regionCode: null,
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_1",
          regionCode: "NSW",
        },
      },
      {
        description: "National AU holiday does not apply to NZ subject",
        expected: false,
        holiday: {
          archivedAt: null,
          countryCode: "AU",
          defaultClassification: "non_working",
          locationAssignments: [],
          regionCode: null,
        },
        subject: {
          countryCode: "NZ",
          locationId: "loc_2",
          regionCode: "AUK",
        },
      },
      {
        description: "NSW regional holiday applies to NSW subject",
        expected: true,
        holiday: {
          archivedAt: null,
          countryCode: "AU",
          defaultClassification: "non_working",
          locationAssignments: [],
          regionCode: "NSW",
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_1",
          regionCode: "NSW",
        },
      },
      {
        description: "NSW regional holiday does not apply to QLD subject",
        expected: false,
        holiday: {
          archivedAt: null,
          countryCode: "AU",
          defaultClassification: "non_working",
          locationAssignments: [],
          regionCode: "NSW",
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_2",
          regionCode: "QLD",
        },
      },
      {
        description: "Custom holiday without region applies universally",
        expected: true,
        holiday: {
          archivedAt: null,
          countryCode: "CUSTOM",
          defaultClassification: "non_working",
          locationAssignments: [],
          regionCode: null,
        },
        subject: {
          countryCode: "UK",
          locationId: "loc_uk",
          regionCode: "ENG",
        },
      },
      {
        description:
          "Location non_working override wins over working default and jurisdiction mismatch",
        expected: true,
        holiday: {
          archivedAt: null,
          countryCode: "NZ",
          defaultClassification: "working",
          locationAssignments: [
            {
              archivedAt: null,
              classification: "non_working",
              locationId: "loc_au",
            },
          ],
          regionCode: "AUK",
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_au",
          regionCode: "NSW",
        },
      },
      {
        description:
          "Location working override excludes holiday despite matching national jurisdiction",
        expected: false,
        holiday: {
          archivedAt: null,
          countryCode: "AU",
          defaultClassification: "non_working",
          locationAssignments: [
            {
              archivedAt: null,
              classification: "working",
              locationId: "loc_au",
            },
          ],
          regionCode: null,
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_au",
          regionCode: "NSW",
        },
      },
      {
        description:
          "Archived holiday is excluded regardless of active location override",
        expected: false,
        holiday: {
          archivedAt: new Date("2026-06-01T00:00:00.000Z"),
          countryCode: "AU",
          defaultClassification: "working",
          locationAssignments: [
            {
              archivedAt: null,
              classification: "non_working",
              locationId: "loc_au",
            },
          ],
          regionCode: null,
        },
        subject: {
          countryCode: "AU",
          locationId: "loc_au",
          regionCode: "NSW",
        },
      },
    ];

    it.each(matrix)("$description", ({ holiday, subject, expected }) => {
      expect(holidayIsNonWorking({ holiday, subject })).toBe(expected);
    });
  });
});
