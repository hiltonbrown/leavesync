import "server-only";

import type { Result } from "@repo/core";
import { database, scopedTo as scoped } from "@repo/database";
import { Prisma } from "@repo/database/generated/client";
import { publishOrganisationNotificationEvent } from "@repo/notifications";
import { log } from "@repo/observability/log";
import { noemailFallbackDomain } from "@repo/seo/branding";
import {
  ensureFreshXeroConnection,
  fetchEmployeesForRegion,
  toPlainLanguageMessage,
  type XeroEmployee,
  type XeroWriteError,
} from "@repo/xero";
import type { InngestFunction } from "inngest";
import { z } from "zod";
import { inngest } from "../client";

const SyncXeroPeopleInputSchema = z.object({
  clerkOrgId: z.string().min(1),
  organisationId: z.string().uuid(),
  triggeredByUserId: z.string().min(1).nullable().optional(),
  triggerType: z.enum(["scheduled", "manual", "webhook"]).default("manual"),
  xeroTenantId: z.string().uuid(),
});

export type SyncXeroPeopleInput = z.infer<typeof SyncXeroPeopleInputSchema>;

export type SyncXeroPeopleError =
  | { code: "validation_error"; message: string }
  | { code: "unknown_error"; message: string };

type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const BATCH_SIZE = 50;
const STALE_RUN_WINDOW_MS = 30 * 60 * 1000;
const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;

export const syncXeroPeopleFunction: InngestFunction.Any =
  inngest.createFunction(
    {
      cancelOn: [
        {
          event: "cancel-sync-run",
          if: "async.data.runId == event.data.runId",
        },
      ],
      id: "sync-xero-people",
      triggers: { event: "sync-xero-people" },
    },
    async ({ event, step }) =>
      await step.run("sync-people", async () => syncXeroPeople(event.data))
  );

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This handler coordinates run lifecycle, tenant readiness, batching, per-record outcomes and finalisation.
export async function syncXeroPeople(input: unknown): Promise<
  Result<
    {
      fetched: number;
      upserted: number;
      skipped: number;
      failed: number;
      runId: string;
      status: "cancelled" | "failed" | "partial_success" | "succeeded";
    },
    SyncXeroPeopleError
  >
