import { describe, expect, it } from "vitest";
import { submitLeaveApplicationForRegion } from "./dispatch";

const input = {
  endsAt: new Date("2026-05-05T00:00:00.000Z"),
  startsAt: new Date("2026-05-04T00:00:00.000Z"),
  units: 2,
  xeroEmployeeId: "employee-1",
  xeroLeaveTypeId: "type-1",
  xeroTenant: {
    clerk_org_id: "org_1",
    id: "tenant_1",
    organisation_id: "00000000-0000-4000-8000-000000000001",
    payroll_region: "NZ" as const,
    xero_connection: {
      access_token_encrypted: "token",
      revoked_at: null,
    },
    xero_tenant_id: "xero-tenant-1",
  },
};

describe("write dispatch", () => {
  it("routes NZ to the documented scaffold", async () => {
    const result = await submitLeaveApplicationForRegion("NZ", input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        "NZ payroll write-back is not yet available."
      );
    }
  });

  it("routes UK to the documented scaffold", async () => {
    const result = await submitLeaveApplicationForRegion("UK", {
      ...input,
      xeroTenant: { ...input.xeroTenant, payroll_region: "UK" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        "UK payroll write-back is not yet available."
      );
    }
  });

  it("returns unknown_error for unsupported regions", async () => {
    const result = await submitLeaveApplicationForRegion("US", input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({
        code: "unknown_error",
        message: "Unsupported payroll region.",
      });
    }
  });
});
