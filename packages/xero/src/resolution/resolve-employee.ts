import type { Result } from "@repo/core";
import { database } from "@repo/database";
import type { XeroTenantForWrite } from "../write/types";

export type ResolutionError =
  | { code: "missing_mapping"; message: string }
  | { code: "person_not_in_tenant"; message: string }
  | { code: "unknown_error"; message: string };

export async function resolveXeroEmployeeId(input: {
  personId: string;
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
      select: {
        source_person_key: true,
        source_system: true,
      },
    });

    if (!person) {
      const exists = await database.person.findFirst({
        where: { id: input.personId },
        select: { id: true },
      });
      return {
        ok: false,
        error: {
          code: exists ? "person_not_in_tenant" : "missing_mapping",
          message: exists
            ? "Person does not belong to this Xero tenant."
            : "Person has not been synced from Xero.",
        },
      };
    }

    if (person.source_system !== "XERO" || !person.source_person_key) {
      return {
        ok: false,
        error: {
          code: "missing_mapping",
          message: "Person has not been synced from Xero.",
        },
      };
    }

    return { ok: true, value: person.source_person_key };
  } catch {
    return {
      ok: false,
      error: {
        code: "unknown_error",
        message: "Failed to resolve Xero employee mapping.",
      },
    };
  }
}
