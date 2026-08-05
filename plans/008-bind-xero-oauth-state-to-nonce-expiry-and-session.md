# Plan 008: Bind the Xero OAuth state to a nonce, an expiry, and the initiating browser

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7821f3a..HEAD -- packages/xero/src/oauth/service.ts apps/api/app/api/xero/oauth/start/route.ts apps/api/app/api/xero/oauth/callback/route.ts 'apps/app/app/(authenticated)/settings/integrations/xero/connect/page.tsx' 'apps/app/app/(authenticated)/settings/integrations/xero/connect/_actions.ts'`
> If any changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding. On a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `7821f3a`, 2026-08-05
- **Execution status**: BLOCKED on 2026-08-05. The isolated retry passes
  typecheck, lint and 55 focused OAuth and confirmation-flow tests, but the
  required direct API test command fails in two unrelated support suites and
  the root unit-test gate fails before app tests load because installed `react`
  and `react-dom` patch versions differ. The retry also exposed that the
  required nonce-mismatch warning needs the undeclared observability workspace
  dependency; scope and steps now include that manifest and lockfile change.

## Why this matters

The Xero OAuth `state` parameter is an HMAC over a payload containing only
`clerkOrgId`, `organisationId`, `returnTo` and `userId`. It has no nonce, no
issued-at timestamp and no expiry, so the same inputs always produce a
byte-identical value that stays valid forever. Verification checks the HMAC and
nothing else: no replay store, no time window, no cookie.

A `state` value is not a secret in practice. It travels in the browser address
bar, is sent in the `Referer` to `login.xero.com`, and persists in browser
history, proxy logs and analytics. The OAuth callback route performs no
authentication of its own, so anyone holding a `state` can drive a token
exchange attributed to that Clerk organisation at any point in the future,
planting a pending session whose Xero tenant they control. A legitimate admin
who then visits the connect confirmation screen can bind the organisation's
payroll writes to an attacker-chosen Xero connection.

This is the standard OAuth CSRF and session-fixation gap. The token is
unforgeable, which is necessary but not sufficient: it also has to be bound to a
browser session and a time window, and it has to be single-use enough that a
leaked value is not a durable capability.

## Current state

### Relevant files

- `packages/xero/src/oauth/service.ts` — the state payload type (line 28),
  `signState` (line 1474), `verifyState` (line 1483), the authorise-URL builder
  (lines 90-115), `completeXeroOAuth` (line 118) and `loadPendingSession`
  (line 1173).
- `apps/api/app/api/xero/oauth/start/route.ts` — the authenticated entry point.
- `apps/api/app/api/xero/oauth/callback/route.ts` — the unauthenticated
  callback.
- `apps/app/app/(authenticated)/settings/integrations/xero/connect/page.tsx` —
  the authenticated pending-session reader.
- `apps/app/app/(authenticated)/settings/integrations/xero/connect/_actions.ts`
  — the authenticated tenant-selection writer.

### The state payload has no nonce and no timestamp

`packages/xero/src/oauth/service.ts:28-33`:

```typescript
interface OAuthStatePayload {
  clerkOrgId: string;
  organisationId: null | string;
  returnTo: string;
  userId: null | string;
}
```

### Signing is deterministic

`packages/xero/src/oauth/service.ts:1474-1481`:

```typescript
function signState(payload: OAuthStatePayload, clientSecret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingKey = deriveStateSigningKey(clientSecret);
  const signature = createHmac("sha256", signingKey)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}
