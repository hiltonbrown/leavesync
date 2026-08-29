# Plan 136: Make People responsive and restore profile source-of-truth cues

> **Executor instructions**: Read the Impeccable skill, load context once for People, then read `reference/critique.md`, `reference/distill.md`, `reference/adapt.md`, `reference/harden.md` and `reference/craft-floor.md`. Run the drift check and all gates.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/people' 'apps/app/components/people/person-profile-content.tsx'`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug, accessibility, design, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

The list has good Xero/manual provenance, but the profile loses it and shows a dead manual-balance Edit control to viewers. Six table columns and up to nine filter decisions also make the directory hard to use on mobile and at zoom.

## Current state and contract

- Preserve Xero/manual leaf/pencil labels (`people-client.tsx:541-562`), live sync feedback and role-hidden admin actions.
- Gate the Edit column/buttons with the same `canEditManual` condition as the editor (`person-profile-content.tsx:494-605`).
- The profile header at `:103-126` lacks provenance; its local `StatusChip` at `:613-632` drifts from the list’s 12px chip.

## Scope

**In scope**: `people-client.tsx`, `person-profile-content.tsx`, their tests, and a narrow shared status/provenance component within the People feature.

**Out of scope**: people/Xero services, authorisation rules, database schema, global Table changes.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Apply `canEditManual` to the balance Edit header and controls. Add role-aware recovery for Xero-connected but unlinked people, with an admin next step and viewer explanation.
2. Add the same labelled Xero/Manual provenance to the profile header as the list. Consolidate the duplicated status chip at the 12px chip token.
3. Distil filters into a primary search and a secondary filter disclosure with active chips and one Clear action, preserving URL and organisation state.
4. Add a mobile person-list projection prioritising name, role/team, current status and provenance, with a complete profile path. Avoid anonymous horizontal panning.
5. Ensure balance editor messages use live status/error semantics and plain domain labels, not “Leave type id”.
6. Run one bounded desktop/mobile visual pass across list and profile, then one confirmation.

## Verification and done criteria

- Viewer tests prove no manual-balance Edit control renders.
- Xero/manual profile provenance and shared status-chip tests pass.
- Mobile/200% zoom tests cover filters, list and balance panel without two-dimensional primary-task panning.
- Existing sync and access-dialog live regions remain intact.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- Detector returns no untriaged People findings.

## STOP conditions

Stop if profile source provenance is absent from the view model, if role checks differ between server and component, or if a mobile projection would expose fields omitted by permission scoping.

## Maintenance notes

Plan 142 depends on the stable Leave balances destination produced here. Do not change shared table behaviour repository-wide in this slice.
