# CLAUDE.md

This file provides guidance to Claude Code when working in the LeaveSync repository.

## Project overview

**LeaveSync** is a multi-tenant availability publishing platform. It connects to Xero Payroll (AU, NZ, UK), syncs approved leave data, normalises it into a canonical availability model, and publishes through secure ICS calendar feeds.

The architecture is: **Xero sync layer > canonical availability model > feed projection layer > ICS publishing layer**.

LeaveSync does not manage payroll, accruals, or leave approvals. Xero is the source of truth for approved leave. LeaveSync adds manual availability entries (WFH, travelling, training, client site) and publishes everything as stable ICS feeds.

**Reference docs (read before implementing domain logic):**

- `PRODUCT.md`: domain model, database schema, Xero sync model, feed rendering, UID strategy, build order, stack decisions.
- `DESIGN.md`: colour tokens, typography, spacing, elevation rules, component specifications.
- `.impeccable.md`: brand personality, user context, design principles.

---

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

---

## Commands

All commands run from the repo root.

```bash
# Development
bun run dev                # Start all apps (Turbo)

# Building
bun run build              # Build all apps and packages

# Linting and formatting
bun run check              # Biome/Ultracite lint checks
bun run fix                # Auto-fix lint issues

# Testing
bun run test               # Vitest across the monorepo
bunx vitest run <path>     # Single test file

# Database
bun run migrate            # Prisma format + generate + migrate dev
bun run migrate:deploy     # Generate + migrate deploy (production)
bun run db:push            # Push schema without migration (dev only)

# Utilities
bun run analyze            # Bundle analysis
bun run clean              # Remove git-ignored files
```

---

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
| `packages/xero` | Xero OAuth, tenant sync, region-specific API handling, rate limiting |
| `packages/availability` | Canonical person model, availability records, privacy rules, feed eligibility |
| `packages/feeds` | ICS generation via ical-generator, UID strategy, feed token validation, caching |
| `packages/jobs` | Inngest job definitions: sync scheduling, feed rebuilds, reconciliation |
| `packages/core` | Result type, branded IDs, shared enums, date/timezone utilities, error types |

### Infrastructure packages

| Package | Purpose |
|---|---|
| `packages/database` | Prisma schema, migrations, generated client, query helpers |
| `packages/auth` | Clerk session management, RBAC, workspace and organisation guards |
| `packages/design-system` | Shared React components, Tailwind CSS, shadcn/ui |
| `packages/email` | React Email templates + Resend transport |
| `packages/observability` | Sentry error tracking, structured logging |
| `packages/next-config` | Shared Next.js configuration |
| `packages/seo` | SEO metadata helpers |
| `packages/typescript-config` | Shared tsconfig base |

### Not in use

These stock next-forge packages are not required for the current build: `ai`, `cms`, `collaboration`, `feature-flags`, `internationalization`, `payments`, `rate-limit`, `security`, `storage`, `webhooks`. Do not add dependencies on them.

---

## Architecture rules

### Tenancy

- Model: Workspace > Organisation > People / XeroConnection / Feed / AvailabilityRecord.
- Users belong to workspaces via memberships.
- Billing enforced at workspace level.
- **All data queries must be scoped by organisation.**

### Data access

- All database access goes through `packages/database`. Never import Prisma client directly in apps.
- All Xero-specific logic lives in `packages/xero`. Canonical domain logic in `packages/availability` never depends on Xero payload shapes.
- All ICS generation logic lives in `packages/feeds`.
- Shared UI components live in `packages/design-system`. Do not redefine base components in apps.

### Core entity

The primary domain object is `AvailabilityRecord`, not a leave application. This table holds both Xero-synced leave and manual availability entries. See PRODUCT.md for the full schema.

---

## Coding rules

### TypeScript

- Strict mode. No `any`. No `as` casts unless justified with a comment.
- Named exports only. No default exports.
- No barrel files (`index.ts` re-exports) except at package root.
- Import aliases: `@repo/database`, `@repo/core`, `@repo/xero`, `@repo/availability`, `@repo/feeds`, etc.

### Validation

- Zod on all external input: API params, Xero responses, webhook payloads, form submissions.
- Branded types for domain IDs (WorkspaceId, OrganisationId, PersonId, etc.), defined in `packages/core`.

### Error handling

```typescript
type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };
```

Service functions return `Result`. Route handlers map errors to HTTP responses. Do not throw for expected failures. Thrown exceptions are for truly unexpected or unrecoverable errors only.

### Next.js

- App Router only. No `pages/` directory.
- Server Components by default. Add `"use client"` only when browser APIs or interactivity require it.
- Route protection and security headers composed in `apps/app/proxy.ts`, not `middleware.ts`.

### Style

