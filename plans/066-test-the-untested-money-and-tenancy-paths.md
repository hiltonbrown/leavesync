# Plan 066: Test the billing SQL, the tenancy invariants, and delete the drifted duplicates

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- packages/database apps/api/__tests__ packages/availability/src/people`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `121da2a`, 2026-08-12
- **Covers findings**: T-02, T-03, T-04, T-05

## Why this matters

Four gaps, all in code whose failure modes are expensive and silent.

**Billing.** The two invariants that keep subscription state correct under
Stripe's at-least-once, out-of-order delivery — the last-writer-by-event-time
ordering guard and the event dedupe key — live entirely in raw SQL, and every
test that touches that module replaces it with a mock that always resolves. No
test anywhere references `clerk_org_subscriptions` or `stripe_events`. An
out-of-order event that downgrades a paying customer, or a replayed event that
double-counts, passes the entire suite today.

**Tenancy.** `CLAUDE.md` mandates explicit tests for the XeroConnection and
XeroTenant uniqueness invariants. There are none. The invariant the whole tenancy
model rests on is enforced only by a schema attribute that nothing verifies, and
its failure mode is a `findFirst` returning the wrong tenant's tokens for a Clerk
Org with two payroll entities.

**Drifted duplicates.** Two of the highest-risk route test files exist twice, and
the copies have already diverged in a way that matters: the duplicate omits the
`created` field that feeds the very ordering guard above. Two copies means a
reviewer can update one and leave a stale duplicate that still passes.

**An untested 599-line service.** `alternative-contact-service.ts` is the only
file over 500 lines in a domain package with no co-located test; the only
assertions anywhere are boundary mocks checking a `where` clause shape.

## Current state

`packages/database/src/queries/billing.ts:88-112` — the ordering guard:

```sql
ON CONFLICT (clerk_org_id) DO UPDATE SET
  plan_key = EXCLUDED.plan_key,
  ...
  stripe_event_created_at = EXCLUDED.stripe_event_created_at,
  updated_at = NOW()
WHERE clerk_org_subscriptions.stripe_event_created_at IS NULL
   OR EXCLUDED.stripe_event_created_at IS NULL
   OR clerk_org_subscriptions.stripe_event_created_at <= EXCLUDED.stripe_event_created_at
