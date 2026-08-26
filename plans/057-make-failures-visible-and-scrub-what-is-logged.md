# Plan 057: Finish exact error-channel scrubbing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. Stop
> on any condition below; do not broaden the logging policy or touch call sites.
> Update this plan's row in `plans/README.md` only after every gate passes.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/observability/scrubber.ts packages/observability/scrubber.test.ts`
> Any change to either file is a STOP condition until the excerpts below are
> compared with the live code.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security, tests
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers finding**: residual S-01 from the partially completed original plan
- **Review status**: DONE on 2026-08-26. Implementation commit `782c2b5` on
  `advisor/057-finish-error-scrubbing` was independently reviewed and approved.

## Execution outcome

- **Worktree**: `/tmp/teamcalendar-plan-057-finish`
- **Branch**: `advisor/057-finish-error-scrubbing`
- **Commit**: `782c2b5` (`fix(observability): scrub non-error exception channels`)
- **Merge**: `409fd10` (`merge: finish exact error channel scrubbing`)
- **Scope**: exactly the two observability files; the worktree is clean.
- **Independent verification**: focused scrubber/log suite 17/17; `bun run
  check` checked 770 files; typecheck 19/19 tasks; unit suite 17/17 tasks;
  integration 5/5 tasks with 60 database-backed tests passed; build 4/4 tasks.
  Two credential-gated external Xero tests remained skipped and were unrelated
  to this plan. `git diff --check` and the two-file scope audit also passed.
- **Mutation proof**: the executor changed the new non-`Error` branch back to
  recursive sanitisation temporarily; all four new non-`Error` cases failed,
  then passed after restoring `"[SCRUBBED]"`. The reviewer inspected the final
  assertions and confirmed they exercise that branch at the top level, nested,
  mixed-case and object-valued boundaries.
- **Verdict**: APPROVE. Exact case-insensitive `error` keys now retain only an
  actual `Error` name and scrub every other value wholesale; `errorCode`
  remains visible.

## Why this matters

The original Plan 057 safely wrapped production logging and made approval
failures visible, but one promised rule did not land. A string or object under
an exact `error` key is currently passed to the production transport unchanged.
Those values can contain provider responses, database details or user data.
Actual `Error` instances are already reduced to `{ name }`; that useful
diagnostic must remain.

## Current state

`packages/observability/scrubber.ts:37-39` only tests the broad sensitive-key
patterns after an operational-key allowlist:

```ts
export const isSensitiveKey = (key: string): boolean =>
  !NON_SECRET_OPERATIONAL_KEYS.has(key) &&
  SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
```

There is no exact `error` pattern. `sanitizeValue` at `:41-58` reduces an
actual `Error`, but returns primitive strings unchanged. Both object walks at
`:49-54` and `:63-66` therefore preserve `{ error: "runtime text" }`.

`packages/observability/scrubber.test.ts:45-52` covers only an actual `Error`.
There is no top-level or nested string-valued error-channel test.

The established policy is:

- exact case-insensitive `error` key plus actual `Error` value becomes
  `{ name: error.name }`;
- exact case-insensitive `error` key plus any other value becomes
  `"[SCRUBBED]"` wholesale;
- separately allowlisted `errorCode` remains visible;
- sensitive parents still dominate children;
- development logging behaviour stays unchanged because only the shared
  sanitiser is modified.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused tests | `cd packages/observability && bunx vitest run scrubber.test.ts log.test.ts` | all pass |
| Check | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit suite | `bun run test` | exit 0 |
| Integration suite | `bun run test:integration` | exit 0 with database suites executed |
| Build | `bun run build` | exit 0 using the default configuration |

## Scope

**In scope**:

- `packages/observability/scrubber.ts`
- `packages/observability/scrubber.test.ts`
- `plans/README.md` for the status row only

**Out of scope**:

- every logging call site, including approval, feed and job code;
- `packages/observability/log.ts` and its tests;
- Sentry `beforeSend` wiring;
- changing the operational-key allowlist;
- exposing exception messages, stacks, causes or custom fields.

## Git workflow

- Branch: `advisor/057-finish-error-scrubbing`
- Conventional commit: `fix(observability): scrub non-error exception channels`
- Do not push or open a pull request unless instructed.

## Steps

### Step 0: Confirm the execution environment before editing

Run `test -n "${DATABASE_URL:-}"` without printing its value, then run the
default build as a baseline. If either prerequisite is unavailable, stop before
editing and move execution to a suitable runner. Keep this plan TODO.

### Step 1: Pin the residual leak

Add table-driven tests proving: top-level, nested and mixed-case string-valued
`error` keys are scrubbed; an actual `Error` remains `{ name: "Error" }` with
no message; `errorCode` remains visible; and an object under `error` is replaced
wholesale.

**Verify**: focused tests fail only for the new non-`Error` cases.

### Step 2: Centralise key/value sanitisation

Add one private helper used by both object walks. Handle the exact `error` key
before the broad sensitive-key check:

```ts
if (key.toLowerCase() === "error") {
  return value instanceof Error ? { name: value.name } : "[SCRUBBED]";
}
return isSensitiveKey(key) ? "[SCRUBBED]" : sanitizeValue(value);
```

Do not add `error` to the operational allowlist or make every key containing
the substring `error` sensitive.

**Verify**: focused tests pass.

### Step 3: Prove the tests detect the defect

Temporarily change only the new exact-error branch so its non-`Error` case
returns `sanitizeValue(value)`, then run the focused tests. The top-level and
nested string cases must fail. Restore `"[SCRUBBED]"` and rerun.

**Verify**: mutation fails, restoration passes, and `git diff --check` exits 0.

### Step 4: Run all gates

Run every command in the table. Do not substitute a Webpack build or skip the
database lane.

**Verify**: all commands exit 0.

## Test plan

Use the existing inline-object style in `scrubber.test.ts`. Add at least six
assertions for the cases above. Do not use snapshots.

## Done criteria

- [x] Focused tests pass and the mutation check fails for the intended reason.
- [x] Exact `error` values follow the policy at every nesting level.
- [x] `errorCode` and existing operational keys remain visible.
- [x] `bun run check`, `bun run typecheck`, `bun run test`,
      `bun run test:integration` and `bun run build` exit 0.
- [x] `git diff --name-only` lists only the two observability files and plan
      bookkeeping.
- [x] `plans/README.md` records DONE with commit and gate evidence.

## STOP conditions

Stop before editing if either file drifted or the environment preflight fails.
After editing, stop and report if the fix needs `log.ts` or call-site changes,
any non-`Error` exact `error` value would remain visible, a mandatory gate
cannot run, or verification fails twice after one in-scope correction.

## Maintenance notes

Use `errorCode` for safe domain codes. Treat `error` as an exception channel,
never as structured business metadata. Review future allowlist additions as a
security change.
