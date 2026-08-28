import { describe, expect, it } from "vitest";
import {
  AVAILABILITY_RECORD_TYPE_LABELS,
  AVAILABILITY_RECORD_TYPES,
  type AvailabilityRecordType,
  formatAvailabilityRecordType,
  getAvailabilityRecordLabel,
} from "./availability-record-label";

describe("availability record label mappings", () => {
  const expectedLabels: Record<AvailabilityRecordType, string> = {
    alternative_contact: "Alternative Contact",
    annual_leave: "Annual Leave",
    another_office: "Another Office",
    client_site: "Client Site",
    contractor_unavailable: "Contractor Unavailable",
    holiday: "Holiday",
    leave: "Leave",
    leave_request: "Leave Request",
    limited_availability: "Limited Availability",
    long_service_leave: "Long Service Leave",
    offsite_meeting: "Offsite Meeting",
    other: "Other",
    personal_leave: "Personal Leave",
    public_holiday: "Public Holiday",
    sick_leave: "Sick Leave",
    training: "Training",
    travel: "Travel",
    travelling: "Travelling",
    unpaid_leave: "Unpaid Leave",
    wfh: "Work From Home",
  };

  it("includes all 20 canonical record types in the enum definition", () => {
    expect(AVAILABILITY_RECORD_TYPES).toHaveLength(20);
    expect(Object.keys(AVAILABILITY_RECORD_TYPE_LABELS)).toHaveLength(20);
  });

  describe("exhaustive table-driven checks for every canonical record type", () => {
    for (const recordType of AVAILABILITY_RECORD_TYPES) {
      it(`formats ${recordType} as "${expectedLabels[recordType]}"`, () => {
        expect(formatAvailabilityRecordType(recordType)).toBe(
          expectedLabels[recordType]
        );
        expect(getAvailabilityRecordLabel(recordType)).toBe(
          expectedLabels[recordType]
        );
      });
    }
  });

  it("verifies compile-time exhaustiveness against type union", () => {
    // Compile-time check: if a record type is omitted from AVAILABILITY_RECORD_TYPE_LABELS,
    // this assignment will fail type checking.
    const mapping: Record<AvailabilityRecordType, string> =
      AVAILABILITY_RECORD_TYPE_LABELS;
    expect(mapping).toBeDefined();

    type ExhaustiveUnionCheck<T extends AvailabilityRecordType> = [T] extends [
      keyof typeof AVAILABILITY_RECORD_TYPE_LABELS,
    ]
      ? true
      : false;
    const isExhaustive: ExhaustiveUnionCheck<AvailabilityRecordType> = true;
    expect(isExhaustive).toBe(true);
  });

  it("falls back to capitalised words for unclassified custom strings", () => {
    expect(getAvailabilityRecordLabel("custom_record_type")).toBe(
      "Custom Record Type"
    );
    expect(getAvailabilityRecordLabel("jury_duty")).toBe("Jury Duty");
  });
});
