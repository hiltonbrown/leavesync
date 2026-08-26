# Plan 089: Map Xero person matches to a serialisable client view model

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- apps/app/app/'(authenticated)'/settings/integrations/xero/matches`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt, security
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Replaces**: client-boundary half of rejected Plan 031

## Why this matters

The server page passes Prisma `XeroPersonMatch` and `Person` shapes directly to
a client component. That couples the browser boundary to persistence fields and
can expose new columns accidentally when the model evolves. The query already
selects a narrow person shape; the match row needs the same explicit treatment.

## Current state

- `matches/page.tsx` performs a dual-tenant, pending-only query and passes its
  result to `MatchesClient`.
- `matches-client.tsx` imports `Person` and `XeroPersonMatch` from generated
  Prisma code and composes its prop type.
- `_connection-view.ts` in the parent integration settings area demonstrates a
  server-to-client view-model mapper pattern.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Focused | `bunx vitest run apps/app/app/'(authenticated)'/settings/integrations/xero/matches` | all pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | exit 0 |

## Scope

**In scope**: matches page/client, a local `_match-view.ts` mapper/test and
co-located page/client tests if present.

**Out of scope**: match resolution actions, query semantics, schema and general
database package exports.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `advisor/089-match-view-model`
- Commit: `refactor(app): map xero matches for the client`
- Do not push or open a PR unless instructed.

## Steps

1. Inventory every field rendered or sent to `resolveXeroPersonMatchAction`.
2. Narrow the Prisma query to those match and relation fields only.
3. Add an explicit serialisable `XeroPersonMatchView` and pure mapper. IDs remain
   strings at the React boundary; dates must be formatted or omitted, never
   passed as Prisma objects.
4. Change `MatchesClient` to import only the local view type. Preserve all
   tenant filtering and action payloads.
5. Add mapper/client tests and run all gates.

## Test plan

Candidate present/absent, missing email, stable IDs, exact serialised keys and
unchanged resolve/ignore action inputs.

## Done criteria

- [ ] Client imports no generated database types.
- [ ] Query and mapper expose only used fields.
- [ ] Client output/actions are unchanged.
- [ ] Four gates pass; index updated.

## STOP conditions

Stop if the client genuinely needs a non-serialisable field, action inputs rely
on an omitted persistence field, or current tenant filters differ from the
documented dual-key contract.

## Maintenance notes

Server components may use Prisma types; client component props should be explicit
application view models.