> {
  const parsed = SyncXeroPeopleInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const context = parsed.data;
  const startedAt = new Date();
  let runId: string | null = null;

  try {
    const existingRun = await database.syncRun.findFirst({
      select: { id: true },
      where: {
        ...scoped(context),
        run_type: "people",
        started_at: { gte: new Date(Date.now() - STALE_RUN_WINDOW_MS) },
        status: "running",
        xero_tenant_id: context.xeroTenantId,
      },
    });

    if (existingRun) {
      const cancelled = await database.syncRun.create({
        data: {
          ...scoped(context),
          completed_at: new Date(),
          error_summary: "Another people sync run is already in progress",
          run_type: "people",
          started_at: startedAt,
          status: "cancelled",
          trigger_type: context.triggerType,
          triggered_by_user_id: context.triggeredByUserId ?? null,
          xero_tenant_id: context.xeroTenantId,
        },
        select: { id: true },
      });
      return {
        ok: true,
        value: emptyResult(cancelled.id, "cancelled"),
      };
    }

    const run = await database.syncRun.create({
      data: {
        ...scoped(context),
        run_type: "people",
        started_at: startedAt,
        status: "running",
        trigger_type: context.triggerType,
        triggered_by_user_id: context.triggeredByUserId ?? null,
        xero_tenant_id: context.xeroTenantId,
      },
      select: { id: true },
    });
    runId = run.id;

    await publishRunStatusChanged(context, run.id, "running");

    const prepared = await prepareTenant(context, run.id);
    if (!prepared.ready) {
      return prepared.result;
    }
    const { xeroTenant } = prepared;

    const counts = emptyCounts();

    if (
      xeroTenant.payroll_region === "NZ" ||
      xeroTenant.payroll_region === "UK"
    ) {
      log.info(
        `Sync people skipped for region ${xeroTenant.payroll_region} as it is not yet available.`
      );
      await completeRun(context, run.id, {
        counts,
        errorSummary: `${xeroTenant.payroll_region} payroll employee reads are not yet available.`,
        status: "succeeded",
      });
      return {
        ok: true,
        value: { ...counts, runId: run.id, status: "succeeded" },
      };
    }

    const employeesResult = await fetchEmployeesForRegion(
      xeroTenant.payroll_region,
      { xeroTenant }
    );
    if (!employeesResult.ok) {
      if (isBlanketFailure(employeesResult.error)) {
        await completeRun(context, run.id, {
          counts,
          errorSummary: toPlainLanguageMessage(employeesResult.error),
          status: "failed",
        });
        return {
          ok: true,
          value: { ...counts, runId: run.id, status: "failed" },
        };
      }
      await completeRun(context, run.id, {
        counts,
        errorSummary: employeesResult.error.message,
        status: "failed",
      });
      return {
        ok: true,
        value: { ...counts, runId: run.id, status: "failed" },
      };
    }

    const { employees } = employeesResult.value;
    counts.fetched = employees.length;

    for (let index = 0; index < employees.length; index += BATCH_SIZE) {
      const runState = await database.syncRun.findFirst({
        select: { cancel_requested_at: true },
        where: { ...scoped(context), id: run.id },
      });
      if (runState?.cancel_requested_at) {
        await completeRun(context, run.id, {
          counts,
          status: "cancelled",
        });
        return {
          ok: true,
          value: { ...counts, runId: run.id, status: "cancelled" },
        };
      }

      const batch = employees.slice(index, index + BATCH_SIZE);
      await processBatch(context, run.id, batch, counts);

      if (index + BATCH_SIZE < employees.length) {
        await sleep(150);
      }
    }

    await database.xeroTenant.updateMany({
      data: {
        last_people_sync_at: new Date(),
        last_sync_error_code: null,
        last_sync_error_message: null,
        people_stale_since: null,
      },
      where: { ...scoped(context), id: context.xeroTenantId },
    });

    const finalStatus = counts.failed > 0 ? "partial_success" : "succeeded";
    await completeRun(context, run.id, {
      counts,
      status: finalStatus,
    });

    return {
      ok: true,
      value: { ...counts, runId: run.id, status: finalStatus },
    };
  } catch (error) {
    log.error("Unhandled exception in syncXeroPeople:", { error });
    if (runId) {
      await completeRun(context, runId, {
        counts: emptyCounts(),
        errorSummary:
          error instanceof Error ? error.message : "Unhandled exception",
        status: "failed",
      });
    }
    return {
      error: {
        code: "unknown_error",
        message: "Failed to sync Xero employees.",
      },
      ok: false,
    };
  }
}

async function processBatch(
  context: SyncXeroPeopleInput,
  runId: string,
  batch: XeroEmployee[],
  counts: { upserted: number; failed: number }
) {
  for (const employee of batch) {
    const validation = validateEmployee(employee);
    if (!validation.valid) {
      await recordFailure(context, {
        errorCode: "validation_error",
        errorMessage: validation.message,
        rawPayload: employee.rawPayload,
        runId,
        sourceId: employee.employeeId || "unknown",
      });
      counts.failed += 1;
      continue;
    }

    try {
      const raw =
        employee.email ||
        `${employee.firstName}.${employee.lastName}@${noemailFallbackDomain}`;
      const email = raw.toLowerCase();
      const employmentType = mapEmploymentType(employee.employmentType);
      const personType =
        employmentType === "contractor" ? "contractor" : "employee";
      await database.person.upsert({
        create: {
          clerk_org_id: context.clerkOrgId,
          display_name: `${employee.firstName} ${employee.lastName}`,
          email,
          employment_type: employmentType,
          first_name: employee.firstName,
          is_active: employee.status === "ACTIVE",
          job_title: employee.jobTitle ?? null,
          last_name: employee.lastName,
          organisation_id: context.organisationId,
          person_type: personType,
          source_person_key: employee.employeeId,
          source_system: "XERO",
          start_date: employee.startDate ? new Date(employee.startDate) : null,
          xero_employee_id: employee.employeeId,
        },
        update: {
          display_name: `${employee.firstName} ${employee.lastName}`,
          email,
          employment_type: employmentType,
          first_name: employee.firstName,
          is_active: employee.status === "ACTIVE",
          job_title: employee.jobTitle ?? null,
          last_name: employee.lastName,
          person_type: personType,
          start_date: employee.startDate ? new Date(employee.startDate) : null,
          updated_at: new Date(),
          xero_employee_id: employee.employeeId,
        },
        where: {
          organisation_id_source_system_source_person_key: {
            organisation_id: context.organisationId,
            source_person_key: employee.employeeId,
            source_system: "XERO",
          },
        },
      });
      counts.upserted += 1;
    } catch (error) {
      await recordFailure(context, {
        errorCode: "db_error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Failed to upsert person record.",
        rawPayload: employee.rawPayload,
        runId,
        sourceId: employee.employeeId,
      });
      counts.failed += 1;
    }
  }
}

