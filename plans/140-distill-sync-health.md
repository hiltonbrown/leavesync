# Plan 140: Make sync status truthful, accessible and easier to operate

> **Executor instructions**: Read the Impeccable skill, load context once for Sync, then read `reference/critique.md`, `reference/distill.md`, `reference/adapt.md`, `reference/harden.md` and `reference/craft-floor.md`. Run the drift check and all gates.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/sync'`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug, accessibility, design, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

Sync health is highly product-specific, but pending state is tracked only by run type, so starting one tenant’s sync falsely marks the same action as running on every tenant. Disabled reasons live only in inaccessible `title` text, four technical dispatch buttons compete per card, and the nine-column history is difficult on mobile and by keyboard.

## Current state and contract

- Preserve tenant scoping, four registered run types, failure/partial/historical hierarchy, live dispatch receipts, run detail, cancellation/re-run semantics and raw-payload privacy.
- `sync-client.tsx:65-70,95-191,394-425` owns the false global pending state.
- Disabled reasoning is at `sync-client.tsx:394-423,683-693` and detail `sync-run-detail-client.tsx:286-294,385-395`.
- History/filter density is at `sync-client.tsx:217-275,482-571`.

## Scope

**In scope**: sync client/tests, run-detail client/tests, and local responsive history/action components.

**Out of scope**: job registration, service/event payloads, retry policy, database queries, failed-record raw-payload policy.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Track pending dispatch as `{ tenantId, runType }`; set `aria-busy` and “Running” only on the selected tenant/action. Add a two-tenant regression test.
2. Replace disabled-only explanations with visible role/connection-aware text or an accessible wrapper/control. Apply the same pattern to run detail.
3. Distil four dispatch buttons into one intentional “Run sync” control with a recommended default and labelled secondary type selection; preserve every operation.
4. Add Clear filters preserving `org`, active filter feedback and filtered-empty recovery.
5. Provide a mobile run-history projection prioritising status, tenant, type, time and failed count with a complete detail link. If retaining horizontal overflow on wider screens, make it labelled and keyboard focusable.
6. Add operation-specific progress and duplicate-submit protection for cancel and re-run. Run one bounded desktop/mobile visual pass plus one confirmation.

## Verification and done criteria

- Two-tenant tests prove pending state never leaks between tenant cards.
- Disabled-reason tests are discoverable by keyboard and screen reader.
- Clear filters, mobile history, cancel and re-run progress tests pass.
- No sync type, failure state or detail path is lost.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- Detector returns no untriaged Sync findings.

## STOP conditions

Stop if tenant ID is unavailable at the pending-state boundary, if action grouping would change server dispatch semantics, or if responsive history would expose omitted raw error payloads.

## Maintenance notes

Pending UI state must always be keyed by both tenant and operation. Preserve `motion-safe` handling for running indicators.
