# Plan 002: Deny record authorisation when the acting user has no linked person

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 75202db..HEAD -- packages/availability/src/plans/plan-service.ts packages/availability/src/plans/plan-service.test.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding. On a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `75202db`, 2026-07-25
- **Execution status**: DONE. Implemented in `4b84e49`, merged in `b14e7c0`.
  Verified on 2026-08-05 against `2095b1f`: `canActOnPerson` in
  `packages/availability/src/plans/plan-service.ts:1215-1220` now requires
  `Boolean(actingPersonId)` before matching `manager_person_id`, and
  `packages/availability/src/plans/plan-service.test.ts` carries the regression
  cases. The earlier BLOCKED note was a dependency-baseline problem, not a
  problem with this change; see plan 047.

## Why this matters

`canActOnPerson` in `packages/availability/src/plans/plan-service.ts` decides
whether the acting user may create, read, edit, archive, restore or delete an
availability record for a given person. One of its three clauses compares
`targetPerson.manager_person_id === actingPersonId`. Both sides are nullable:
`manager_person_id` is an optional column, and `actingPersonId` is passed as
`actingPerson?.id ?? null`. When the acting user has no linked `Person` row in
the selected organisation, and the target person has no manager, the comparison
becomes `null === null`, which is `true`, and authorisation is granted.

An acting user has no linked `Person` row in ordinary situations: during
onboarding before the Xero people sync has matched them, after a Clerk
membership webhook lag, and permanently for a user who belongs to only one of
several `Organisation` rows inside the same Clerk organisation. The role gate
above this code admits `org:viewer`, so the lowest-privileged role can reach it.
Because `createRecord` routes through the submit path, records fabricated this
way can be written to Xero Payroll.

The repository already knows this guard is required. An equivalent check in
`packages/availability/src/people/alternative-contact-service.ts:447` wraps the
same comparison in `Boolean(actingPersonId) &&`. This plan brings
`plan-service.ts` in line with that existing convention.

## Current state

### Relevant files

- `packages/availability/src/plans/plan-service.ts` — contains the defective
  gate at lines 1185-1199 and its four call sites.
- `packages/availability/src/plans/plan-service.test.ts` — existing co-located
  unit tests for this module; new tests go here.
- `packages/availability/src/people/alternative-contact-service.ts` — contains
  the correct version of the same guard; use it as the reference shape.
- `packages/database/prisma/schema.prisma` — declares the nullable column.

### The defect, as it exists today

`packages/availability/src/plans/plan-service.ts:1185-1199`:

```typescript
function canActOnPerson({
  actingOrgRole,
  actingPersonId,
  targetPerson,
}: {
  actingOrgRole?: string | null;
  actingPersonId: string | null;
  targetPerson: SelectedPerson;
}): boolean {
  return (
    isAdminOrOwner(actingOrgRole) ||
    targetPerson.id === actingPersonId ||
    targetPerson.manager_person_id === actingPersonId
  );
}

function isAdminOrOwner(role?: string | null): boolean {
  return role === "org:admin" || role === "org:owner";
}
```

The nullable column, `packages/database/prisma/schema.prisma:367`:

```prisma
  manager_person_id           String?                     @db.Uuid
```

### The four call sites, all passing `?? null`

All four are in `packages/availability/src/plans/plan-service.ts` and all four
use the identical argument shape `actingPersonId: actingPerson?.id ?? null`:

- line 309 — inside `getRecord` (exported, line 286)
- line 370 — inside `createRecord` (exported, line 330)
- line 484 — inside `updateRecord` (exported, line 455)
- line 937 — inside `loadAndAuthorise` (private, line 918), which is the sole
  gate for `deleteDraftRecord` (line 607), `archiveRecord` (line 651) and
  `restoreRecord` (line 719)

Excerpt from `loadAndAuthorise`, `plan-service.ts:918-944`:

