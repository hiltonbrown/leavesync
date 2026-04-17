import type { ClerkOrgId, OrganisationId, Result } from "@repo/core";
import { appError } from "@repo/core";
import { database } from "../client";
import { scopedQuery } from "../tenant-query";

export interface SyncRunSummaryData {
  completedAt: Date | null;
  entityType: string | null;
  id: string;
  recordsFailed: number;
  recordsSynced: number;
  startedAt: Date;
  status: string;
}

export interface FailedRecordData {
  createdAt: Date;
  entityType: string;
  errorMessage: string;
  id: string;
  sourceId: string;
  syncRunId: string;
}

export interface AuditEventData {
  action: string;
  actorUserId: string | null;
  clerkOrgId: string;
  createdAt: Date;
  id: string;
  organisationId: OrganisationId;
  payload: unknown;
  resourceId: string | null;
  resourceType: string;
}

export async function getLatestSyncRunSummary(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId
): Promise<Result<SyncRunSummaryData | null>> {
  try {
    const syncRun = await database.syncRun.findFirst({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
      },
      select: {
        id: true,
        status: true,
        entity_type: true,
        records_synced: true,
        records_failed: true,
        started_at: true,
        completed_at: true,
      },
      orderBy: { started_at: "desc" },
    });

    if (!syncRun) {
      return {
        ok: true,
        value: null,
      };
    }

    return {
      ok: true,
      value: {
        id: syncRun.id,
        status: syncRun.status,
        entityType: syncRun.entity_type,
        recordsSynced: syncRun.records_synced,
        recordsFailed: syncRun.records_failed,
        startedAt: syncRun.started_at,
        completedAt: syncRun.completed_at,
      },
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to get latest sync run"),
    };
  }
}

export async function listRecentSyncRuns(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  limit?: number
): Promise<Result<SyncRunSummaryData[]>> {
  try {
    const syncRuns = await database.syncRun.findMany({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
      },
      select: {
        id: true,
        status: true,
        entity_type: true,
        records_synced: true,
        records_failed: true,
        started_at: true,
        completed_at: true,
      },
      orderBy: { started_at: "desc" },
      take: limit ?? 10,
    });

    return {
      ok: true,
      value: syncRuns.map((r) => ({
        id: r.id,
        status: r.status,
        entityType: r.entity_type,
        recordsSynced: r.records_synced,
        recordsFailed: r.records_failed,
        startedAt: r.started_at,
        completedAt: r.completed_at,
      })),
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to list sync runs"),
    };
  }
}

export async function listFailedRecordsForSyncRun(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  syncRunId: string
): Promise<Result<FailedRecordData[]>> {
  try {
    const failedRecords = await database.failedRecord.findMany({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        sync_run_id: syncRunId,
      },
      select: {
        id: true,
        sync_run_id: true,
        entity_type: true,
        source_id: true,
        error_message: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });

    return {
      ok: true,
      value: failedRecords.map((r) => ({
        id: r.id,
        syncRunId: r.sync_run_id,
        entityType: r.entity_type,
        sourceId: r.source_id,
        errorMessage: r.error_message,
        createdAt: r.created_at,
      })),
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to list failed records"),
    };
  }
}

export async function listRecentAuditEvents(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  limit?: number
): Promise<Result<AuditEventData[]>> {
  try {
    const auditEvents = await database.auditEvent.findMany({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
      },
      select: {
        id: true,
        clerk_org_id: true,
        organisation_id: true,
        actor_user_id: true,
        action: true,
        resource_type: true,
        resource_id: true,
        payload: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: limit ?? 20,
    });

    return {
      ok: true,
      value: auditEvents.map((e) => ({
        id: e.id,
        clerkOrgId: e.clerk_org_id,
        organisationId: e.organisation_id as OrganisationId,
        actorUserId: e.actor_user_id,
        action: e.action,
        resourceType: e.resource_type,
        resourceId: e.resource_id,
        payload: e.payload,
        createdAt: e.created_at,
      })),
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to list audit events"),
    };
  }
}
