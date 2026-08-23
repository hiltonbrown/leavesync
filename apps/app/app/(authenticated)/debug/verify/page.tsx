export default async function VerifyPage() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let out: any = {};
  let err: string | null = null;
  try {
    const j = async (u: string, m: string) => {
      try {
        const r = await fetch(`${base}${u}`, { method: m, cache: "no-store", headers: { "x-verify": "headless" } });
        const t = await r.text();
        try { return { status: r.status, json: JSON.parse(t) }; } catch { return { status: r.status, text: t.slice(0,3000) }; }
      } catch (e) { return { error: String(e) }; }
    };
    // Drive debug bumps via public HTTP (each uses Neon HTTP driver server-side)
    out.getBump = await j("/debug/bump", "GET");
    out.postBump = await j("/debug/bump", "POST");
    out.getAutoBump = await j("/debug/auto-bump", "GET");
    out.getDebug = await j("/debug", "GET");
    out.getVerify = null;
    // Check sync pages reachable
    out.getSync = await j("/sync?xeroTenantId=2d9d06b2-9df7-43f2-8598-ca16c2c9fb40", "GET");
    out.getPeople = await j("/people", "GET");
    out.now = new Date().toISOString();
  } catch (e) {
    err = e instanceof Error ? e.message + "\n" + e.stack : String(e);
  }
  return (
    <div style={{ padding: 24, fontFamily: "monospace", whiteSpace: "pre-wrap", fontSize: 12 }}>
      <h1>HEADLESS Neon+HTTP Verification Pass (one uninterrupted, background)</h1>
      {err && <pre style={{ color: "red" }}>{err}</pre>}
      <pre>{JSON.stringify(out, null, 2)}</pre>
      <p>Neon HTTP driver runs server-side in /debug/bump etc.; this page drives them via public HTTP in one pass. Then drive POST Sync People/leave records/balances and /people Sync from Xero via UI — each should create sync_runs records_fetched&gt;0 status completed error_summary null.</p>
    </div>
  );
}