```typescript
async function loadAndAuthorise(
  input: z.infer<typeof RecordActionSchema>,
  actingOrgRole: string | null | undefined
): Promise<Result<ScopedRecord, PlanServiceError>> {
  const [record, actingPerson] = await Promise.all([
    loadScopedRecord(input.clerkOrgId, input.organisationId, input.recordId),
    resolvePersonForUser(
      input.clerkOrgId,
      input.organisationId,
      input.actingUserId
    ),
  ]);

  if (!record) {
    return recordNotFound();
  }
  if (
    !canActOnPerson({
      actingOrgRole,
      actingPersonId: actingPerson?.id ?? null,
      targetPerson: record.person,
    })
  ) {
    return notAuthorised();
  }

  return { ok: true, value: record };
}
```

### The correct shape, already used elsewhere

`packages/availability/src/people/alternative-contact-service.ts:440-449`:

```typescript
  actingPersonId: null | string,
  actingRole: PeopleRole
): boolean {
  return (
    actingRole === "admin" ||
    actingRole === "owner" ||
    actingPersonId === person.id ||
    (Boolean(actingPersonId) && person.manager_person_id === actingPersonId)
  );
}
```

Note the `Boolean(actingPersonId) &&` guard on the manager clause only. The
self-identity clause (`actingPersonId === person.id`) does not need the guard,
because `person.id` is a non-nullable primary key and can never be `null`.

### Repo conventions that apply here

- TypeScript strict mode. No `any`. No `as` casts without a justifying comment.
- Named exports only; no default exports.
- Service functions return `Result<T, E>`; do not throw for expected failures.
- Australian English in comments and copy. No em dashes anywhere.
- Tests are co-located: `foo.ts` has `foo.test.ts` in the same directory.
- Tests use Vitest with `vi.hoisted` mock objects and `vi.mock` module factories.
  See `packages/availability/src/approvals/approval-service.test.ts:1-60` for the
  established pattern in this package, and `plan-service.test.ts` for the
  module-specific setup you should extend.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Package tests | `bunx vitest run packages/availability/src/plans/plan-service.test.ts` | all pass |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, run
`bun install` first. That error is a stale-install artifact, not a code defect.

## Scope

**In scope** (the only files you may modify):

- `packages/availability/src/plans/plan-service.ts`
- `packages/availability/src/plans/plan-service.test.ts`

**Out of scope** (do NOT touch, even though they look related):

- `packages/availability/src/people/alternative-contact-service.ts` — already
  correct; it is the reference, not a target.
- `packages/availability/src/records/manual-records-service.ts` and
  `packages/availability/src/plans/submit-service.ts` — these use
  `actingPerson?.id` (yielding `undefined`) or an explicit `Boolean(...)` guard,
  so they do not have this defect. Changing them is out of scope.
- `apps/app/app/(authenticated)/plans/_actions.ts` — the role admission list
  (`canUsePlans` admitting `org:viewer`) is deliberate product behaviour; a
  viewer is meant to reach these services and be filtered by person scope. Do
  not change the role list.
- Any change to `Result` error codes or messages returned by these functions.

## Git workflow

- Branch: `advisor/002-null-actor-authorisation`
- Conventional commits, one logical change per commit. Example from `git log`:
  `fix(availability): withhold xero write errors from peers on the calendar`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Guard the manager clause in `canActOnPerson`

In `packages/availability/src/plans/plan-service.ts`, change the manager clause
of `canActOnPerson` so it cannot match when `actingPersonId` is `null`. Produce
this shape:

```typescript
  return (
    isAdminOrOwner(actingOrgRole) ||
    targetPerson.id === actingPersonId ||
    (Boolean(actingPersonId) &&
      targetPerson.manager_person_id === actingPersonId)
  );
```

Do not change the `isAdminOrOwner` clause: an admin or owner with no linked
person must still pass. Do not change the self-identity clause.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Add regression tests for the null-actor case

