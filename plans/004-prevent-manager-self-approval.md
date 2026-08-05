# Plan 004: Prevent managers from approving or declining their own leave

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 75202db..HEAD -- packages/availability/src/approvals/approval-service.ts packages/availability/src/approvals/approval-service.test.ts packages/availability/src/settings/manager-scope.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding. On a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `75202db`, 2026-07-25
- **Execution status**: DONE. Implemented in `f880889`, merged in `c151225`.
  Verified on 2026-08-05 against `2095b1f`: `managerScopePersonIds` in
  `packages/availability/src/settings/manager-scope.ts` takes an `excludeSelf`
  option, `transitiveReportIds` refuses to walk back to the manager itself, and
  `approval-service.ts:1346-1349` passes `excludeSelf: true`. `bun run test`
  now enters the app suites (53 files, 175 tests) and exits 0. The earlier
  react/react-dom mismatch is resolved by plan 047.

## Why this matters

`managerScopePersonIds` returns the acting manager's own person id alongside
their reports. The approvals *list* query deliberately strips the acting person
out of that set, so a manager never sees their own leave request in their
approvals queue. The *command* path does not apply the same filter: it checks
`visiblePersonIds.includes(record.person_id)`, and the manager's own id is in
that array.

A manager can therefore approve or decline their own leave request, and drive
the corresponding write to Xero Payroll, by acting on a record id that the UI
deliberately hides from them. The resulting record shows
`approved_by_person_id` equal to the requester.

The list-side filter is direct evidence that self-exclusion is the intended
product behaviour. This is a separation-of-duties gap on the product's core
workflow, not a design decision.

## Current state

### Relevant files

- `packages/availability/src/settings/manager-scope.ts` — builds the visible
  person set; includes the acting person in both return branches.
- `packages/availability/src/approvals/approval-service.ts` — contains the
  command-path authorisation check (`canActOnRecord`, line 1337) and the
  list-path filter that contradicts it (line 257).
- `packages/availability/src/approvals/approval-service.test.ts` — existing
  co-located tests; new tests go here.

### The scope helper includes the acting person

`packages/availability/src/settings/manager-scope.ts:27-45`:

```typescript
  if (!settingsResult.ok) {
    return [input.actingPersonId];
  }

  if (settingsResult.value.managerVisibilityScope === "all_team_leave") {
    return [
      input.actingPersonId,
      ...transitiveReportIds(people, input.actingPersonId),
    ];
  }

  return [
    input.actingPersonId,
    ...people
      .filter((person) => person.manager_person_id === input.actingPersonId)
      .map((person) => person.id),
  ];
}
```

All three return paths include `input.actingPersonId`.

### The command path does not exclude self

`packages/availability/src/approvals/approval-service.ts:1337-1355`:

```typescript
async function canActOnRecord(
  input: CommandInput,
  record: LoadedApprovalRecord
): Promise<boolean> {
  if (input.role === "admin" || input.role === "owner") {
    return true;
  }
  if (!(input.role === "manager" && input.actingPersonId)) {
    return false;
  }

  const visiblePersonIds = await managerScopePersonIds({
    actingPersonId: input.actingPersonId,
    clerkOrgId: input.clerkOrgId,
    organisationId: input.organisationId,
  });

  return visiblePersonIds.includes(record.person_id);
}
```

`canActOnRecord` has exactly one caller, at
`packages/availability/src/approvals/approval-service.ts:1178`:

```typescript
  const canAct = await canActOnRecord(input, record);
```

That shared code path serves all six approval commands, which are exported from
the same file: `approve` (line 407), `retryApproval` (line 418), `decline`
(line 430), `retryDecline` (line 462), `requestMoreInfo` (line 505) and
`revertApprovalAttempt` (line 543).

### The list path proves the intent

`packages/availability/src/approvals/approval-service.ts:249-257`:

