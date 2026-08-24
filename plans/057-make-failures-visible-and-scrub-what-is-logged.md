# Plan 057: Make approval failures visible and structured logging safe

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in "STOP conditions" occurs, stop and report. Do not
> improvise. When done, update this plan's row in `plans/README.md`, unless a
> reviewer dispatched you and said they maintain the index.
>
> **Drift and continuation check (run first)**:
> `git diff --stat b7bef70 -- packages/observability/log.ts packages/observability/log.test.ts packages/observability/scrubber.ts packages/observability/scrubber.test.ts packages/observability/error.ts packages/observability/error.test.ts packages/availability/src/approvals/approval-service.ts packages/availability/src/approvals/approval-service.test.ts packages/feeds/src/render/render-feed.ts packages/feeds/src/render/render-feed.test.ts`
> then
> `git status --short -- packages/observability/log.ts packages/observability/log.test.ts packages/observability/scrubber.ts packages/observability/scrubber.test.ts packages/observability/error.ts packages/observability/error.test.ts packages/availability/src/approvals/approval-service.ts packages/availability/src/approvals/approval-service.test.ts packages/feeds/src/render/render-feed.ts packages/feeds/src/render/render-feed.test.ts`.
> The second command is required because the first cannot show untracked test
> files. A fresh worktree must print no changes. The preserved continuation
> worktree must match the exact dirty-file set recorded below. Any other result
> is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug, security
- **Planned at**: commit `b7bef70`, 2026-08-24 (reviewed and reconciled from `121da2a`)
- **Covers findings**: C-06, S-01
- **Execution status**: MERGED at `b800f20` (implementation `eee7891`) by
  explicit operator direction with known follow-up work; this is not a review
  approval

## Resolved logging policy

The previous execution stopped before source edits because `/clerk/i` matched
`clerkOrgId` and `/xero/i` matched `xeroWriteSucceeded`. That exposed a real
conflict between strict key scrubbing and useful incident correlation.

Resolve it with a narrow exact allowlist, not by weakening the broad deny rules:

```ts
const NON_SECRET_OPERATIONAL_KEYS = new Set([
  "actingClerkOrgId",
  "clerkOrgId",
  "errorCode",
  "stripeSubscriptionId",
  "xeroWriteSucceeded",
]);
```

These are opaque provider identifiers or a boolean state marker, not
credentials. They are already intentionally logged for cross-tenant access
attempts and Stripe webhook failures. Exact spelling matters. A near-miss such
as `clerkSecret`, `stripeWebhookSecret` or `xeroAccessToken` must still be
scrubbed.

The policy contract is:

1. Every log call created or modified by this plan uses a fixed, code-authored
   first argument. Runtime values go in the structured context. This plan does
   not claim to audit every pre-existing message argument in the repository.
2. Production structured context is recursively scrubbed before Logtail sees
   it. Sensitive parent keys dominate the allowlist, so a `rawPayload` object is
   replaced wholesale even if it contains `clerkOrgId`.
3. A production `Error` becomes `{ name }`. Do not forward its raw `message`,
   `stack`, `cause` or enumerable custom fields. Exception messages can contain
   Prisma query text, parameters or provider response fragments.
4. Add deny patterns for message, query, parameter, response and cause keys so
   a non-`Error` thrown object cannot bypass the same policy.
5. Treat the exact case-insensitive `error` key as an exception channel. If its
   value is an actual `Error`, reduce it to `{ name }`; otherwise replace the
   value wholesale with `"[SCRUBBED]"`. A caller that needs a safe domain code
   must use the separately allowlisted `errorCode` key.
6. In non-production environments, preserve current console behaviour exactly:
   pass the original message and context through, including the original Error
   object and stack.

This is deliberately stricter than the first draft. It preserves correlation
without treating exception text as safe.

## Why this matters

