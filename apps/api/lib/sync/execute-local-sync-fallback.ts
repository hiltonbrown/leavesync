import type { Result } from "@repo/core";
import {
  reconcileXeroApprovalState,
  syncXeroLeaveBalances,
  syncXeroLeaveRecords,
  syncXeroPeople,
} from "@repo/jobs";

type LocalSyncRunType =
  | "approval_state_reconciliation"
  | "leave_balances"
  | "leave_records"
  | "people";

interface LocalSyncFallbackInput {
  actingUserId: string;
  clerkOrgId: string;
  organisationId: string;
  runType: LocalSyncRunType;
  xeroTenantId: string;
}

interface LocalSyncFallbackValue {
  eventName: string;
  failed: number;
  fetched?: number;
  queued: true;
  runId: string;
  skipped?: number;
  status: "partial_success" | "succeeded";
  upserted?: number;
}

export type LocalSyncFallbackError =
  | { code: "sync_failed"; message: string }
  | { code: "unknown_error"; message: string }
  | { code: "validation_error"; message: string };

const localEventNames: Record<LocalSyncRunType, string> = {
  approval_state_reconciliation: "reconcile-xero-approval-state",
  leave_balances: "sync-xero-leave-balances",
  leave_records: "sync-xero-leave-records",
  people: "sync-xero-people",
};

export async function executeLocalSyncFallback(
  input: LocalSyncFallbackInput
): Promise<Result<LocalSyncFallbackValue, LocalSyncFallbackError>> {
  const payload = {
    clerkOrgId: input.clerkOrgId,
    organisationId: input.organisationId,
    triggeredByUserId: input.actingUserId,
    triggerType: "manual" as const,
    xeroTenantId: input.xeroTenantId,
  };

  try {
    const syncResult = await executeLocalSync(input.runType, payload);
    if (!syncResult.ok) {
      return syncResult;
    }

    if (
      syncResult.value.status === "failed" ||
      syncResult.value.status === "cancelled"
    ) {
      return syncFailed("Sync run failed or was cancelled.");
    }

    const { value } = syncResult;
    const status =
      value.status === "partial_success" ? "partial_success" : "succeeded";
    return {
      ok: true,
      value: {
        eventName: localEventNames[input.runType],
        failed: value.failed,
        ...(hasCount(value, "fetched") ? { fetched: value.fetched } : {}),
        queued: true,
        runId: value.runId,
        ...(hasCount(value, "skipped") ? { skipped: value.skipped } : {}),
        status,
        ...(hasCount(value, "upserted") ? { upserted: value.upserted } : {}),
      },
    };
  } catch (error) {
    return syncFailed(
      error instanceof Error
        ? error.message
        : "Sync run threw an unexpected error."
    );
  }
}

async function executeLocalSync(
  runType: LocalSyncRunType,
  payload: {
    clerkOrgId: string;
    organisationId: string;
    triggeredByUserId: string;
    triggerType: "manual";
    xeroTenantId: string;
  }
) {
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

function hasCount<
  T extends object,
  K extends "fetched" | "skipped" | "upserted",
>(value: T, key: K): value is T & Record<K, number> {
  return key in value && typeof Reflect.get(value, key) === "number";
}

function syncFailed(message: string): Result<never, LocalSyncFallbackError> {
  return {
    error: { code: "sync_failed", message },
    ok: false,
  };
}
