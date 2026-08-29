# Lessons

## Repo conventions inferred during the finalisation audit (2026-06)

- When starting persistent dev servers for smoke checks, always stop every
  spawned app before handing back. Check `lsof -iTCP:3000-3003` or equivalent
  host process state after `bun run dev` verification. Leaving app/web/api/email
  listeners running causes the user's next `bun run dev` to fail with
  `EADDRINUSE`.
- The dev/integration database is built with `db push` (schema-direct), not
  `migrate deploy`. The migration history has drifted from `schema.prisma`: several
  tables and columns exist only in the schema. Always diff migration `CREATE TABLE`
  names against `schema.prisma` `@@map` names before claiming the schema is shippable.
  Treat `migrate:deploy` (the documented production command) as the source of truth for
  launch readiness, not `db push`.
- Tenant isolation is enforced through `scopedQuery(clerkOrgId, organisationId)` in
  `packages/database/src/tenant-query.ts`. New tenant-scoped queries should compose this
  helper. Writes (`update`/`delete`) on tenant tables should also carry both IDs in the
  `where` clause even when keyed by a unique id (Prisma extended-where supports this).
- The "optional env var must be absent, not empty string" rule applies to env Zod
  schemas only (`packages/*/keys.ts`). Prisma column `@default("")` and Zod field
  `.default("")` are not env vars and are out of scope for that rule.
- Em-dash / Australian-English rules target shippable surfaces (code, UI copy, comments,
  product docs). Agent-instruction files (CLAUDE/AGENTS/GEMINI) and vendored
  `skills/next-forge/*` are governance/template material; flag rather than silently edit.
- `packages/analytics` is in use and is NOT on the forbidden-package list. `/webhooks`
  in `apps/api` is a Clerk user webhook (svix), unrelated to the forbidden
  `@repo/webhooks` package.
- Xero access tokens are short-lived (~30 min). Any sync/write path must refresh
  proactively; `connectionActive` only checks expiry, it does not refresh.
- After merging executor branches, check `git worktree list --porcelain`,
  `git branch -vv`, and `git branch --no-merged main` before declaring the repo
  tidy. A clean merge can still leave an auxiliary worktree checked out on an
  already-merged branch, which looks suspicious to the user even when the branch is
  contained in `main`.
- Treat `git fsck` dangling objects as normal unless it reports missing or corrupt
  objects. Do not present dangling commits/blobs from prior rebases or abandoned
  work as repository corruption.

## CI debugging patterns (2026-08)

- Registration tests that load an entire function registry should perform the
  expensive module initialisation once at file setup, after mocks are declared,
  rather than repeating dynamic imports inside a test's default five-second
  timeout. A locally fast cached import is not evidence that the test is stable
  under contended CI workers.
- Before opening or handing off a PR, run the production build from a clean
  generated-file state. `next.config.ts` is evaluated before Next generates
  app artefacts, so it must not depend on application path aliases or full app
  env validation for optional build wrappers. Never pass ignored,
  Next-generated `next-env.d.ts` files as explicit lint targets.
- CI failures are layered: fixing the first blocking stage (e.g. Lint) can expose a
  further failure at a later stage (e.g. integration tests) that was already broken
  and simply never reached. Before treating a newly-visible failure as caused by your
  fix, check `gh run list`/`gh run view` history for an earlier run, on a different
  commit, that reached the same stage and failed the same way. If one exists, it's
  pre-existing, not a regression you introduced.
- Integration tests go stale when a production behaviour change updates the unit test
  file but not the integration test file for the same handler. When an integration
  test fails on an assertion that looks like it's testing old semantics, `git log
  --oneline -- <handler>.ts` and check whether a recent commit deliberately changed
  that behaviour (and updated `*.test.ts` but not `*.integration.test.ts` alongside
  it) before assuming the production code is the bug.
- This WSL2 dev box has no local Postgres and no working `docker` CLI (Docker Desktop
  WSL integration isn't enabled). To run `bun run test:integration` or reproduce a
  CI-only DB-dependent failure, use the Neon MCP tools: `create_branch` off the
  project's existing migrated branch (schema is already applied, no need to
  `migrate:deploy`), export `DATABASE_URL` to that branch's connection string, run the
  tests, then `delete_branch` when done. Always confirm with the user before creating
  Neon resources, since these tools carry a destructive-hint notice.
