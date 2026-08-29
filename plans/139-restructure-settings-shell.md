# Plan 139: Make Settings responsive, context-safe and goal-grouped

> **Executor instructions**: Read the Impeccable skill, load context once for Settings, then read `reference/critique.md`, `reference/distill.md`, `reference/adapt.md`, `reference/harden.md` and `reference/craft-floor.md`. This is an Operate admin surface. Run the drift check and all gates.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/settings'`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: bug, accessibility, design, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

Settings always reserves a 208px sidebar, drops the active payroll organisation from its nine literal links, exposes nine unrelated destinations as peers, and contains unlabelled auto-save controls. The Xero detail also presents up to eight routine and destructive actions together.

## Current state and contract

- `settings/layout.tsx:24-30` and `settings-nav.tsx:63-88` own the fixed desktop shell.
- `settings-nav.tsx:22-58` uses literal paths without `withOrg`.
- Auto-save label defects are in `settings/feeds/feeds-client.tsx:77-118` and `settings/leave-approval/leave-approval-settings-client.tsx:261-283`.
- Xero action density is at `settings/integrations/xero/xero-client.tsx:198-310`.
- Preserve admin/owner access, server actions, setting semantics, Clerk/Xero organisation separation and Settings section headers.

## Scope

**In scope**: Settings layout/nav, feeds and leave-approval control labelling, Xero action composition/confirmation, their co-located tests.

**Out of scope**: Clerk role policy, billing owner-only product decision, sync job behaviour, database settings models, unrelated settings feature additions.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Pass resolved `orgQueryValue` into Settings navigation and use `withOrg` for every destination. Add exact context-preservation tests.
2. Replace the fixed sidebar below the desktop breakpoint with a labelled sheet/select navigation, correct `aria-current`, focus return and tonal separation rather than a persistent content border.
3. Group destinations under Organisation, Publishing and Operations while preserving route names and direct-link discoverability.
4. Associate every radio/switch with visible labels and descriptions. Add scoped saving/saved/error state for auto-save controls.
5. Distil Xero tenant actions: promote connection health and one recommended sync action; group manual sync types; move disconnect into `ConfirmActionDialog`; expose pause/resume only if the existing audited actions remain supported.
6. On General, remove the unreachable country-confirmation dead path or present NZ/UK as explicit planned read-only choices without suggesting they can be saved.
7. Run one bounded mobile/desktop pass across representative General, Xero, Feeds and Leave approval pages, then one confirmation.

## Verification and done criteria

- Every settings link preserves the exact active `org` value.
- Mobile navigation is keyboard/screen-reader operable and returns focus.
- Feed and leave-approval controls have accessible names, descriptions and receipts.
- Xero disconnect has explicit consequence preview, cancel and duplicate-submit protection.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- Detector returns no untriaged Settings findings.

## STOP conditions

Stop if the settings layout cannot resolve active organisation context without a new data-access contract, if pause/resume actions have drifted or are unsupported, or if changing country availability conflicts with current regional rollout plans.

## Maintenance notes

Plan 143 depends on the responsive shell and grouped navigation. Do not change billing permissions without the unresolved product decision.
