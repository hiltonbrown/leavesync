# Plan 137: Make plans clear, responsive and truthful about provenance

> **Executor instructions**: Read the Impeccable skill, load context once for Plans, then read `reference/critique.md`, `reference/distill.md`, `reference/adapt.md`, `reference/clarify.md` and `reference/craft-floor.md`. Run the drift check and all gates.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/plans' 'apps/app/components/states/xero-sync-failed-state.tsx'`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: accessibility, design, error-recovery, performance, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

Plans is strongly product-specific, but it labels provenance as “Leave” versus “Availability” instead of Xero versus Manual, drops the failed outbound action, relies on a wide employee table, presents four equal status cards and lacks direct filter reset. These issues conflate category with source and make the employee experience unnecessarily dense.

## Current state and contract

- Preserve My/Team role rules, Xero disconnection explanation, status semantics, one visible row action plus overflow, synchronous write confirmations and balance truth.
- `plans-client.tsx:681-699` owns the misleading source labels.
- `plans-client.tsx:383-417` invokes generic failure recovery.
- The table is at `:321-425`, status grid at `:646-678`, and filters at `:266-319`.
- `plans/page.tsx:146-163` computes working days once per record and needs a bounded performance check before any optimisation.

## Scope

**In scope**: Plans page/client/status files, co-located tests, route-local loading/error states, failure view-model wiring, and a targeted batch/caching change only if measured query amplification is proven.

**Out of scope**: availability state machine, Xero write services, balance formulas, feed publication, broad database refactors.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Label provenance Xero/Manual with leaf/pencil; keep Leave/Availability as a separate record category/type label.
2. Carry the validated failed action into the client view model and render submit/withdraw-specific recovery copy.
3. Replace the mobile table with a lighter plan list prioritising type/source, dates, status, balance and one action. Keep complete detail/actions in disclosure.
4. Replace four equal status cards with a compact, action-led summary. Add associated filter labels, active filter chips and Clear filters preserving tab and `org`.
5. Add route-local loading/error states shaped like the plan list. Show per-row pending state rather than disabling the entire list without context.
6. Characterise working-day computation for a representative large list. Batch or cache only if the test proves repeated expensive work; otherwise record the rejection.
7. Run one bounded desktop/mobile visual inspection plus one confirmation.

## Verification and done criteria

- Tests prove Xero/Manual is independent of Leave/Availability type.
- Failed submit and withdraw render action-specific recovery.
- Mobile/200% zoom, label association, filter reset, per-row pending and route states pass.
- Performance characterisation is recorded with an explicit optimise/not-worth-doing verdict.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- Detector returns no untriaged findings.

## STOP conditions

Stop if source type and record category cannot be distinguished by the current view model, if failed action is unavailable, or if performance work requires changing working-day domain semantics.

## Maintenance notes

Plan 141 depends on this as the canonical visual destination. Keep action-specific failure language aligned with Plan 134.
