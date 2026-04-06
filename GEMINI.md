# GEMINI.md

This file provides foundational mandates and expert procedural guidance for Gemini CLI (interactive CLI agent) when working in the **LeaveSync** repository. These instructions take precedence over general defaults.

## Project Context
- **Product:** LeaveSync, a multi-tenant leave and availability publishing platform.
- **Stack:** next-forge (Next.js 15+, Turborepo, Prisma 7 with Neon/Postgres, Clerk, Tailwind CSS v4, Biome).
- **Architecture:** Monorepo with `apps/` (app, web, api, docs, email, storybook, studio) and `packages/` (auth, database, design-system, next-config, etc.).
- **Tenancy:** Tenant > Organisation > ProviderConnection / Feed / Employee. **All queries MUST be scoped by organisation.**

## Engineering Standards

### TypeScript & Patterns
- **Strict Mode:** No `any`. No `as` casts without documented justification.
- **Exports:** Named exports ONLY. No default exports.
- **Validation:** Use Zod for all external input (API, webhooks, OAuth, provider responses).
- **Error Handling:** Use the **Result Pattern** (`{ ok: true; value: T } | { ok: false; error: E }`) for service-layer errors. Do not throw for expected failures.
- **Domain Types:** Use branded types for all domain IDs and cursors (defined in `packages/types`).

### Codebase Organization
- **Barrel Files:** No `index.ts` re-exports except at the package root.
- **Imports:** Use repo aliases: `@repo/database`, `@repo/types`, `@repo/auth`, etc.
- **Database:** Access ONLY through `packages/database`. Do not import ORM client directly in apps.
- **UI:** Components live in `packages/design-system`. Do not redefine base components in apps.
- **Integrations:** Provider-specific logic lives in `packages/integrations/providers/{provider}/`.

### Database Conventions
- **Naming:** `snake_case` for tables (plural) and columns.
- **Audit Columns:** Every table must have `id` (UUID), `created_at`, `updated_at`.
- **Migrations:** One migration per change. Never hand-edit. Use `npm run migrate` or `npm run db:push` (dev only).

### Testing & Validation
- **Location:** Co-located test files (`foo.test.ts` next to `foo.ts`).
- **Runner:** Vitest.
- **Requirements:** Every feature or bug fix MUST include corresponding tests. Use factories/builders for test data.

## Critical Workflows

### 1. Research & Strategy
- Always map the codebase using `grep_search` and `read_file` before suggesting changes.
- Refer to `PRODUCT.md` for domain logic, `DESIGN.md` for UI tokens, and `.impeccable.md` for brand personality.
- Verify library usage in `package.json` before employing them.

### 2. Implementation
- **Server Components:** Default to React Server Components. Use `"use client"` only for interactivity.
- **Styling:** Adhere to Tailwind CSS v4 patterns.
- **Linting:** Run `npm run fix` (Biome) after modifications.

### 3. Verification
- Run `npm run check` for linting/type-checking and `npm run test` for validation.
- For Prisma changes, ensure `serverExternalPackages` includes `@prisma/client` to avoid Turbopack WASM failures.

## Commands Reference
- `npm run dev`: Start all apps.
- `npm run build`: Build all apps/packages.
- `npm run check`: Lint/type-check (Biome).
- `npm run fix`: Auto-fix lint issues.
- `npm run test`: Run all tests.
- `npm run migrate`: Prisma migration.
- `npm run db:push`: Push schema without migration.

## Security & Isolation
- **Tenant Isolation:** Enforce on every query.
- **Secrets:** Never log or commit `.env` files or API keys.
- **Auth:** Clerk protects routes; middleware in `apps/app/proxy.ts` (not `middleware.ts`).
