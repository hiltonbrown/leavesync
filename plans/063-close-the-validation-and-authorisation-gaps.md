# Plan 063: Validate what crosses the API boundary and stop trusting webhook metadata

> **Reconciliation verdict (2026-08-24): REJECTED as a compound plan. Do not
> execute it.** The three findings remain, but they have different boundaries
> and failure contracts. Plans 077, 078 and 079 replace them.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- apps/api/app/api/availability apps/api/app/webhooks/payments packages/feeds/src/tokens`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `121da2a`, 2026-08-12
- **Outcome**: REJECTED, superseded by plans 077, 078 and 079
- **Covers findings**: S-03, S-04, S-05

## Why this matters

Three places where a boundary is enforced by convention rather than by code.
None is currently exploitable — tenant isolation still holds on all three — but
each is a guard rail that is missing where its neighbours have one.

**Unvalidated input on the availability routes.** The tenant key is read straight
off the request body outside the Zod schema, and the route param is cast to a
branded id with no UUID check. `CLAUDE.md` requires Zod on all external input,
and the sibling notifications route does exactly that. The cost today is
malformed identifiers reaching the driver and surfacing as caught 500s whose
exception object then gets logged, plus `as` casts that defeat the branded-ID
system that is the repo's main defence against key-mixing.

**An ungated token minter.** `createInitialToken` mints a plaintext feed token
with no acting-role check, sitting beside two siblings that both check
`isAdminOrOwner`. It has **zero call sites**, so it is ungated *and* dead — the
next caller wired to it inherits no protection and nothing in the type system
says so.

**Webhook metadata as the sole tenant key.** The Stripe handler routes the
subscription mirror entirely on `metadata.clerk_org_id`, and the upsert
overwrites plan, status, period end and customer id on conflict. Signature
verification is correct, so this is not forgeable from outside; the risk is
integrity. Any subscription created outside the checkout flow — Stripe Dashboard,
a migration script, a support-created subscription — can be attributed to the
wrong Clerk Organisation and silently change another tenant's entitlements.

## Current state

`apps/api/app/api/availability/route.ts:69`:

```ts
const organisationId = body.organisationId as string | undefined;
```

`CreateAvailabilitySchema` (`:9-20`) does not include `organisationId`. The same
pattern is at `apps/api/app/api/availability/[recordId]/route.ts:65` and `:220`,
and `:94` casts the route param straight to a branded id with no UUID check.

**The sibling that does it right**:
`apps/api/app/api/notifications/[notificationId]/mark-read/route.ts:5-7,42-46`
validates both the body and the param with `z.string().uuid()`. Match it.

`packages/feeds/src/tokens/token-service.ts:87-103` — `createInitialToken` takes
`InitialTokenInputSchema` (`:56`), which has no `actingRole` field, performs no
role check, and returns a `TokenDisclosure` including `plaintext`. Its siblings
`rotateToken` (`:167`) and `revokeToken` (`:264`) both gate on
`isAdminOrOwner(parsed.data.actingRole)`. Verified call sites: only its own test
at `token-service.test.ts:50,118`. The transactional variant
`createInitialTokenWithClient` (`:105`) is the one actually used, from
`packages/feeds/src/feed-service.ts:246,352`, and those callers are role-checked
at `feed-service.ts:191`.

`listTokens` (`:314`) and `getActiveTokenHint` (`:348`) also accept no acting role.

`apps/api/app/webhooks/payments/route.ts:50`:

```ts
const clerkOrgId = data.metadata?.clerk_org_id;
```

`packages/database/src/queries/billing.ts:99` — the write is
`ON CONFLICT (clerk_org_id) DO UPDATE SET ... stripe_customer_id = EXCLUDED.stripe_customer_id`,
so a wrong `clerk_org_id` overwrites another tenant's row in one statement. The
handler already treats *missing* metadata as an error (`route.ts:51-56`); the
*incorrect* metadata case is unguarded.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| API suite | `cd apps/api && bunx vitest run` | 13 files / 101 tests baseline, plus new |

## Scope

**In scope**:
- `apps/api/app/api/availability/route.ts` and `[recordId]/route.ts`, plus their
  co-located tests
- `packages/feeds/src/tokens/token-service.ts` and its test
- `apps/api/app/webhooks/payments/route.ts` and its co-located test

**Out of scope**:
- `packages/database/src/queries/billing.ts`. The SQL is correct for what it is
  asked to do; the guard belongs in the handler. Plan 066 adds its tests.
- `apps/api/__tests__/webhooks-payments.test.ts` — plan 066 deletes that
  duplicate. Do not edit it here; you would be editing a file about to be removed.
- `packages/feeds/src/feed-service.ts` — its role checks are already correct.
- The Stripe checkout flow that sets the metadata in the first place.

## Git workflow

- Branch: `advisor/063-validation-and-authorisation`
- Conventional commits, e.g. `fix(api): validate availability route input with zod`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Validate the availability route input

Add `organisationId: z.string().uuid()` to `CreateAvailabilitySchema` and
`UpdateAvailabilitySchema`, and parse `recordId` with `z.string().uuid()` before
use. Have the schemas emit the branded types so the `as ClerkOrgId`,
`as OrganisationId` and `as AvailabilityRecordId` casts can be deleted rather
than merely moved.

Model the shape on the mark-read route named above.

**Verify**: `grep -c " as " apps/api/app/api/availability/route.ts apps/api/app/api/availability/[recordId]/route.ts`
decreases; `bun run typecheck` → exit 0.

### Step 2: Test the 400 paths

Add cases asserting a malformed `organisationId` and a malformed `recordId` each
return 400 with the route's existing error shape, and never reach the service
layer.

**Verify**: `cd apps/api && bunx vitest run` → all pass.

### Step 3: Delete the dead ungated token minter, and gate its read siblings

Delete `createInitialToken` (`:87-103`) and the test that exercises it. Keep
`createInitialTokenWithClient`, which is only reachable from role-checked
callers.

Add a required `actingRole` with an `isAdminOrOwner` check to `listTokens` and
`getActiveTokenHint`, and update the two `feed-service.ts` read paths that call
them. The package should enforce its own invariant rather than trusting callers.

**Verify**: `grep -rn "createInitialToken\b" packages apps | grep -v createInitialTokenWithClient`
returns nothing; `bun run typecheck` → exit 0.

### Step 4: Cross-check the Stripe customer before mirroring

Before `upsertSubscriptionFromWebhook`, look up the existing
`clerk_org_subscriptions` row for that `clerk_org_id`. If a row exists with a
**different** `stripe_customer_id`, log at error level with both ids and **skip**
the write rather than overwriting.

A skip must be retryable, not a silent success: return the same non-2xx shape the
handler already uses for the missing-metadata case so Stripe redelivers, or
record it explicitly for operator follow-up. Choose one and state which in a
comment.

**Verify**: `cd apps/api && bunx vitest run` → all pass, including the new case.

## Test plan

- availability create: malformed `organisationId` → 400, service not called
- availability update: malformed `recordId` → 400, service not called
- availability create: valid input still succeeds (no regression)
- token service: `listTokens` and `getActiveTokenHint` reject a non-admin role
- token service: the admin path still returns tokens
- payments webhook: a subscription whose `clerk_org_id` maps to a row with a
  different `stripe_customer_id` is skipped and logged, and the existing row is
  unchanged
- payments webhook: a matching customer still mirrors normally
- payments webhook: a first-time subscription with no existing row still mirrors

Verification: `bun run test` → exit 0, with at least 8 new tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 8 new tests
- [ ] `grep -rn "body.organisationId as" apps/api/` returns nothing
- [ ] `grep -rn "export async function createInitialToken(" packages/feeds/` returns nothing
- [ ] `grep -A6 "actingRole" packages/feeds/src/tokens/token-service.ts` shows a
      role check in `listTokens` and `getActiveTokenHint`
- [ ] The payments handler reads the existing subscription row before upserting
- [ ] No credential values appear anywhere in the diff
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- A legitimate product flow re-points a Clerk Organisation at a new Stripe
  customer (a plan migration, a re-subscription after cancellation). The Step 4
  guard would then block a valid write, and the correct design is to resolve
  `clerk_org_id` **from** the stored `stripe_customer_id` and treat metadata as a
  cross-check only. Confirm with the operator before choosing.
- Deleting `createInitialToken` breaks a caller not found by the greps above.
- Adding `actingRole` to `listTokens` requires threading a role through a call
  path that does not have one, which would mean a genuinely unauthenticated read
  path exists. That is a bigger finding — report it.

## Maintenance notes

- The rule: every exported function that mints, rotates or reveals a credential
  takes an acting role and checks it itself. Callers are not the enforcement
  point. A reviewer should apply this to any new token-service export.
- Webhook metadata is attacker-influenced only in the sense that it is
  operator-editable in a third-party dashboard. Treat it as a hint to be
  cross-checked, never as a tenant key.
- Plan 066 adds integration tests for the billing SQL underneath this handler.
  The two are complementary: this plan guards the caller, 066 proves the SQL.
