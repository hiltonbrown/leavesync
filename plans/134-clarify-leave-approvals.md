# Plan 134: Make leave approvals scan-fast and action-safe

> **Executor instructions**: Read the Impeccable skill, load context once for the leave-approvals route, then read `reference/critique.md`, `reference/adapt.md`, `reference/clarify.md` and `reference/craft-floor.md`. Run the drift check and every gate.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/leave-approvals' 'apps/app/components/states/xero-sync-failed-state.tsx'`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: accessibility, design, error-recovery, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

Managers can act efficiently, but pending, approved, declined and withdrawn badges share one treatment; Xero failures omit the attempted action; and seven columns plus several actions require horizontal panning. These defects weaken the six-second scan rule at the highest-stakes decision surface.

## Current state and contract

- Preserve manager/team scoping, synchronous Xero writes, A/D/Enter shortcuts, balance impact, row disclosure and explicit confirmation copy.
- `leave-approvals-client.tsx:681-689` flattens non-failure statuses.
- Records have `failedAction` (`:79`) but the failure component invocation at `:601-618` drops it.
- The desktop queue at `:326-421` depends on a non-focusable horizontal table wrapper.

## Scope

**In scope**: `leave-approvals-client.tsx`, its tests, a narrow local status component/extraction, and failure-state view-model wiring.

**Out of scope**: approval state machine, Xero service operations, manager visibility rules, adding withdraw to this route.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Give each status a distinct labelled semantic treatment using text/icon plus token colour; keep failure/destructive reserved for real failure.
2. Thread the validated failed action into `XeroSyncFailedState`. Use verb-specific “approval failed” or “decline failed” recovery and retry copy.
3. Provide a mobile/200%-zoom approval list that prioritises person, dates, type, balance impact and status, with one clear decision path and complete detail disclosure.
4. Replace the four equal metric cards with a compact queue summary led by pending and failed work. Demote monthly history.
5. Keep Approve and Decline discoverable; move lower-frequency request/recovery actions into contextual disclosure. Restore a full 3px focus ring and announce the row operation in progress.
6. Run one bounded desktop/mobile visual inspection and one confirmation pass.

## Verification and done criteria

- Tests cover every status’s label/icon semantics and failed approve versus failed decline copy.
- Mobile/zoom tests prove the full decision is possible without horizontal panning.
- Keyboard shortcuts, modal focus, cancellation, duplicate-submit protection and focus return pass.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- Detector returns no untriaged findings.

## STOP conditions

Stop if status vocabulary conflicts with the canonical approval enum, if failed action is not available from the service projection, or if action regrouping would remove an authorised workflow.

## Maintenance notes

Use the same action-specific Xero recovery convention in Plan 137 so failures do not drift between employee and manager surfaces.
