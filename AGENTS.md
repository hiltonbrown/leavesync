# AGENTS.md

This file provides shared instructions for coding agents working in the **LeaveSync** repository. It consolidates the current guidance from `CLAUDE.md` and `GEMINI.md` into a single repo-level reference.

## Project Overview

**LeaveSync** is a multi-tenant leave and availability publishing platform. It connects upstream payroll and HR systems, syncs approved leave data, normalises it into a canonical model, and publishes through calendar feeds, HTML views, Slack, and Teams.

The repo is a production-grade Next.js SaaS monorepo built on [next-forge](https://next-forge.com), using Turborepo to orchestrate deployable apps and shared packages.

### Reference Docs

- `PRODUCT.md`: source of truth for domain entities, connector truth, capability flags, sync model, publishing model, and billing entities.
- `DESIGN.md`: colour tokens, typography, spacing, and design system reference.
- `.impeccable.md`: brand personality, user context, and design principles.
- Read `PRODUCT.md` before implementing or changing domain entities, provider adapters, or sync logic.

## Repo Layout

### Apps (`apps/`)

| App | Port | Purpose |
| --- | --- | --- |
| `app` | 3000 | Main authenticated SaaS application |
| `web` | 3001 | Public marketing website |
| `api` | 3002 | REST API, OAuth callbacks, sync orchestration, feed endpoints, webhook handlers |
| `email` | 3003 | React Email template development |
| `docs` | 3004 | Mintlify documentation site |
| `studio` | 3005 | Prisma Studio |
| `storybook` | 6006 | Component library showcase |

### Packages (`packages/`)

- `auth`: Clerk authentication, session management, tenant and organisation guards.
- `database`: Prisma ORM and PostgreSQL access. All app-level DB access goes through this package.
- `design-system`: shared React components, Tailwind CSS, and shadcn/ui primitives.
- `next-config`: shared Next.js configuration.
- `typescript-config`: shared TypeScript config base.
- `seo`, `internationalization`, and other next-forge integration packages support app concerns.

### Planned Domain Packages

These are part of the intended architecture even where not yet created:

- `integrations`: provider adapters, OAuth clients, mappers, sync services.
- `calendar`: ICS generation, feed signing, filtering, HTML calendar helpers.
- `types`: shared domain types and branded IDs.
- `billing`: plan logic, entitlement checks, usage metering.
- `queue`: retry, backoff, rate-limit, and job orchestration helpers.

## Core Architecture Rules

- Tenancy model is `Tenant > Organisation > ProviderConnection / Feed / Employee`.
- Users belong to tenants through memberships.
- Memberships may be scoped to one or more organisations.
- Billing is enforced at the tenant level.
- **All data queries must be scoped by organisation.**
- Database access must go through `packages/database`; do not import the ORM client directly inside apps.
- Shared UI components belong in `packages/design-system`; do not recreate base components inside apps.
- Provider-specific logic belongs in `packages/integrations/providers/{provider}/`.
- Canonical domain logic must not depend on provider internals.

## Engineering Standards

### TypeScript and API Boundaries

- TypeScript strict mode is required.
- Do not use `any`.
- Do not use `as` casts unless there is a justified reason documented in code.
- Use named exports only. No default exports.
- Use Zod for all external input validation, including API params, webhooks, OAuth responses, and provider responses.
- Use branded types for domain IDs and cursors, defined in `packages/types`.
- Use the Result pattern for service-layer errors:

```ts
type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };
```

- Do not throw for expected failures in the service layer. Route handlers should map `Result` errors to HTTP responses.

### Code Organization

- No barrel files (`index.ts` re-exports) except at package root.
- Use repo import aliases such as `@repo/database`, `@repo/types`, `@repo/auth`, and `@repo/integrations`.
- Use the Next.js App Router only. Do not introduce `pages/`.
- Prefer React Server Components. Add `"use client"` only when browser APIs or interactivity require it.
- Keep comments sparse and intent-focused. Do not restate obvious code.
- Do not use `console.log` in production code. Use the observability logger instead.

## Database Conventions

The current repo uses Prisma. A future ORM decision may still evolve, but these conventions hold regardless:

- Table names: `snake_case`, plural.
- Column names: `snake_case`.
- Every table includes `id`, `created_at`, and `updated_at`.
- Use `deleted_at` for soft deletes where specified.
- Foreign keys should be explicit.
- Enums should be defined at the database level.
- JSON columns should be typed with Zod schemas and documented.
- Create one migration per schema change.
- Never hand-edit generated migrations.
- Use `npm run migrate` for migrations and `npm run db:push` only where appropriate for development workflows.

## Testing Standards

- Co-locate tests with source files: `foo.ts` and `foo.test.ts`.
- Use Vitest.
- Every feature or bug fix should include corresponding tests.
- Prefer factories or builders over repeated raw object literals in tests.
- Add fixture-based tests for provider mappers and response parsers.
- Explicitly test ICS serialisation, feed UID generation, and Zod validators when touching those areas.

## Provider Adapter Rules

- Each adapter lives in `packages/integrations/providers/{provider}/`.
- Adapters implement `AvailabilitySourceAdapter` as defined in `PRODUCT.md`.
- Omit optional methods when the provider does not support that capability.
- Persist capability flags per connection instead of hardcoding them at call sites.
- Store raw provider responses for audit; do not discard source payloads.
- Keep provider-specific logic isolated from domain and publishing layers.

## Security Baseline

- Enforce tenant isolation on every query.
- Enforce organisation scoping on all data access.
- Protect authenticated routes with Clerk.
- Route protection and security headers are composed in `apps/app/proxy.ts`, not `middleware.ts`.
- Encrypt provider tokens at rest.
- Feed tokens must be signed and revocable.
- Audit-log admin actions.
- Never expose tokens or raw provider payloads to clients.
- Never log or commit secrets, `.env` files, or API keys.

## Workflow For Agents

### 1. Research First

- Inspect the existing codebase before suggesting or making changes.
- Verify package usage in `package.json` before introducing or relying on libraries.
- Refer to `PRODUCT.md` for domain decisions, `DESIGN.md` for UI tokens, and `.impeccable.md` for product voice and brand direction.

### 2. Implement Within Repo Conventions

- Follow Tailwind CSS v4 patterns.
- Keep changes aligned with existing architecture and package boundaries.
- Default to server components unless a client component is necessary.

### 3. Verify Changes

- Run `npm run fix` after modifications when lint autofixes are relevant.
- Run `npm run check` for linting and type-checking.
- Run `npm run test` for validation.
- For targeted validation, use `npx vitest run <path/to/test>`.

## Commands

All commands run from the repo root unless noted otherwise.

```bash
# Development
npm run dev

# Build
npm run build

# Linting / formatting
npm run check
npm run fix

# Testing
npm run test
npx vitest run <path/to/test>

# Database
npm run migrate
npm run migrate:deploy
npm run db:push

# Utilities
npm run analyze
npm run translate
npm run boundaries
npm run clean

# Dependency management
npm run bump-deps
npm run bump-ui
```

## Platform Notes

- Biome 2 and Ultracite enforce repo style. Check `biome.jsonc` for configuration details.
- Environment variables are defined in `.env.example`.
- Server variables are unprefixed; client variables use `NEXT_PUBLIC_`.
- Optional environment variables with format constraints must be omitted rather than set to empty strings, because empty strings still fail Zod format validation.
- Turborepo caches build outputs such as `.next/`, `dist/`, and `storybook-static/`; do not bypass Turbo without reason.
- Prisma 7 uses a WASM query compiler. `serverExternalPackages: ["@prisma/client", "@prisma/adapter-neon"]` in `packages/next-config/index.ts` must remain configured so Turbopack does not bundle Prisma incorrectly and trigger runtime initialization failures.

## Git Conventions

- Use conventional commit prefixes such as `feat:`, `fix:`, `chore:`, `docs:`, `test:`, and `refactor:`.
- Keep each commit to one logical change.
- Prefer a branch per feature slice.