```typescript
    const managedPersonIds =
      parsed.data.role === "manager" && parsed.data.actingPersonId
        ? (
            await managerScopePersonIds({
              actingPersonId: parsed.data.actingPersonId,
              clerkOrgId: parsed.data.clerkOrgId,
              organisationId: parsed.data.organisationId,
            })
          ).filter((personId) => personId !== parsed.data.actingPersonId)
        : [];
```

The same `.filter((personId) => personId !== ...actingPersonId)` also appears in
the summary-count path around line 352.

### Repo conventions that apply here

- TypeScript strict mode. No `any`, no unjustified `as` casts.
- Named exports only; no barrel files except at package root.
- Service functions return `Result<T, E>`; do not throw for expected failures.
- Australian English in comments and copy. No em dashes anywhere.
- Tests are co-located and use Vitest with `vi.hoisted` mock objects plus
  `vi.mock` module factories. `packages/availability/src/approvals/approval-service.test.ts:1-60`
  shows the established setup for this module, including a
  `managerScopePersonIds` mock already declared in the `mocks` object.

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

- `packages/availability/src/settings/manager-scope.ts`
- `packages/availability/src/approvals/approval-service.ts`
- `packages/availability/src/approvals/approval-service.test.ts`
- `packages/availability/src/settings/manager-scope.test.ts` (create if absent)

**Out of scope** (do NOT touch, even though they look related):

- The admin and owner branch of `canActOnRecord`. Admins and owners may act on
  any record including their own; that is deliberate and must not change.
- The list-path and summary-count filters at `approval-service.ts:257` and
  `:352`. After Step 1 they may look redundant, but leaving them is harmless and
  removing them widens this plan's blast radius. Do not remove them.
- `packages/availability/src/plans/*` and
  `packages/availability/src/records/manual-records-service.ts` — a person
  submitting or editing their own leave is correct behaviour. This plan is only
  about approving and declining.
- `apps/app/app/(authenticated)/leave-approvals/*` — the UI already hides
  self-records; no UI change is needed.

## Git workflow

- Branch: `advisor/004-prevent-manager-self-approval`
- Conventional commits, one logical change per commit. Example from `git log`:
  `fix(billing): require admin role on checkout and portal actions`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Give `managerScopePersonIds` an explicit self-exclusion option

In `packages/availability/src/settings/manager-scope.ts`, add an optional
`excludeSelf?: boolean` field to the function's input type, defaulting to
`false` so every existing caller keeps its current behaviour.

When `excludeSelf` is `true`, omit `input.actingPersonId` from all three return
paths. The cleanest shape is to build the array as it is built today and filter
once before returning:

```typescript
  const ids = /* existing array construction, unchanged */;
  return input.excludeSelf
    ? ids.filter((personId) => personId !== input.actingPersonId)
    : ids;
```

Keep the `!settingsResult.ok` early return degrading closed: with
`excludeSelf: true` it must return an empty array, not the acting person.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Exclude self on the approval command path

In `packages/availability/src/approvals/approval-service.ts`, change
`canActOnRecord` so the manager branch passes `excludeSelf: true`:

```typescript
  const visiblePersonIds = await managerScopePersonIds({
    actingPersonId: input.actingPersonId,
    clerkOrgId: input.clerkOrgId,
    excludeSelf: true,
    organisationId: input.organisationId,
  });

  return visiblePersonIds.includes(record.person_id);
```

Do not add a separate `record.person_id === input.actingPersonId` check on top;
one definition of scope is the point of this change.

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Test the scope helper directly

Create `packages/availability/src/settings/manager-scope.test.ts` if it does not
exist. Cover:

1. Default behaviour (no `excludeSelf`): the returned array contains the acting
   person id. This pins that existing callers are unaffected.
2. `excludeSelf: true` with `managerVisibilityScope: "direct_reports"`: the
   acting person id is absent, reports are present.
