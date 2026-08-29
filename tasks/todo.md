# Current work

Last reviewed: 2026-08-29

Keep this file limited to active work and unresolved follow-ups. Each plan must
state an outcome, use verifiable checkboxes, and end with a review containing the
evidence actually collected. Completed plans move to `tasks/archive.md`.

## Active plan: Add a role-aware dashboard calendar timeline

Status: Implemented, browser review blocked

### Outcome

Employee, manager, and admin dashboards share an accessible calendar timeline
derived from existing dashboard data. Dates and today remain the primary visual
axis; availability, intensity, and provenance support scanning without changing
product behaviour or introducing a second data-fetch path. Viewer and admin
empty states remain explicit and do not receive a decorative timeline.

### Tasks

- [x] Define typed role adapters and deterministic empty and error fallbacks from
  the existing dashboard projections.
- [x] Implement an accessible timeline with chronological dates, a visible today
  anchor, semantic fallback content, dark mode, and reduced-motion behaviour.
- [x] Pass the feature through employee, manager, and admin compositions while
  preserving explicit viewer and admin empty states.
- [x] Align dashboard hierarchy, skeletons, and responsive layouts.
- [x] Add focused tests for personal and manager data, empty and error data,
  accessibility semantics, and static reduced-motion output.
- [x] Add an explicit manager coverage lane to the horizontal date axis, with
  exact counts, threshold-only peaks, and honest unknown-day states.
- [x] Verify the coverage lane remains horizontally scrollable, keyboard
  navigable, and readable at mobile widths.
- [x] Run targeted formatting plus `bun run check`, `bun run typecheck`,
  `bun run test`, and `bun run test:integration`; record exact results.
- [ ] Run one desktop and mobile Chromium review in light, dark, and reduced-motion
  modes; fix observed defects or record the concrete runtime blocker.

### Review

- The 14-day date axis, keyboard tab interaction, mobile scroll snapping, today
  anchor, confidence labels, public holidays, and honest partial-data states are
  implemented. Manager dates now carry proportional unavailable-person bars and
  visible live or peak counts; unknown future days show `No signal`, never zero.
- View Transitions progressively morph the selected date and are bypassed under
  reduced motion or unsupported browsers. Horizontal overscroll is contained,
  while arrow-key selection still scrolls the focused date into view.
- Targeted Biome checks, app typecheck, `git diff --check`, and 14 focused model
  and interaction tests pass.
- Full `bun run check`, `bun run typecheck`, and `bun run test` pass. The parallel
  integration gate encountered shared fixture collisions in `packages/jobs`;
  the other four packages passed, then the isolated jobs retry passed all 65
  tests. The Xero suite retained its two configured credential-dependent skips.
- Browser automation was attempted again. The CLI is unavailable in the
  workspace, Linux ARM64 exposes only Snap Chromium (which exits before DevTools
  starts), and the Windows control bridge rejects the WSL workspace path. No
  visual screenshot result is claimed.

## Follow-ups

### Calendar subscribe URL verification

- [ ] Review feed list and detail views at desktop and mobile widths using the
  available Chromium installation; verify light and dark modes, selection,
  copying, lifecycle states, and clipboard failure recovery.

### Repository credential cleanup

- [ ] Rotate the credential formerly exposed in `.mcp.json`.
- [ ] Ask GitHub Support to purge retained pull-request refs and cached commit
  views that cannot be rewritten by a normal Git push.
- [ ] Re-audit a fresh remote mirror after the purge and record the result.