```

`billing.ts:125-131` — the dedupe:

```sql
INSERT INTO stripe_events (id, stripe_event_id, type, processed_at, created_at, updated_at)
VALUES (gen_random_uuid(), ${eventId}, ${type}, NOW(), NOW(), NOW())
ON CONFLICT (stripe_event_id) DO NOTHING
```

Both are mocked away at `apps/api/__tests__/webhooks-payments.test.ts:11` and
`apps/api/app/webhooks/payments/route.test.ts:8`. Verified:
`grep -rln "clerk_org_subscriptions\|stripe_events" --include="*.test.ts"`
returns nothing.

The uniqueness constraints: `packages/database/prisma/schema.prisma:444`
(`organisation_id String @unique` on `XeroConnection`) and `:479`
(`xero_connection_id String @unique` on `XeroTenant`). No test asserts either;
`packages/xero/src/oauth/disconnect.integration.test.ts` creates both without a
P2002 assertion.

The duplicates, with line counts verified:

| Duplicate | Co-located original |
|---|---|
| `apps/api/__tests__/webhooks-payments.test.ts` (226 lines) | `apps/api/app/webhooks/payments/route.test.ts` (225 lines) |
| `apps/api/__tests__/ical-route.test.ts` | `apps/api/app/ical/[token]/route.test.ts` |

The co-located payments copy sets `created: 1_700_000_100` on the Stripe event
fixture at `route.test.ts:46`; the `__tests__` copy does not.
`apps/api/__tests__/` also holds `availability-routes.test.ts` and
`health.test.ts`, which have **no** co-located counterpart.

`CLAUDE.md:363` states the convention: co-located `foo.test.ts` beside `foo.ts`.

**The patterns to copy**: `packages/database/plan_limits.integration.test.ts:18-31`
has a reusable `expectPrismaErrorCode(..., "P2002")` helper, and
`leave_balances.integration.test.ts` shows the isolated-tenant setup and teardown
shape.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| Integration (needs `DATABASE_URL`) | `bun run test:integration` | all pass |

## Scope

**In scope**:
- `packages/database/billing.integration.test.ts` (create)
- a Xero uniqueness integration test (in `packages/database` or `packages/xero`)
- delete `apps/api/__tests__/webhooks-payments.test.ts` and
  `apps/api/__tests__/ical-route.test.ts`, after porting any unique assertion
- `packages/availability/src/people/alternative-contact-service.test.ts` (create)

**Out of scope**:
- `packages/database/src/queries/billing.ts` — this plan **tests** the SQL, it
  does not change it. If a test reveals a defect, report it; do not fix it here.
- `apps/api/app/webhooks/payments/route.ts` — plan 063 owns the handler guard.
- `apps/api/__tests__/availability-routes.test.ts` and `health.test.ts` — they
  have no duplicate. Leave them and note the exception.
- Refactoring `alternative-contact-service.ts`. Characterisation first; changing
  it is a later, separate decision.

## Git workflow

- Branch: `advisor/066-test-coverage`
- Conventional commits, e.g. `test(database): cover the stripe subscription mirror`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Allocate a unique UUID prefix

Before adding fixtures, search every integration test in `packages/database`,
`packages/jobs` and `packages/xero` for hard-coded UUIDs. Choose a readable UUID
prefix that no existing integration test uses, then keep the fixture constants
local to the new test file. Plan 051's proposed registry was rejected because it
was incomplete and did not enforce uniqueness.

**Verify**: `rg -o '"[0-9a-f]{8}-[0-9a-f-]{27}"' packages/database packages/jobs packages/xero --glob '*.integration.test.ts' | sort -u`
shows the new prefix only in the new test file and no pre-existing file shares it.

### Step 2: Cover the billing SQL

Create `packages/database/billing.integration.test.ts`, following the setup and
teardown shape of `leave_balances.integration.test.ts`, asserting:

1. mirror a subscription, then replay an **older** `stripe_event_created_at` →
   the row is unchanged
2. mirror a **newer** event → it wins
3. a null `stripe_event_created_at` on either side → the documented fallback
   behaviour, matching the SQL's `IS NULL` branches
4. `recordStripeEvent` called twice with the same id → exactly one row
5. `isStripeEventProcessed` flips from false to true

Case 1 is the one that matters most: it is the downgrade-a-paying-customer
scenario.

**Verify**: `bun run test:integration` → all pass.

### Step 3: Cover the tenancy uniqueness invariants

Add an integration test that creates an Organisation and one XeroConnection, then
asserts a second `xeroConnection.create` for the same `organisation_id` rejects
with P2002. Repeat for a second `xeroTenant.create` on the same
`xero_connection_id`. Reuse `expectPrismaErrorCode`.

**Verify**: `bun run test:integration` → all pass; temporarily removing one
`@unique` from the schema would make the test fail (reason about this, do not
actually migrate).

### Step 4: Delete the drifted duplicates

Diff each pair case by case. Port into the co-located file any assertion that
exists **only** in the `__tests__` copy. Then delete both duplicates.

Do not simply delete on the assumption the co-located copy is a superset — the
`created` field difference proves the copies drifted in both directions.

**Verify**: `cd apps/api && bunx vitest run` → passes with no fewer distinct
assertions than before; `ls apps/api/__tests__/` shows only
`availability-routes.test.ts` and `health.test.ts`.

### Step 5: Characterise `alternative-contact-service.ts`

Run coverage scoped to the package first to see what the server-action tests
already exercise incidentally:
`cd packages/availability && bunx vitest run --coverage src/people`.

Then write characterisation tests for what is uncovered, prioritising the
tenant-scoping predicates (every query must carry both `clerk_org_id` and
`organisation_id`) and the contact resolution and precedence rules.

This is a first pass, not exhaustive coverage. Document the measured starting
percentage and the ending one in the report.

**Verify**: `bun run test` → exit 0, 17/17 tasks.

## Test plan

Covered by the steps above. The structural patterns to follow:
`packages/database/plan_limits.integration.test.ts` for P2002 assertions and
isolated tenants; `packages/database/leave_balances.integration.test.ts` for
setup/teardown; the existing `packages/availability/src/people/*.test.ts` files
for service-level unit tests.

Verification: `bun run test` → exit 0; `bun run test:integration` → exit 0, with
at least 10 new tests across both lanes.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks
- [ ] `bun run test:integration` exits 0
- [ ] `grep -rln "clerk_org_subscriptions" --include="*.test.ts" packages apps` returns at least one file
- [ ] `grep -rn "P2002" --include="*.test.ts" packages | grep -i "xero"` returns at least one match
- [ ] `ls apps/api/__tests__/` lists exactly `availability-routes.test.ts` and `health.test.ts`
- [ ] `packages/availability/src/people/alternative-contact-service.test.ts` exists
- [ ] The report records the before/after coverage figure for
      `alternative-contact-service.ts`
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- No `DATABASE_URL` is reachable. Steps 2 and 3 cannot be verified without one,
  and a `describe.skip` is not evidence. Complete Steps 4 and 5 and report the
  rest as written-but-unverified.
- A billing test **fails** against the current SQL. That is a real defect in the
  money path — report it immediately with the failing case; do not fix the SQL
  under this plan.
- An assertion exists only in a `__tests__` duplicate and cannot be ported
  cleanly, meaning the two files test genuinely different things.
- Existing integration fixtures already use the chosen prefix. Pick another
  unused prefix before writing any rows; do not renumber another file here.

## Maintenance notes

- Once billing has integration coverage, the mocks in the route tests are fine —
  they test the handler, and the integration tests test the SQL. Keep both layers.
- The `apps/api/__tests__/` directory should not grow. New route tests go beside
  their route, per `CLAUDE.md:363`. A reviewer should reject additions there.
- `alternative-contact-service.ts` gets characterisation tests, not a refactor.
  If someone later wants to restructure it, these tests are the baseline that
  makes it safe — that is the whole reason to write them first.