```

### Verification checks only the signature and the shape

`packages/xero/src/oauth/service.ts:1483-1530`:

```typescript
function verifyState(value: string): Result<OAuthStatePayload, XeroOAuthError> {
  const clientSecret = stateSecret();
  if (!clientSecret) {
    return oauthNotConfigured();
  }

  const [encoded, signature] = value.split(".");
  if (!(encoded && signature)) {
    return invalidState();
  }

  const signingKey = deriveStateSigningKey(clientSecret);
  const expected = createHmac("sha256", signingKey)
    .update(encoded)
    .digest("base64url");
  const matches =
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!matches) {
    return invalidState();
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<OAuthStatePayload>;
    if (
      typeof payload.clerkOrgId !== "string" ||
      typeof payload.returnTo !== "string"
    ) {
      return invalidState();
    }
    return {
      ok: true,
      value: { /* ... */ },
    };
  } catch {
    return invalidState();
  }
}
```

The constant-time comparison here is correct. Do not change it.

### The state is minted in the authorise-URL builder

`packages/xero/src/oauth/service.ts:101-113`:

```typescript
  url.searchParams.set(
    "state",
    signState(
      {
        clerkOrgId: input.clerkOrgId,
        organisationId: input.organisationId ?? null,
        returnTo: input.returnTo ?? "/settings/integrations/xero",
        userId: input.userId ?? null,
      },
      clientSecret
    )
  );

  return { ok: true, value: { redirectUrl: url.toString() } };
```

### The start route is properly authenticated

`apps/api/app/api/xero/oauth/start/route.ts` calls `requireOrg()`, `currentUser()`
and requires `org:admin` or `org:owner`, and rejects a `clerkOrgId` that does not
match the authenticated one. It ends with:

```typescript
  return NextResponse.redirect(result.value.redirectUrl);
```

This route is correct. The only change it needs is to also set the nonce cookie.

### The callback route authenticates nothing

`apps/api/app/api/xero/oauth/callback/route.ts` in full: it checks
`isPreviewDeployment()`, reads `code` and `state` from the query string, and
calls `completeXeroOAuth({ code, state })`. There is no `requireOrg`, no
`requireRole`, and no cookie check.

That is not by itself wrong: OAuth callbacks are entered by redirect from the
provider and cannot rely on a role check. It is wrong only because `state`
carries no session binding, which is what this plan adds.

### Pending sessions are not scoped to their creator

`packages/xero/src/oauth/service.ts:1173-1179` — `loadPendingSession` filters by
`clerk_org_id` and `id` only, never `created_by_user_id`, so any admin or owner
in the organisation can finalise a pending session they did not start. The
session row does record `created_by_user_id` (see `completeXeroOAuth`, which
sets it from `state.value.userId`).

### Repo conventions that apply here

- All Xero logic lives in `packages/xero`. Route handlers in `apps/api` map
  `Result` errors to HTTP responses.
- Service functions return `Result<T, E>`; do not throw for expected failures.
- Zod validates external input.
- Xero OAuth tokens are encrypted at rest with AES-256-GCM. Do not alter the
  crypto in this plan.
- Structured logging via `@repo/observability/log`. No `console.log`.
- TypeScript strict mode, no `any`, named exports only.
- Australian English in comments and user-facing copy. No em dashes anywhere.
- Tests are co-located; `apps/api/app/api/xero/oauth/start/route.test.ts`
  already exists and shows the route-test pattern for this area.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Xero tests | `bunx vitest run packages/xero` | all pass |
| API tests | `bunx vitest run apps/api` | all pass |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, run
`bun install` first. That error is a stale-install artifact, not a code defect.

## Scope

**In scope** (the only files you may modify):

- `packages/xero/src/oauth/service.ts`
- `packages/xero/src/oauth/service.test.ts` (create if absent)
- `packages/xero/package.json`
- `bun.lock`
- `apps/api/app/api/xero/oauth/start/route.ts`
- `apps/api/app/api/xero/oauth/start/route.test.ts`
- `apps/api/app/api/xero/oauth/callback/route.ts`
- `apps/api/app/api/xero/oauth/callback/route.test.ts` (create)
- `apps/app/app/(authenticated)/settings/integrations/xero/connect/page.tsx`
- `apps/app/app/(authenticated)/settings/integrations/xero/connect/_actions.ts`
- `apps/app/app/(authenticated)/settings/integrations/xero/connect/_actions.test.ts`
- `packages/xero/index.ts` — only if a new export is genuinely required

**Out of scope** (do NOT touch, even though they look related):

- `packages/xero/src/crypto/tokens.ts` and anything to do with token encryption.
- The `isPreviewDeployment()` gate at the top of the callback route. It must
  stay exactly as it is; removing it would let preview deployments attempt token
  exchanges they cannot complete.
- The constant-time HMAC comparison in `verifyState`. It is already correct.
- Any database migration. This plan deliberately achieves single-use through a
  browser-bound cookie rather than a new replay-store table, because a schema
  change here is a larger and riskier unit of work. See "Maintenance notes".
- `apps/app/app/(authenticated)/settings/integrations/xero/connect/connect-client.tsx`
  and any other confirmation-flow UI files. The page, action and action test
  explicitly named above are the only permitted exceptions; its `returnTo`
  handling is already safe and must not change.

## Git workflow

- Branch: `advisor/008-xero-oauth-state-binding`
- Conventional commits, one logical change per commit. Example from `git log`:
  `fix(api): fail closed when the Clerk webhook secret is missing`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add `nonce` and `issuedAt` to the state payload

In `packages/xero/src/oauth/service.ts`, extend the interface:

```typescript
interface OAuthStatePayload {
  clerkOrgId: string;
  issuedAt: number;
  nonce: string;
  organisationId: null | string;
  returnTo: string;
  userId: null | string;
}
```

`issuedAt` is milliseconds since epoch (`Date.now()`). `nonce` is 32 random
bytes, base64url encoded, generated with `randomBytes` from `node:crypto` (the
module is already imported in this file for `createHmac`, `hkdfSync` and
`timingSafeEqual`).

**Verify**: `bun run typecheck` → exit 0 (it will fail until Steps 2 and 3 are
done; that is expected, so run this verification after Step 3).

### Step 2: Mint the nonce and return it alongside the redirect URL

Change the authorise-URL builder so it generates a nonce, includes it and
`issuedAt` in the signed payload, and returns the nonce to its caller so the
route can set a cookie:

```typescript
  const nonce = randomBytes(32).toString("base64url");
  url.searchParams.set(
    "state",
    signState(
      {
        clerkOrgId: input.clerkOrgId,
        issuedAt: Date.now(),
        nonce,
        organisationId: input.organisationId ?? null,
        returnTo: input.returnTo ?? "/settings/integrations/xero",
        userId: input.userId ?? null,
      },
      clientSecret
    )
  );

  return { ok: true, value: { nonce, redirectUrl: url.toString() } };