function validateEmployee(
  employee: XeroEmployee
): { valid: true } | { valid: false; message: string } {
  if (!(employee.employeeId && UUID_REGEX.test(employee.employeeId))) {
    return { message: "Invalid or missing Employee ID", valid: false };
  }
  if (!employee.firstName || employee.firstName.trim().length === 0) {
    return { message: "First name is required", valid: false };
  }
  if (!employee.lastName || employee.lastName.trim().length === 0) {
    return { message: "Last name is required", valid: false };
  }
  return { valid: true };
}

function mapEmploymentType(
  value: string | null
): "employee" | "contractor" | "director" | "offshore" {
  if (!value) {
    return "employee";
  }
  const type = value.toLowerCase().trim();
  if (type === "contractor") {
    return "contractor";
  }
  if (type === "director") {
    return "director";
  }
  if (type === "offshore") {
    return "offshore";
  }
  return "employee";
}

async function recordFailure(
  context: SyncXeroPeopleInput,
  input: {
    errorCode: string;
    errorMessage: string;
    rawPayload: unknown;
    runId: string;
    sourceId: string;
  }
) {
  await database.failedRecord.create({
    data: {
      clerk_org_id: context.clerkOrgId,
      entity_type: "people",
      error_code: input.errorCode,
      error_message: input.errorMessage,
      organisation_id: context.organisationId,
      raw_payload: toPrismaJsonValue(input.rawPayload),
      record_type: "people",
      source_id: input.sourceId,
      source_remote_id: input.sourceId,
      sync_run_id: input.runId,
    },
  });
}

async function completeRun(
  context: SyncXeroPeopleInput,
  runId: string,
  input: {
    counts: {
      fetched: number;
      upserted: number;
      skipped: number;
      failed: number;
    };
    errorSummary?: string;
    status: "cancelled" | "failed" | "partial_success" | "succeeded";
  }
) {
  await database.syncRun.updateMany({
    data: {
      completed_at: new Date(),
      error_summary: input.errorSummary ?? null,
      records_failed: input.counts.failed,
      records_fetched: input.counts.fetched,
      records_skipped: input.counts.skipped,
      records_synced: input.counts.upserted,
      records_upserted: input.counts.upserted,
      status: input.status,
    },
    where: { ...scoped(context), id: runId },
  });
  await publishRunStatusChanged(context, runId, input.status);
}

// Load the tenant, confirm the connection is usable, and refresh its access token
// proactively before any Xero read so a token that lapsed since the last sync does not fail
// the run. Terminal cases complete the run and are returned as a ready:false result.
async function prepareTenant(
  context: SyncXeroPeopleInput,
  runId: string
): Promise<
  | {
      ready: false;
      result: {
        ok: true;
        value: ReturnType<typeof emptyResult>;
      };
    }
  | {
      ready: true;
      xeroTenant: NonNullable<Awaited<ReturnType<typeof loadXeroTenant>>>;
    }
