# Plan 064: Stop the feed endpoint confirming revoked tokens, and minimise support PII

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- "apps/api/app/ical" apps/api/app/api/support packages/core/src/support-submission.ts`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plan 061 (same route file — land 061 first)
- **Category**: security
- **Planned at**: commit `121da2a`, 2026-08-12
- **Covers findings**: S-07, S-08

## Why this matters

**The feed endpoint discloses token history.** It returns 404 for a token that
never existed and 410 for one that is expired or revoked. Token guessing is not
the concern — 240 bits of `randomBytes` is not brute-forceable, and the
constant-time question is already settled as impractical. The concern is that
someone holding a token that was rotated away from them (a departed employee, a
leaked calendar URL) can distinguish "this was real and has been revoked" from
"this never existed". That is reconnaissance the endpoint has no reason to
provide.

The same endpoint is unauthenticated, has no rate limit at any layer in this
repo, and does a database round trip per request plus a full 366-day projection
render on a cache miss. That is a cheap amplification target.

**The support form exports tenant PII and imports untrusted text.** It copies
staff email, name and employer name into a GitHub issue, where they are readable
by every collaborator on that repo regardless of tenant and retained under
GitHub's lifecycle rather than the product's. Separately, end-user free text is
interpolated verbatim into the issue body — and issue bodies are routinely
consumed by CI bots, triage automation and AI coding agents, which makes the
support form an injection vector into whatever automation reads the tracker.

Whether the PII flow is acceptable is a product decision. Either way it should be
explicit rather than incidental.

## Current state

`apps/api/app/ical/[token]/route.ts:55-69`:

```ts
if (feedResult.error.code === "unknown_error") {
  log.warn(`Feed render failed: ${feedResult.error.code}`);
  return new Response("Temporarily unavailable", {
    headers: { "Retry-After": "60" },
    status: 503,
  });
}
return new Response("Not found", { status: 404 });
// ...
// Handle expired or revoked tokens
if (status === "expired" || status === "revoked") {
  return new Response("Gone", { status: 410 });
}
```

The 503 path is plan 043's retryable-error behaviour and must be preserved
exactly.

`apps/api` has no `proxy.ts` and no `middleware.ts` — only `env.ts`,
`next.config.ts` and instrumentation files exist at that level. There is no
request budget anywhere in the repo for this route.

`packages/core/src/support-submission.ts:140-152` — the metadata rows:

```ts
const rows: [label: string, value: string | undefined][] = [
  ["Category", CATEGORY_LABELS[input.category]],
  ["Priority", PRIORITY_LABELS[input.priority]],
  ["Page URL", input.page_url],
  ["Email override", input.email_override],
  ["Current route", input.current_route],
  ["Clerk organisation ID", input.clerk_org_id],
  ["Organisation ID", input.organisation_id],
  ["Organisation name", input.organisation_name],
  ["User ID", input.user_id],
  ["User email", input.user_email],
  ["User name", input.user_name],
  ["Environment", input.environment],
  ["App version", input.app_version],
];
```

`:118-126` interpolates `reproduction_steps`, `expected_outcome` and
`actual_outcome` verbatim into the same Markdown body.
`apps/api/app/api/support/github-issue/route.ts:74` passes
`user_email: getPrimaryEmail(user)`. The target repo comes from
`GITHUB_OWNER`/`GITHUB_REPO` (`apps/api/lib/github/keys.ts`), which are optional
env vars — the repo's visibility is not knowable from this codebase. An audit
event is already persisted internally at `route.ts:93-105`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| API suite | `cd apps/api && bunx vitest run` | 13 files / 101 tests baseline, plus new |

## Scope

**In scope**:
- `apps/api/app/ical/[token]/route.ts` and its co-located test
- `apps/api/proxy.ts` (create, for the rate limit)
- `packages/core/src/support-submission.ts` and its test
- `apps/api/app/api/support/github-issue/route.ts` and its test

**Out of scope**:
- The 503 retryable path from plan 043. Preserve it byte for byte.
- Feed token generation, hashing or rotation. Those are correct.
- Vercel Firewall rules. A repo-level limiter is what this plan can deliver;
  platform rules are the operator's to add and should be recommended, not
  assumed.
- Removing the internal audit event. It is the record that should *keep* the
  PII, inside the tenant boundary.

## Git workflow

- Branch: `advisor/064-public-surface-hardening`
- Conventional commits, e.g. `fix(api): return a uniform not-found for every unusable feed token`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Collapse the token-state responses

Return **404** uniformly for unknown, expired and revoked tokens. Keep the
distinction internally — log which case occurred, with the token hash prefix
rather than the token — so support can still answer "was this revoked?" from the
logs.

Leave the 503 retryable path untouched.

**Verify**: `cd apps/api && bunx vitest run` → the existing 410 test now expects
404; the 503 test is unchanged.

### Step 2: Add a rate limit at the `apps/api` edge

Create `apps/api/proxy.ts` with a limiter scoped to `/ical/*`, budgeted **per
token and per IP**. Set the budget generously: Outlook, Google and Apple poll on
their own schedules and a limit that trips on legitimate polling is worse than no
limit. Document the chosen numbers and the reasoning in a comment.

Note `packages/rate-limit` is on the forbidden list in `CLAUDE.md` — do not add a
dependency on it. Implement the limiter locally or use the KV client already in
use.

Return 429 with `Retry-After` when the budget is exceeded.

**Verify**: a test asserting a burst beyond the budget returns 429 and that
normal polling cadence does not.

### Step 3: Minimise what leaves the tenant boundary

Change the GitHub issue body to carry only the opaque identifiers —
`clerk_org_id`, `organisation_id`, `user_id` and the persisted audit-event id.
Drop `user_email`, `user_name`, `organisation_name` and `email_override` from the
issue body; they stay in the internal audit record.

**Verify**: `grep -c "User email\|User name\|Organisation name" packages/core/src/support-submission.ts`
→ `0`.

### Step 4: Fence the untrusted free text

Wrap `reproduction_steps`, `expected_outcome` and `actual_outcome` in a fenced
code block with an explicit "user-supplied, untrusted" marker, so automation
reading the tracker treats them as data. Escape any backtick sequence that would
break out of the fence.

**Verify**: a test asserting that a free-text field containing a fence sequence
cannot escape the code block.

## Test plan

- feed route: unknown token → 404
- feed route: expired token → 404 (was 410)
- feed route: revoked token → 404 (was 410)
- feed route: the internal log still distinguishes the three cases
- feed route: 503 retryable path unchanged
- feed route: burst beyond budget → 429 with `Retry-After`; normal cadence → 200
- support: issue body contains no email, user name or organisation name
- support: issue body contains the audit event id
- support: free text containing a code fence is escaped and stays inside the block

Verification: `bun run test` → exit 0, with at least 6 new or changed tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks
- [ ] `grep -c "410" apps/api/app/ical/[token]/route.ts` prints `0`
- [ ] `grep -c "Retry-After" apps/api/app/ical/[token]/route.ts` still shows the
      503 path intact
- [ ] `apps/api/proxy.ts` exists and scopes its limiter to the feed path
- [ ] `grep -c "user_email" packages/core/src/support-submission.ts` prints `0`
- [ ] No dependency on `packages/rate-limit` was added
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- Support genuinely needs the requester's email inside the GitHub issue to
  operate. That is a legitimate workflow constraint; the answer is then a private
  repo plus a documented data-flow notice, not a code change. Report rather than
  breaking the workflow.
- Adding `apps/api/proxy.ts` changes how existing routes resolve — the app has
  none today, so this is the first one, and it must not accidentally intercept
  the Inngest, webhook or SSE routes.
- The operator confirms Vercel Firewall already rate-limits this path. Then Step
  2 is redundant; do Steps 1, 3 and 4 and say so.
- You cannot determine whether the configured GitHub repo is private. Report it
  as an open question; the code change is still correct either way.

## Maintenance notes

- The rule: a public endpoint should not let its response codes reconstruct the
  history of a credential. Unknown and revoked look the same from outside.
- Anything written into an external tracker is outside the tenant boundary and
  outside the product's retention policy. New fields added to the support payload
  should default to staying in the audit record.
- If the ICS endpoint ever gains legitimate high-frequency clients, the budget
  from Step 2 is the first thing to revisit — and it should be revisited with
  logs, not guesses.
