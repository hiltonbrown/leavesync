import { database } from "@repo/database";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const xeroTenantId = url.searchParams.get("xeroTenantId") ?? "2d9d06b2-9df7-43f2-8598-ca16c2c9fb40";
  const runType = url.searchParams.get("runType");
  const where: Record<string, unknown> = { xero_tenant_id: xeroTenantId };
  if (runType) where["run_type"] = runType;
  const runs = await database.syncRun.findMany({
    where: where as never,
    orderBy: { started_at: "desc" },
    take: 5,
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
  return NextResponse.json({ ok: true, runs });
}