When Xero accepts an approve or decline write and the local transition then
fails, Xero and Team Calendar disagree. Eight approval-service catch paths also
return generic errors without recording the cause. Operators currently have no
reliable starting point for these incidents.

At the same time, the repository's scrubber is connected to no logging sink.
Call sites pass caught exceptions to a third-party transport, and several embed
raw exception strings directly into log messages. Adding more approval logs
before enforcing safe transport behaviour would increase the exposure. This
plan makes structured production logging safe first, removes the known raw
exception interpolation, then adds the missing approval telemetry.

## Current state

### Logger and scrubber

`packages/observability/log.ts:1-3` is the entire logger adapter:

```ts
import { log as logtail } from "@logtail/next";

export const log = process.env.NODE_ENV === "production" ? logtail : console;
```

Every repository caller uses only `log.error`, `log.warn`, `log.info` or
`log.debug`; none uses Logtail's `with`, `flush`, middleware or request methods.
The wrapper only needs those four established methods.

`packages/observability/scrubber.ts:3-25` has a broad key-pattern list and
exports `isSensitiveKey`. `sanitizeObject` at `:27-51` recursively handles
objects and arrays, but an Error has no enumerable standard fields and is
currently reduced to `{}`. `scrubSentryEvent` starts at `:53`; it remains
unwired and is not part of this plan.

The current patterns include `/xero/i`, `/clerk/i`, `/stripe/i` and `/code/i`.
Do not delete them. Add the exact operational-key exception before evaluating
the patterns, and add deny coverage for `/message/i`, `/query/i`,
`/param(?:s|eter|eters)?/i`, `/response/i`, `/cause/i` and `/^error$/i`.

The source establishes that the allowlisted identifiers are intentional:

- `packages/availability/src/people/people-service.ts:1014-1018` logs
  `actingClerkOrgId` for a cross-tenant access attempt.
- `apps/api/app/webhooks/payments/route.ts:52-63,80-85` logs
  `stripeSubscriptionId` and `clerkOrgId` to diagnose webhook failures.
- Approval and job logs use `clerkOrgId` throughout, including
  `packages/availability/src/approvals/approval-service.ts:320-327` and
  `packages/jobs/src/handlers/reconcile-feed-publications.ts:116-120`.

### Raw exception interpolation

Structured-context scrubbing cannot clean runtime values already interpolated
into the first message argument:

- `packages/observability/error.ts:18` logs `Parsing error: ${message}`.
- `packages/feeds/src/render/render-feed.ts:95-96` interpolates
  `String(error)` after ICS serialisation fails.
- The same feed file interpolates raw exceptions at `:175` and `:213-214` for
  token-use and cache-write failures.

`packages/feeds/src/render/render-feed.test.ts:232-260,352-365,432-445,510-528`
already exercises these branches, but some assertions pin the unsafe message.

### String-valued error fields

Normalising actual `Error` objects is not sufficient. Existing production calls
store raw exception or domain messages as strings under an `error` key:

- `packages/availability/src/approvals/approval-service.ts:1124` passes
  `publication.error.message`;
- `approval-service.ts:1613` passes `error.message` for notification failures;
- `packages/availability/src/plans/submit-service.ts:637,735,754` uses the same
  shapes.

The five message/query/parameter/response/cause patterns do not match the key
`error`, so those strings would reach Logtail unchanged. Fix this centrally in
the scrubber. Do not widen this plan to edit every caller.

### Approval catch paths

There are exactly eight catch paths that return `unknownError(...)` without a
log:

| Current lines | Public operation |
|---|---|
| `approval-service.ts:246-250` | list for approver |
| `:441-443` | get approval detail |
| `:503-505` | get summary counts |
| `:616-618` | retry-decline preflight |
| `:654-656` | request more information |
| `:714-719` | revert failed attempt |
| `:870-877` | approve or retry approve |
| `:967-974` | decline or retry decline |

The approve external write is at `:818-832`; the local transaction follows at
`:834-857`. Decline has the same ordering at `:910-952`. A single boolean is not
enough to locate the failure because later notification, reload, publication
and projection work is inside the same try block.

