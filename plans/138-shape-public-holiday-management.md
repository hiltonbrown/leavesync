# Plan 138: Give public-holiday management one safe, responsive home

> **Executor instructions**: Read the Impeccable skill, load context once for Public Holidays, then read `reference/critique.md`, `reference/shape.md`, `reference/harden.md`, `reference/adapt.md` and `reference/craft-floor.md`. Run the drift check and all gates.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/public-holidays' 'apps/app/app/(authenticated)/settings/holidays'`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: design, error-prevention, accessibility, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

Suppress and permanent delete execute from small row icons without confirmation, custom holidays cannot express jurisdiction/location scope, and the product contradicts itself about whether `/public-holidays` or Settings owns administration. The viewer table also wastes a full Actions column on repeated “Read only” text.

## Current state and contract

- Preserve viewer read access, admin/owner mutation enforcement, year/location/suppressed filters, source/type labels and organisation-scoped holiday logic.
- Direct mutations are at `public-holidays-list.tsx:119-159,265-311`.
- The new-holiday form always sends `jurisdictionId: null` at `new-holiday-modal.tsx:31-50,96-145`.
- `public-holidays/page.tsx:22-27` and `settings/holidays/holidays-client.tsx:41-90` disagree about workflow ownership.

## Scope

**In scope**: public holiday list/form/tests and Settings Holidays summary/launch copy and controls.

**Out of scope**: Nager.Date transport, persistence schema, holiday calculation, feed projection, changing role policy.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Make `/public-holidays` the single operational list unless PRODUCT.md explicitly decides otherwise; make Settings Holidays a truthful summary/launch page. Put “Refresh from source” on the chosen admin surface using the existing action if available.
2. Put suppress and delete behind consequence-aware confirmation with explicit Cancel, affected holiday name and publication impact. Keep Restore lightweight but receipt-backed.
3. Expose all-organisation versus supported jurisdiction/location scope in the new-holiday form and preview the selection before save.
4. Remove the Actions column entirely for viewers. Add an explicit Suppressed badge in addition to dimming/strikethrough.
5. Provide a mobile list/card projection or labelled focusable scroll region with a complete detail/action path.
6. Run one bounded admin/viewer, desktop/mobile and dark-mode visual pass, then confirm once.

## Verification and done criteria

- Confirmation/cancellation tests cover suppress and delete; duplicate submission is prevented.
- Viewer tests contain no Actions header or dead controls.
- Scope tests cover organisation-wide and every supported location/jurisdiction path.
- Refresh ownership and success/error receipt are explicit in UI and tests.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- Detector returns no untriaged findings.

## STOP conditions

Stop if no supported refresh action exists, if jurisdiction scope lacks a safe persisted contract, or if product docs do not resolve which surface owns administration. Report the decision needed instead of duplicating controls.

## Maintenance notes

Keep the member-view and admin-summary copy aligned in `ScreenCatalogue.md` after implementation.