```

### Step 3: Enforce expiry and shape in `verifyState`

Add a module-level constant next to the other OAuth constants:

```typescript
const STATE_MAX_AGE_MS = 10 * 60 * 1000;
```

In `verifyState`, after the existing HMAC check and inside the parse block, add
validation for the two new fields and reject anything outside the window:

```typescript
    if (
      typeof payload.clerkOrgId !== "string" ||
      typeof payload.returnTo !== "string" ||
      typeof payload.nonce !== "string" ||
      typeof payload.issuedAt !== "number"
    ) {
      return invalidState();
    }
    if (Date.now() - payload.issuedAt > STATE_MAX_AGE_MS) {
      return invalidState();
    }
```

Include `issuedAt` and `nonce` in the returned value object.

Ten minutes is comfortably longer than a real Xero consent flow and short enough
that a state found in a log is useless.

**Verify**: `bun run typecheck` → exit 0.

### Step 4: Set the nonce cookie on the start route

In `apps/api/app/api/xero/oauth/start/route.ts`, replace the final redirect so
it also sets an `HttpOnly` cookie carrying the nonce:

```typescript
  const response = NextResponse.redirect(result.value.redirectUrl);
  response.cookies.set("xero_oauth_nonce", result.value.nonce, {
    httpOnly: true,
    maxAge: 600,
    path: "/api/xero/oauth",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
```

`sameSite: "lax"` is required and correct: the callback is entered as a
top-level GET navigation from Xero, and Lax cookies are sent on those. `strict`
would break the flow.

`secure` is conditional on production only so local HTTP development still
works.

**Verify**: `bunx vitest run apps/api/app/api/xero/oauth/start/route.test.ts`
→ passes after you update the existing assertions for the new response shape.

### Step 5: Require the nonce to match at the callback

In `apps/api/app/api/xero/oauth/callback/route.ts`, read the cookie and pass it
to `completeXeroOAuth`. Keep the `isPreviewDeployment()` gate first.

```typescript
  const nonce = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("xero_oauth_nonce="))
    ?.slice("xero_oauth_nonce=".length);

  const result = await completeXeroOAuth({ code, nonce: nonce ?? null, state });
```

Prefer `cookies()` from `next/headers` if it is already used elsewhere in
`apps/api`; check with
`grep -rn "from \"next/headers\"" apps/api` and match whatever the app already
does rather than introducing a second style.

On success, clear the cookie on the redirect response:

```typescript
  const response = NextResponse.redirect(new URL(result.value.redirectTo, appBaseUrl));
  response.cookies.delete("xero_oauth_nonce");
  return response;
```

Clearing the cookie is what makes the flow effectively single-use per browser.

**Verify**: `bun run typecheck` → exit 0.

### Step 6: Compare the nonce in `completeXeroOAuth`

Change `completeXeroOAuth`'s input to accept `nonce: null | string`, and after
`verifyState` succeeds, compare it against the state's nonce using a
constant-time comparison, mirroring the existing HMAC comparison style:

```typescript
  const expectedNonce = Buffer.from(state.value.nonce);
  const providedNonce = Buffer.from(input.nonce ?? "");
  if (
    expectedNonce.length !== providedNonce.length ||
    !timingSafeEqual(expectedNonce, providedNonce)
  ) {
    return invalidState();
  }
```

Log the rejection at `warn` with `clerkOrgId` from the state, so a genuine
attack or a misconfigured deployment is visible. Do not log the nonce or the
state value.

`packages/xero/package.json` does not currently declare the logger package.
Before importing it, add `"@repo/observability": "*"` to its `dependencies`
next to the other workspace packages, then run `bun install` so `bun.lock`
records the workspace edge. Import `log` from `@repo/observability/log` and
match the existing service call shape, for example
`log.warn("Rejected Xero OAuth callback with mismatched nonce", { clerkOrgId })`.
The log data must contain only `clerkOrgId`; never include the state, nonce,
authorisation code or tokens.

**Verify**: `bun run typecheck` → exit 0.

### Step 7: Scope pending sessions to their creator

In `loadPendingSession` (line 1173), add `created_by_user_id` to the `where`
clause, taking a required acting user id from the caller. Add the required
`userId` input to both public callers, then thread it through to
`loadPendingSession`:

- In `connect/page.tsx`, destructure `userId` from the existing `auth()`
  result, require it alongside `orgId` and `session`, and pass it to
  `getPendingXeroOAuthSession`.
- In `connect/_actions.ts`, pass the already-resolved `user.id` to
  `completeXeroTenantSelection`.

The page remains protected by `requirePageRole("org:admin")`; do not weaken
that guard. The new `userId` inputs must not be optional. Trace the callers
before editing:

```
grep -n "loadPendingSession" packages/xero/src/oauth/service.ts
```

If a caller does not currently have the acting user id available, STOP rather
than making the filter optional. A filter that can be skipped is not a filter.

If a pending session exists but belongs to another user, return the existing
not-found error rather than a distinct one, so the response does not
distinguish the two cases.

**Verify**: `bun run typecheck` → exit 0.

### Step 8: Add tests

In `packages/xero/src/oauth/service.test.ts` (create if absent), cover
`verifyState`:

1. A state signed just now with a valid nonce verifies.
2. A state whose `issuedAt` is 11 minutes old is rejected.
3. A state with a tampered payload (valid JSON, wrong signature) is rejected.
4. A state missing `nonce` is rejected.
5. Two calls to the authorise-URL builder with identical inputs produce
   **different** `state` values. This is the regression test for determinism.

In `apps/api/app/api/xero/oauth/callback/route.test.ts` (create), cover:

6. A callback with a valid state but no `xero_oauth_nonce` cookie returns 400
   and does NOT call the token exchange.
7. A callback whose cookie nonce does not match the state's nonce returns 400
   and does NOT call the token exchange.
8. A callback with a matching nonce proceeds and redirects.
9. The preview-deployment gate still returns 403 before anything else runs.

Update `connect/_actions.test.ts` to assert that the call to
`completeXeroTenantSelection` includes the authenticated `user.id`.

Update `apps/api/app/api/xero/oauth/start/route.test.ts` for the cookie on the
redirect response.

**Verify**: `bunx vitest run packages/xero apps/api` → all pass.

### Step 9: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0, and
`bun run check` → exit 0.

## Test plan

- New tests: 5 cases in `packages/xero/src/oauth/service.test.ts`, 4 cases in a
  new `apps/api/app/api/xero/oauth/callback/route.test.ts`, plus updates to the
  existing start-route test.
- Structural pattern to copy: `apps/api/app/api/xero/oauth/start/route.test.ts`
  for route handler tests in this app.
- The two load-bearing assertions: identical inputs produce different `state`
  values (proves the nonce is real), and a callback without a matching cookie
  never reaches the token exchange (proves the binding is enforced).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `grep -n "STATE_MAX_AGE_MS" packages/xero/src/oauth/service.ts` returns at
      least two matches (the constant and its use)
- [ ] `grep -n "xero_oauth_nonce" apps/api/app/api/xero/oauth/start/route.ts apps/api/app/api/xero/oauth/callback/route.ts`
      returns matches in both files
- [ ] `grep -n "created_by_user_id" packages/xero/src/oauth/service.ts` returns
      a match inside `loadPendingSession`
- [ ] `rg -n '"@repo/observability": "\*"' packages/xero/package.json`
      confirms the Xero package declares its logger dependency
- [ ] `rg -n "userId" 'apps/app/app/(authenticated)/settings/integrations/xero/connect/page.tsx' 'apps/app/app/(authenticated)/settings/integrations/xero/connect/_actions.ts'`
      shows each caller passes an acting user id to the Xero package
- [ ] `bunx vitest run packages/xero apps/api` passes with at least 9 new cases
- [ ] `git status --short` shows only in-scope files modified
- [ ] Status row for plan 008 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- Any excerpt in "Current state" does not match the live code.
- `apps/api` turns out to be deployed on a different origin from the OAuth
  callback URL. Check `callbackUrl()` in `packages/xero/src/oauth/service.ts`
  and the `XERO_REDIRECT_URI` env var. If the callback is not same-origin with
  `/api/xero/oauth/start`, the cookie will not be sent and this design does not
  work. Report it; the fallback is a short-lived server-side nonce table, which
  is a different plan.
- `loadPendingSession` has a caller that cannot supply an acting user id.
- Adding the nonce requirement breaks an existing test in a way that suggests
  some other flow mints states outside the start route. Confirm with
  `grep -rn "buildXeroOAuthStartUrl" apps packages --include=*.ts`.
- A step's verification fails twice after a reasonable fix attempt.

## Deployment note

This change invalidates any OAuth flow that is mid-flight at deploy time: a user
who clicked "Connect Xero" just before the deploy and completes consent just
after will get an invalid-state error. The failure is safe and self-correcting
(they retry and it works), but it should be deployed at a low-traffic time and
the error message the user sees should read as recoverable. Check that
`invalidState()`'s message says something like "This connection request expired.
Start again from the Xero settings page." and adjust the copy if it does not.

## Maintenance notes

- What this achieves and what it does not: the state is now unforgeable (as
  before), time-limited, and bound to the browser that started the flow. Within
  a ten-minute window, in the originating browser, before the cookie is cleared,
  a state could still be replayed. That residual case is the legitimate user's
  own browser, so it is not a meaningful exposure.
- The stronger form is a server-side single-use nonce table keyed by the nonce
  with a TTL, which would make replay impossible from any browser. That needs a
  migration and was deliberately left out of this plan to keep it executable in
  one pass. If the threat model tightens, that is the follow-up.
- A reviewer should check three things specifically: `sameSite` is `lax` and not
  `strict`; the nonce comparison is constant-time; and the cookie is cleared on
  the success path so the flow cannot be replayed by pressing back.
- `STATE_MAX_AGE_MS` interacts with how long Xero's consent screen can sit open.
  If users start reporting expired-state errors, raise it to 15 minutes rather
  than removing the check.