The optimistic-conflict branches are also significant. They can occur after
Xero returned success but currently return `invalid_state_*` without recording
the cross-system divergence. Preserve the user-facing result, but log the
incident.

Use the existing fixed-message plus structured-context style at
`approval-service.ts:1117-1127`. The test file's hoisted mock registry begins at
`approval-service.test.ts:1`; follow that pattern when mocking the logger.

## Preserved continuation state

The stopped execution is intentionally preserved, uncommitted, at
`/tmp/teamcalendar-plan-057` on branch `advisor/057-observability` and commit
`b7bef70`. Its expected dirty-file set is exactly:

```text
 M packages/availability/src/approvals/approval-service.test.ts
 M packages/availability/src/approvals/approval-service.ts
 M packages/feeds/src/render/render-feed.test.ts
 M packages/feeds/src/render/render-feed.ts
 M packages/observability/error.ts
 M packages/observability/log.ts
 M packages/observability/scrubber.ts
?? packages/observability/error.test.ts
?? packages/observability/log.test.ts
?? packages/observability/scrubber.test.ts
```

When a port-capable runner is available, resume this worktree rather than
discarding or recreating the implementation. Confirm it first:

```sh
test "$(git -C /tmp/teamcalendar-plan-057 rev-parse --short HEAD)" = "b7bef70"
test "$(git -C /tmp/teamcalendar-plan-057 branch --show-current)" = "advisor/057-observability"
git -C /tmp/teamcalendar-plan-057 status --short
git -C /tmp/teamcalendar-plan-057 diff --check
```

Inspect all ten files, including the three untracked tests. Steps 1 to 5 below
remain the full contract, but only the missing `error`-channel sanitisation, its
tests and the remaining logger-dispatch coverage need new edits in this
continuation. If the worktree is absent, a fresh isolated worktree at `b7bef70`
may execute the full plan. If the branch, base commit or dirty-file set differs,
STOP and report rather than resetting or overwriting it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install, only when dependencies are absent | `bun install --frozen-lockfile` | exit 0 with the lockfile unchanged |
| Observability tests | `cd packages/observability && bunx vitest run` | all pass |
| Approval tests | `cd packages/availability && bunx vitest run src/approvals` | all pass |
| Feed renderer tests | `cd packages/feeds && bunx vitest run src/render/render-feed.test.ts` | all pass |
| Lint | `bun run check` | exit 0 |
| Production build | `bun run build` | exit 0 with all scheduled tasks passing; baseline at `b7bef70` is 4/4 |
| Typecheck | `bun run typecheck` | exit 0 with all scheduled tasks passing; baseline is 19/19 |
| Unit tests | `bun run test` | exit 0 with all scheduled tasks passing; baseline is 17/17 |
| Integration tests | `bun run test:integration` | exit 0 with all scheduled tasks passing; baseline is 5/5 and credential-gated external tests may skip |

## Scope

**Implementation scope, the only source or test files to modify**:

- `packages/observability/log.ts`
- `packages/observability/log.test.ts` (create)
- `packages/observability/scrubber.ts`
- `packages/observability/scrubber.test.ts` (create)
- `packages/observability/error.ts`
- `packages/observability/error.test.ts` (create)
- `packages/availability/src/approvals/approval-service.ts`
- `packages/availability/src/approvals/approval-service.test.ts`
- `packages/feeds/src/render/render-feed.ts`
- `packages/feeds/src/render/render-feed.test.ts`

`plans/README.md` is bookkeeping only. Update only Plan 057's row unless the
dispatching reviewer says they maintain it.

**Out of scope**:

- Sentry `beforeSend` wiring. `scrubSentryEvent` remains unused; connecting it
  needs a separate review of every Sentry initialisation path.
