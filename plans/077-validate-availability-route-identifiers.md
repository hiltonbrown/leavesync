# Plan 077: Validate every availability route identifier before database access

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- apps/api/app/api/availability apps/api/__tests__/availability-routes.test.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 066
- **Category**: security, bug
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers finding**: S-03

## Why this matters

The create and update routes accept external organisation and record IDs without
UUID validation, then cast them into branded types. Malformed values reach the
database and can become 500 responses. Tenant checks exist, but the boundary
contract required by AGENTS.md is missing.

## Current state

- `apps/api/app/api/availability/route.ts`: `organisationId` is read outside
  `CreateAvailabilitySchema`.
- `apps/api/app/api/availability/[recordId]/route.ts`: body organisation ID and
  route `recordId` are cast without UUID validation.
- `apps/api/__tests__/availability-routes.test.ts` is the only route suite after
  Plan 066 and already mocks the dual-tenant queries.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Focused | `cd apps/api && bunx vitest run __tests__/availability-routes.test.ts` | all pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | exit 0 |

## Scope

**In scope**: the two routes above and `availability-routes.test.ts`.

**Out of scope**: service behaviour, response-shape redesign, database schema,
and authentication middleware.

## Git workflow

- Branch: `advisor/077-availability-inputs`
- Commit: `fix(api): validate availability route identifiers`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add failing boundary tests

Cover malformed create/update `organisationId` and malformed `recordId`. Assert
400 and that no database/service mock is called. Retain valid and cross-tenant
cases.

**Verify**: focused tests fail only for the missing validation.

### Step 2: Parse all identifiers with Zod

Add `organisationId: z.string().uuid()` to both body schemas and parse the route
parameter with `z.string().uuid()`. Convert validated strings to branded IDs at
one explicit boundary, with the repository-required justification comment; do
not scatter casts through the handler.

**Verify**: focused tests and `bun run typecheck` pass.

### Step 3: Run all gates

**Verify**: all four repository gates and `git diff --check` pass.

## Test plan

Malformed UUIDs return 400 before any query; valid UUIDs retain current success,
not-found and dual-tenant isolation behaviour.

## Done criteria

- [ ] Both body IDs and `recordId` are Zod-validated UUIDs.
- [ ] Boundary tests prove no service call for malformed input.
- [ ] Four repository gates pass.
- [ ] Only in-scope files changed; index row updated.

## STOP conditions

Stop if Plan 066 did not leave one canonical route suite, the response contract
has changed, or branding cannot be achieved without weakening strict types.

## Maintenance notes

External strings become branded IDs only after runtime validation.
