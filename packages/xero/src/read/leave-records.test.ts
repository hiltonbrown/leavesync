import { describe, expect, it } from "vitest";
import { mapXeroLeaveRecords } from "./leave-records";

describe("Xero leave records read mapper", () => {
  it("maps AU leave application payloads into narrow Xero leave records", () => {
    const records = mapXeroLeaveRecords({
      LeaveApplications: [
        {
          EmployeeID: "11111111-1111-4111-8111-111111111111",
          EndDate: "2026-05-08",
          LeaveApplicationID: "22222222-2222-4222-8222-222222222222",
          LeavePeriods: [{ NumberOfUnits: 7.6 }, { NumberOfUnits: 7.6 }],
          LeaveType: "Annual Leave",
          LeaveTypeID: "annual",
          StartDate: "2026-05-07",
          Status: "APPROVED",
          Title: "Annual leave",
          UpdatedDateUTC: "2026-05-01T01:02:03.000Z",
        },
      ],
    });

    expect(records).toEqual([
      {
        employeeId: "11111111-1111-4111-8111-111111111111",
        endDate: "2026-05-08",
        leaveApplicationId: "22222222-2222-4222-8222-222222222222",
        leaveTypeId: "annual",
        leaveTypeName: "Annual Leave",
        rawPayload: expect.objectContaining({
          LeaveApplicationID: "22222222-2222-4222-8222-222222222222",
        }),
        startDate: "2026-05-07",
        status: "APPROVED",
        title: "Annual leave",
        units: 15.2,
        updatedDateUtc: "2026-05-01T01:02:03.000Z",
      },
    ]);
  });

  it("normalises known Xero status aliases", () => {
    const [scheduled, declined, pending] = mapXeroLeaveRecords({
      LeaveApplications: [
        { Status: "SCHEDULED" },
        { Status: "DECLINED" },
        { Status: "PENDING" },
      ],
    });

    expect(scheduled?.status).toBe("APPROVED");
    expect(declined?.status).toBe("REJECTED");
    expect(pending?.status).toBe("SUBMITTED");
  });

  it("maps AU V2 dates, period statuses, and PayItems leave-type names", () => {
    const [record] = mapXeroLeaveRecords(
      {
        LeaveApplications: [
          {
            EmployeeID: "11111111-1111-4111-8111-111111111111",
            EndDate: "/Date(1788912000000+0000)/",
            LeaveApplicationID: "22222222-2222-4222-8222-222222222222",
            LeavePeriods: [
              {
                LeavePeriodStatus: "REQUESTED",
                NumberOfUnits: 22.8,
              },
            ],
            LeaveTypeID: "annual",
            StartDate: "/Date(1788739200000+0000)/",
            Title: "Annual Leave",
            UpdatedDateUTC: "/Date(1788000000000+0000)/",
          },
        ],
      },
      new Map([["annual", "Annual Leave"]])
    );

    expect(record).toMatchObject({
      endDate: "2026-09-09",
      leaveTypeName: "Annual Leave",
      startDate: "2026-09-07",
      status: "SUBMITTED",
      updatedDateUtc: "2026-08-29T10:40:00.000Z",
    });
  });

  it.each([
    ["REQUESTED", "SUBMITTED"],
    ["SCHEDULED", "APPROVED"],
    ["PROCESSED", "APPROVED"],
    ["REJECTED", "REJECTED"],
  ] as const)(
    "derives %s application state from AU leave periods",
    (periodStatus, expected) => {
      const [record] = mapXeroLeaveRecords({
        LeaveApplications: [
          {
            LeavePeriods: [{ LeavePeriodStatus: periodStatus }],
          },
        ],
      });

      expect(record?.status).toBe(expected);
    }
  );
});