- User-facing approval error strings and Result codes.
- Other log calls whose dynamic message contains only a known identifier or
  fixed domain error code. This plan removes the known raw exception/message
  interpolation listed above.
- Jobs, API route handlers and notification services.
- Database schema, migrations and persisted audit payloads.

## Git workflow

- Branch: `advisor/057-observability`
- Use one conventional commit for the logical change, for example
  `fix(observability): scrub logs and expose approval failures`.
- Do not push or open a PR unless the operator instructs it.

## Steps

### Step 0: Prove the runner can execute the required build

Before making another source edit, run `bun run build` from the isolated
worktree. It must exit 0 with all four currently scheduled tasks passing. This
preflight prevents another partial continuation in the known restricted
sandbox.

If dependencies are absent, run `bun install --frozen-lockfile` first. Supply
build configuration through the runner's normal ignored environment files or
secret injection. Never read, print or copy environment values into the plan,
logs or tracked files.

The previous runner failed while Turbopack processed
`apps/web/instrumentation-client.ts` and `apps/web/instrumentation.ts`: creating
its loader process attempted a local port bind and the operating system returned
`Operation not permitted`. Those files are out of scope, and Turbo then
cancelled the app and API builds. This is an environmental blocker, not evidence
of a Plan 057 source regression.

If that exact process-creation/port-bind error recurs, STOP immediately. Do not
repeat the same command in the same sandbox and do not substitute
`next build --webpack`; the repository CI uses the default Turbopack command and
the webpack mode is diagnostic only.

**Verify**: `bun run build` exits 0 with all currently scheduled tasks passing;
at `b7bef70`, the expected Turbo summary is 4/4.

### Step 1: Define and test the production scrubbing contract

In `packages/observability/scrubber.ts`:

1. Add the exact `NON_SECRET_OPERATIONAL_KEYS` set from the resolved policy.
2. Make `isSensitiveKey` return `false` for an exact allowlisted key before it
   evaluates the existing patterns.
3. Add the six deny patterns specified above, including exact
   case-insensitive `/^error$/i`. Do not remove or weaken an existing pattern.
4. Refactor recursion through an internal `sanitizeValue(value: unknown)` or
   equivalent helper so nested arrays, objects and Error values follow one
   path. Avoid adding `any` or a new cast.
5. Normalise every Error to `{ name: value.name }`. Drop its message, stack,
   cause and enumerable custom properties.
6. Before the generic sensitive-key branch, special-case an exact
   case-insensitive `error` key whose value is an actual `Error` so it retains
   `{ name }`. Every non-`Error` value under that key is scrubbed wholesale by
   `/^error$/i`, including strings, arrays and plain result objects.
7. Preserve input immutability. Return new objects and arrays.

Create `packages/observability/scrubber.test.ts` with named cases proving:

- the five exact operational keys are not sensitive;
- near-miss credential keys remain sensitive;
- nested objects and arrays are recursively scrubbed;
- a sensitive parent such as `rawPayload` dominates an allowlisted child;
- an Error with a synthetic canary in its message, stack and custom fields is
  reduced to `{ name: "Error" }` and the canary is absent;
- a non-Error object with message, query, params, response and cause fields has
  those values scrubbed;
- a top-level string-valued `error` field containing a synthetic canary is
  replaced with `"[SCRUBBED]"`;
- a nested string-valued `error` field containing a synthetic canary is
  replaced with `"[SCRUBBED]"`;
- the input object is not mutated.

Use synthetic values only. Never read an environment file or real credential.

**Verify**: `cd packages/observability && bunx vitest run scrubber.test.ts`
prints all new tests passing.

### Step 2: Wrap the production logger without changing development

Replace the bare environment conditional in `packages/observability/log.ts`
with an object exposing exactly `debug`, `info`, `warn` and `error`. Each method
keeps the established `(message: string, context?: Record<string, unknown>)`
signature.

- In production, pass a context through `sanitizeObject` before calling the
  matching Logtail method. With no context, preserve the transport's empty
  object behaviour.
