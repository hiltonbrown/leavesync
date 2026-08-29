# Plan 114: Test the public integration contract

> **Executor instructions**: Follow the plan step by step and modify only the
> listed test/model files. The reviewer maintains the index.
>
> **Drift check (run first)**:
> `git diff --stat b50f42b..HEAD -- apps/web/app/integrations/capabilities.ts apps/web/app/integrations/capabilities.test.ts apps/web/app/integrations/integrations.test.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 113 DONE
- **Category**: tests
- **Planned at**: commit `b50f42b`, 2026-08-30; reconciled after Plan 113
- **Preview landing**: PENDING; approved commit `ddbebd0`; `preview` is
  user-provisioned

## Why this matters

Public support, data-access and destination claims have already drifted while
normal repository checks remained green. Tests should protect the factual
capability boundary without freezing entire paragraphs or HTML snapshots.

## Current state

- Plan 113 introduced `capabilities.ts` plus exact region, inbound-category and
  calendar-destination model tests. Do not duplicate those assertions.
- `apps/web/app/contact/contact.test.ts` demonstrates focused static-render
  assertions.
- The dangerous contracts are region status, reviewed inbound categories,
  calendar destinations, client-controlled refresh wording and canonical
  contact/security links.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused | `bunx vitest run apps/web/app/integrations` | all tests pass |
| Mutation proof | temporarily invert one status/read assertion, run focused tests, then revert | focused test fails before revert and passes after |
| Lint/typecheck | `bunx ultracite check apps/web/app/integrations && bun run --cwd apps/web typecheck` | exit 0 |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | all exit 0 |

## Scope

**In scope**:
- `apps/web/app/integrations/capabilities.test.ts`
- `apps/web/app/integrations/integrations.test.ts`
- `apps/web/app/integrations/capabilities.ts` only if a named readonly export is
  required for testability, with no behavioural change

**Out of scope**:
- Production copy changes.
- Snapshot files.
- Backend adapters and tests.
- Test-only exports from the page component.

## Git workflow

- Target branch: user-created `preview`; do not create or reset it.
- Branch: `codex/114-strengthen-integration-contract-tests`
- Commit: `test(web): protect integration capability claims`
- Approved landing commit: `ddbebd0`.
- Executor: do not push or merge. Stop if `preview` or `origin/preview` is absent.
- Landing owner: after Plan 113 is reachable from `origin/preview`, update local
  `preview`, fast-forward it to the working branch with `git merge --ff-only`,
  run the plan gates, then push `preview`. Stop and reconcile on divergence.
- Completion proof: `git merge-base --is-ancestor ddbebd0 origin/preview` must
  exit 0 before this plan is considered landed.

## Steps

### Step 1: Expand model contract tests

Assert the complete region status map, authoritative inbound categories and
three supported calendar destinations. Use exact values for capability keys,
not full marketing sentences.

**Verify**: focused tests pass.

### Step 2: Expand rendered-page boundary tests

Assert AU shipped and NZ/UK planned status text, contact and security links,
absence of unsupported payroll-calendar and 60-second claims, and presence of
client-controlled refresh wording. Keep assertions semantic and narrow.

**Verify**: mutation proof demonstrates the tests fail on a deliberate contract
break, then pass after revert.

### Step 3: Run gates

Run lint, web typecheck, all repository gates and `git diff --check`.

## Test plan

This plan is the test plan. Tests must not call the network, depend on secrets,
or snapshot full HTML.

## Done criteria

- [x] Model tests cover regions, reads and destinations.
- [x] Render tests cover status labels, links and rejected claims.
- [x] Mutation proof is observed and reverted.
- [x] Production behaviour is unchanged and all available gates pass, subject to
  the recorded environment deviations below.

## STOP conditions

- Plan 113 is not landed or its model differs materially.
- Meaningful assertions require duplicating full production paragraphs.
- Tests require a browser or production environment.

## Maintenance notes

Update capability-key tests when a reviewed capability ships. Editorial copy
may change without updating tests unless the underlying factual contract moves.

## Execution review

- **Verdict**: APPROVE at `ddbebd0` on
  `codex/114-strengthen-integration-contract-tests`.
- Added narrow rendered-page assertions for the canonical contact and security
  links, client-controlled feed refresh wording, and absence of unsupported
  payroll-calendar, pay-period and 60-second claims. Plan 113's exact model
  assertions remain the sole model-contract coverage.
- Mutation proof inverted the payroll-calendar absence assertion; the focused
  suite failed at the intended contract test, then returned to 2 files and 9
  passing tests after the mutation was reverted.
- Executor verification passed app-aware focused tests, targeted Ultracite, web
  type-check, the 19-task repository type-check, the 17-task unit suite and
  `git diff --check`. The plan's root-level Vitest command bypassed the web app's
  TSX configuration, so the app-aware command is canonical for this directory.
- Full `check` reproduced the same four unrelated public-holiday diagnostics in
  the disposable dependency mount. Integration suites requiring `DATABASE_URL`
  could not initialise in this worktree; non-database suites passed or skipped.
  The preceding isolated execution passed the complete integration gate, and no
  production file changed in Plan 114.
- Reviewer inspected the one-file diff and independently reran the app-aware
  suite: 2 files and 9 tests passed. The worktree was clean after temporary
  dependency mounts were removed.