In `packages/availability/src/plans/plan-service.test.ts`, add tests covering
the authorisation matrix. Follow the existing mock setup already present in that
file; do not introduce a new mocking style.

Write these cases, each asserting on the returned `Result`:

1. **The bug, as a regression test**: acting user resolves to no person
   (`resolvePersonForUser` mocked to return `null`/`undefined`), acting role
   `org:viewer`, target person has `manager_person_id: null`. Calling
   `updateRecord` must return `ok: false` with the not-authorised error. Before
   your Step 1 change this test fails; after it, it passes.
2. Same setup but calling `archiveRecord` (exercises the `loadAndAuthorise`
   path, which covers `deleteDraftRecord` and `restoreRecord` too). Must return
   `ok: false`.
3. **Admin still passes without a linked person**: no resolved person, acting
   role `org:admin`, target with `manager_person_id: null`. Must return
   `ok: true`.
4. **Genuine manager still passes**: acting person resolves to id `M`, target
   has `manager_person_id: "M"`. Must return `ok: true`.
5. **Self still passes**: acting person resolves to id `P`, target person id is
   `P`, `manager_person_id: null`. Must return `ok: true`.

**Verify**: `bunx vitest run packages/availability/src/plans/plan-service.test.ts`
→ all pass, including the five new cases.

### Step 3: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, and `bun run check` → exit 0.

## Test plan

- New tests live in `packages/availability/src/plans/plan-service.test.ts`.
- Cases: the five listed in Step 2 (null-actor denied on `updateRecord`,
  null-actor denied on `archiveRecord`, admin allowed without a person, real
  manager allowed, self allowed).
- Structural pattern to copy: the `vi.hoisted` + `vi.mock` setup already in
  `plan-service.test.ts`; if you need a broader example of mocking the database
  and collaborating services in this package, read
  `packages/availability/src/approvals/approval-service.test.ts:1-60`.
- Verification: `bunx vitest run packages/availability/src/plans/plan-service.test.ts`
  → all pass, 5 new tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `bunx vitest run packages/availability/src/plans/plan-service.test.ts`
      passes and includes at least 5 new test cases
- [ ] `grep -n "targetPerson.manager_person_id === actingPersonId" packages/availability/src/plans/plan-service.ts`
      shows the comparison guarded by `Boolean(actingPersonId) &&`
- [ ] `git status --short` shows only the two in-scope files modified
- [ ] Status row for plan 002 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- The `canActOnPerson` function at `plan-service.ts:1185` does not match the
  excerpt in "Current state" (the code has drifted).
- There are more or fewer than four `actingPersonId: actingPerson?.id ?? null`
  call sites in `plan-service.ts`. Confirm with
  `grep -n "actingPersonId: actingPerson?.id ?? null" packages/availability/src/plans/plan-service.ts`
  which must return exactly 4 lines (309, 370, 484, 937).
- Adding the guard causes an existing test to fail. That would mean some current
  behaviour depends on the null-actor match, which contradicts this plan's
  premise. Report the failing test rather than weakening the guard.
- The fix appears to require touching any file outside the in-scope list.

## Maintenance notes

- The root cause is a nullable-vs-nullable comparison, not this one call site.
  If a future change adds a fifth caller of `canActOnPerson`, it will pass
  `null` the same way and be protected by the Step 1 guard, so the guard belongs
  in the predicate rather than at the call sites. Keep it there.
- A reviewer should check that the `isAdminOrOwner` clause was not accidentally
  brought inside the new parentheses, which would deny admins with no linked
  person and break the onboarding path.
- Deliberately deferred: unifying `canActOnPerson` with the near-identical
  predicates in `alternative-contact-service.ts`, `manual-records-service.ts`
  and `submit-service.ts`. Those four have subtly different role vocabularies
  (`PeopleRole` versus Clerk `org:*` strings) and merging them is a larger
  refactor that should not ride along with a security fix.
