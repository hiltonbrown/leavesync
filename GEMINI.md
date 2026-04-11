# GEMINI.md

This file provides foundational mandates and procedural guidance for Gemini CLI when working in the LeaveSync repository. These instructions take precedence over general defaults.

## Project context

**LeaveSync** is a multi-tenant availability publishing platform. It connects to Xero Payroll (AU, NZ, UK), syncs approved leave data, normalises it into a canonical availability model, and publishes through secure ICS calendar feeds.

The architecture is: **Xero sync layer > canonical availability model > feed projection layer > ICS publishing layer**.

LeaveSync does not manage payroll, accruals, or leave approvals. Xero is the only provider. Manual availability entries (WFH, travelling, training, client site) are added directly by users.

### Reference docs

- `PRODUCT.md`: domain model, database schema, Xero sync model, feed rendering, UID strategy, build order.
- `DESIGN.md`: colour tokens, typography, spacing, elevation rules, component specifications.
- `.impeccable.md`: brand personality, user context, design principles.
- `AGENTS.md`: shared agent instructions (architecture rules, coding standards, testing).

Read PRODUCT.md before implementing or changing domain entities, sync logic, feed rendering, or schema.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js on next-forge (Turborepo) |
| Runtime | Bun |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma 7 with `@prisma/adapter-neon` |
| Auth | Clerk |
| Job queue | Inngest |
| Email | Resend + React Email |
| Monitoring | Sentry |
| Feed caching | Vercel KV (Redis-compatible) |
| ICS generation | ical-generator |
| Deployment | Vercel (all apps) |
| Testing | Vitest |
| Linting | Biome 2 + Ultracite |

## Monorepo layout

### Apps

| App | Port | Purpose |
|---|---|---|
| `app` | 3000 | Authenticated product UI |
| `api` | 3002 | Xero OAuth, sync orchestration, feed endpoints, Inngest handlers |
| `web` | 3001 | Public marketing site |
| `docs` | 3004 | Mintlify documentation |
| `email` | 3003 | React Email template development |

### Domain packages

| Package | Purpose |
|---|---|
| `packages/xero` | Xero OAuth, tenant sync, AU/NZ/UK region handling, rate limiting, leave-type mapping |
| `packages/availability` | Canonical person model, availability records, privacy rules, contactability, feed eligibility |
| `packages/feeds` | ICS generation, stable UID strategy, feed token validation, Vercel KV caching |
| `packages/jobs` | Inngest job definitions (sync scheduling, feed rebuilds, reconciliation) |
| `packages/core` | Result type, branded IDs, shared enums, date/timezone utilities, error types |

### Infrastructure packages

`packages/database`, `packages/auth`, `packages/design-system`, `packages/email`, `packages/observability`, `packages/next-config`, `packages/seo`, `packages/typescript-config`.

### Not in use

Do not reference or depend on: `packages/ai`, `packages/cms`, `packages/collaboration`, `packages/feature-flags`, `packages/internationalization`, `packages/payments`, `packages/rate-limit`, `packages/security`, `packages/storage`, `packages/webhooks`.

## Tenancy model

Workspace > Organisation > People / XeroConnection / Feed / AvailabilityRecord.

- Users belong to workspaces via memberships.
- Billing enforced at workspace level.
- **All data queries must be scoped by organisation.**

## Engineering standards

### TypeScript and patterns

- Strict mode. No `any`. No `as` casts without documented justification.
- Named exports only. No default exports.
- Zod validation on all external input (API params, Xero responses, webhook payloads, form submissions).
- Result pattern for service-layer errors: `{ ok: true; value: T } | { ok: false; error: E }`. Do not throw for expected failures.
- Branded types for domain IDs and cursors, defined in `packages/core`.

### Code organisation

- No barrel files (`index.ts` re-exports) except at package root.
- Import aliases: `@repo/database`, `@repo/core`, `@repo/xero`, `@repo/availability`, `@repo/feeds`, etc.
- All database access through `packages/database`. Never import Prisma client directly in apps.
- All Xero logic in `packages/xero`. Canonical domain logic never depends on Xero payload shapes.
- All ICS logic in `packages/feeds`.
- Shared UI in `packages/design-system`. Do not redefine base components in apps.

### Database conventions

- Table names: `snake_case`, plural. Column names: `snake_case`.
- Every table: `id` (UUID, PK), `created_at`, `updated_at`.
- Soft deletes: `archived_at`, nullable.
- Enums at database level. JSON columns typed with Zod schemas.
- One migration per schema change. Never hand-edit generated migrations.

