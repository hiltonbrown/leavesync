# Plan 067: Consolidate the duplicated helpers and correct the wrong documentation

> **Reconciliation verdict (2026-08-24): REJECTED as a compound plan. Do not
> execute it.** It combines four independent code/tooling changes and one
> partly incorrect documentation finding. Plans 082 to 085 replace the valid
> work with explicit scope and dependencies.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- packages/feeds/src packages/availability/src/analytics packages/notifications CLAUDE.md package.json`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt, deps, dx, docs
- **Planned at**: commit `121da2a`, 2026-08-12
- **Outcome**: REJECTED, superseded by plans 082, 083, 084 and 085
- **Covers findings**: A-01, A-03, M-01, D-01, DOC-01

## Why this matters

Five small items, each cheap, each currently costing something concrete.

**A label rendered eight ways.** `labelForRecordType` is implemented eight times,
and they have drifted: two render `WFH`, six render `Wfh`. That is not cosmetic —
the wrong casing is **persisted** into `published_summary` and shipped to
subscribers' calendars. Any future label change needs eight edits with no
compiler help.

**Two KV clients.** `packages/feeds` and `packages/notifications` each hand-roll
an Upstash REST client over `fetch` with the same unwrap and error shape. Their
env handling diverges: feeds validates through the `keys()` pattern with a
both-or-neither check; notifications reads `process.env` directly and
re-implements the check by hand, with no `keys.ts` at all. `CLAUDE.md` lists the
KV variables as belonging to feeds only, so a deploy that provisions KV "for
feeds" silently also enables or disables real-time notifications.

**An override that became a ceiling.** The root `overrides` block pins
`ws@8.21.0` as a security floor, but `packages/database` later declared
`^8.21.2`. The installed version does not satisfy the only declared range in the
repo, and `--frozen-lockfile` cannot catch it because the lockfile faithfully
records the override.

**A documented command that fails.** `CLAUDE.md` documents
`bunx vitest run <path>` from the repo root. There is no root vitest config, so
it fails on every `.tsx` test with a misleading "invalid JS syntax" error — while
silently *appearing* to work for node-environment tests, which it runs under the
wrong resolution.

**Documentation that misdirects agents.** `CLAUDE.md` omits `packages/billing`
and `packages/analytics` from its package tables, and warns against ten "not in
use" packages, **none of which exist**. It is the primary orientation document
for agents executing these plans.

## Current state

**A-01** — eight implementations, verified:
`packages/feeds/src/projection/feed-projection.ts:359` (exported; also honours
`record.title` — the canonical one), `packages/feeds/src/render/render-html.ts:324`
(adds a `public_holiday` case),
`packages/availability/src/analytics/out-of-office-service.ts:680`,
`.../leave-reports-service.ts:780`, `.../analytics-csv.ts:4`,
`packages/availability/src/plans/plan-service.ts:1283`,
`apps/app/app/(authenticated)/analytics/out-of-office/page.tsx:286` and
`.../ooo-days-monthly-chart.tsx:76`. Only the last two special-case `wfh`:

```ts
if (recordType === "wfh") {
```

`wfh` is a real enum value (`packages/database/prisma/schema.prisma:120`). The
label reaches subscribers via `feed-projection.ts:188` and is persisted by
`packages/feeds/src/publication/publication-service.ts:203`.

**A-03** — `packages/feeds/src/cache/feed-cache.ts:128` `createRestCacheClient`
(`del`/`get`/`scan`/`set`) and
`packages/notifications/src/sse/redis-stream.ts:47` `createRestStreamClient`
(`xadd`/`expire`/`xrange`). The notifications env read, `redis-stream.ts:27-36`:

```ts
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;
if (Boolean(url) !== Boolean(token)) {
  throw new Error(
    "KV_REST_API_URL and KV_REST_API_TOKEN must both be set or both omitted to configure notification SSE."
  );
}
```

versus `packages/feeds/keys.ts:11-29`, which validates the same pair through
`@t3-oss/env-nextjs`. `packages/notifications` has no `keys.ts`.

**M-01** — root `package.json:53` has `"ws": "8.21.0"` in `overrides`;
`packages/database/package.json:26` declares `"ws": "^8.21.2"`.

**D-01** — `CLAUDE.md:135` documents `bunx vitest run <path>`. Reproduced from
root: `bunx vitest run apps/app/components/states/empty-state.test.tsx` fails
with "Failed to parse source for import analysis because the content contains
invalid JS syntax". Verified vitest configs exist only at `apps/api`, `apps/app`,
`apps/web`, `packages/core`, `packages/database`, `packages/feeds` and `tooling`.

**DOC-01** — `CLAUDE.md:232-254` lists the packages; `packages/billing` and
`packages/analytics` are in neither table. `CLAUDE.md:256-258` names ten "not in
use" packages. Verified: none of the ten directories exists under `packages/`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| Build | `bun run build` | exit 0, 4/4 tasks |
| Audit | `bun audit` | 2 known build-time advisories, no critical/high |

## Scope

**In scope**:
- `packages/core/src/record-type-label.ts` (create) plus the eight call sites
- a shared KV REST client and `packages/notifications/keys.ts` (create)
- root `package.json` `overrides`, and `bun.lock` via a re-lock
- `CLAUDE.md`
- `README.md` if it repeats the same wrong vitest command

**Out of scope**:
- The `published_summary` values already stored with `Wfh`. Correcting stored
  rows is a data question — see Step 2's note.
- Switching either KV client's wire protocol or adding a dependency.
- `packages/design-system`.
- Adding a root `vitest.config.mts`. The docs fix is smaller and more honest;
  see Step 5.

## Git workflow

- Branch: `advisor/067-consolidation-and-hygiene`
- One commit per lettered item, so any of them can be reverted alone.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: One record-type label in `@repo/core`

Move the `feed-projection.ts:359` version into `@repo/core` with an explicit
overrides map — `wfh → "WFH"`, `public_holiday → "Public holiday"` — and options
for the `title` override the feed version honours. Replace the other seven
definitions with imports.

`@repo/core` depends only on `zod`, so a pure string helper belongs there and is
importable from both `packages/feeds` and `packages/availability`.

**Verify**: `grep -rn "function labelForRecordType" packages apps | grep -v "/generated/"`
returns exactly one definition; `bun run test` → exit 0.

### Step 2: Decide what happens to already-persisted `Wfh` summaries

Existing `published_summary` rows hold the wrong casing. They will correct
themselves on the next materialisation for each record. Confirm that is
acceptable and **write the decision into the report**; if a SEQUENCE bump is
needed so subscribers see the corrected text, say so explicitly rather than
assuming calendars will refresh.

Do not write a backfill under this plan.

**Verify**: the report states the decision.

### Step 3: One KV REST client and a `keys.ts` for notifications

Extract a shared `createKvRestClient({ url, token })` exposing a generic
`command(parts)`, and have `feed-cache` and `redis-stream` layer their own typed
methods on top. Add `packages/notifications/keys.ts` mirroring
`packages/feeds/keys.ts`, and have `redis-stream.ts` use it instead of reading
`process.env` directly.

Keep `setNotificationSseStreamClientForTests` working — it is the existing test
seam.

**Verify**: `grep -c "process.env.KV_REST_API" packages/notifications/src/sse/redis-stream.ts`
prints `0`; `bun run test` → exit 0.

### Step 4: Fix the `ws` override

Bump the override to `8.21.2` so it satisfies the declared range, or drop it if
the advisory floor is now met transitively. Re-lock and confirm the resolved
version.

This also moves `engine.io` and `socket.io-adapter`, which declare `~8.21.0`, so
run the full build and test suite rather than typecheck alone.

**Verify**: `bun install` then
`grep -A2 '"ws"' package.json` shows `8.21.2`; `bun run build` → exit 0, 4/4;
`bun run test` → exit 0, 17/17; `bun audit` shows no new advisory.

While here, add a one-line comment against each remaining override
(`@grpc/grpc-js`, `fast-uri`, `parse5`, `protobufjs`, `vite`,
`import-in-the-middle`, `require-in-the-middle`, `hono`, `next`) recording why it
exists. Do not delete any of them under this plan — absence of a direct declarer
is not proof a transitive floor is unneeded.

### Step 5: Correct the documented test command

Change `CLAUDE.md:135` (and the same example in `README.md` if present) to the
form that actually works:
`cd <workspace> && bunx vitest run <file>`.

**Verify**: run the corrected command against a `.tsx` test and confirm it
passes: `cd apps/app && bunx vitest run components/states/empty-state.test.tsx`.

### Step 6: Correct the package tables

Add `packages/billing` (Stripe client, plan catalogue, entitlements) and
`packages/analytics` to the appropriate `CLAUDE.md` tables. Delete the "Not in
use" section, or replace it with one line noting the next-forge starter packages
were removed. Add `packages/notifications` as a consumer of the KV variable pair
in the environment table, reflecting Step 3.

**Verify**: `grep -c "packages/billing" CLAUDE.md` prints 1 or more;
`grep -c "feature-flags" CLAUDE.md` prints `0`.

## Test plan

- `packages/core`: the label helper — each enum value, the `wfh` and
  `public_holiday` overrides, the `title` override, an unknown value
- `packages/feeds`: ICS output for a `wfh` record now reads `WFH`
- `packages/notifications`: the KV client resolves through `keys.ts`, and the
  both-or-neither check still throws when only one variable is set
- `packages/feeds`: `feed-cache` still passes its existing suite against the
  shared client

Verification: `bun run test` → exit 0, with at least 8 new tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 8 new tests
- [ ] `bun run build` exits 0, 4/4 tasks
- [ ] Exactly one `labelForRecordType` definition remains
- [ ] `grep -c "process.env.KV_REST_API" packages/notifications/src/sse/redis-stream.ts` prints `0`
- [ ] `packages/notifications/keys.ts` exists
- [ ] The `ws` override satisfies `^8.21.2` and `bun audit` shows no new advisory
- [ ] `cd apps/app && bunx vitest run components/states/empty-state.test.tsx` passes
- [ ] `grep -c "feature-flags" CLAUDE.md` prints `0`
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- Bumping `ws` pulls in a breaking change for `engine.io`/`socket.io-adapter`, or
  `bun audit` reports a **new** advisory afterwards.
- Correcting `wfh` to `WFH` in feed output turns out to require a SEQUENCE bump
  to reach subscribers, and the operator has not agreed to the resulting feed
  churn.
- The shared KV client cannot serve both call sites without one of them losing a
  behaviour (for example, `scan` semantics differing from `xrange`). Keep two
  thin typed layers over one transport rather than forcing a single interface.
- Deleting the "Not in use" section would remove guidance the operator still
  wants. It is a documentation change with a real audience — flag rather than
  assume.

## Maintenance notes

- Each of the six steps is independently revertible by design. If one causes
  trouble, revert that commit rather than the branch.
- The `labelForRecordType` consolidation is the kind of duplication that recurs.
  A reviewer seeing a new local `snake_case → Title Case` helper should ask why
  it is not the shared one.
- `CLAUDE.md` is load-bearing for every agent executing these plans. Treat a
  package added or removed as requiring a `CLAUDE.md` change in the same PR.