> {
  const loadedTenant = await loadXeroTenant(context);
  if (loadedTenant?.sync_paused_at) {
    await completeRun(context, runId, {
      counts: emptyCounts(),
      errorSummary: "Tenant sync is paused for this Xero connection",
      status: "cancelled",
    });
    return {
      ready: false,
      result: { ok: true, value: emptyResult(runId, "cancelled") },
    };
  }
  const notActive = async (): Promise<{
    ready: false;
    result: { ok: true; value: ReturnType<typeof emptyResult> };
  }> => {
    await completeRun(context, runId, {
      counts: emptyCounts(),
      errorSummary: "Xero connection not active",
      status: "failed",
    });
    return {
      ready: false,
      result: { ok: true, value: emptyResult(runId, "failed") },
    };
  };
  if (!loadedTenant) {
    return await notActive();
  }
  const freshness = await ensureFreshXeroConnection({
    clerkOrgId: context.clerkOrgId,
    connectionId: loadedTenant.xero_connection_id,
    organisationId: context.organisationId,
  });
  if (!freshness.ok) {
    return await notActive();
  }
  // Reload so the run uses the freshly persisted access token, not the stale one.
  const xeroTenant = freshness.value.refreshed
    ? await loadXeroTenant(context)
    : loadedTenant;
  if (!xeroTenant) {
    return await notActive();
  }
  return { ready: true, xeroTenant };
}

function loadXeroTenant(context: SyncXeroPeopleInput) {
  return database.xeroTenant.findFirst({
    include: {
      xero_connection: {
        select: {
          access_token_auth_tag: true,
          access_token_encrypted: true,
          access_token_iv: true,
          expires_at: true,
          last_refreshed_at: true,
          revoked_at: true,
          status: true,
        },
      },
    },
    where: {
      clerk_org_id: context.clerkOrgId,
      id: context.xeroTenantId,
      organisation_id: context.organisationId,
    },
  });
}

function isBlanketFailure(error: XeroWriteError): boolean {
  return error.code === "auth_error" || error.code === "rate_limit_error";
}

async function publishRunStatusChanged(
  context: SyncXeroPeopleInput,
  runId: string,
  status: string
) {
  try {
    await publishOrganisationNotificationEvent(
      {
        clerkOrgId: context.clerkOrgId,
        organisationId: context.organisationId,
      },
      {
        payload: {
          organisationId: context.organisationId,
          runId,
          runType: "people",
          status,
          xeroTenantId: context.xeroTenantId,
        },
        type: "sync.run_status_changed",
      }
    );
  } catch (error) {
    log.error("Failed to publish sync run status notification", {
      error,
      organisationId: context.organisationId,
      runId,
    });
  }
}

function emptyCounts() {
  return {
    failed: 0,
    fetched: 0,
    skipped: 0,
    upserted: 0,
  };
}

function emptyResult(
  runId: string,
  status: "cancelled" | "failed" | "partial_success" | "succeeded"
) {
  return {
    failed: 0,
    fetched: 0,
    runId,
    skipped: 0,
    status,
    upserted: 0,
  };
}

function toPrismaJsonValue(
  value: unknown
): Exclude<JsonValue, null> | typeof Prisma.JsonNull {
  const jsonValue = toJsonValue(value);
  return jsonValue === null ? Prisma.JsonNull : jsonValue;
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }
  if (typeof value === "object") {
    const output = Object.create(null) as Record<string, JsonValue>;
    for (const [key, item] of Object.entries(value)) {
      if (key !== "__proto__" && key !== "constructor" && key !== "prototype") {
        Reflect.set(output, key, toJsonValue(item));
      }
    }
    return output;
  }
  return String(value);
}

function validationError(
  error: z.ZodError
): Result<never, SyncXeroPeopleError> {
  return {
    error: {
      code: "validation_error",
      message: error.issues[0]?.message ?? "Invalid sync people request.",
    },
    ok: false,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
