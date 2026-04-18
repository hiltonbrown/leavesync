import type { Result } from "@repo/core";
import { database } from "@repo/database";
import type { availability_record_type } from "@repo/database/generated/enums";
import type { XeroTenantForWrite } from "../write/types";
import type { ResolutionError } from "./resolve-employee";

export async function resolveXeroLeaveTypeId(input: {
  personId: string;
  recordType: availability_record_type;
  xeroTenant: XeroTenantForWrite;
}): Promise<Result<string, ResolutionError>> {
  try {
    const person = await database.person.findFirst({
      where: {
        clerk_org_id: input.xeroTenant.clerk_org_id,
        organisation_id: input.xeroTenant.organisation_id,
        archived_at: null,
        id: input.personId,
      },
      select: { id: true },
    });

    if (!person) {
      return {
        ok: false,
        error: {
          code: "person_not_in_tenant",
          message: "Person does not belong to this Xero tenant.",
        },
      };
    }

    const balance = await database.leaveBalance.findFirst({
      where: {
        clerk_org_id: input.xeroTenant.clerk_org_id,
        organisation_id: input.xeroTenant.organisation_id,
        person_id: input.personId,
        record_type: input.recordType,
        xero_tenant_id: input.xeroTenant.id,
      },
      orderBy: { updated_at: "desc" },
      select: {
        leave_type_xero_id: true,
      },
    });

    if (!balance) {
      return {
        ok: false,
        error: {
          code: "missing_mapping",
          message: "Leave type is not mapped for this employee in Xero.",
        },
      };
    }

    return { ok: true, value: balance.leave_type_xero_id };
  } catch {
    return {
      ok: false,
      error: {
        code: "unknown_error",
        message: "Failed to resolve Xero leave type mapping.",
      },
    };
  }
}
