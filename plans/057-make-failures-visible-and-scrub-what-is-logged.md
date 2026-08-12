# Plan 057: Log the failures that are currently invisible, and scrub what gets logged

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- packages/observability packages/availability/src/approvals/approval-service.ts`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug, security
- **Planned at**: commit `121da2a`, 2026-08-12
- **Covers findings**: C-06, S-01

## Why this matters

Two halves of one problem: the worst production failure in the approval flow is
logged nowhere, and what *is* logged is not scrubbed.

**Half one.** When a manager approves leave, the Xero write happens first and the
local transaction second. If that local transaction fails for any reason other
than an optimistic conflict, the catch block returns a generic message and
discards the error entirely. Xero now records the leave as approved and Team
Calendar does not, with nothing written to logs, Sentry or the audit table. An
on-call engineer has no starting point. The file logs carefully on every
*expected* degradation, so the omission is specific to the catch-all paths.

**Half two.** The repo has a scrubber with a well-tuned pattern list, and it is
wired to **nothing** — `sanitizeObject` and `scrubSentryEvent` have zero call
sites outside their own module. The production logger is a bare Logtail
re-export, and call sites forward whole caught exceptions to it. Prisma
exceptions embed the failing query and, on some error classes, bound parameter
values; Xero errors can carry response fragments. All of it reaches a
third-party log store unredacted.

Fixing them together is deliberate: adding the missing error logs without wiring
the scrubber would increase the volume of unscrubbed sensitive data.

## Current state

`packages/observability/log.ts` — the entire file:

```ts
import { log as logtail } from "@logtail/next";