- Outside production, call the matching console method with the original
  arguments. Do not clone or sanitise context and do not add an `undefined`
  second argument when the caller supplied only a message.
- Do not expose or emulate unused Logtail methods.
- Do not use `any` or add a cast. If the installed Logtail type cannot support
  this four-method adapter without either, STOP and report the exact signature.

Create `packages/observability/log.test.ts`. Mock `@logtail/next`; set
`NODE_ENV` before dynamically importing `log.ts`; call `vi.resetModules()`
between modes; restore the original environment and mocks in `afterEach`.
Prove:

- production forwards a recursively scrubbed structured context;
- a production Error canary, message and stack do not reach the transport;
- a benign production context remains useful and unchanged;
- production `debug`, `info`, `warn` and `error` calls each dispatch to the
  matching transport method;
- a production message-only call reaches the transport with exactly one
  argument;
- development receives the identical context and Error object, including its
  stack;
- development message-only calls receive exactly one argument.

**Verify**: `cd packages/observability && bunx vitest run log.test.ts scrubber.test.ts`
prints all tests passing.

### Step 3: Remove the known raw exception strings from message arguments

In `packages/observability/error.ts`, keep `parseError`'s return value and
Sentry call unchanged, but replace the interpolated log with the fixed message
`"Parsing error"` and structured `{ error }` context. If reporting itself
throws, use a fixed console message without forwarding `newError`.

Create `packages/observability/error.test.ts` to prove:

- `parseError` still returns the original display message and calls
  `Sentry.captureException`;
- the logger receives the fixed message and structured error;
- the fallback console call has a fixed message and does not receive the
  reporting exception.

In `packages/feeds/src/render/render-feed.ts`, convert all four dynamic warning
messages in the current-state section to fixed messages with structured safe
context. For caught exceptions, pass `{ error, feedId }`; the production wrapper
will reduce Error to its name. For projection failure, pass `errorCode` and
`feedId`. Do not include the plaintext feed token, feed body, event summary or
event description.

Update only the affected assertions in `render-feed.test.ts`. Assert fixed
messages and structured context instead of pinning raw exception strings.

**Verify**:

- `cd packages/observability && bunx vitest run error.test.ts log.test.ts scrubber.test.ts`
  prints all tests passing.
- `cd packages/feeds && bunx vitest run src/render/render-feed.test.ts` prints
  all tests passing.
- `rg -n -U 'log\.(error|warn)\([\s\S]{0,180}\$\{(?:String\()?((error|err|message)\b)' packages/observability/error.ts packages/feeds/src/render/render-feed.ts`
  prints no matches.

### Step 4: Log every unknown approval failure with an exact operation

Use a module-local `logAndReturnUnknown` helper near `unknownError`. It accepts
the caught `unknown`, a typed context, and the unchanged user message. It emits
the fixed message `"Unexpected approval service failure"`, then returns
`unknownError(userMessage)`.

Keep a separate `handleApprovalWriteFailure` decision helper for the shared
approve and decline paths. It handles optimistic conflicts, emits the dedicated
post-Xero divergence log when required, and delegates every non-conflict failure
to `logAndReturnUnknown`. This two-helper shape is intentional: it avoids
duplicating the same conflict classification in `performApproval` and
`performDecline`.

The context must always contain `operation`, `clerkOrgId` and
`organisationId`; include `recordId` only when the validated input has one. Use
this exact operation mapping:

| Catch path | Operation value |
|---|---|
| list for approver | `list_for_approver` |
| detail | `get_approval_detail` |
| summary | `get_approval_summary_counts` |
| outer retry-decline catch | `retry_decline_preflight` |
| request more information | `request_more_info` |
| revert | `revert_approval_attempt` |
| `performApproval`, normal | `approve` |
| `performApproval`, retry | `retry_approve` |
| `performDecline`, normal | `decline` |
| `performDecline`, retry | `retry_decline` |