### Testing

- Co-located: `foo.ts` has `foo.test.ts` in the same directory.
- Vitest as runner. Every feature or fix must include corresponding tests.
- Factories or builders for test data.
- Fixture-based tests for Xero response mappers and region-specific parsers.
- Explicitly test: ICS serialisation, UID generation, SEQUENCE incrementing, privacy transforms, Zod validators, feed token validation.

## Core entity

The primary domain object is `AvailabilityRecord`. It holds both Xero-synced leave and manual availability entries. It is not called a "leave application" or "absence event". See PRODUCT.md for the full schema and record types.

## Xero adapter rules

- All Xero code lives in `packages/xero` with region subdirectories (`au/`, `nz/`, `uk/`).
- Raw Xero responses stored in `source_payload_json` for audit.
- Rate limiting (60/min per org, 5,000/day per org, five concurrent per org) handled inside `packages/xero`.
- Xero-specific types never leak into `packages/availability` or `packages/feeds`.

## Feed rules

- Feed endpoint: `GET /ical/:token.ics` in `apps/api`.
- UID generation uses the deterministic hash formula in PRODUCT.md. Never use Xero's LeaveApplicationID as the sole UID.
- SEQUENCE incremented on material changes to published representation.
- Privacy transforms applied during publication projection.
- Feed body cached in Vercel KV by `feed_id + etag`.

## Inngest job rules

- Job definitions in `packages/jobs`. Handlers registered in `apps/api`.
- Jobs: `sync-xero-people`, `sync-xero-leave-records`, `reconcile-feed-publications`, `rebuild-feed-cache`.
- All upserts must be idempotent. Record-level failures do not fail the entire run.

## Style and language

- Australian English everywhere (organise, analyse, colour, centre, prioritise).
- No em dashes. Use commas, colons, semicolons, or parentheses.
- Direct, professional tone. No hype, cliches, or motivational language.

## Critical workflows

### 1. Research first

- Map the codebase using search and file reads before suggesting changes.
- Refer to PRODUCT.md for domain logic, DESIGN.md for UI tokens, .impeccable.md for brand personality.
- Verify library usage in `package.json` before employing them.

### 2. Implement within conventions

- Server Components by default. `"use client"` only for interactivity.
- Tailwind CSS v4 patterns.
- Route protection in `apps/app/proxy.ts`, not `middleware.ts`.

### 3. Verify changes

- Run `bun run check` for linting and type-checking.
- Run `bun run test` for validation.
- For Prisma changes, ensure `serverExternalPackages` includes `@prisma/client` and `@prisma/adapter-neon` in `packages/next-config/index.ts`.

## Commands

All commands run from the repo root.

```bash
bun run dev                # Start all apps
bun run build              # Build all apps and packages
bun run check              # Lint and type-check (Biome)
bun run fix                # Auto-fix lint issues
bun run test               # Run all tests
bunx vitest run <path>     # Single test file
bun run migrate            # Prisma format + generate + migrate dev
bun run migrate:deploy     # Generate + migrate deploy (production)
bun run db:push            # Push schema without migration (dev only)
bun run analyze            # Bundle analysis
bun run clean              # Remove git-ignored files
```

## Security

- Workspace isolation on every query.
- Organisation scoping on all data access.
- Clerk auth on all authenticated routes; middleware in `apps/app/proxy.ts`.
- Xero tokens encrypted at rest.
- Feed tokens signed and revocable.
- No tokens or raw payloads exposed to client.
- Never log or commit secrets or `.env` files.

## Platform notes

- Prisma 7 WASM compiler requires `serverExternalPackages: ["@prisma/client", "@prisma/adapter-neon"]` in `packages/next-config/index.ts`. Without this, Turbopack bundles Prisma incorrectly.
- Optional env vars with format constraints must be absent (commented out), not `""`. Empty strings fail Zod `.optional()` validation.
- Git: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), one logical change per commit, branch per feature slice.

## Build order

1. Workspace, organisation, people, team, location schema and seed data
2. Xero OAuth and tenant persistence
3. Xero employee sync (AU, NZ, UK)
4. Xero leave normalisation into `availability_records`
5. Manual availability CRUD
6. Feed model and token model
7. ICS renderer with stable UID and privacy modes
8. Feed preview and feed detail UI
9. Team calendar and person profile UI
10. Reconciliation jobs, sync health UI, and audit reporting
