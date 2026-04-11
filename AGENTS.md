# AGENTS.md

This file provides shared instructions for coding agents working in the LeaveSync repository. It consolidates guidance that applies regardless of which agent or IDE is in use.

## Project overview

**LeaveSync** is a multi-tenant availability publishing platform. It connects to Xero Payroll (AU, NZ, UK), syncs approved leave data, normalises it into a canonical availability model, and publishes through secure ICS calendar feeds.

The architecture is: **Xero sync layer > canonical availability model > feed projection layer > ICS publishing layer**.

LeaveSync does not manage payroll, accruals, or leave approvals. Xero is the source of truth for approved leave. LeaveSync standardises both Xero leave and manual availability entries (WFH, travelling, training, client site) into one publishable calendar domain.

### Reference docs

Read these before implementing or changing domain entities, sync logic, feed rendering, or schema:

- `PRODUCT.md`: domain model, database schema, Xero sync model, feed rendering, UID strategy, build order, stack decisions.
- `DESIGN.md`: colour tokens, typography, spacing, elevation rules, component specifications.
- `.impeccable.md`: brand personality, user context, design principles.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js on next-forge (Turborepo) |
| Runtime / package manager | Bun |
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
| `packages/feeds` | ICS generation (ical-generator), stable UID strategy, feed token validation, Vercel KV caching |
| `packages/jobs` | Inngest job definitions: sync scheduling, feed rebuilds, reconciliation |
| `packages/core` | Result type, branded IDs, shared enums, date/timezone utilities, error types |

### Infrastructure packages

| Package | Purpose |
|---|---|
| `packages/database` | Prisma schema, migrations, generated client |
| `packages/auth` | Clerk session management, RBAC, workspace/organisation guards |
| `packages/design-system` | Shared React components, Tailwind CSS, shadcn/ui |
| `packages/email` | React Email templates + Resend transport |
| `packages/observability` | Sentry, structured logging |
| `packages/next-config` | Shared Next.js configuration |
| `packages/seo` | SEO metadata helpers |
| `packages/typescript-config` | Shared tsconfig base |

### Not in use

Do not reference or add dependencies on: `packages/ai`, `packages/cms`, `packages/collaboration`, `packages/feature-flags`, `packages/internationalization`, `packages/payments`, `packages/rate-limit`, `packages/security`, `packages/storage`, `packages/webhooks`.

---

## Architecture rules

### Tenancy

Workspace > Organisation > People / XeroConnection / Feed / AvailabilityRecord.

- Users belong to workspaces via memberships.
- Billing enforced at workspace level.
- **All data queries must be scoped by organisation.**
- Multi-workspace from day one.

### Roles

| Role | Scope |
|---|---|
| owner | Full workspace access |
| admin | Full organisation access |
| manager | Team and direct-report access |
| viewer | Read-only filtered access |

### Data flow boundaries

- All database access goes through `packages/database`. Never import Prisma client directly in apps.
- All Xero-specific logic lives in `packages/xero`. Canonical domain logic in `packages/availability` never depends on Xero payload shapes.
- All ICS generation logic lives in `packages/feeds`.
- Shared UI components live in `packages/design-system`. Do not redefine base components in apps.

### Core entity

The primary domain object is `AvailabilityRecord`. It holds both Xero-synced leave and manual availability entries. It is not called a "leave application" or "absence event". See PRODUCT.md for the full schema.

---

## Engineering standards

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

Service functions return `Result`. Route handlers map errors to HTTP responses. Do not throw for expected failures.

### Next.js

- App Router only. No `pages/` directory.
- Server Components by default. `"use client"` only when browser APIs or interactivity require it.
- Route protection composed in `apps/app/proxy.ts`, not `middleware.ts`.

### Code organisation

- No `console.log` in production code. Use the observability package logger.
- Comments only where intent is non-obvious.

---

## Database conventions

- Table names: `snake_case`, plural.
- Column names: `snake_case`.
- Every table: `id` (UUID, PK), `created_at`, `updated_at`.
- Soft deletes: `archived_at`, nullable.
- Foreign keys explicit. Enums at database level.
- JSON columns typed with Zod schemas.
- One migration per schema change. Never hand-edit generated migrations.