Bind the five currently bare catches as `catch (error)`. The six non-shared
catch paths call `logAndReturnUnknown` directly. The two shared write paths enter
the same pipeline through `handleApprovalWriteFailure`. Preserve every existing
user message and Result code byte-for-byte.

For `performApproval` and `performDecline`, track:

- `xeroWriteSucceeded`, initially `false`, changed to `true` only after the
  external port returns `{ ok: true }`;
- `failureStage`, using only `prepare`, `xero_write`, `local_transaction`,
  `notification`, `reload`, `publication` and `projection`.

Set the stage immediately before the corresponding operation. Pass both fields
into the shared failure pipeline on a catch-all failure. The boolean means only
that the external port returned success; the stage identifies whether local
persistence or later work failed.

If an `OptimisticConflictError` occurs in approve or decline after Xero
succeeded, emit a separate error log with the fixed message
`"Approval state changed after Xero write succeeded"`, the same safe context,
`failureStage: "local_transaction"` and `xeroWriteSucceeded: true`. Then return
the existing `invalid_state_*` result. Revert's optimistic conflict has no Xero
side effect and keeps its existing result without this divergence log.

Never log `xero_write_error_raw`, record notes, decline reasons or provider
payloads.

**Verify**: `cd packages/availability && bunx vitest run src/approvals` prints
all tests passing.

### Step 5: Prove all approval catch contracts

In the hoisted mock registry in `approval-service.test.ts`, add logger mocks and
mock `@repo/observability/log`. Reset them in the existing `beforeEach`.

Add tests for these behaviours:

1. A table covering the six non-shared catch paths logs once with its exact
   operation, available identifiers and unchanged generic Result.
2. Approve and decline each log `xeroWriteSucceeded: true` and
   `failureStage: "local_transaction"` when the external write succeeds and the
   local transaction throws a non-conflict error.
3. Retry approve and retry decline each use their retry operation label when
   the external port throws, with `xeroWriteSucceeded: false` and
   `failureStage: "xero_write"`.
4. Approve and decline optimistic conflicts retain their existing
   `invalid_state_*` Results and emit the dedicated divergence log, not the
   catch-all message.
5. A failure during preparation records `xeroWriteSucceeded: false` and
   `failureStage: "prepare"`.

Import `getApprovalDetail` and `getApprovalSummaryCounts` for the table. Keep
the existing factories and hoisted mocks; do not introduce raw tenant literals
when `input` already provides them.

**Verify**: `cd packages/availability && bunx vitest run src/approvals/approval-service.test.ts`
prints all existing and new tests passing.

### Step 6: Run the complete repository gates

Run every command in order:

1. `bun run check`
2. `bun run build`
3. `bun run typecheck`
4. `bun run test`
5. `bun run test:integration`
6. `git diff --check`

All must exit 0. The integration command may skip only external tests that are
explicitly credential-gated. If `DATABASE_URL` is unavailable, STOP and report;
do not claim the plan verified and do not substitute a mocked integration run.
The build is deliberately before typecheck, matching `.github/workflows/ci.yml`:
Next generates route-validator types under `.next/types` during the build. The
Step 0 preflight does not replace this final post-change build.

## Test plan

- `packages/observability/scrubber.test.ts`: the nine named policy, recursion
  and string-valued error-channel cases from Step 1.
- `packages/observability/log.test.ts`: the production/development adapter
  cases from Step 2, including the four-method dispatch matrix and production
  message-only branch.
- `packages/observability/error.test.ts`: three fixed-message and fallback
  cases from Step 3.
- `packages/feeds/src/render/render-feed.test.ts`: update the four existing
  warning-path assertions to the fixed-message structured-context contract.
- `packages/availability/src/approvals/approval-service.test.ts`: cover all
  eight catch paths, both retry labels, both post-Xero optimistic conflicts,
  pre-write failure state and unchanged public Results.

