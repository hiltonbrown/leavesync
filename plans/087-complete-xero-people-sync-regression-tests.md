# Plan 087: Complete the regression coverage promised by Plan 069

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- packages/jobs/src/handlers/sync-xero-people.integration.test.ts apps/app/app/'(authenticated)'/people apps/app/app/'(authenticated)'/sync/_actions.test.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 069 (DONE); reachable integration-test `DATABASE_URL`
- **Category**: tests
- **Planned at**: commit `ecd49f5`, 2026-08-24

## Why this matters

Plan 069's production fixes are present, but three promised regression seams are
missing: persisted `person_type`, People client notification behaviour, and
manual-sync failed/cancelled results. Closing those gaps prevents a completed
plan from relying on spot-checks alone.

## Current state

- `sync-xero-people.integration.test.ts` does not assert `person_type`.
- no `people-client.test.tsx` exists at the planning commit.
- `sync/_actions.test.ts` does not cover failed and cancelled handler results.
- Production behaviour from implementation commit `18a8bae` is verified present;
  this plan is tests only.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Focused | `bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts apps/app/app/'(authenticated)'/sync/_actions.test.ts apps/app/app/'(authenticated)'/people/people-client.test.tsx` | all pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | exit 0 |

## Scope

**In scope**: the three test files named above, creating the People client test.

**Out of scope**: production changes, new UX and People sync semantics.

## Git workflow

- Branch: `advisor/087-people-sync-tests`
- Commit: `test: complete xero people sync regressions`
- Do not push or open a PR unless instructed.

## Steps

1. Extend the integration fixture to assert Xero employees persist the expected
   canonical `person_type` through create and update.
2. Add People client tests using the existing notification-provider test seam:
   relevant sync completion refreshes once; unrelated events do not; action
   feedback reflects the actual result.
3. Add manual-action cases for failed and cancelled handler results. Assert they
   cannot be reported as queued/successful.
4. Run focused and all repository gates.

## Test plan

Employee/contractor mapping, update path, notification filtering, one refresh per
event, failed result, cancelled result and existing success behaviour.

## Done criteria

- [ ] All three missing seams are covered.
- [ ] No production file changed.
- [ ] Four gates pass; index updated.

## STOP conditions

Stop if a test reveals current production behaviour contradicts Plan 069. Report
the regression and create a separate fix plan rather than changing source here.

## Maintenance notes

Completed implementation plans must carry observable regression coverage, not
only structural verification.
