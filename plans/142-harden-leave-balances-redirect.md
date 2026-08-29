# Plan 142: Preserve leave-balance deep links and orient users at the person profile

> **Executor instructions**: `/leave-balances` is a redirect shim. Do not design a page that never renders. Read `.agents/skills/impeccable/SKILL.md` and use Impeccable on the canonical People/profile destination through Plan 136. Run the drift check and all gates.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/leave-balances/page.tsx' 'apps/app/components/people/person-profile-content.tsx'`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 136
- **Category**: correctness, information-architecture, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

Old `/leave-balances` bookmarks land on `/people` or `/people/[personId]`, but users receive no direct balance anchor and repeated `org` values are cast to a scalar unsafely. The correct design work belongs to the profile balance panel, not this redirect.

## Current state

- `leave-balances/page.tsx:11-28` preserves other query parameters and uses `personId` to choose list versus detail.
- The profile balance panel is the canonical destination and is covered by Plan 136.
- The redirect has no loading, empty, error or responsive state because it never renders.

## Scope

**In scope**: redirect normalisation/tests and a stable balance anchor or tab query on the canonical profile if that mechanism already exists or can be added locally.

**Out of scope**: balance calculations, Xero balance sync, profile redesign outside Plan 136, a new `/leave-balances` UI.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Normalise array/scalar `org` and `personId` consistently using the repository query pattern.
2. Preserve arbitrary repeated non-routing parameters and add a stable destination anchor/query that opens or focuses Leave balances when a person is supplied.
3. Add redirect tests for missing/scalar/repeated identifiers, organisation context and exact destination.
4. Let Plan 136 own profile provenance, role-gated edits, recovery guidance and responsive balance presentation.

## Verification and done criteria

- Redirect tests prove exact list/detail destinations and query preservation.
- A person-specific legacy URL lands with Leave balances discoverable without manual tab hunting.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- No screenshot or design-health claim is made for the redirect itself.

## STOP conditions

Stop if the person profile has no stable tab/anchor contract and adding one would require broad navigation changes, or if external consumers rely on a different destination.

## Maintenance notes

Keep the shim until product owners explicitly retire old links. Plan 136 is the visual source of truth.
