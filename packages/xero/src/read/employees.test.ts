import { describe, expect, it } from "vitest";
import { mapXeroEmployees, tryMapXeroEmployees } from "./employees";

describe("mapXeroEmployees", () => {
  it("maps employee IDs with EmployeeID taking precedence over EmployeeId", () => {
    const employees = mapXeroEmployees({
      Employees: [
        {
          EmployeeID: "11111111-1111-4111-8111-111111111111",
          EmployeeId: "22222222-2222-4222-8222-222222222222",
          FirstName: "Ada",
          LastName: "Lovelace",
        },
        {
          EmployeeId: "33333333-3333-4333-8333-333333333333",
          FirstName: "Grace",
          LastName: "Hopper",
        },
      ],
    });

    expect(employees.map((employee) => employee.employeeId)).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "33333333-3333-4333-8333-333333333333",
    ]);
  });

  it("trims optional string fields and maps whitespace-only values to null", () => {
    const [employee] = mapXeroEmployees({
      Employees: [
        {
          Email: " ada@example.com ",
          EmployeeID: "11111111-1111-4111-8111-111111111111",
          EmploymentType: " Full Time ",
          FirstName: "Ada",
          JobTitle: " Engineer ",
          LastName: "Lovelace",
          StartDate: " 2026-01-01 ",
          Status: " ACTIVE ",
        },
      ],
    });

    expect(employee).toEqual({
      email: "ada@example.com",
      employeeId: "11111111-1111-4111-8111-111111111111",
      employmentType: "Full Time",
      firstName: "Ada",
      jobTitle: "Engineer",
      lastName: "Lovelace",
      rawPayload: expect.objectContaining({
        EmployeeID: "11111111-1111-4111-8111-111111111111",
      }),
      startDate: "2026-01-01",
      status: "ACTIVE",
    });

    const [blankEmployee] = mapXeroEmployees({
      Employees: [
        {
          Email: " ",
          EmployeeID: "22222222-2222-4222-8222-222222222222",
          EmploymentType: " ",
          FirstName: "Grace",
          JobTitle: " ",
          LastName: "Hopper",
          StartDate: " ",
          Status: " ",
        },
      ],
    });

    expect(blankEmployee).toEqual(
      expect.objectContaining({
        email: null,
        employmentType: null,
        jobTitle: null,
        startDate: null,
        status: null,
      })
    );
  });

  it("returns an empty list for malformed payloads", () => {
    expect(mapXeroEmployees(null)).toEqual([]);
    expect(mapXeroEmployees({})).toEqual([]);
    expect(mapXeroEmployees({ Employees: "not an array" })).toEqual([]);
    expect(
      mapXeroEmployees({
        Employees: [
          {
            EmployeeID: "not-a-uuid",
            FirstName: "Ada",
            LastName: "Lovelace",
          },
        ],
      })
    ).toEqual([]);
  });
});

describe("tryMapXeroEmployees record-level isolation", () => {
  it("keeps valid neighbours when a malformed record sits between them", () => {
    const result = tryMapXeroEmployees({
      Employees: [
        {
          EmployeeID: "11111111-1111-4111-8111-111111111111",
          FirstName: "Ada",
          LastName: "Lovelace",
        },
        // Malformed: EmployeeID is not a valid UUID shape.
        {
          EmployeeID: "not-a-uuid",
          FirstName: "Broken",
          LastName: "Record",
        },
        {
          EmployeeID: "22222222-2222-4222-8222-222222222222",
          FirstName: "Grace",
          LastName: "Hopper",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.employees.map((e) => e.employeeId)).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({ index: 1 });
    // Raw item count reflects every record Xero sent, valid or not.
    expect(result.rawItemCount).toBe(3);
  });

  it("records a failure with no resolvable EmployeeID and no raw id", () => {
    const result = tryMapXeroEmployees({
      Employees: [
        {
          FirstName: "No",
          LastName: "Id",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.employees).toEqual([]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        index: 0,
        rawEmployeeId: null,
        reason: "Missing Employee ID",
      }),
    ]);
    expect(result.seenEmployeeIds).toEqual([]);
  });

  it("captures the raw EmployeeID for a record that fails schema parsing", () => {
    const result = tryMapXeroEmployees({
      Employees: [
        {
          EmployeeID: "not-a-uuid",
          FirstName: "Broken",
          LastName: "Record",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.employees).toEqual([]);
    // seenEmployeeIds is populated from the raw payload before validation
    // runs, so this id is still accounted for even though the record fails.
    expect(result.seenEmployeeIds).toEqual(["not-a-uuid"]);
    expect(result.failures).toEqual([
      expect.objectContaining({ index: 0, rawEmployeeId: "not-a-uuid" }),
    ]);
  });

  it("does not treat a missing first or last name as a mapper-level failure", () => {
    // Names are a Team Calendar import requirement enforced by the sync job
    // handler, not something the page mapper asserts on.
    const result = tryMapXeroEmployees({
      Employees: [
        {
          EmployeeID: "11111111-1111-4111-8111-111111111111",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.failures).toEqual([]);
    expect(result.employees).toEqual([
      expect.objectContaining({
        employeeId: "11111111-1111-4111-8111-111111111111",
        firstName: "",
        lastName: "",
      }),
    ]);
  });

  it("passes every provider status straight through without validating it", () => {
    const result = tryMapXeroEmployees({
      Employees: [
        {
          EmployeeID: "11111111-1111-4111-8111-111111111111",
          FirstName: "Active",
          LastName: "Person",
          Status: "ACTIVE",
        },
        {
          EmployeeID: "22222222-2222-4222-8222-222222222222",
          FirstName: "Terminated",
          LastName: "Person",
          Status: "TERMINATED",
        },
        {
          EmployeeID: "33333333-3333-4333-8333-333333333333",
          FirstName: "Inactive",
          LastName: "Person",
          Status: "INACTIVE",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.employees.map((e) => e.status)).toEqual([
      "ACTIVE",
      "TERMINATED",
      "INACTIVE",
    ]);
    expect(result.failures).toEqual([]);
  });

  it("reports rawItemCount using raw cardinality even when every record fails", () => {
    const result = tryMapXeroEmployees({
      Employees: [{ FirstName: "No", LastName: "Id" }, null, 42],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.employees).toEqual([]);
    expect(result.failures).toHaveLength(3);
    expect(result.rawItemCount).toBe(3);
  });

  it("returns ok: false only when the envelope itself cannot be read", () => {
    expect(tryMapXeroEmployees(null)).toEqual({ ok: false });
    expect(tryMapXeroEmployees({})).toEqual({ ok: false });
    expect(tryMapXeroEmployees({ Employees: "not an array" })).toEqual({
      ok: false,
    });
  });
});
