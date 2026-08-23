import { database } from "@repo/database";

export default async function AutoBumpPage() {
  let result: unknown = null;
  let error: string | null = null;
  try {
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
    result = { upd, check, newExpiry: newExpiry.toISOString() };
  } catch (e) {
    error = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
  }
  return (
    <div style={{ padding: 24, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      <h1>Auto Bump e1c01b90 (A)</h1>
      {error ? <p style={{ color: "red" }}>{error}</p> : null}
      <pre>{JSON.stringify(result, null, 2)}</pre>
      <p>Next: visit <a href="/sync?xeroTenantId=2d9d06b2-9df7-43f2-8598-ca16c2c9fb40">/sync?xeroTenantId=2d9d06b2-9df7-43f2-8598-ca16c2c9fb40</a> and click Sync People.</p>
    </div>
  );
}
