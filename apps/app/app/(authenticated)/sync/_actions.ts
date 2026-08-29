"use server";

import { auth, currentUser } from "@repo/auth/server";
import {
  cancelRun,
  dispatchManualSync,
  exportFailedRecordsCsv,
  type SyncMonitorError,
  type SyncMonitorRole,
  type SyncRunType,
} from "@repo/availability";
import type { Result } from "@repo/core";
import {
  reconcileXeroApprovalState,
  syncXeroLeaveBalances,
  syncXeroLeaveRecords,
  syncXeroPeople,
} from "@repo/jobs";
import { revalidatePath } from "next/cache";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";
import {
  CancelRunActionSchema,
  DispatchManualSyncActionSchema,
  ExportFailedRecordsCsvActionSchema,
} from "./_schemas";

type SyncActionError =
  | SyncMonitorError
  | { code: "not_authorised"; message: string }
  | { code: "validation_error"; message: string }
  | { code: "sync_failed"; message: string };

interface SyncActionContext {
  actingRole: SyncMonitorRole;
  actingUserId: string;
  clerkOrgId: string;
  organisationId: string;
}

interface DispatchResultValue {
  errorSummary?: string | null;
  eventName: string;
  failed?: number;
  fetched?: number;
  queued: boolean;
  reason?: string;
  runId?: string;
  skipped?: number;
  status?: string;
  upserted?: number;
}

interface InlineSyncValue {
  errorSummary?: string | null;
  failed?: number;
  fetched?: number;
  runId?: string;
  skipped?: number;
  status?: string;
  upserted?: number;
}

interface InlineSyncPayload {
  clerkOrgId: string;
  organisationId: string;
  triggeredByUserId: string;
  triggerType: "manual";
  xeroTenantId: string;
}

export async function dispatchManualSyncAction(input: {
  organisationId: string;
  runType: string;
  xeroTenantId: string;
}): Promise<Result<DispatchResultValue, SyncActionError>> {
  const parsed = DispatchManualSyncActionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message);
  }
  const context = await syncActionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }
  const result = await dispatchManualSync({
    ...context.value,
    runType: parsed.data.runType,
    xeroTenantId: parsed.data.xeroTenantId,
  });

  if (result.ok) {
    return result;
  }

  const shouldFallbackToInline =
    result.error.code === "dispatch_failed" &&
    process.env.NODE_ENV !== "production";
  if (!shouldFallbackToInline) {
    return result;
  }

  const fallbackEventNames: Record<string, string> = {
    approval_state_reconciliation: "reconcile-xero-approval-state",
    leave_balances: "sync-xero-leave-balances",
    leave_records: "sync-xero-leave-records",
    people: "sync-xero-people",
  };
  const effectiveEventName =
    fallbackEventNames[parsed.data.runType] ?? parsed.data.runType;
  const handlerPayload = {
    clerkOrgId: context.value.clerkOrgId,
    organisationId: context.value.organisationId,
    triggeredByUserId: context.value.actingUserId,
    triggerType: "manual" as const,
    xeroTenantId: parsed.data.xeroTenantId,
  };
  let syncResult: Result<InlineSyncValue, SyncActionError>;
  try {
    syncResult = await executeInlineSync(parsed.data.runType, handlerPayload);
  } catch (error) {
    revalidateSyncPaths();
    return {
      error: {
        code: "sync_failed",
        message:
          error instanceof Error
            ? error.message
            : "Sync run threw an unexpected error.",
      },
      ok: false,
    };
  }

  revalidateSyncPaths();
  if (!syncResult.ok) {
    return syncResult;
  }
  const { value } = syncResult;
  if (value.status === "failed" || value.status === "cancelled") {
    return {
      error: {
        code: "sync_failed",
        message: value.errorSummary || "Sync run failed or was cancelled.",
      },
      ok: false,
    };
  }

  return {
    ok: true,
    value: {
      errorSummary: value.errorSummary ?? null,
      eventName: effectiveEventName,
      failed: value.failed ?? 0,
      fetched: value.fetched ?? 0,
      queued: true,
      runId: value.runId,
      skipped: value.skipped ?? 0,
      status: value.status,
      upserted: value.upserted ?? 0,
    },
  };
}

async function executeInlineSync(
  runType: SyncRunType,
  payload: InlineSyncPayload
): Promise<Result<InlineSyncValue, SyncActionError>> {
  if (runType === "people") {
    return await syncXeroPeople(payload);
  }
  if (runType === "leave_records") {
    return await syncXeroLeaveRecords(payload);
  }
  if (runType === "leave_balances") {
    return await syncXeroLeaveBalances(payload);
  }
  return await reconcileXeroApprovalState(payload);
}

function revalidateSyncPaths() {
  revalidatePath("/sync");
  revalidatePath("/people");
  revalidatePath("/leave-approvals");
  revalidatePath("/notifications");
  revalidatePath("/settings/integrations/xero");
}

export async function cancelRunAction(input: {
  organisationId: string;
  runId: string;
}): Promise<
  Result<{ cancellationRequested: true; eventQueued: boolean }, SyncActionError>
> {
  const parsed = CancelRunActionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message);
  }
  const context = await syncActionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }
  const result = await cancelRun({
    ...context.value,
    runId: parsed.data.runId,
  });
  if (result.ok) {
    revalidatePath("/sync");
    revalidatePath(`/sync/${parsed.data.runId}`);
  }
  return result;
}

export async function exportFailedRecordsCsvAction(input: {
  organisationId: string;
  runId: string;
}): Promise<Result<{ csvContent: string; filename: string }, SyncActionError>> {
  const parsed = ExportFailedRecordsCsvActionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message);
  }
  const context = await syncActionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }
  return await exportFailedRecordsCsv({
    ...context.value,
    runId: parsed.data.runId,
  });
}

async function syncActionContext(
  organisationId: string
): Promise<Result<SyncActionContext, SyncActionError>> {
  const [{ orgRole }, user, context] = await Promise.all([
    auth(),
    currentUser(),
    getActiveOrgContext(organisationId),
  ]);
  const role = effectiveRole(orgRole);
  if (!(user && role)) {
    return notAuthorised();
  }
  if (!context.ok) {
    return notAuthorised(context.error.message);
  }
  return {
    ok: true,
    value: {
      actingRole: role,
      actingUserId: user.id,
      clerkOrgId: context.value.clerkOrgId,
      organisationId: context.value.organisationId,
    },
  };
}

function effectiveRole(
  role: string | null | undefined
): SyncMonitorRole | null {
  if (role === "org:owner") {
    return "owner";
  }
  if (role === "org:admin") {
    return "admin";
  }
  return null;
}

function notAuthorised(message?: string): Result<never, SyncActionError> {
  return {
    error: {
      code: "not_authorised",
      message: message ?? "Only admins and owners can manage sync health.",
    },
    ok: false,
  };
}

function validationError(message?: string): Result<never, SyncActionError> {
  return {
    error: {
      code: "validation_error",
      message: message ?? "Invalid sync request.",
    },
    ok: false,
  };
}
