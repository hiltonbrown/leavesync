# Plan 132: Make the calendar timezone-correct and mobile-operable

> **Executor instructions**: Run the drift check first. Read `.agents/skills/impeccable/SKILL.md`, load context once for the calendar target, then read `reference/critique.md`, `reference/adapt.md`, `reference/harden.md` and `reference/craft-floor.md` before editing. Preserve the established Operate visual world.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/calendar' 'apps/app/components/calendar'`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: bug, accessibility, design, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

The calendar is already product-specific, but the day view places events with `getUTCHours()` inside a fixed 06:00–20:00 range, so organisation-local times can render in the wrong slot or disappear. The month view remains a 56rem grid on mobile, compact event names omit record type, and the primary Add action is not thumb-reachable.

## Current state and contract

- Preserve provenance icons, coverage runway, person lanes, active-filter chips, scan panel, detail popovers and role-scoped data.
- `calendar-day-view.tsx:13,86-119` owns the timezone/off-hours defect.
- `calendar-event-chip.tsx:30-55` lacks record type in its accessible name.
- `calendar-month-view.tsx:40-109` requires horizontal panning below 640px.
- `calendar-toolbar.tsx:90-170` exposes eight control groups and keeps Add at the top.

## Scope

**In scope**: calendar page, day/month views, toolbar, event chip, route-local loading/error surfaces, their tests, and a narrowly scoped timezone helper if needed.

**Out of scope**: authorisation, aggregation, global navigation, changing the canonical AvailabilityRecord model.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Place timed events using `data.range.timezone`, not UTC wall-clock hours. Keep all events discoverable, including before/after the bounded workday, through explicit earlier/later groups or an expanded range.
2. Build the complete compact-event accessible name from person, record type, source and exception state, using canonical label helpers.
3. Replace the mobile month grid with a chronological day-grouped agenda. Preserve a complete day-detail path for every date and avoid two-dimensional panning at 200% zoom.
4. Distil the toolbar into navigation, view/scope and secondary filters. Add a persistent safe-area-aware mobile Add affordance without duplicating focus targets on desktop.
5. Add calendar-shaped loading, retry and stale-data recovery surfaces. Keep prior context visible during background refresh where the current architecture permits.
6. Run one bounded desktop/mobile visual pass covering day, week, month/agenda and coverage, then one confirmation pass.

## Verification and done criteria

- Tests cover Brisbane and non-UTC placement, date boundaries, and events outside 06:00–20:00.
- Event-chip tests assert a complete accessible label.
- Mobile and 200% zoom need no two-dimensional panning for the primary month task.
- Keyboard selection, Escape, focus return, loading, error, empty and long-name states pass.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- Detector returns no untriaged findings for calendar source.

## STOP conditions

Stop if the range contract lacks a trustworthy IANA timezone, if fixing placement requires changing cross-package date semantics, or if the agenda would remove a documented capability. Report the contract gap with exact evidence.

## Maintenance notes

Use time as the primary axis. Keep provenance and pressure as supporting signals, and preserve the timeline lesson that unreported days must not imply zero coverage risk.