---

## Testing standards

- Co-located: `foo.ts` has `foo.test.ts` in the same directory.
- Vitest as runner.
- Tests from the first slice. No deferring.
- Factories or builders for test data, not repeated raw literals.
- Fixture-based tests for Xero response mappers and region-specific parsers.
- Explicitly test: ICS serialisation, UID generation, SEQUENCE incrementing, privacy transforms, Zod validators, feed token validation.

---

## Xero adapter rules

- All Xero code lives in `packages/xero`.
- Region-specific logic (AU, NZ, UK) isolated in subdirectories.
- Raw Xero responses stored in `source_payload_json` for audit.
- Xero-specific types never leak into `packages/availability` or `packages/feeds`.
- Rate limiting (60/min per org, 5,000/day per org, five concurrent per org) handled inside `packages/xero`.

---

## Feed rules

- Feed endpoint: `GET /ical/:token.ics` in `apps/api`.
- UID generation uses the deterministic hash formula in PRODUCT.md. Never use Xero's LeaveApplicationID as the sole UID.
- SEQUENCE incremented on material changes to the published representation.
- Privacy transforms applied during publication projection, not at render time.
- Feed body cached in Vercel KV by `feed_id + etag`.

---

## Inngest job rules

- Job definitions live in `packages/jobs`.
- Inngest handlers registered in `apps/api`.
- Jobs: `sync-xero-people`, `sync-xero-leave-records`, `reconcile-feed-publications`, `rebuild-feed-cache`.
- Inngest handles retries with exponential backoff.
- Record-level failures do not fail the entire sync run.
- All upserts must be idempotent.

---

## Style and language

- Australian English everywhere (organise, analyse, colour, centre, prioritise).
- No em dashes. Use commas, colons, semicolons, or parentheses instead.
- Direct, professional tone. No hype, cliches, or motivational language.

---

## Design system summary

- Brand colour: `#336A3B` (deep forest green). Primary actions, CTAs, brand moments. Not decoration.
- Font: Plus Jakarta Sans.
- Border radius: 16px (cards/containers), 12px (inputs/small elements). No 4px or 8px.
- No borders for content separation. Use tonal layering (surface colour shifts).
- No `#000000` for text. Use `on-surface` token.
- No drop shadows except on floating elements.
- Light-first. Dark mode receives equal care.
- Full token tables in DESIGN.md.

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

## Agent workflow

### 1. Research first

- Inspect the existing codebase before suggesting or making changes.
- Verify package usage in `package.json` before introducing or relying on libraries.
- Refer to PRODUCT.md for domain decisions, DESIGN.md for UI tokens, .impeccable.md for brand direction.

### 2. Implement within repo conventions

- Follow Tailwind CSS v4 patterns.
- Keep changes aligned with existing package boundaries.
- Default to server components unless a client component is necessary.

### 3. Verify changes

- Run `bun run fix` after modifications when lint autofixes are relevant.
- Run `bun run check` for linting and type-checking.
- Run `bun run test` for validation.
- For targeted tests: `bunx vitest run <path/to/test>`.

---

## Commands

All commands run from the repo root.

```bash
# Development
bun run dev

# Building
bun run build

# Linting and formatting
bun run check
bun run fix

# Testing
bun run test
bunx vitest run <path/to/test>

# Database
bun run migrate            # Prisma format + generate + migrate dev
bun run migrate:deploy     # Generate + migrate deploy (production)
bun run db:push            # Push schema without migration (dev only)

# Utilities
bun run analyze
bun run clean
```

---

## Platform notes

- Prisma 7 WASM compiler requires `serverExternalPackages: ["@prisma/client", "@prisma/adapter-neon"]` in `packages/next-config/index.ts`. Without this, Turbopack bundles Prisma incorrectly.
- Route protection composed in `apps/app/proxy.ts`, not `middleware.ts`.
- Optional env vars with format constraints must be absent (commented out), not `""`. Empty strings fail Zod `.optional()` validation.
- Git: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), one logical change per commit, branch per feature slice.

---

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

Each step: deployable, testable vertical slice.
