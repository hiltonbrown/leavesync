import { database } from "@repo/database";
import { NextResponse } from "next/server";

async function doBump() {
  const newExpiry = new Date(Date.now() + 30 * 60 * 1000);
  const upd = await database.xeroConnection.update({
    where: { id: 'e1c01b90-1ae0-4a08-b818-f9b7e04bd4c1' },
    data: { expires_at: newExpiry, status: 'active', last_error_code: null, last_error_message: null },
    select: { id: true, expires_at: true, status: true },
  });
  const check = await database.xeroConnection.findUnique({
    where: { id: 'e1c01b90-1ae0-4a08-b818-f9b7e04bd4c1' },
    select: { id: true, status: true, expires_at: true },
  });
  return { ok: true, upd, check };
}

export async function POST() {
  try {
    const r = await doBump();
    return NextResponse.json(r, { status: r.ok ? 200 : 500 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const r = await doBump();
    return NextResponse.json(r, { status: r.ok ? 200 : 500 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
