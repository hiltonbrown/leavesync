# Plan 010: Return a typed auth error instead of throwing when token decryption fails

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 75202db..HEAD -- packages/xero/src/crypto/tokens.ts packages/xero/src/au/read.ts packages/xero/src/au/write.ts`
> If any changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding. On a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `75202db`, 2026-07-25
- **Reconciled**: 2026-08-05 against `2095b1f`. Finding confirmed still present:
  `packages/xero/src/crypto/tokens.ts` still throws at lines 42 and 65.
  `packages/xero/src/au/read.ts` has changed since this plan was written (plan
  003 added pagination completeness handling and observability logging), so
  re-read that file before editing it; `tokens.ts` itself is unchanged.

## Why this matters

`decryptXeroToken` throws when a stored token has ciphertext but a null IV or
auth tag, and `readKey` throws when the encryption key is missing or malformed.
Both are correct behaviours: refusing to proceed with a half-written credential
row is exactly right.

The problem is where those throws land. Every call site in the AU read and write
modules performs the decryption *above* the surrounding `try` block, so the throw
escapes functions that are documented to return `Result<T, XeroWriteError>`. The
`auth_error` guard sitting immediately below each decrypt, which produces
precisely the right error, is never reached on the throwing path.

The consequences are concrete. In the approval path the throw escapes the write
adapter and is caught by the approval service's generic handler, which maps it
to `unknown_error` and shows the user "Failed to approve this leave." The
`auth_error` classification is lost, so the connection is never marked stale and
nothing prompts a reconnect. In the sync handlers, a throw aborts the entire run
instead of producing an isolated per-record failure, which violates the rule that
record-level failures must not fail the whole sync.

The fix is small and mechanical: give the decryption a non-throwing variant that
returns the error the guard below already produces.

## Current state

### Relevant files

- `packages/xero/src/crypto/tokens.ts` — `decryptXeroToken` (line 33) and
  `readKey` (line 61), both of which throw.
- `packages/xero/src/au/write.ts` — one call site (line 150).
- `packages/xero/src/au/read.ts` — four call sites (lines 47, 152, 262, 358).

### The thrower

`packages/xero/src/crypto/tokens.ts:33-50`:

```typescript
export function decryptXeroToken(input: {
  authTag: null | string;
  encrypted: string;
  iv: null | string;
}): string {
  if (!input.encrypted) {
    return "";
  }
  if (!(input.iv && input.authTag)) {
    throw new Error(
      "Encrypted Xero token is missing its IV or auth tag; refusing to use the stored value. Reconnect Xero to repair this connection."
    );
  }

  const key = readKey();
```

`packages/xero/src/crypto/tokens.ts:61-68`:

```typescript
function readKey(): Buffer {
  const raw = keys().XERO_TOKEN_ENCRYPTION_KEY;
  validateEncryptionKey(raw);
  if (!raw) {
    throw new Error("XERO_TOKEN_ENCRYPTION_KEY is required.");
  }
  return Buffer.from(raw, "base64");
}
```

Note the empty-ciphertext case returns `""` rather than throwing, and the guard
below each call site handles `""`. That path is already fine.

### The decrypt sits outside the try

`packages/xero/src/au/write.ts:148-166`:

```typescript
): Promise<XeroWriteResult<unknown>> {
  const accessToken = xeroTenant.xero_connection.access_token_encrypted;
  const decryptedAccessToken = decryptXeroToken({
    authTag: xeroTenant.xero_connection.access_token_auth_tag ?? null,
    encrypted: accessToken,
    iv: xeroTenant.xero_connection.access_token_iv ?? null,
  });

  if (!decryptedAccessToken || xeroTenant.xero_connection.revoked_at) {
    return {
      ok: false,
      error: {
        code: "auth_error",
        message: "Xero credentials are missing or revoked.",
      },
    };
  }

  try {
```

The `try` begins at line 166, after the decrypt. The four sites in
`packages/xero/src/au/read.ts` (lines 47, 152, 262, 358) have the same shape:
decrypt, then an `auth_error` guard, then `try`.

The error object in that guard is the exact value the new code should return.

### Repo conventions that apply here

- All Xero logic lives in `packages/xero`; region code in `au/`, `nz/`, `uk/`.
- Outbound writes return `Result<T, XeroWriteError>`. The `XeroWriteError`
  variants are `validation_error`, `conflict_error`, `auth_error`,
  `rate_limit_error` and `unknown_error`. Use `auth_error`; do not invent a new
  variant.
- Service functions return `Result`; do not throw for expected failures. A
  corrupt credential row is an expected failure.
- Never expose raw Xero error payloads or internal error text to employees. The
  message in the existing guard ("Xero credentials are missing or revoked.") is
  the approved user-facing wording. Reuse it verbatim.
- Structured logging via `@repo/observability/log`. No `console.log`.
- TypeScript strict mode, no `any`, named exports only.
- Australian English in comments. No em dashes anywhere.
- Tests are co-located; `packages/xero/src/au/write.test.ts` (270 lines) and
  `packages/xero/src/au/read.test.ts` (241 lines) are the patterns to follow.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Xero tests | `bunx vitest run packages/xero` | all pass |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, run
`bun install` first. That error is a stale-install artifact, not a code defect.

## Scope

**In scope** (the only files you may modify):

- `packages/xero/src/crypto/tokens.ts`
- `packages/xero/src/crypto/tokens.test.ts` (create if absent)
- `packages/xero/src/au/read.ts`
- `packages/xero/src/au/write.ts`
- `packages/xero/src/au/read.test.ts`
- `packages/xero/src/au/write.test.ts`

**Out of scope** (do NOT touch, even though they look related):

- The existing `decryptXeroToken` and `encryptXeroToken` behaviour. Do not make
  `decryptXeroToken` stop throwing; other callers rely on the throw, and
  silently returning `""` on a corrupt row would be worse than failing. Add a
  variant alongside it.
- `readKey`'s validation, or `packages/xero/keys.ts`. The requirement that an
  absent or malformed `XERO_TOKEN_ENCRYPTION_KEY` prevents startup is a stated
  non-negotiable and must remain.
- The four `decryptXeroToken` call sites in `packages/xero/src/oauth/service.ts`
  (lines 278, 283, 522, 848). Step 4 audits them but this plan does not change
  them; see "Maintenance notes".
- The AES-256-GCM parameters, IV generation, or auth-tag handling.

## Git workflow

- Branch: `advisor/010-token-decrypt-result`
- Conventional commits, one logical change per commit. Example from `git log`:
  `fix(xero): protect rotated refresh token against transaction abort`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add a non-throwing decrypt variant

In `packages/xero/src/crypto/tokens.ts`, add an exported function that wraps the
existing one:

```typescript
export type DecryptXeroTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

/**
 * Non-throwing form of decryptXeroToken, for call sites that must return a
 * Result rather than throw. A corrupt credential row or a missing encryption
 * key is an expected failure at the Xero boundary, not an exception.
 */
export function tryDecryptXeroToken(input: {
  authTag: null | string;
  encrypted: string;
  iv: null | string;
}): DecryptXeroTokenResult {
  try {
    return { ok: true, token: decryptXeroToken(input) };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Token decryption failed.",
    };
  }
}
```

Keep `decryptXeroToken` exactly as it is.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Use it at the write call site

In `packages/xero/src/au/write.ts`, replace the decrypt and fold its failure
into the existing guard:

```typescript
  const accessToken = xeroTenant.xero_connection.access_token_encrypted;
  const decrypted = tryDecryptXeroToken({
    authTag: xeroTenant.xero_connection.access_token_auth_tag ?? null,
    encrypted: accessToken,
    iv: xeroTenant.xero_connection.access_token_iv ?? null,
  });

  if (!decrypted.ok) {
    log.warn("Xero token decryption failed", {
      clerkOrgId: xeroTenant.clerk_org_id,
      organisationId: xeroTenant.organisation_id,
      reason: decrypted.reason,
    });
  }

  const decryptedAccessToken = decrypted.ok ? decrypted.token : "";

  if (!decryptedAccessToken || xeroTenant.xero_connection.revoked_at) {
    return {
      ok: false,
      error: {
        code: "auth_error",
        message: "Xero credentials are missing or revoked.",
      },
    };
  }
```

The existing guard is left untouched and now catches the failure case as well,
because a failed decrypt yields `""`. This keeps one definition of the
user-facing error.

Log the reason but never the ciphertext, the IV, the auth tag, or the decrypted
token.

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Apply the same change at the four read call sites

Apply the identical transformation at `packages/xero/src/au/read.ts` lines 45,
123, 212 and 308. Each already has the matching `auth_error` guard immediately
below it.

If the four sites are textually identical, extract a small private helper in
`read.ts` that takes the connection and returns
`{ ok: true; token: string } | { ok: false; error: XeroWriteError }`, and use it
at all four. Prefer that over four copies.

**Verify**: `grep -c "decryptXeroToken(" packages/xero/src/au/read.ts` returns 0,
and `bun run typecheck` → exit 0.

### Step 4: Audit the OAuth service call sites and report

Read the four `decryptXeroToken` call sites in
`packages/xero/src/oauth/service.ts` (lines 278, 283, 522, 848). For each,
determine whether it is inside a `try` block whose `catch` returns a `Result`.

Do NOT change them in this plan. Record your finding in your completion report:
list each line number and whether it is protected. If any is unprotected, say so
explicitly so it can be scheduled.

**Verify**: your completion report contains the four line numbers and a verdict
for each.

### Step 5: Add tests

In `packages/xero/src/crypto/tokens.test.ts` (create if absent):

1. `tryDecryptXeroToken` with valid ciphertext, IV and auth tag returns
   `{ ok: true }` with the original plaintext (round-trip through
   `encryptXeroToken`).
2. With ciphertext but `iv: null` returns `{ ok: false }` and does not throw.
3. With ciphertext but `authTag: null` returns `{ ok: false }` and does not
   throw.
4. With `encrypted: ""` returns `{ ok: true, token: "" }`, matching the existing
   empty-value behaviour.
5. `decryptXeroToken` still throws for cases 2 and 3, pinning that the original
   function is unchanged.

In `packages/xero/src/au/write.test.ts`, following the existing pattern:

6. **The regression test**: a tenant whose connection has non-empty
   `access_token_encrypted` but `access_token_iv: null`. Assert the function
   returns `{ ok: false, error: { code: "auth_error" } }` and does NOT throw. Use
   `await expect(...).resolves.toMatchObject(...)`, not a try/catch.

In `packages/xero/src/au/read.test.ts`, add the equivalent regression test for
at least one of the four read functions.

**Verify**: `bunx vitest run packages/xero` → all pass.

### Step 6: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0, and
`bun run check` → exit 0.

## Test plan

- New tests: 5 cases in `packages/xero/src/crypto/tokens.test.ts`, 1 in
  `au/write.test.ts`, 1 in `au/read.test.ts`.
- Structural pattern to copy: `packages/xero/src/au/write.test.ts` for
  constructing a fake `xeroTenant` with a connection, and
  `packages/xero/src/au/read.test.ts` for the read functions.
- The load-bearing assertion: a connection row with a null IV produces a
  resolved `auth_error` Result rather than a rejected promise. That is the
  difference between "reconnect Xero" and "Failed to approve this leave."

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `grep -c "decryptXeroToken(" packages/xero/src/au/read.ts` returns 0
- [ ] `grep -c "decryptXeroToken(" packages/xero/src/au/write.ts` returns 0
- [ ] `grep -n "tryDecryptXeroToken" packages/xero/src/crypto/tokens.ts` returns
      a match
- [ ] `bunx vitest run packages/xero` passes with at least 7 new test cases
- [ ] The completion report records the audit verdict for the four
      `oauth/service.ts` call sites
- [ ] `git status --short` shows only in-scope files modified, plus this plan
      file and `plans/README.md` for the status update
- [ ] Status row for plan 010 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- Any excerpt in "Current state" does not match the live code.
- The `auth_error` guard is missing below any of the five call sites, meaning
  the decrypt result is used directly. That changes the fix shape; report it.
- A read function's error type is not `XeroWriteError` (the read paths reuse it,
  but confirm with
  `grep -n "XeroWriteResult\|XeroReadResult" packages/xero/src/au/read.ts`). If
  reads use a different error union without an `auth_error` member, report it
  rather than adding a member.
- Any test requires the real `XERO_TOKEN_ENCRYPTION_KEY` to be set and it is not
  available in your environment. Report it; do not commit a key or a fixture key
  to the repository.

## Maintenance notes

- The rule this reinforces: **anything that can throw must sit inside the `try`
  of a function that returns a `Result`, or be called through a non-throwing
  wrapper.** Placing a throwing call above the `try` is the specific mistake this
  plan fixes, and it is easy to reintroduce when adding a new call site.
- A reviewer should confirm the user-facing message was not changed. Employees
  must never see raw Xero error codes or decryption internals; "Xero credentials
  are missing or revoked." is the approved wording.
- Follow-up recorded by Step 4: the four `oauth/service.ts` call sites. They were
  deliberately excluded because the OAuth service has a different error union
  (`XeroOAuthError`) and its own connection-repair semantics, so changing them
  is a separate decision rather than a mechanical repeat.
- When NZ and UK read/write modules are implemented (see plan 037), they must use
  `tryDecryptXeroToken` from the start rather than copying the AU pattern that
  existed before this plan.
