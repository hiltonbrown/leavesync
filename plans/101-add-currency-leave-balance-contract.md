# Plan 101: Add the currency leave-balance data contract

> **Executor instructions**: Run on a migration-capable database runner. Use the
> repository migration command; never hand-edit a generated migration.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- PRODUCT.md packages/database/prisma/schema.prisma packages/database/prisma/migrations packages/database/generated packages/database/src/queries/leave-balances.ts packages/database/leave_balances.integration.test.ts packages/xero/src/read/leave-balances.ts packages/xero/src/read/leave-balances.test.ts packages/jobs/src/handlers/sync-xero-leave-balances.ts packages/jobs/src/handlers/sync-xero-leave-balances.test.ts packages/jobs/src/handlers/sync-xero-leave-balances.integration.test.ts packages/availability/src/people/manual-balance-service.ts packages/availability/src/people/manual-balance-service.test.ts`
> Stop on another pending migration touching `leave_balance_unit` or
> `leave_balances`.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none; migration/database runner required
- **Category**: migration
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Execution status**: TODO
- **Supersedes**: currency-data slice of rejected Plan 071

## Why this matters

NZ exposes Holiday Pay in dollars, while the canonical model accepts only hours
or days and cannot retain a currency code or raw balance payload. Persisting a
number without its unit/currency would be misleading, and existing manual paths
must not accidentally gain monetary editing.

## Current state and decided contract

- `schema.prisma:177-180,659-674` has `hours | days`, no currency code and no
  balance raw payload.
- `read/leave-balances.ts:3-10` has no `currencyCode`; the balance handler writes
  amount/unit only.
- Add enum value `currency`, nullable `currency_code String? @db.VarChar(3)` and
  nullable `source_payload_json Json?` with a comment naming the Zod schema.
- The unit/code rule is application-enforced: currency requires a supported
  code; hours/days require null. Use `SupportedCurrencyCodeSchema =
  z.enum(["NZD"])` initially, not a regex that pretends to validate all ISO 4217.
- Team Calendar stores/displays provider values, never calculates accruals,
  converts currency or subtracts duration from money.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Migration | `bun run migrate` | one generated migration succeeds |
| Generate | `bunx prisma generate` | generated client exits 0 |
| Focused | `bunx vitest run packages/xero/src/read/leave-balances.test.ts packages/jobs/src/handlers/sync-xero-leave-balances.test.ts packages/jobs/src/handlers/sync-xero-leave-balances.integration.test.ts packages/database/leave_balances.integration.test.ts packages/availability/src/people/manual-balance-service.test.ts` | contract matrix passes |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Only drift-check files, the single generated migration/client output,
`packages/database/index.ts` or root type exports when required, and plan
bookkeeping. No NZ/UK requests, UI formatting, manual currency editing or FX.

## Git workflow

- Branch: `feat/101-currency-balance-contract`
- Commit: `feat(database): store currency leave balances`
- Do not push or open a pull request unless instructed.

## Steps

### Step 1: Define failing contract tests

Test valid NZD currency, currency without/unsupported code, hours/days with code,
AU null code, raw payload round-trip and manual balance restrictions.

**Verify**: focused tests fail only for missing fields/validation.

### Step 2: Generate the schema migration

Change Prisma schema, run `bun run migrate`, then generate the client. Do not
edit migration SQL. Update PRODUCT with the application-enforced invariant and
no-calculation/no-conversion rule.

**Verify**: migration and generation commands exit 0; exactly one new migration
exists and `bunx prisma migrate status` reports no unexpected drift.

### Step 3: Propagate the canonical fields

Extend `XeroLeaveBalance`, database data/projection types and handler create/
update paths with `currencyCode` and a Prisma-safe validated raw object. AU and
hours/days always write null currency. Both create and update persist raw JSON.

**Verify**: Xero, job and database focused tests pass.

### Step 4: Preserve manual restrictions

Keep manual Zod input limited to hours/days and always write null currency/raw
provider payload for manual rows.

**Verify**: manual service tests reject currency and all focused tests pass.

### Step 5: Run all gates

**Verify**: every table command exits 0; status shows only in-scope files.

## Test plan

Use existing balance fixtures/factories. Cover create/update, query projections,
raw JSON, valid/invalid unit-code pairs, supported-code fail-closed behaviour,
AU regression, manual create/update and both tenant keys.

## Done criteria

- [ ] Schema stores currency code and validated raw provider payload.
- [ ] Application boundaries enforce the unit/code invariant fail-closed.
- [ ] Manual and AU hour/day paths always persist null currency.
- [ ] Migration, generated client and every table command pass.
- [ ] No conversion/accrual/manual-currency feature was added.

## STOP conditions

Stop if migration generation is unavailable, a conflicting migration exists,
raw payload cannot be made Prisma-safe through Zod, or the change requires UI or
regional requests.

## Maintenance notes

Extend `SupportedCurrencyCodeSchema` only alongside a documented provider
mapping. Database nullability is not the business-rule enforcement boundary.