3. `excludeSelf: true` with `managerVisibilityScope: "all_team_leave"`: the
   acting person id is absent, transitive reports are present.
4. `excludeSelf: true` with a failed settings read: returns an empty array.

**Verify**: `bunx vitest run packages/availability/src/settings/manager-scope.test.ts`
→ all pass.

### Step 4: Test that every approval command rejects self-action

In `packages/availability/src/approvals/approval-service.test.ts`, using the
existing `mocks.managerScopePersonIds` mock, add one test per command asserting
a manager acting on their own record is rejected.

For each of `approve`, `retryApproval`, `decline`, `retryDecline`,
`requestMoreInfo` and `revertApprovalAttempt`: mock the loaded record so
`record.person_id` equals the acting person id, call with `role: "manager"`, and
assert the result is `ok: false` with the not-authorised error code used by the
existing authorisation-failure tests in this file.

Then add two tests pinning the behaviour that must NOT change:

7. A manager acting on a direct report's record still succeeds.
8. An **admin** acting on their own record still succeeds.

Note: because Step 2 routes through the real filter, make sure
`mocks.managerScopePersonIds` is set up to reflect the `excludeSelf` argument,
or assert on the argument it received. Prefer asserting the call argument:
`expect(mocks.managerScopePersonIds).toHaveBeenCalledWith(expect.objectContaining({ excludeSelf: true }))`.

**Verify**: `bunx vitest run packages/availability/src/approvals/approval-service.test.ts`
→ all pass, including the 8 new cases.

### Step 5: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0, and
`bun run check` → exit 0.

## Test plan

- New tests: `manager-scope.test.ts` (4 cases), `approval-service.test.ts`
  (8 cases: 6 self-action rejections plus 2 must-still-work cases).
- Structural pattern to copy: the `vi.hoisted` + `vi.mock` setup at
  `packages/availability/src/approvals/approval-service.test.ts:1-60`, which
  already declares a `managerScopePersonIds` mock.
- The load-bearing assertion: a manager acting on their own `person_id` is
  rejected by all six commands, while an admin acting on their own is not.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `grep -n "excludeSelf" packages/availability/src/approvals/approval-service.ts`
      returns a match inside `canActOnRecord`
- [ ] `bunx vitest run packages/availability/src/approvals packages/availability/src/settings`
      passes with at least 12 new test cases
- [ ] `git status --short` shows only in-scope files modified
- [ ] Status row for plan 004 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- `canActOnRecord` at `approval-service.ts:1337` does not match the excerpt
  above, or it has more than one caller. Confirm with
  `grep -n "canActOnRecord" packages/availability/src/approvals/approval-service.ts`
  which must return exactly two lines (the call at 1178 and the definition at
  1337).
- An existing test fails after Step 2 because it relies on a manager acting on
  their own record. That would contradict this plan's premise; report the test
  rather than weakening the change.
- `managerScopePersonIds` turns out to have callers that would be broken by the
  new optional field. Confirm with
  `grep -rn "managerScopePersonIds" packages apps --include=*.ts`. The field is
  optional, so this should not happen; if it does, report it.

## Maintenance notes

- There are now two consumers of `managerScopePersonIds` with opposite
  self-inclusion needs: visibility (include self, so a manager can see their own
  leave in team views) and authority (exclude self). The `excludeSelf` flag is
  the single place that distinction lives. Any new caller must choose
  deliberately.
- A reviewer should confirm the admin and owner early return in `canActOnRecord`
  was left untouched, and that the `!settingsResult.ok` path degrades to an
  empty array under `excludeSelf`, not to the acting person.
- Deliberately deferred: the list-path and summary-count filters at
  `approval-service.ts:257` and `:352` now duplicate logic that
  `managerScopePersonIds` can do itself. Collapsing them onto `excludeSelf: true`
  is a safe follow-up but is not required for the security fix, and doing it here
  would put a behavioural change to the queue contents in the same commit as an
  authorisation fix.
