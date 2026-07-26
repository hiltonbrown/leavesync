# Plan 011: Fail closed when the decline-reason policy cannot be loaded

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 75202db..HEAD -- packages/availability/src/approvals/approval-service.ts packages/availability/src/approvals/approval-service.test.ts "apps/app/app/(authenticated)/leave-approvals/_actions.ts"`
> If any changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding. On a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug, tests
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

Organisations can require a reason on every declined leave request. The service
enforces that policy only when the settings read succeeds:

```typescript
  if (
    settingsResult.ok &&
    settingsResult.value.requireDeclineReason &&
    parsed.data.reason.trim().length < 3
  ) {
```

If `getSettings` returns `ok: false` for any reason, the whole condition is
false and the policy is skipped. The Zod schema defaults `reason` to `""`, so a
reason-less decline proceeds, is written to `approval_note`, and is pushed to
Xero's reject endpoint as the rejection reason. The subsequent `retryDecline`
path then fails with `missing_preserved_reason`, because there is no reason to
replay.

A transient database blip should not silently disable a compliance control. The
same file's neighbour, `managerScopePersonIds`, handles a failed settings read by
degrading conservatively, which is the convention this plan restores.

The same `settingsResult.ok &&` shape also governs `showDeclinedOnApprovals`,
where the failure mode is milder but still wrong: an operator silently sees a
smaller approvals queue with no indication anything failed.

Separately, this plan closes a decision drift. The `requireDeclineReason` toggle
is presented to admins in the settings UI, but the server action's Zod schema
requires a reason unconditionally, so turning the toggle off changes nothing a
user can observe. Both branches of a repo-mandated invariant are also untested.

## Current state

### Relevant files

- `packages/availability/src/approvals/approval-service.ts` — the fail-open
  decline check (line 438) and the fail-open list default (line 239).
- `packages/availability/src/approvals/approval-service.test.ts` — has a
  `requireDeclineReason: true` fixture at line 195 but never exercises either
  branch.
- `apps/app/app/(authenticated)/leave-approvals/_actions.ts` — the server
  action's Zod schema, which requires a reason unconditionally (lines 28-30).
- `apps/app/app/(authenticated)/settings/leave-approval/leave-approval-settings-client.tsx`
  — the admin-facing toggle (around line 200).
- `packages/database/src/organisation-settings/repository.ts` — defaults
  `requireDeclineReason` to `true` (line 45).
- `packages/availability/src/settings/manager-scope.ts` — the correct
  fail-closed convention (lines 27-29).

### The fail-open decline check

`packages/availability/src/approvals/approval-service.ts:436-454`:

```typescript
    return validationError(parsed.error);
  }
  const settingsResult = await getSettings({
    clerkOrgId: parsed.data.clerkOrgId,
    organisationId: parsed.data.organisationId,
  });
  if (
    settingsResult.ok &&
    settingsResult.value.requireDeclineReason &&
    parsed.data.reason.trim().length < 3
  ) {
    return {
      ok: false,
      error: {
        code: "validation_error",
        message: "Enter a decline reason of at least 3 characters.",
      },
    };
  }
  return await performDecline(parsed.data, externalWritePort, {
```

### The fail-open list default

`packages/availability/src/approvals/approval-service.ts:239-243`:

```typescript
      settingsResult.ok && settingsResult.value.showDeclinedOnApprovals;
    const defaultStatus: z.infer<typeof ApprovalStatusSchema>[] = showDeclined
      ? ["submitted", "approved", "xero_sync_failed", "withdrawn", "declined"]
      : ["submitted", "approved", "xero_sync_failed", "withdrawn"];
```

### The conservative convention this restores

`packages/availability/src/settings/manager-scope.ts:27-29`:

```typescript
  if (!settingsResult.ok) {
    return [input.actingPersonId];
  }
```

The failure is handled explicitly and degrades to the narrowest safe answer.

### The server action makes the toggle inert

`apps/app/app/(authenticated)/leave-approvals/_actions.ts:28-30`:

```typescript
  reason: z.string().trim().min(3).max(1000),
```

This runs before the service ever reads the setting, so a decline with an empty
reason is rejected at the action boundary whether the org requires one or not.

### Repo conventions that apply here

- Service functions return `Result<T, E>`; do not throw for expected failures.
- Zod validates all external input, including form submissions.
- Decline-reason enforcement is explicitly named in the repo's testing rules as
  something that must be tested.
- Structured logging via `@repo/observability/log`. No `console.log`.
- TypeScript strict mode, no `any`, named exports only.
- Australian English in copy and comments. No em dashes anywhere.
- Tests are co-located and use Vitest with `vi.hoisted` mocks plus `vi.mock`
  module factories. `packages/availability/src/approvals/approval-service.test.ts:1-60`
  shows the setup, and `mocks.getSettings` already exists there.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Module tests | `bunx vitest run packages/availability/src/approvals/approval-service.test.ts` | all pass |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, run
`bun install` first. That error is a stale-install artifact, not a code defect.

## Scope

**In scope** (the only files you may modify):

- `packages/availability/src/approvals/approval-service.ts`
- `packages/availability/src/approvals/approval-service.test.ts`

**Out of scope** (do NOT touch, even though they look related):

- `apps/app/app/(authenticated)/leave-approvals/_actions.ts`. Making the server
  action's schema conditional on the org setting is a deliberate product change
  (it would let a decline be submitted with no reason when the toggle is off),
  and it belongs to whoever owns that decision. Step 5 records the question
  instead of answering it.
- The settings UI toggle and
  `packages/database/src/organisation-settings/repository.ts`.
- `packages/availability/src/settings/manager-scope.ts` — it is the reference for
  the correct pattern, not a target.
- `performDecline`, the Xero write path, or the `missing_preserved_reason`
  handling in `retryDecline`.

## Git workflow

- Branch: `advisor/011-decline-reason-fail-closed`
- Conventional commits, one logical change per commit. Example from `git log`:
  `fix(api): fail closed when the Clerk webhook secret is missing`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Fail closed on the decline path

In `packages/availability/src/approvals/approval-service.ts`, restructure the
decline check so a failed settings read is handled explicitly and never skips
the policy:

```typescript
  const settingsResult = await getSettings({
    clerkOrgId: parsed.data.clerkOrgId,
    organisationId: parsed.data.organisationId,
  });

  // A settings read failure must not silently disable a compliance control.
  // The stored default for requireDeclineReason is true, so treat an unreadable
  // setting as "required" rather than skipping the check.
  const requireDeclineReason = settingsResult.ok
    ? settingsResult.value.requireDeclineReason
    : true;

  if (requireDeclineReason && parsed.data.reason.trim().length < 3) {
    return {
      ok: false,
      error: {
        code: "validation_error",
        message: "Enter a decline reason of at least 3 characters.",
      },
    };
  }
```

Treating the unreadable case as `true` matches the stored default in
`packages/database/src/organisation-settings/repository.ts:45`, so the worst case
is that an org which had turned the toggle off temporarily sees the reason
required during an outage. That is the safe direction.

When the settings read fails, log a warning with `clerkOrgId` and
`organisationId` so the outage is visible.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Make the list default explicit about failure

Apply the same treatment to `showDeclinedOnApprovals` at line 239. Keep the
current behaviour on a failed read (declined records hidden), but make it a
deliberate, commented choice rather than a side effect of `&&`, and log a
warning:

```typescript
    // On a settings read failure, keep the narrower default rather than
    // silently widening the queue. Logged so the outage is not invisible.
    const showDeclined = settingsResult.ok
      ? settingsResult.value.showDeclinedOnApprovals
      : false;
```

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Test both branches of the decline policy

In `packages/availability/src/approvals/approval-service.test.ts`, using the
existing `mocks.getSettings`, add:

1. **The regression test**: `getSettings` mocked to return `{ ok: false, ... }`,
   decline called with `reason: ""`. Assert the result is `ok: false` with
   `code: "validation_error"`, and that the Xero decline write was NOT called.
   Before Step 1 this test fails.
2. `requireDeclineReason: true`, `reason: ""` → `validation_error`.
3. `requireDeclineReason: true`, `reason: "ok"` (2 characters, below the
   3-character floor) → `validation_error`.
4. `requireDeclineReason: true`, `reason: "Too much overlap"` → succeeds. This
   pins that the existing happy path is unaffected.
5. `requireDeclineReason: false`, `reason: ""` → succeeds. This is the branch
   the setting controls and it has never been exercised.
6. `requireDeclineReason: true`, `reason: "   "` (whitespace only) →
   `validation_error`, pinning that `.trim()` is applied.

### Step 4: Test the list default on a settings failure

7. `getSettings` mocked to `{ ok: false }`. Assert `listForApprover` issues a
   query whose `approval_status` filter does NOT include `"declined"`.

**Verify**: `bunx vitest run packages/availability/src/approvals/approval-service.test.ts`
→ all pass, including the 7 new cases.

### Step 5: Record the decision drift for the maintainer

Append a section to the bottom of this plan file titled
`## Open question: the requireDeclineReason toggle is currently inert`, stating:

- `apps/app/app/(authenticated)/leave-approvals/_actions.ts:28-30` requires a
  reason of at least 3 characters unconditionally, before the service reads the
  org setting.
- Therefore an admin who turns `requireDeclineReason` off in the settings UI sees
  no behaviour change.
- The service-layer branch that the setting controls is now tested (case 5
  above) but is unreachable from the product.
- Two coherent resolutions: make the action schema conditional on the setting so
  the toggle becomes real, or remove the toggle from the settings UI because the
  product has decided a reason is always required.
- Do not pick one. This is a product decision.

**Verify**: the section exists in this file.

### Step 6: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0, and
`bun run check` → exit 0.

## Test plan

- New tests: 7 cases in
  `packages/availability/src/approvals/approval-service.test.ts`.
- Structural pattern to copy: the existing decline tests in that file (around
  lines 305, 386, 439 and 542), which already construct a decline command and
  assert on the `Result`. The fixture at line 195 already sets
  `requireDeclineReason: true`; your new cases need to vary it.
- The load-bearing assertion: with `getSettings` failing, an empty-reason
  decline is rejected and no Xero write is attempted.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `grep -n "settingsResult.ok &&" packages/availability/src/approvals/approval-service.ts`
      returns no matches
- [ ] `bunx vitest run packages/availability/src/approvals/approval-service.test.ts`
      passes with at least 7 new test cases
- [ ] The "Open question" section has been added to this file
- [ ] `git status --short` shows only the two in-scope files modified
- [ ] Status row for plan 011 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- Either excerpt in "Current state" does not match the live code.
- `getSettings` turns out never to return `ok: false` in practice (for example,
  it swallows errors and always returns defaults). Confirm by reading its
  definition. If it cannot fail, this plan's premise is wrong: report that
  rather than adding dead branches.
- `grep -n "settingsResult.ok &&" packages/availability/src/approvals/approval-service.ts`
  finds sites beyond the two in this plan. Report the additional line numbers;
  do not fix them here without confirming each one's correct failure direction.
- Case 5 (`requireDeclineReason: false`, empty reason succeeds) turns out to be
  impossible to reach because `performDecline` itself requires a reason. Report
  it; that would mean the enforcement lives somewhere this plan has not accounted
  for.

## Maintenance notes

- The rule this establishes: **`settingsResult.ok && policy` is a bug pattern**.
  Every read of organisation settings must decide explicitly what happens when
  the read fails, and the answer for a compliance control is always the
  restrictive one. A reviewer seeing `settingsResult.ok &&` in a new diff should
  push back.
- A reviewer should check the direction of each default: `requireDeclineReason`
  fails to `true` (restrictive), `showDeclinedOnApprovals` fails to `false`
  (narrow). Both are the conservative choice for their respective semantics, and
  they point in opposite boolean directions for that reason.
- Deliberately deferred: the toggle-is-inert question in Step 5, and any change
  to the server action schema.
- If `getSettings` gains caching later, the failure branch becomes rarer but not
  impossible, and these guards should stay.
