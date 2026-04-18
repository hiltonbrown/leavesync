import { describe, expect, it } from "vitest";
import { fieldOwnershipForPerson } from "./field-ownership";

describe("field-ownership", () => {
  it("marks Xero-sourced identity fields as Xero-owned when linked", () => {
    expect(
      fieldOwnershipForPerson({ xeroEmployeeId: "xero-employee-1" })
    ).toMatchObject({
      email: "xero",
      firstName: "xero",
      jobTitle: "xero",
      lastName: "xero",
      startDate: "xero",
      location: "leavesync",
      manager: "leavesync",
      personType: "leavesync",
      statusNote: "leavesync",
      team: "leavesync",
    });
  });

  it("marks all identity fields as LeaveSync-owned for manual people", () => {
    expect(fieldOwnershipForPerson({ xeroEmployeeId: null })).toMatchObject({
      email: "leavesync",
      firstName: "leavesync",
      jobTitle: "leavesync",
      lastName: "leavesync",
      startDate: "leavesync",
    });
  });
});