The synthetic leakage canary must appear only in test setup. Assertions inspect
the captured production transport payload and prove its serialised form does
not contain the canary.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run build` exits 0 with all currently scheduled tasks passing; the
      expected baseline at `b7bef70` is 4/4
- [ ] `bun run typecheck` exits 0 with all currently scheduled tasks passing;
      the expected baseline is 19/19
- [ ] `bun run test` exits 0 with all currently scheduled tasks passing; the
      expected baseline is 17/17
- [ ] `bun run test:integration` exits 0 with all currently scheduled tasks
      passing; the expected baseline is 5/5 and only credential-gated external
      tests skip
- [ ] `git diff --check` exits 0
- [ ] `grep -c "return unknownError" packages/availability/src/approvals/approval-service.ts` prints exactly `1`
- [ ] `grep -c '"Failed to approve this leave\."' packages/availability/src/approvals/approval-service.ts` prints exactly `1`
- [ ] `grep -c '"Failed to decline this leave\."' packages/availability/src/approvals/approval-service.ts` prints exactly `1`
- [ ] The dynamic-error `rg` command from Step 3 prints no matches
- [ ] Production logger tests prove the serialised transport payload contains no synthetic canary
- [ ] Development logger tests prove the original Error object and stack are preserved
- [ ] All exact operational keys pass, near-miss secret keys scrub, a sensitive
      parent dominates its child, and top-level plus nested string-valued
      `error` fields are scrubbed
- [ ] Approval tests prove the six direct catch paths, both shared write paths,
      retry labels and post-Xero conflict results behaviourally; no lexical
      helper-occurrence count substitutes for these assertions
- [ ] `git status --short | sed 's/^...//' | grep -Ev '^(packages/observability/(log|scrubber|error)(\.test)?\.ts|packages/availability/src/approvals/approval-service(\.test)?\.ts|packages/feeds/src/render/render-feed(\.test)?\.ts|plans/README\.md)$'` prints no output
- [ ] Plan 057's `plans/README.md` row is updated, unless the dispatching reviewer owns it

## STOP conditions

Stop and report if:

- The drift check reports a mismatch with the current-state excerpts.
- The preserved continuation worktree differs from its recorded branch, base
  commit or exact dirty-file set.
- The default Turbopack build reports the known loader process
  `binding to a port` / `Operation not permitted` failure. Stop immediately and
  move verification to a runner that permits loopback binding; do not treat a
  webpack build as completion evidence.
- The logger adapter needs `any`, a new cast, or an API beyond the four methods
  verified in current callers.
- Preserving development behaviour requires weakening production sanitisation.
- A required operational field outside the exact five-key allowlist is lost.
  Report the field and its existing call site; do not extend the allowlist.
- Another approval catch path returns `unknownError(...)` beyond the eight
  listed, or one of the eight cannot carry both tenant scopes.
- The approval divergence test cannot distinguish `local_transaction` from a
  later stage without changing an out-of-scope public API.
- A verification command fails twice after one reasonable in-scope correction.
- `DATABASE_URL` is unavailable for the required integration gate.
- Any fix appears to require a file outside implementation scope.

## Maintenance notes

- The exact allowlist is a security boundary. Add a key only when it is both
  non-secret and required for an existing operational query. Never rename a
  sensitive key merely to bypass a deny pattern.
- Log calls created or changed by this plan keep static messages. Put runtime
  values in structured context so the wrapper can enforce policy. A separate
  repository-wide audit would be required to make that a global invariant.
- The exact `error` field is an exception channel, not a safe text field. Pass
  actual exceptions when their type name is useful, or use the allowlisted
  `errorCode` field for bounded domain codes; do not place messages under
  `error` and expect them to survive production sanitisation.
- `xeroWriteSucceeded` is not a claim that Team Calendar diverged. Review it
  together with `failureStage`; only `local_transaction` identifies the local
  persistence window.
- `scrubSentryEvent` remains unwired. That follow-up must inspect all Sentry
  initialisation paths and is intentionally outside this plan.
- Plan 061 later touches `render-feed.ts`; land Plan 057 first to avoid a
  needless conflict.

## Reconciliation record, 2026-08-24

- The first execution stopped correctly before source edits because broad key
  patterns erased required operational context.
- Worktree `/tmp/teamcalendar-plan-057` and branch
  `advisor/057-observability` remained source-clean at `b7bef70`; no commit was
  created.
- Cold review found the unresolved policy, unsafe Error message retention,
  incomplete stage semantics, invisible post-Xero optimistic conflicts,
  message-channel bypasses, a missing test path in the drift command and
  insufficient behavioural coverage.
- This reconciliation resolves those points with an exact allowlist, stricter
  error normalisation, fixed production messages, explicit stages and labels,
  full catch-path tests, an exact drift scope and MED risk.
- **Verdict after first reconciliation**: the original policy ambiguity was
  resolved and the plan was ready for the execution recorded below.

## Execution review, 2026-08-24

- Executor: isolated worktree `/tmp/teamcalendar-plan-057`, branch
  `advisor/057-observability`, based on `b7bef70`.
- Scope: exactly the ten implementation files listed in this plan. The main
  worktree remained plans-only. No source commit was created.
- Focused verification passed both in the executor and independently in
  review: observability 15/15, approvals 57/57 and feed renderer 29/29.
- Repository gates passed through check (770 files), typecheck (19/19), unit
  tests (17/17) and integration tests (5/5, with only the two expected
  credential-gated Xero cases skipped).
- The required production build did not complete. The executor report records
  two attempts after the permitted environment correction. The latest durable
  evidence in `apps/web/.turbo/turbo-build.log` records Turbopack failing on the
  two out-of-scope web instrumentation files because its loader process could
  not bind a local port and returned `Operation not permitted`; Turbo then
  cancelled the app and API tasks. This triggered the plan's verification STOP
  condition. The log is overwritten per run, so it proves only the latest
  attempt; the two-attempt count comes from the executor report.
- The first review treated a helper-occurrence count of `8` rather than `9` as
  a failure. Cold reconciliation rejected that criterion: the implementation's
  `handleApprovalWriteFailure` cleanly centralises approve/decline conflict
  classification and delegates non-conflicts to `logAndReturnUnknown`.
  Behavioural tests, not a duplicated helper name, are the correct contract.
- Cold reconciliation found the remaining security gap instead: actual Error
  objects are reduced safely, but existing plain exception strings stored under
  an `error` key are not matched by the five newly added deny patterns. The
  refreshed plan adds exact error-channel sanitisation and top-level plus nested
  regression tests.
- `git diff --check`, the two unchanged user-message counts, the single
  `return unknownError` count, the dynamic-error search and the strict scope
  check all passed independently.
- **Review verdict before operator override: BLOCKED.** Preserve the current
  two-helper approval design. A runner that permits Turbopack's loader process
  is still required, as are the exact `error`-channel correction and tests.

## Operator-directed merge record, 2026-08-24

- The operator explicitly instructed that the existing implementation be
  committed and merged despite the review verdict, with the deferred test noted
  in the plan index.
- Implementation commit: `eee7891` on `advisor/057-observability`.
- Merge commit on `main`: `b800f20`.
- Immediately before the commit, the focused suites passed again:
  observability 15/15, approvals 57/57 and feed renderer 29/29.
- The earlier repository run passed check, typecheck, unit and integration
  gates. The default Turbopack build remains unverified because the available
  sandbox denied its loader process a local port bind.
- **Required follow-up**: treat exact string-valued `error` fields as sensitive
  in the production scrubber and add top-level plus nested synthetic-canary
  regression tests. Then run the default `bun run build` on a port-capable
  runner and rerun all repository gates. Until that follow-up lands, plain
  exception strings placed under `error` can still reach the production log
  transport.