- No `console.log` in production code. Use the observability package logger.
- Comments only where intent is non-obvious. Do not restate what the code does.
- Australian English in all UI copy, documentation, and comments.
- No em dashes anywhere (UI copy, comments, docs, generated text).

---

## Database conventions

- Table names: `snake_case`, plural (e.g. `availability_records`, `xero_tenants`).
- Column names: `snake_case`.
- Every table includes `id` (UUID, PK), `created_at`, `updated_at`.
- Soft deletes where specified: `archived_at` column, nullable.
- Foreign keys explicit.
- Enums defined at database level.
- JSON columns typed with Zod schemas and documented.
- One migration per schema change. Never hand-edit generated migrations.
- Full schema specification in PRODUCT.md.

---

## Testing rules

- Co-located: `foo.ts` has `foo.test.ts` in the same directory.
- Vitest as runner.
- Tests from the first slice. No deferring tests.
- Factories or builders for test data, not repeated raw object literals.
- Fixture-based tests for Xero response mappers and region-specific parsers.
- Explicitly test: ICS serialisation, UID generation, SEQUENCE incrementing, privacy transforms, Zod validators, feed token validation.

---

## Xero adapter rules

- All Xero code lives in `packages/xero`.
- Region-specific logic (AU, NZ, UK) isolated in subdirectories (`packages/xero/src/au/`, etc.).
- Raw Xero responses stored in `source_payload_json` on `availability_records` for audit.
- Xero-specific logic never leaks into `packages/availability` or `packages/feeds`.
- Rate limiting (60/min per org, 5,000/day per org, five concurrent per org) handled inside `packages/xero`.
- Token refresh handled proactively before sync runs.

---

## Feed rules

- Feed endpoint: `GET /ical/:token.ics` in `apps/api`.
- UID generation uses the deterministic formula in PRODUCT.md. Never use Xero's LeaveApplicationID as the sole UID.
- SEQUENCE incremented when the published representation changes materially.
- Privacy transforms applied during publication projection, not at render time.
- Feed body cached in Vercel KV by `feed_id + etag`.
- Cache invalidated only when a relevant `availability_record` changes.

---

## Inngest job rules

- Job definitions live in `packages/jobs`.
- Inngest handlers registered in `apps/api`.
- Jobs: `sync-xero-people`, `sync-xero-leave-records`, `reconcile-feed-publications`, `rebuild-feed-cache`.
- Inngest handles retries with exponential backoff.
- Record-level failures do not fail the entire sync run unless a configurable threshold is breached.
- All upserts must be idempotent.

---

## Security baseline

- Workspace isolation on every query.
- Organisation scoping on all data access.
- Clerk auth on all authenticated routes.
- Xero tokens encrypted at rest.
- Feed tokens signed and revocable.
- Audit logs for admin actions.
- No tokens or raw payloads exposed to client.
- No secrets in client bundles.

---

## Environment variables

Defined in `.env.example` per app and package. Server variables are unprefixed; client variables use `NEXT_PUBLIC_`.

**Critical:** optional variables with format constraints (email, URL, `startsWith`) must be absent (commented out) rather than set to `""`. Empty strings fail Zod format validation even for `.optional()` fields.

### Required variables

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | `packages/database` | Neon Postgres connection string |
| `CLERK_SECRET_KEY` | `packages/auth` | Clerk server-side auth |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `packages/auth` | Clerk client-side auth |
| `RESEND_TOKEN` | `packages/email` | Resend API key |
| `RESEND_FROM` | `packages/email` | Sender address |
| `SENTRY_DSN` | `packages/observability` | Sentry error tracking |
| `XERO_CLIENT_ID` | `packages/xero` | Xero OAuth app ID |
| `XERO_CLIENT_SECRET` | `packages/xero` | Xero OAuth app secret |
| `INNGEST_EVENT_KEY` | `packages/jobs` | Inngest event key |
| `INNGEST_SIGNING_KEY` | `packages/jobs` | Inngest signing key |
| `KV_REST_API_URL` | `packages/feeds` | Vercel KV endpoint |
| `KV_REST_API_TOKEN` | `packages/feeds` | Vercel KV auth token |

---

## Platform notes

- Prisma 7 uses a WASM query compiler. `serverExternalPackages: ["@prisma/client", "@prisma/adapter-neon"]` in `packages/next-config/index.ts` is required. Without it, Turbopack bundles Prisma incorrectly and throws `PrismaClientInitializationError` at runtime.
- Turborepo caches build outputs (`.next/`, `dist/`). Do not bypass Turbo for builds.
- Biome 2 + Ultracite enforce repo style. Configuration in `biome.jsonc` at root.

---

## Git conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- One logical change per commit.
- Branch per feature slice.

---

## Build order

Implement in this order. Each step should produce a deployable, testable vertical slice.

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
