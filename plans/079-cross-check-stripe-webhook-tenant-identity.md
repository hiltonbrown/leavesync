# Plan 079: Cross-check Stripe customer identity before mirroring entitlements

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- apps/api/app/webhooks/payments packages/database/src/queries/billing.ts packages/database/index.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: Plan 066
- **Category**: security
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers finding**: S-05

## Why this matters

Signed Stripe subscription events currently choose the Clerk tenant solely from
subscription metadata. A support-created or misconfigured subscription can
therefore overwrite another organisation's entitlement row. Signature
verification prevents outside forgery, but not trusted-system misattribution.

## Current state

- `apps/api/app/webhooks/payments/route.ts:46-83` reads
  `metadata.clerk_org_id` and immediately mirrors by that key.
- `packages/database/src/queries/billing.ts` can look up by Clerk org but has no
  lookup by Stripe customer.
- Checkout sets the same Clerk org on session and subscription metadata.
- The mirror uses event time for ordering; preserve that invariant.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Focused | `cd apps/api && bunx vitest run app/webhooks/payments/route.test.ts` | all pass |
| Integration | `bun run test:integration` | billing SQL tests pass |
| Gates | `bun run check && bun run typecheck && bun run test` | exit 0 |

## Scope

**In scope**: payments webhook and test, billing query module and its integration
test, package-root export.

**Out of scope**: checkout UI, Stripe product catalogue, subscription transfer
workflow and Clerk Billing.

## Git workflow

- Branch: `advisor/079-stripe-tenant-cross-check`
- Commit: `fix(billing): cross-check webhook tenant identity`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add conflict tests

Test both conflicts: metadata org already bound to a different customer, and
event customer already bound to a different org. Assert no mirror, no recount
event and a non-2xx retryable response. Test matching and first-time unbound
events still succeed.

### Step 2: Add a dual lookup contract

Add a typed query for subscription by `stripe_customer_id`. In the handler,
validate metadata and customer, then load both bindings. Accept only when they
are mutually consistent or both unbound. Never log secrets or full payloads.

### Step 3: Preserve idempotency

Record the Stripe event only after successful processing. Conflicts must remain
unrecorded so retries are possible and visible. Preserve event-time ordering.

### Step 4: Verify

Run focused, integration and repository gates plus `git diff --check`.

## Test plan

Two conflict directions, matching binding, first event, duplicate event, older
event and missing metadata. Database integration proves the customer lookup is
unique and tenant-safe.

## Done criteria

- [ ] Metadata is never the only identity evidence once either binding exists.
- [ ] Conflicts cannot write or enqueue recount work.
- [ ] First-time checkout events still mirror.
- [ ] Four repository gates pass; index row updated.

## STOP conditions

Stop if production intentionally moves an organisation between Stripe customers,
if customer IDs are not unique in current data, or if Stripe retry semantics
cannot surface the conflict safely. Those require an explicit migration flow.

## Maintenance notes

Metadata is a claim to cross-check, not an authoritative tenant mapping.
