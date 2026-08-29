# Plan 143: Make setup a single, confident next-step experience

> **Executor instructions**: `/setup` redirects to `/settings/getting-started`. Keep the redirect and apply Impeccable to the canonical destination. Read the skill, load context once for `apps/app/app/(authenticated)/settings/getting-started`, then read `reference/critique.md`, `reference/distill.md`, `reference/layout.md`, `reference/quieter.md` and `reference/craft-floor.md`.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/setup' 'apps/app/app/(authenticated)/settings/getting-started' 'apps/app/components/onboarding'`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: Plan 139
- **Category**: information-architecture, design, tech-debt, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

The canonical checklist is based on live product state, but dashboard and Settings duplicate its purpose, every step exposes an equal action, progress is only a fraction, and nested rounded cards create generic onboarding chrome. The `/setup` directory also contains an unreachable legacy organisation-creation client.

## Current state and contract

- `/setup/page.tsx:8-22` is a query-preserving redirect.
- `settings/getting-started/page.tsx:27-43` loads the canonical derived state.
- `onboarding-checklist.tsx:23-71` renders the same component for dashboard and Settings.
- Preserve non-blocking onboarding, live derived completion, Xero optionality, organisation context and Done/Next/Later/Optional text.

## Scope

**In scope**: setup redirect tests, canonical checklist, Settings destination, dashboard wrapper if needed for a single-source decision, and deletion of `setup/onboarding-client.tsx` only after a zero-import proof.

**Out of scope**: changing what business events complete each step, organisation creation/Clerk setup, new mandatory onboarding gates.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Keep Settings as the durable checklist and make the dashboard a concise next-step summary linking there, or document the inverse if product evidence proves it. Do not show two full checklists.
2. Promote one `Next` action; collapse completed steps into a quieter completed group and place optional/later steps behind progressive disclosure.
3. Replace the fraction-only treatment with a labelled progress indicator plus plain text. Flatten nested cards into one tonal task surface with rows.
4. Preserve organisation context in every CTA and give the all-complete state a clear return-to-work action.
5. Add redirect tests for repeated/scalar query values. Re-run `rg -n 'OnboardingClient|onboarding-client' apps packages`; remove the dead client only if no runtime importer exists.
6. Run one bounded dashboard/Settings, mobile/desktop and dark-mode inspection, then confirm once.

## Verification and done criteria

- Only one full checklist is shown in the product.
- Exactly one next action is visually primary; complete and all-complete states have tests.
- Every CTA preserves `org`; redirect tests cover repeated values.
- Mobile and 200% zoom reflow without nested-card clutter or clipped CTAs.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.

## STOP conditions

Stop if dashboard dismissal and Settings visibility semantics cannot be reconciled without a product decision, or if the legacy client has a runtime importer.

## Maintenance notes

The derived state loader remains the single business source of truth. Future steps should not add peer CTAs without revisiting progressive disclosure.
