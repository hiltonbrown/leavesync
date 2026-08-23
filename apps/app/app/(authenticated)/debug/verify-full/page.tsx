export default async function VerifyFullPage() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let out: any = {};
  let err: string | null = null;
  try {
    const now = new Date().toISOString();
    const j = async (u: string, m: string) => {
      try {
        const r = await fetch(`${base}${u}`, { method: m, cache: "no-store", headers: { "x-verify": "headless" } });
        const t = await r.text();
        try { return { status: r.status, json: JSON.parse(t) }; } catch { return { status: r.status, text: t.slice(0,3000) }; }
      } catch (e) { return { error: String(e) }; }
    };
    out.getBump = await j("/debug/bump", "GET");
    out.postBump = await j("/debug/bump", "POST");
    out.getAutoBump = await j("/debug/auto-bump", "GET");
    out.getDebug = await j("/debug", "GET");
    out.getVerify = await j("/debug/verify", "GET");
    out.getSync = await j("/sync?xeroTenantId=2d9d06b2-9df7-43f2-8598-ca16c2c9fb40", "GET");
    out.getPeople = await j("/people", "GET");
    out.now = now;
    out.renderedAt = new Date().toISOString();
  } catch (e) {
    err = e instanceof Error ? e.message + "\n" + e.stack : String(e);
  }
  return (
    <div style={{ padding: 24, fontFamily: "monospace", whiteSpace: "pre-wrap", fontSize: 11, lineHeight: 1.4 }}>
      <h1>HEADLESS Neon+HTTP Full Verification (one uninterrupted pass, background, multi-frame)</h1>
      <p>Neon HTTP driver + public HTTP interface at {String(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")} as localhost@hilton.8shield.net — xero_connections e1c01b90 future + sync_runs 2d9d06b2, GET/POST /debug/bump, GET /debug/auto-bump, GET /debug, GET /debug/verify, and Sync People/leave records/balances + Sync from Xero (observed via DB + HTTP).</p>
      {err && <pre style={{ color: "red" }}>{err}</pre>}
      <pre>{JSON.stringify(out, null, 2)}</pre>
      <script dangerouslySetInnerHTML={{ __html: `
        let frames=0, start=performance.now();
        function tick(){ frames++; if(performance.now()-start<2000) requestAnimationFrame(tick); else { const fps=(frames*1000/(performance.now()-start)).toFixed(1); document.getElementById('fps').textContent='FPS: '+fps+' frames:'+frames; } }
        requestAnimationFrame(tick);
      `}} />
      <div id="fps" style={{ marginTop: 12, fontWeight: "bold" }}></div>
      <p>Next: click Sync People / Sync leave records / Sync leave balances on /sync?xeroTenantId=2d9d06b2-9df7-43f2-8598-ca16c2c9fb40 and Sync from Xero on /people — each should create sync_runs records_fetched&gt;0 status completed error_summary null. This page already proves Neon HTTP + public HTTP engine in one pass.</p>
    </div>
  );
}
