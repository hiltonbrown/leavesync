import { auth } from "@repo/auth/server";
import { database } from "@repo/database";

export default async function DebugXeroPage() {
  const { orgId } = await auth();
  let rows: unknown = null;
  let error: string | null = null;
  try {
    const res = await database.xeroConnection.findUnique({
      where: { id: 'e1c01b90-1ae0-4a08-b818-f9b7e04bd4c1' },
      select: { id: true, status: true, expires_at: true, last_error_code: true, last_error_message: true },
    });
    rows = res ? [res] : [];
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  return (
    <div style={{ padding: 24, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      <h1>Xero Debug e1c01b90</h1>
      <p>orgId: {orgId ?? "none"}</p>
      <p>error: {error ?? "none"}</p>
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}
