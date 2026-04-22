# LeaveSync

**The canonical availability and leave publishing platform for Xero Payroll teams.**

LeaveSync connects directly to Xero Payroll (AU, NZ, UK) to sync approved leave data, combining it with manual out-of-office context to create a single, accurate view of team availability. It publishes this data securely via ICS feeds to the calendars your team already uses (Outlook, Google Calendar, Apple Calendar).

By treating Xero as the ultimate source of truth, LeaveSync eliminates double-handling, provides clear calendar visibility, and reduces internal friction around who is in the office, working from home, or on leave.

## Why LeaveSync?

Most teams struggle with fragmented availability context. Approved annual leave sits in payroll, while "working from home" or "travelling" sits in Slack or disjointed calendar events. LeaveSync solves this by providing:

- **A single canonical view:** Combines Xero-approved leave with non-leave availability states (WFH, training, client site).
- **Secure calendar publishing:** Delivers availability directly to work calendars via secure, revocable ICS feeds with customizable privacy modes (Named, Masked, Private).
- **Strict multi-tenancy:** Built for modern organisations with multiple payroll entities operating under a single corporate umbrella.
- **Bidirectional sync:** (Designed for) submitting leave and managing approval workflows entirely within LeaveSync, writing approved state synchronously back to Xero.

## How It Works

LeaveSync operates on a unidirectional and bidirectional sync model depending on the workflow:

1. **Bidirectional Xero Sync Layer:** Pulls employees, leave records, and balances from Xero via background jobs. Leave submissions and approvals in LeaveSync are written synchronously back to Xero.
2. **Canonical Availability Model:** Normalises Xero leave and manual out-of-office entries into a single `AvailabilityRecord` domain.
3. **Feed Projection Layer:** Applies privacy filtering and scope rules to generate stable calendar events.
4. **ICS Publishing Layer:** Serves cached, heavily optimised `.ics` files using deterministic event UIDs for robust calendar client compatibility.

## Tech Stack

LeaveSync is a Turborepo monorepo built with modern serverless primitives:

- **Framework:** Next.js (App Router) on next-forge
- **Runtime & Package Manager:** Bun
- **Database:** PostgreSQL (Neon serverless) via Prisma 7
- **Authentication:** Clerk (using the Organisations feature)
- **Background Jobs:** Inngest (durable execution for sync, reconciliation, and feed rebuilds)
- **Caching:** Vercel KV (Redis-compatible feed and ETag caching)
- **Email:** Resend + React Email
- **Deployment:** Vercel (across all applications)
- **Testing & Quality:** Vitest, Biome 2, and Ultracite

## Architecture & Monorepo Structure

The repository is strictly divided by domain boundaries to prevent Xero specifics from leaking into canonical availability logic.

### Applications (`apps/`)

| App | Port | Purpose |
| --- | --- | --- |
| **`app`** | 3000 | Authenticated product UI (dashboards, feed management, leave submission). |
| **`api`** | 3002 | Xero OAuth orchestration, Inngest job handlers, feed rendering (`/ical/:token.ics`). |
| **`web`** | 3001 | Public marketing and product site. |
| **`docs`** | 3004 | Mintlify-powered product and API documentation. |
| **`email`** | 3003 | React Email template development and preview environment. |

### Core Packages (`packages/`)

- **`xero`**: Completely isolates Xero OAuth, tenant management, API rate limiting, and region-specific mapping (AU, NZ, UK).
- **`availability`**: The canonical domain logic for people, availability records, privacy rules, and feed eligibility.
- **`feeds`**: Handles ICS generation (`ical-generator`), stable UID hashing rules, and Vercel KV feed caching.
- **`jobs`**: Inngest job definitions for polling Xero, feed rebuilds, and nightly state reconciliation.
- **`database`**: Centralised Prisma schema, migrations, and generated client.
- **`auth`**: Clerk helpers for enforcing tenant boundaries (`requireOrg`, `requireRole`).
- **`design-system`**: Shared Tailwind CSS UI components.

## Security & Tenancy Model

LeaveSync enforces strict multi-tenancy at the database and application levels:

- **Clerk Organisations as Top-Level Boundary:** There is no custom `workspaces` table. The `clerk_org_id` is the primary tenant boundary, present and indexed on every tenant-scoped table.
- **Strict Scoping:** All database queries must filter by `clerk_org_id` sourced from the authenticated context.
- **Credential Protection:** Xero OAuth tokens are encrypted at rest and never exposed in plaintext. Feed access tokens are hashed.
- **Permissions:** Admin, manager, and viewer roles are enforced via Clerk custom roles.

## Local Development

### Prerequisites

- [Bun](https://bun.sh/) (v1.x)
- Neon database URL
- Clerk API keys (Publishable & Secret)
- Resend, Inngest, and Vercel KV keys (if running specific jobs/feeds locally)

### Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Configure environment variables:**
   Copy the example environment files in the apps you wish to run:
   ```bash
   cp apps/api/.env.example apps/api/.env.local
   cp apps/app/.env.example apps/app/.env.local
   cp apps/web/.env.example apps/web/.env.local
   ```
   Fill in `DATABASE_URL`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` as a minimum.

   **Optional GitHub support issue integration (`apps/api/.env.local`):**
   ```bash
   # Server-side only. Do not expose this token in the client.
   GITHUB_TOKEN=github_pat_xxx
   GITHUB_OWNER=your-github-owner
   GITHUB_REPO=your-repository-name
   ```
   - `GITHUB_TOKEN`: the server-side GitHub token used by the API app to create support issues
   - `GITHUB_OWNER`: the repository owner or organisation
   - `GITHUB_REPO`: the repository name without `.git`
   - Leave these values absent if you are not using the feature. Do not set them to empty strings.
   - Minimum fine-grained token permission: repository `Issues: write`
   - Labels are best effort in v1. If the configured labels do not exist, the issue is still created.
   - If the variables are missing, support submission fails predictably with a configuration error instead of crashing the app.

3. **Set up the database:**
   ```bash
   bun run db:push
   # OR for formal migrations:
   bun run migrate
   ```

4. **Start the development servers:**
   ```bash
   bun run dev
   ```
   This uses Turbo to spin up all applications concurrently.

### Vercel deployment notes

If you enable GitHub-backed support submissions in deployed environments, configure `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` on the `api` app in Vercel. These values are server-side only and should not be added to the `app` or `web` deployments.

Set the variables in both Preview and Production if the feature should work in both environments. Redeploy the API app after changing them so the updated configuration is picked up.

### Testing and Quality

LeaveSync uses co-located tests and strict linting to maintain code quality:

- **Run all tests:**
  ```bash
  bun run test
  ```
- **Run specific tests:**
  ```bash
  bunx vitest run packages/feeds
  ```
- **Linting & Formatting:**
  ```bash
  bun run check
  bun run fix
  ```

## Current Status

LeaveSync is currently under active development. Core infrastructure, Clerk multi-tenancy, Prisma schema design, and domain boundaries are established. Xero synchronization, leave workflows, and the canonical ICS feed projection engine are implemented in their respective domain packages. Multiple connectors beyond Xero are intentionally out of scope to focus on a flawless payroll-integrated experience.
