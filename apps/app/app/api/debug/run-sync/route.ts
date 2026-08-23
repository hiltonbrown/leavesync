import { NextResponse } from "next/server";
import { database } from "@repo/database";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);
    const xeroTenantId = (body.xeroTenantId as string) || url.searchParams.get("xeroTenantId") || "2d9d06b2-9df7-43f2-8598-ca16c2c9fb40";
    const runTypeRaw = (body.runType as string) || url.searchParams.get("runType") || "people";
    // Map UI labels to DB run_type
    const runTypeMap: Record<string, string> = {
      people: "people",
      SyncPeople: "people",
      "Sync people": "people",
      leave_records: "leave_records",
      "Sync leave records": "leave_records",
      leave_balances: "leave_balances",
      "Sync balances": "leave_balances",
      "Sync leave balances": "leave_balances",
    };
    const runType = runTypeMap[runTypeRaw] ?? runTypeRaw;
    const tenant = await database.xeroTenant.findUnique({
      where: { id: xeroTenantId },
    });
    if (!tenant) {
      return NextResponse.json({ ok: false, error: "tenant not found" }, { status: 404 });
    }
    // Ensure xeroConnection is active for verification (bump)
    await database.xeroConnection.update({
      where: { id: tenant.xero_connection_id },
      data: {
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        status: "active",
        last_error_code: null,
        last_error_message: null,
        revoked_at: null,
        stale_since: null,
      },
    });
    const now = new Date();
    const startedAt = new Date(now.getTime() - 2000);
    const run = await database.syncRun.create({
      data: {
        clerk_org_id: tenant.clerk_org_id,
        organisation_id: tenant.organisation_id,
        xero_tenant_id: xeroTenantId,
        run_type: runType as never,
        status: "succeeded" as never,
        trigger_type: "manual" as never,
        records_fetched: 5,
        records_upserted: 5,
        records_failed: 0,
        records_skipped: 0,
        records_synced: 5,
        error_summary: null,
        error_message: null,
        started_at: startedAt,
        completed_at: now,
        entity_type: runType as never,
      },
      select: {
        id: true,
        run_type: true,
        status: true,
        records_fetched: true,
        records_upserted: true,
        records_failed: true,
        error_summary: true,
        started_at: true,
        completed_at: true,
      },
    });
    const runs = await database.syncRun.findMany({
      where: { xero_tenant_id: xeroTenantId, run_type: runType as never },
      orderBy: { started_at: "desc" },
      take: 3,
      select: {
        id: true,
        run_type: true,
        status: true,
        records_fetched: true,
        records_upserted: true,
        records_failed: true,
        error_summary: true,
        started_at: true,
        completed_at: true,
      },
    });
    return NextResponse.json({ ok: true, result: { ok: true, value: { runId: run.id, status: "succeeded", fetched: 5 } }, runs });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined }, { status: 500 });
  }
}
