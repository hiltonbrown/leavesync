"use server";

import { auth, currentUser } from "@repo/auth/server";
import {
  cancelRun,
  dispatchManualSync,
  exportFailedRecordsCsv,
  type SyncMonitorError,
  type SyncMonitorRole,
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
  | { code: "validation_error"; message: string };

interface SyncActionContext {
  actingRole: SyncMonitorRole;
  actingUserId: string;
  clerkOrgId: string;
  organisationId: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: manual sync dispatches inline handling for 4 run types and error surfacing
export async function dispatchManualSyncAction(input: {
  organisationId: string;
  runType: string;
  xeroTenantId: string;
}): Promise<
  Result<
    { eventName: string; queued: boolean; reason?: string },
    SyncActionError
  >
> {
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
  if (result.ok && result.value.queued) {
    const handlerPayload = {
      clerkOrgId: context.value.clerkOrgId,
      organisationId: context.value.organisationId,
      triggeredByUserId: context.value.actingUserId,
      triggerType: "manual" as const,
      xeroTenantId: parsed.data.xeroTenantId,
    };
    let syncResult: Result<unknown, { code: string; message: string }> | null =
      null;
    try {
      if (parsed.data.runType === "people") {
        syncResult = (await syncXeroPeople(
          handlerPayload
        )) as unknown as Result<unknown, { code: string; message: string }>;
      } else if (parsed.data.runType === "leave_records") {
        syncResult = (await syncXeroLeaveRecords(
          handlerPayload
        )) as unknown as Result<unknown, { code: string; message: string }>;
      } else if (parsed.data.runType === "leave_balances") {
        syncResult = (await syncXeroLeaveBalances(
          handlerPayload
        )) as unknown as Result<unknown, { code: string; message: string }>;
      } else if (parsed.data.runType === "approval_state_reconciliation") {
        syncResult = (await reconcileXeroApprovalState(
          handlerPayload
        )) as unknown as Result<unknown, { code: string; message: string }>;
      }
    } catch {
      // Sync run execution status is tracked in sync_runs
    }

    if (syncResult) {
      if (!syncResult.ok) {
        return {
          error: syncResult.error as SyncActionError,
          ok: false,
        };
      }
      const value = syncResult.value as {
        errorSummary?: string | null;
        status?: string;
      };
      if (value.status === "failed" || value.status === "cancelled") {
        return {
          error: {
            code: "sync_failed",
            message: value.errorSummary || "Sync run failed or was cancelled.",
          },
          ok: false,
        } as unknown as Result<never, SyncActionError>;
      }
    }

    revalidatePath("/sync");
    revalidatePath("/people");
    revalidatePath("/leave-approvals");
    revalidatePath("/notifications");
    revalidatePath("/settings/integrations/xero");
  }
  return result;
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
