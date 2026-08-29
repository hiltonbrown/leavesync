# Plan 141: Keep availability deep links correct and remove legacy UI ambiguity

> **Executor instructions**: This target is a redirect shim, not a rendered page. Do not invent a visual design for it. Read `.agents/skills/impeccable/SKILL.md` and resolve any visual critique to the canonical `/plans` surface owned by Plan 137. Run the drift check and all gates.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/availability' 'apps/app/lib/navigation/nav-items.ts'`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 137
- **Category**: correctness, tech-debt, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

`/availability`, `/availability/new`, and `/availability/[recordId]/edit` only redirect to `/plans`. Impeccable cannot critique a composition that never renders. The remaining user-facing issues are duplicate command-palette concepts, unsafe array handling for repeated `org` parameters, and an unused legacy form that can mislead future design work.

## Current state

- The three page files return only `redirect(...)` and preserve non-organisation query values.
- Each casts `org` from `string | string[] | undefined` to a scalar before `withOrg`.
- `apps/app/lib/navigation/nav-items.ts:103-115` exposes both “New leave request” and “New plan” for the same canonical form.
- `manual-availability-form.tsx` has no importer at the planning SHA and diverges from the canonical plans form.

## Scope

**In scope**: the three redirect pages, redirect/navigation tests, `nav-items.ts`, and deletion of `manual-availability-form.tsx` only after a fresh zero-import proof.

**Out of scope**: `/plans` UI, availability domain actions, redirecting old URLs somewhere other than the documented canonical routes.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Add a small shared scalar-query normaliser or use the existing repository pattern; select the first valid `org` value consistently in all three redirects.
2. Add redirect tests for missing, scalar, repeated and invalid `org`; repeated non-org parameters; `personId`, date and edit deep links.
3. Distil command-menu creation to one canonical “New plan” action, or make the visible label describe the Leave/Availability intent selector without exposing the legacy route.
4. Re-run `rg -n 'ManualAvailabilityForm|manual-availability-form' apps packages`. If zero production importers remain, remove the dead form and add a guard assertion. Otherwise STOP.
5. Execute Plan 137 for the actual visual critique and refinement of the rendered destination.

## Verification and done criteria

- Redirect tests prove exact destination and query preservation for all three routes.
- `rg -n 'href: "/availability/new"|ManualAvailabilityForm' apps packages` returns no unintended production path.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- No visual screenshot claim is made for the redirect itself.

## STOP conditions

Stop if the legacy form has a runtime importer, if external consumers require both command entries, or if canonical route ownership differs from `ScreenCatalogue.md`. Do not modify Plan 137 files here.

## Maintenance notes

Keep compatibility redirects until an explicit product deprecation removes them. Their tests are the contract for old bookmarks.
