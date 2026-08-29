# Plan 117: Restore the documented marketing focus ring

> **Executor instructions**: Follow all steps and verify shared impact. Modify
> only in-scope files. The reviewer maintains the index.
>
> **Drift check (run first)**:
> `git diff --stat ce5a1c4..HEAD -- apps/web/app/styles/shell.css`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 116 DONE
- **Category**: bug
- **Planned at**: commit `ce5a1c4`, 2026-08-30; reconciled after Plan 116
- **Preview landing**: PENDING; approved commit `d29f65b`; `preview` is
  user-provisioned

## Why this matters

Marketing actions use a 2px focus outline while the design contract requires a
full-opacity 3px semantic ring. This weakens keyboard focus on the integrations
hero and all shared marketing controls.

## Current state

- `apps/web/app/styles/shell.css:248-252` sets `outline: 2px solid` for buttons
  and the mobile navigation toggle.
- DESIGN.md requires a full-opacity 3px primary ring and cites its contrast
  performance.
- Forced-colour behaviour is handled in `shell.css:78-91`; preserve it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Style check | `rg -n "outline: 2px solid var\(--marketing-primary\)" apps/web/app/styles/shell.css` | no matches |
| Lint/typecheck | `bunx ultracite check apps/web/app/styles/shell.css && bun run --cwd apps/web typecheck` | exit 0 |
| Visual keyboard | tab through header and `/integrations` CTAs at 390px and 1440px, light/dark/forced-colour modes | every focus target has an unclipped visible ring |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | all exit 0 |

## Suggested executor toolkit

- Use `impeccable` with `audit` and `polish`; read `craft-floor` before editing.
  Use a bounded keyboard/browser verification pass.

## Scope

**In scope**:
- `apps/web/app/styles/shell.css`

**Out of scope**:
- Focus rules in authenticated apps or unrelated feature-specific controls.
- Token value changes.
- New animation or shadow treatment.

## Git workflow

- Target branch: user-created `preview`; do not create or reset it.
- Branch: `codex/117-restore-marketing-focus-ring`
- Commit: `fix(web): restore marketing focus ring`
- Approved landing commit: `d29f65b`.
- Executor: do not push or merge. Stop if `preview` or `origin/preview` is absent.
- Landing owner: after Plan 116 is reachable from `origin/preview`, update local
  `preview`, fast-forward it to the working branch with `git merge --ff-only`,
  run the plan gates, then push `preview`. Stop and reconcile on divergence.
- Completion proof: `git merge-base --is-ancestor d29f65b origin/preview` must
  exit 0 before this plan is considered landed.

## Steps

### Step 1: Correct the shared ring

Change the shared focus outline to the documented 3px full-opacity semantic
ring. Preserve the 3px offset unless visual inspection proves clipping.

**Verify**: style search and targeted lint pass.

### Step 2: Verify all shared contexts

Keyboard-test desktop header, mobile menu toggle, hero primary and tertiary
actions, footer actions and forced-colour mode. Fix only clipping directly
caused by the thicker shared outline.

**Verify**: every named control has visible, unclipped focus at 200% zoom.

### Step 3: Run gates

Run web typecheck, all repository gates and `git diff --check`.

## Test plan

- No brittle CSS unit test is required. The machine check rejects the old 2px
  rule; browser verification covers actual focus visibility.

## Done criteria

- [x] Shared marketing focus ring is 3px and full opacity.
- [ ] Keyboard focus is visible in all named contexts and themes. Browser
  verification was blocked by the recorded tooling constraint.
- [x] Available gates pass and only `shell.css` changed, subject to the recorded
  environment deviations below.

## STOP conditions

- The design token or focus contract changed.
- Fixing clipping requires layout edits outside `shell.css`.
- Forced-colour mode loses native focus visibility.

## Maintenance notes

New marketing controls should consume this shared focus pattern or a design
system primitive, not define thinner local rings.

## Execution review

- **Verdict**: APPROVE at `d29f65b` on
  `codex/117-restore-marketing-focus-ring`, with browser verification blocked.
- The shared marketing button and mobile-navigation focus rule now uses the
  documented full-opacity 3px primary outline. The existing 3px offset and
  forced-colour block are unchanged.
- Executor verification found no remaining old 2px rule and passed targeted
  Ultracite, web type-check, all 19 repository type-check tasks, all 17 unit
  tasks and `git diff --check`. Reviewer inspected the exact one-line CSS diff
  and confirmed the worktree is clean.
- Full `check` reproduced four unrelated public-holiday diagnostics. Database-
  dependent integration suites could not initialise without `DATABASE_URL`;
  non-database suites passed or skipped.
- No keyboard screenshots are claimed because `agent-browser` is unavailable
  in this environment. No layout change was introduced to compensate without
  evidence.
