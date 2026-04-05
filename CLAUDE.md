# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**LeaveSync** is a multi-tenant leave and availability publishing platform. It connects upstream payroll/HR systems, syncs approved leave data, normalises it into a canonical model, and publishes through calendar feeds, HTML views, Slack, and Teams.

Built as a production-grade Next.js SaaS monorepo on the [next-forge](https://next-forge.com) template. Uses Turborepo to orchestrate deployable apps and shared packages.

**Reference docs:**
- `PRODUCT.md`: full domain model, connector truth, capability flags, sync model, publishing model, billing entities.
- `DESIGN.md`: colour tokens, typography, spacing, and design system reference.
- `.impeccable.md`: brand personality, user context, and design principles.
- Read PRODUCT.md before implementing any domain entity, provider adapter, or sync logic.

## Commands

All commands run from the repo root unless otherwise noted.

```bash
# Development
npm run dev              # Start all apps in dev mode (Turbo)

# Building
npm run build            # Build all apps and packages

# Linting / Formatting
npm run check            # Run Ultracite/Biome lint checks
npm run fix              # Auto-fix lint issues

# Testing
npm run test             # Run Vitest across the monorepo

# Database
npm run migrate          # Run Prisma migrations (dev)
npm run migrate:deploy   # Deploy migrations to production
npm run db:push          # Push schema changes without migration

# Utilities
npm run analyze          # Bundle analysis
npm run translate        # Run i18n tooling
npm run boundaries       # Check architectural boundaries
npm run clean            # Remove all git-ignored files (node_modules, build artifacts, .env files)

# Dependency management
npm run bump-deps        # Update all dependencies (runs npm-check-updates --deep)
npm run bump-ui          # Regenerate all shadcn/ui components
```

To run a single test file: `npx vitest run <path/to/test>`

## Architecture

### Apps (`apps/`)

| App | Port | Purpose |
|-----|------|---------|
| `app` | 3000 | Main authenticated SaaS application |
| `web` | 3001 | Public marketing website |
| `api` | 3002 | REST API, OAuth callbacks, sync orchestration, feed endpoints, webhook handlers |
| `docs` | 3004 | Mintlify documentation site |
| `email` | 3003 | React Email template development |
| `storybook` | 6006 | Component library showcase |
| `studio` | 3005 | Prisma Studio (database UI) |

### Packages (`packages/`)

**Core:**
- `auth` — Clerk authentication (session management, protected routes, tenant and organisation access guards)
- `database` — Prisma ORM + PostgreSQL (Neon serverless)
- `design-system` — Shared React components, Tailwind CSS, shadcn/ui

**LeaveSync domain *(planned — not yet created)*:**
- `integrations` — Provider adapters, OAuth clients, mappers, sync services
- `calendar` — ICS generation, feed signing, filtering, HTML calendar helpers
- `types` — Shared domain types and branded IDs
- `billing` — Plan logic, entitlement checks, usage metering
- `queue` — Retry, backoff, rate-limit, job orchestration helpers

**Next Forge integrations:**
- `payments` — Stripe billing
- `email` — React Email + Resend
- `notifications` — Knock in-app notifications
- `analytics` — Google Analytics + PostHog
- `observability` — Sentry error tracking + Logtail logging
- `cms` — BaseHub headless CMS
- `ai` — OpenAI + Vercel AI SDK
- `collaboration` — Liveblocks real-time features
- `webhooks` — Svix webhook handling
- `storage` — Vercel Blob
- `rate-limit` — Upstash Redis rate limiting
- `security` — Arcjet (bot/DDoS protection) + NoseCone (security headers)
- `feature-flags` — Vercel Toolbar flags

**Config:**
- `next-config` — Shared Next.js configuration (composes Sentry, logging, toolbar wrappers)
- `typescript-config` — Shared `tsconfig.json` base
- `seo` — SEO metadata helpers
- `internationalization` — i18n support

### Data flow

- **Authentication**: Clerk handles identity; middleware in `apps/app` protects routes
- **Database**: All DB access goes through `packages/database`; never import the ORM client directly in apps
- **API**: `apps/api` handles webhooks, OAuth callbacks, sync orchestration, and feed serving; `apps/app` handles user-facing routes
- **Shared UI**: Components live in `packages/design-system`; apps consume them, never redefine base components
- **Provider logic**: All provider-specific code lives in `packages/integrations/providers/{provider}/`; canonical domain logic never depends on provider internals

## Tenancy model

Tenant > Organisation > ProviderConnection / Feed / Employee.
Users belong to tenants via memberships.
Memberships may be scoped to one or more organisations.
Billing enforced at tenant level.
**All data queries must be scoped by organisation.**

## Coding rules

- **TypeScript strict mode.** No `any`. No `as` casts unless justified with a comment.
- **Named exports only.** No default exports.
- **Zod validation** on all external input (API params, webhook payloads, OAuth responses, provider API responses).
- **Branded types** for all domain IDs and cursors. Defined in `packages/types`.
- **Result pattern** for service-layer errors. Do not throw for expected failures. Use a `Result<T, E>` type (see below). Thrown exceptions only for truly unexpected or unrecoverable errors.
- **No barrel files** (`index.ts` re-exports) except at package root.
- **Import aliases**: `@repo/database`, `@repo/types`, `@repo/integrations`, etc.
- **Comments** only where the intent is non-obvious. Never restate what the code does.
- **No `console.log`** in production code. Use the observability package logger.
- **App Router only**: All Next.js apps use the App Router; no `pages/` directory.
- **Server Components by default**: Use `"use client"` only when browser APIs or interactivity is needed.

### Error handling

```typescript
type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };
```

Service functions return `Result`. Route handlers map errors to HTTP responses. Provider adapters return `Result` with provider-specific error context.

## Database conventions

The repo currently uses Prisma (Next Forge default). The ORM decision between Prisma and Drizzle is pending; see `PRODUCT.md` for the preferred stack note.

Regardless of ORM:
- Table names: snake_case, plural (e.g. `tenants`, `provider_connections`).
- Column names: snake_case.
- All tables include `id` (UUID, primary key), `created_at`, `updated_at`.
- Soft deletes where specified: `deleted_at` column, nullable.
- Foreign keys explicit.
- Enums defined at database level.
- JSON columns typed with Zod schemas and documented.
- One migration per schema change. Never hand-edit generated migrations.

## Testing rules

- Co-located test files: `foo.ts` has `foo.test.ts` in the same directory.
- Vitest as the test runner.
- Unit tests from the first slice. No deferring tests.
- Fixture-based tests for all provider mappers and response parsers.
- Test ICS serialisation, feed UID generation, and Zod validators explicitly.
- Use factories or builders for test data, not raw object literals repeated across tests.

## Provider adapter rules

- Each adapter lives in `packages/integrations/providers/{provider}/`.
- Adapter implements `AvailabilitySourceAdapter` (see PRODUCT.md for contract).
- Optional methods omitted when the provider lacks the capability.
- Raw provider responses stored for audit. Never discard source payloads.
- Provider-specific logic never leaks into domain or publishing layers.
- Capability flags persisted per connection, never hardcoded at call sites.

## Security baseline

- Tenant isolation on every query.
- Clerk auth on all authenticated routes.
- Organisation scoping on all data access.
- Provider tokens encrypted at rest.
- Feed tokens signed and revocable.
- Audit logs for admin actions.
- No tokens or raw payloads exposed to client.

## Key conventions (Next Forge inherited)

- **Linting**: Biome 2 + Ultracite enforce style; `biome.jsonc` at root configures exceptions.
- **Environment variables**: Defined in `.env.example` at root; server vars are unprefixed, client vars are `NEXT_PUBLIC_`. Optional vars with format constraints (email, `startsWith`, url) must be absent (commented out) rather than `""` — empty strings fail Zod format validation even for `.optional()` fields.
- **Turborepo caching**: Build outputs (`.next/`, `dist/`, `storybook-static/`) are cached; don't bypass Turbo for builds.
- **Auth middleware**: `apps/app/proxy.ts` (not `middleware.ts`) composes Clerk auth + NoseCone security headers.
- **Prisma 7 + Turbopack**: Prisma 7 uses a WASM query compiler. `serverExternalPackages: ["@prisma/client", "@prisma/adapter-neon"]` in `packages/next-config/index.ts` is required — without it Turbopack bundles `@prisma/client` and the WASM runtime fails, throwing `PrismaClientInitializationError` on every request.

## Git conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- One logical change per commit.
- Branch per feature slice.