export const log = process.env.NODE_ENV === "production" ? logtail : console;
```

`packages/observability/scrubber.ts:24-49` exports `isSensitiveKey` and
`sanitizeObject`, which recurses through objects and arrays replacing values
under keys matching a 20-pattern list (`/token/i`, `/secret/i`, `/xero/i`,
`/payload/i`, `/email/i`, `/stripe/i`, `/clerk/i`, and others). `:53` exports
`scrubSentryEvent`. Verified: `grep -rn "sanitizeObject\|scrubSentryEvent"` over
`apps` and `packages`, excluding `scrubber.ts` itself, returns **nothing**.

`packages/availability/src/approvals/approval-service.ts:870-877` — the approve
path:

```ts
} catch (error) {
  if (error instanceof OptimisticConflictError) {
    return invalidState(
      options.retry ? "invalid_state_for_retry" : "invalid_state_for_approve"
    );
  }
  return unknownError("Failed to approve this leave.");
}
```

`:967-974` is the identical shape in `performDecline`. Five more bare catches at
`:246-250`, `:441-443`, `:503-505`, `:616-618`, `:654-656`.

The Xero write that has **already succeeded** by the time the approve catch runs
is at `:818-832`.

Representative unscrubbed call sites:
`apps/api/app/api/availability/[recordId]/route.ts:171`
(`log.error("Error updating availability record", { error })`),
`apps/api/app/api/support/github-issue/route.ts:125`,
`packages/jobs/src/handlers/sync-xero-people.ts:225`.

`apps/api/app/webhooks/auth/route.ts:344-346` carries a hand-written comment
about this exact hazard — the concern is understood, but enforced by convention
rather than by the pipeline.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| Approvals suite | `cd packages/availability && bunx vitest run src/approvals` | all pass |

## Scope

**In scope**:
- `packages/observability/log.ts`
- `packages/observability/log.test.ts` (create)
- `packages/observability/scrubber.ts` (only if a helper for `Error` values is
  needed; the pattern list itself is already correct)
- `packages/availability/src/approvals/approval-service.ts`
- `packages/availability/src/approvals/approval-service.test.ts`

**Out of scope**:
- The ~10 individual `log.*` call sites that pass raw errors. Wrapping the
  logger fixes them all at once; editing them one by one is the wrong shape and
  will conflict with other plans.
- Sentry's `beforeSend` wiring. `scrubSentryEvent` is unused, which is worth
  fixing, but it needs the Sentry init path and is a separate change. Note it,
  do not do it here.
- The user-facing messages returned by the catch blocks. They must stay exactly
  as they are — the whole point is that the *user* sees no more detail while the
  *operator* sees much more.
- `packages/jobs` and `apps/api` handlers — plans 053, 056, 058 and 059 own
  those files.

## Git workflow

- Branch: `advisor/057-observability`
- Conventional commits, e.g. `fix(observability): scrub structured log context`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Wrap the logger so every context object is scrubbed

Replace the bare re-export in `packages/observability/log.ts` with a wrapper that
keeps the same call signature (`log.error(message, context)`,
`log.warn`, `log.info`, `log.debug`) but:

1. runs each context object through `sanitizeObject` before it reaches the
   transport;
2. normalises any `Error` value to `{ name, message }`, dropping `stack` in
   production so a stack trace cannot smuggle query text or parameters into the
   log store.

The wrapper must not change behaviour in development, where `console` is used and
a full stack is what you want.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Prove the scrubbing with tests

Create `packages/observability/log.test.ts` asserting:

- a context object containing a key matching the pattern list is redacted
- a Prisma-shaped error (a nested object carrying a `query`-like field) is
  redacted rather than forwarded whole
- an `Error` becomes `{ name, message }` with no `stack` under production
- a benign context object passes through unchanged, so the wrapper is not
  over-scrubbing everything into uselessness

**Verify**: `cd packages/observability && bunx vitest run` → all pass.

### Step 3: Route the seven catch blocks through one helper

Add a single module-local helper in `approval-service.ts`, for example
`logAndReturnUnknown(error, context, userMessage)`, that logs at error level with
`recordId`, `clerkOrgId`, `organisationId` and the error, then returns the same
`unknownError(userMessage)` as today.

Route all seven catch sites through it (`:246-250`, `:441-443`, `:503-505`,
`:616-618`, `:654-656`, `:870-877`, `:967-974`), keeping every existing
`OptimisticConflictError` branch and every user-facing string byte-identical.

The approve and decline sites must additionally record that the **Xero write had
already succeeded** — that single fact is what turns an unreadable incident into
a five-minute one.

Do not log `xero_write_error_raw` contents.

**Verify**: `cd packages/availability && bunx vitest run src/approvals` → all
existing tests still pass.

### Step 4: Test the divergence path

Add a test asserting that when the Xero write succeeds and the local transaction
then throws a non-conflict error, an error-level log is emitted carrying the
record and tenant identifiers, and the caller still receives the unchanged
generic message.

**Verify**: `bun run test` → exit 0, 17/17 tasks.

## Test plan

- `packages/observability/log.test.ts` (new): the four cases in Step 2.
- `packages/availability/src/approvals/approval-service.test.ts`: Xero-succeeded
  then local-failure emits an error log for both approve and decline; the
  `OptimisticConflictError` branch still returns `invalid_state_*` and does
  **not** log at error level; user-facing messages unchanged.

Verification: `bun run test` → exit 0, with at least 6 new tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 6 new tests
- [ ] `grep -c "sanitizeObject" packages/observability/log.ts` prints 1 or more
- [ ] `grep -c "return unknownError" packages/availability/src/approvals/approval-service.ts`
      is unchanged from before the plan, and every one is now preceded by a log call
- [ ] The user-facing strings "Failed to approve this leave." and "Failed to
      decline this leave." are unchanged
- [ ] No test asserts on a scrubbed value's plaintext
- [ ] `git status --short` lists only the in-scope files
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- Wrapping the logger breaks the `@logtail/next` typing in a way that needs an
  `any` or a cast. `CLAUDE.md` forbids both without justification; report the
  signature problem rather than casting around it.
- The scrubber's pattern list redacts something an operator genuinely needs for
  debugging (for example, it matches `summary` and `description`, which may be
  load-bearing in feed diagnostics). Report which field and let the operator
  decide; do not quietly narrow the pattern list.
- You find a catch block in `approval-service.ts` beyond the seven listed.

## Maintenance notes

- The wrapper is now the enforcement point. Any new `log.*` call site inherits
  scrubbing automatically — that is the property to protect. A reviewer should
  reject a change that imports the Logtail transport directly.
- `scrubSentryEvent` remains unwired. That is the obvious follow-up and is
  deliberately deferred here because it touches Sentry initialisation.
- If a future incident needs stack traces in production, add an explicit flag
  rather than removing the normalisation.
