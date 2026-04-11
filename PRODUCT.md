# LeaveSync Product Specification

## Product truth

LeaveSync is a visibility-first availability publishing platform. It connects to Xero Payroll (AU, NZ, UK), syncs approved leave data, normalises it into a canonical availability model, and publishes through secure ICS calendar feeds.

The clean architecture is:

**Xero sync layer > canonical availability model > feed projection layer > ICS publishing layer**

LeaveSync stays out of payroll decision-making. Xero remains the source of truth for approved leave. LeaveSync standardises both Xero leave and manual availability entries into one publishable calendar domain.

### Product boundaries

LeaveSync is not:

- a full HRIS
- a full payroll engine
- a leave approval workflow system (Xero handles approvals)
- a multi-connector abstraction layer (Xero only at this stage)

LeaveSync is:

- a canonical availability publisher
- a Xero leave visibility layer
- a manual availability entry surface for non-leave events (WFH, travelling, training, client site)
- a secure ICS feed generator for Outlook, Google Calendar, and Apple Calendar

### Product boundaries (future)

Slack notifications, Teams integration, HTML calendar views, and additional provider connectors (MYOB, QuickBooks) are out of scope for the initial build. The architecture accommodates these without requiring structural changes.

---

## Stack decisions

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js on next-forge | Turborepo monorepo |
| Runtime | Bun | Package manager and script runner |
| Database | PostgreSQL (Neon serverless) | |
| ORM | Prisma 7 | With `@prisma/adapter-neon` |
| Auth | Clerk | Session management, RBAC, workspace guards |
| Job queue | Inngest | Durable execution, scheduling, retries; no infrastructure to manage on Vercel |
| Email | Resend + React Email | Transactional email only |
| Monitoring | Sentry | Error tracking and performance |
| Feed caching | Vercel KV | Redis-compatible; feed body and ETag caching |
| ICS generation | ical-generator | Mature Node.js library; supports VEVENT, UID, SEQUENCE, all-day events |
| Deployment | Vercel | All apps |
| Testing | Vitest | Co-located test files |
| Linting | Biome 2 + Ultracite | |

---

## Tenancy model

| Concept | Role |
|---|---|
| Workspace | Top-level tenant boundary; billing anchor |
| Organisation | Legal or payroll entity within a workspace; owns Xero connections, feeds, people, and availability data |
| User | Authenticated identity via Clerk |
| Membership | User-to-workspace relationship |
| Team | Grouping of people within an organisation |
| Location | Work location within an organisation; used for feed scoping and timezone handling |

A workspace may contain multiple organisations. Billing, plan limits, and usage are enforced at workspace level. **All data queries must be scoped by organisation.**

### Roles

| Role | Scope |
|---|---|
| owner | Full workspace access |
| admin | Full organisation access |
| manager | Team and direct-report access |
| viewer | Read-only filtered access |

---

## Monorepo structure

```text
leavesync/
├─ apps/
│  ├─ app/                    # authenticated product UI (port 3000)
│  ├─ api/                    # sync, webhooks, feed endpoints, admin APIs (port 3002)
│  ├─ web/                    # marketing site (port 3001)
│  ├─ docs/                   # product and implementation docs (port 3004)
│  └─ email/                  # notification templates (port 3003)
├─ packages/
│  ├─ database/               # Prisma schema, migrations, queries
│  ├─ auth/                   # Clerk auth, RBAC, workspace guards
│  ├─ design-system/          # shared UI components (shadcn/ui, Tailwind)
│  ├─ core/                   # shared types, enums, Result pattern, utilities
│  ├─ xero/                   # Xero OAuth, tenant sync, region mapping
│  ├─ availability/           # canonical domain logic
│  ├─ feeds/                  # ICS generation, UID rules, feed filtering
│  ├─ notifications/          # in-app and email notifications
│  ├─ jobs/                   # Inngest job definitions, scheduling
│  ├─ observability/          # Sentry, logging, sync metrics
│  ├─ email/                  # React Email + Resend
│  ├─ next-config/            # shared Next.js configuration
│  ├─ seo/                    # SEO metadata helpers
│  └─ typescript-config/      # shared tsconfig base
└─ tooling/
   ├─ seed/
   ├─ import/
   └─ scripts/
```

### Packages to remove from stock next-forge

The following stock next-forge packages are not required and should be removed or left dormant:

- `packages/ai` (no AI features)
- `packages/cms` (no CMS)
- `packages/collaboration` (no Liveblocks)
- `packages/feature-flags` (defer until needed)
- `packages/internationalization` (defer until needed)
- `packages/payments` (Stripe integration deferred; billing schema exists but checkout is manual initially)
- `packages/rate-limit` (Xero rate limiting handled in `packages/xero`)
- `packages/security` (Arcjet/NoseCone deferred)
- `packages/storage` (no blob storage needed initially)
- `packages/webhooks` (Svix not required; Xero uses polling)
- `apps/storybook` (defer until design system stabilises)
- `apps/studio` (Prisma Studio available via CLI when needed)

---

## App responsibilities

### `apps/app`

Authenticated UI for:

- team calendar view
- person profiles and detail
- manual availability entry (WFH, travelling, training, client site, etc.)
- Xero leave visibility (read-only display of synced leave)
- feed management (create, configure, preview, rotate tokens)
- privacy rule configuration
- publishing health dashboard
- admin settings (organisations, teams, locations, Xero connections)
- sync health and audit log

### `apps/api`

System boundary for:

- Xero OAuth flow and token refresh
- Xero employee and leave sync endpoints
- manual availability CRUD
- feed rendering endpoint: `GET /ical/:token.ics`
- feed preview APIs
- Inngest job handlers (sync scheduling, feed rebuilds, reconciliation)
- publish invalidation
- audit event writes

### `apps/web`

Public site:

- marketing pages
- feature pages
- Xero integration detail
- pricing
- security and privacy
- blog and changelog
- help centre

### `apps/docs`

Internal and external documentation:

- Xero setup guide
- ICS subscription instructions (Outlook, Google Calendar, Apple Calendar)
- admin handbook
- API integration notes

### `apps/email`

Operational messaging only:

- sync failure alerts
- feed token rotated alerts
- privacy conflict notifications
- missing alternative contact reminders

---

## Package design

### `packages/xero`

Isolates all Xero-specific logic.

```text
packages/xero/src/
├─ oauth/
├─ tenants/
├─ au/
├─ nz/
├─ uk/
├─ mappings/
├─ sync/
├─ webhooks/
├─ types/
└─ errors/
```

Responsibilities:

- Xero OAuth token management (acquire, refresh, encrypt at rest)
- tenant discovery and connection state
- employee sync (all three payroll regions)
- leave record sync (all three payroll regions)
- leave-type mapping to canonical types
- source fingerprinting and change detection
- normalisation into canonical `AvailabilityRecord` shape
- region-specific API differences handled internally

Xero's AU, NZ, and UK payroll APIs expose similar concepts but not identical resources. This package absorbs all region variance so downstream code never sees Xero-specific payload shapes.

#### Xero rate limits

- 60 API calls per minute per connected organisation
- 5,000 API calls per day per connected organisation
- maximum five concurrent requests per connected organisation
- app-wide: 10,000 calls per minute across all tenancies

Rate limiting, backoff, and retry logic live inside this package. The job scheduler in `packages/jobs` respects these constraints when scheduling sync runs.

#### Xero commercial considerations

Xero developer pricing charges by connected-organisation count and API usage. Polling frequency and organisation count have direct cost implications. The scheduler must optimise for correctness, rate limits, and cost, not just freshness.

### `packages/availability`

Canonical business domain.

```text
packages/availability/src/
├─ people/
├─ records/
├─ privacy/
├─ contactability/
├─ policies/
├─ scopes/
├─ projections/
├─ validators/
└─ types/
```

Responsibilities:

- canonical person model
- manual availability model
- Xero leave normalisation target
- visibility and privacy rules
- contactability handling (contactable, limited, not contactable, use alternative contact)
- feed eligibility rules
- scope filtering (team, location, event type, person)

### `packages/feeds`

Turns canonical availability into stable ICS output.

```text
packages/feeds/src/
├─ ical/
├─ uid/
├─ templates/
├─ filters/
├─ scopes/
├─ renderers/
├─ signatures/
└─ tests/
```

Responsibilities:

- VEVENT rendering via `ical-generator`
- stable UID generation (see UID strategy below)
- DTSTART/DTEND handling
- all-day vs timed event handling
- privacy masking (named, masked, private)
- DESCRIPTION generation
- secure feed token validation
- feed caching and ETag strategy (via Vercel KV)

### `packages/jobs`

Inngest job definitions and scheduling.

Responsibilities:

- tenant sync scheduling (per-organisation polling intervals)
- feed rebuild scheduling (triggered by availability record changes)
- backfill jobs (initial sync)
- nightly reconciliation jobs
- dead-letter handling for failed records

### `packages/core`

Shared types, utilities, and patterns.

- `Result<T, E>` type
- branded ID types (WorkspaceId, OrganisationId, PersonId, etc.)
- shared enums
- date and timezone utilities
- error types

---

## Core domain model

The primary object is an **AvailabilityRecord**, not a "leave application". This keeps the model provider-agnostic and accommodates both Xero leave and manual availability entries.

### Entities

```text
Workspace
Organisation
Team
Location
User
RoleAssignment
Person
PersonAssignment
XeroConnection
XeroTenant
XeroSyncCursor
AvailabilityRecord
AvailabilityPublication
Feed
FeedScope
FeedSubscriptionToken
AuditEvent
AlternativeContact
SyncRun
FailedRecord
Plan
PlanLimit
WorkspaceSubscription
UsageCounter
```

---

## Database schema

### `workspaces`

Top-level tenant boundary.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | text | |
| `slug` | text | unique |
| `timezone_default` | text | IANA timezone |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `organisations`

Legal/payroll entities inside a workspace.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK |
| `name` | text | |
| `country_code` | enum | `AU`, `NZ`, `UK` |
| `xero_tenant_id` | text | nullable |
| `timezone` | text | IANA timezone |
| `is_active` | boolean | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `teams`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `organisation_id` | UUID | FK |
| `name` | text | |
| `manager_person_id` | UUID | nullable FK |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `locations`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `organisation_id` | UUID | FK |
| `name` | text | |
| `country_code` | text | |
| `region_code` | text | |
| `timezone` | text | IANA timezone |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `people`

Covers employees, contractors, directors, and offshore staff.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK |
| `organisation_id` | UUID | FK |
| `team_id` | UUID | nullable FK |
| `manager_person_id` | UUID | nullable FK |
| `person_type` | enum | `employee`, `contractor`, `director`, `offshore_staff` |
| `source_system` | enum | `xero`, `manual` |
| `source_person_key` | text | nullable; Xero employee ID |
| `display_name` | text | |
| `first_name` | text | |
| `last_name` | text | |
| `email` | text | |
| `phone` | text | nullable |
| `job_title` | text | nullable |
| `is_active` | boolean | |
| `default_contactability` | enum | `contactable`, `limited`, `not_contactable`, `use_alternative_contact` |
| `default_contact_method` | text | nullable |
| `default_privacy_mode` | enum | `named`, `masked`, `private` |
| `include_in_feeds_by_default` | boolean | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `alternative_contacts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `person_id` | UUID | FK |
| `name` | text | |
| `contact_method` | text | |
| `contact_value` | text | |
| `priority` | integer | |
| `is_default` | boolean | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `xero_connections`

One per workspace/credential set.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK |
| `provider` | text | fixed to `xero` |
| `status` | enum | `active`, `expired`, `revoked`, `error` |
| `access_token_encrypted` | text | |
| `refresh_token_encrypted` | text | |
| `expires_at` | timestamp | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `xero_tenants`

One row per connected Xero organisation.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `xero_connection_id` | UUID | FK |
| `xero_tenant_id` | text | Xero's tenant identifier |
| `tenant_name` | text | |
| `payroll_region` | enum | `AU`, `NZ`, `UK` |
| `organisation_id` | UUID | FK |
| `status` | enum | `active`, `paused`, `disconnected` |
| `last_employee_sync_at` | timestamp | nullable |
| `last_leave_sync_at` | timestamp | nullable |
| `last_successful_sync_at` | timestamp | nullable |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `xero_sync_cursors`

Track incremental sync and reconciliation.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `xero_tenant_id` | UUID | FK |
| `entity_type` | enum | `employees`, `leave_records`, `leave_balances`, `leave_periods` |
| `cursor_value` | text | nullable |
| `last_seen_remote_updated_at` | timestamp | nullable |
| `last_full_sync_at` | timestamp | nullable |
| `last_incremental_sync_at` | timestamp | nullable |
| `sync_status` | enum | `idle`, `running`, `failed` |
| `error_message` | text | nullable |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `availability_records`

Core table.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK |
| `organisation_id` | UUID | FK |
| `person_id` | UUID | FK |
| `source_type` | enum | `xero_leave`, `manual` |
| `record_type` | enum | see record types below |
| `title` | text | |
| `starts_at` | timestamp | |
| `ends_at` | timestamp | |
| `all_day` | boolean | |
| `working_location` | text | nullable |
| `contactability_status` | enum | `contactable`, `limited`, `not_contactable`, `use_alternative_contact` |
| `preferred_contact_method` | text | nullable |
| `alternative_contact_id` | UUID | nullable FK |
| `notes_internal` | text | nullable |
| `include_in_feed` | boolean | |
| `privacy_mode` | enum | `named`, `masked`, `private` |
| `publish_status` | enum | `eligible`, `suppressed`, `archived` |
| `source_remote_id` | text | nullable; Xero leave application ID |
| `source_remote_hash` | text | fingerprint for change detection |
| `source_remote_version` | text | nullable |
| `source_last_modified_at` | timestamp | nullable |
| `source_payload_json` | jsonb | nullable; raw provider payload for audit |
| `derived_uid_key` | text | stable UID for ICS |
| `created_by_user_id` | text | nullable; Clerk user ID |
| `updated_by_user_id` | text | nullable; Clerk user ID |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |
| `archived_at` | timestamp | nullable |

#### Record types

`annual_leave`, `personal_leave`, `holiday`, `sick_leave`, `long_service_leave`, `unpaid_leave`, `public_holiday`, `wfh`, `travelling`, `client_site`, `another_office`, `training`, `offsite_meeting`, `contractor_unavailable`, `limited_availability`, `alternative_contact`, `other`

### `availability_publications`

Materialised publishing state per record. Decouples raw data from what was actually emitted in a feed.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `availability_record_id` | UUID | FK (unique) |
| `published_title` | text | |
| `published_description` | text | nullable |
| `published_location` | text | nullable |
| `published_status` | text | |
| `published_uid` | text | stable ICS UID |
| `published_sequence` | integer | incrementing version |
| `published_dtstamp` | timestamp | |
| `last_published_at` | timestamp | |
| `last_feed_hash` | text | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `feeds`

One row per ICS feed.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK |
| `organisation_id` | UUID | nullable FK |
| `name` | text | |
| `slug` | text | |
| `scope_type` | enum | `all_staff`, `team`, `manager`, `location`, `event_type`, `custom` |
| `privacy_default` | enum | `named`, `masked`, `private` |
| `include_contractors` | boolean | |
| `include_directors` | boolean | |
| `include_offshore_staff` | boolean | |
| `status` | enum | `active`, `paused`, `archived` |
| `token_id` | UUID | FK |
| `last_rendered_at` | timestamp | nullable |
| `last_etag` | text | nullable |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `feed_scopes`

Normalised scope rules for feeds.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `feed_id` | UUID | FK |
| `rule_type` | enum | `organisation`, `team`, `manager`, `location`, `event_type`, `person` |
| `rule_value` | text | |
| `created_at` | timestamp | |

### `feed_tokens`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `feed_id` | UUID | FK |
| `token_hash` | text | |
| `token_hint` | text | last four characters for display |
| `status` | enum | `active`, `revoked`, `expired` |
| `rotated_from_token_id` | UUID | nullable FK |
| `expires_at` | timestamp | nullable |
| `last_accessed_at` | timestamp | nullable |
| `created_at` | timestamp | |

### `sync_runs`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK |
| `xero_tenant_id` | UUID | FK |
| `run_type` | enum | `initial`, `incremental`, `reconciliation`, `manual` |
| `status` | enum | `queued`, `running`, `partial`, `succeeded`, `failed`, `dead_lettered` |
| `started_at` | timestamp | |
| `finished_at` | timestamp | nullable |
| `records_in` | integer | |
| `records_changed` | integer | |
| `records_failed` | integer | |
| `error_summary` | text | nullable |
| `retry_count` | integer | |
| `created_at` | timestamp | |

### `failed_records`

Dead-letter table for individual sync failures.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `sync_run_id` | UUID | FK |
| `entity_type` | text | |
| `source_remote_id` | text | nullable |
| `error_message` | text | |
| `source_payload_json` | jsonb | nullable |
| `created_at` | timestamp | |

### `audit_events`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK |
| `actor_user_id` | text | nullable; Clerk user ID |
| `actor_type` | enum | `user`, `system`, `sync` |
| `entity_type` | text | |
| `entity_id` | text | |
| `action` | text | |
| `old_values_json` | jsonb | nullable |
| `new_values_json` | jsonb | nullable |
| `reason` | text | nullable |
| `created_at` | timestamp | |

### Billing entities (schema only, no checkout)

#### `plans`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | text | e.g. free, starter, pro, enterprise |
| `is_active` | boolean | |
| `created_at` | timestamp | |

#### `plan_limits`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `plan_id` | UUID | FK |
| `limit_type` | enum | `active_people`, `connections`, `feeds`, `organisations` |
| `limit_value` | integer | |

#### `workspace_subscriptions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK |
| `plan_id` | UUID | FK |
| `status` | enum | `active`, `cancelled`, `past_due` |
| `started_at` | timestamp | |
| `expires_at` | timestamp | nullable |
| `created_at` | timestamp | |

#### `usage_counters`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK |
| `counter_type` | enum | `active_people`, `connections`, `feeds`, `sync_runs` |
| `counter_value` | integer | |
| `updated_at` | timestamp | |

---

## Indexes and constraints

### Unique constraints

- `organisations(workspace_id, xero_tenant_id)` where `xero_tenant_id` is not null
- `people(workspace_id, organisation_id, source_system, source_person_key)` where `source_person_key` is not null
- `availability_records(organisation_id, source_type, source_remote_id)` where `source_remote_id` is not null
- `availability_publications(availability_record_id)`
- `feeds(workspace_id, slug)`

### Indexes

- `availability_records(person_id, starts_at, ends_at)`
- `availability_records(organisation_id, publish_status, include_in_feed)`
- `availability_records(source_type, source_last_modified_at)`
- `feed_scopes(feed_id, rule_type, rule_value)`
- `audit_events(entity_type, entity_id, created_at)`
- `xero_sync_cursors(xero_tenant_id, entity_type)`

---

## Canonical event UID strategy

Do not use Xero's LeaveApplicationID alone. RFC 5545 requires a persistent globally unique UID for calendar objects.

### UID formula

```text
uid = sha256(
  workspace_id + "|" +
  organisation_id + "|" +
  person_id + "|" +
  source_type + "|" +
  stable_source_key + "|" +
  starts_at_utc + "|" +
  ends_at_utc + "|" +
  record_type
) + "@ical.leavesync.app"
```

Where `stable_source_key` is:

- for Xero records: `tenant_id + employee_id + leave_type + start + end + units`
- for manual records: the `availability_records.id`

This gives:

- stable identity across feed rebuilds
- resistance to duplicate subscriber events
- provider independence
- consistent UID even if Xero's remote ID behaviour changes

### SEQUENCE handling

Store a `published_sequence` integer on `availability_publications`. Increment it when the published representation changes materially. This is the correct way to signal event updates to calendar subscribers, rather than creating a new UID.

---

## Xero sync model

Use a pull-first (polling) sync model.

### Why polling

- LeaveSync's job is visibility and publishing, not transactional payroll write-back
- Xero's leave resources differ by payroll region
- feed freshness matters more than low-latency bidirectional mutation
- Xero does not provide webhooks for leave data relevant to LeaveSync's scope

### Sync jobs (Inngest)

| Job | Purpose |
|---|---|
| `sync-xero-people` | Fetch and upsert employees from Xero |
| `sync-xero-leave-records` | Fetch leave records, map to `availability_records` |
| `reconcile-feed-publications` | Ensure `availability_publications` match current records |
| `rebuild-feed-cache` | Regenerate cached ICS feed bodies in Vercel KV |

### Sync flow

1. Load active Xero tenant
2. Fetch employees for the tenant's payroll region
3. Upsert `people` records
4. Fetch leave records and supporting leave metadata
5. Map to canonical `availability_records`
6. Compute `source_remote_hash` for change detection
7. Archive or suppress stale records no longer present in Xero
8. Enqueue feed rebuilds for affected feeds only

### Mapping rule

Keep raw provider payloads in `source_payload_json` for auditability.

### Retry and failure rules

- Transient failures: exponential backoff with jitter (handled by Inngest)
- Retries capped per job type
- Record-level failures do not fail the entire run unless a configurable threshold is breached
- Failed records captured in `failed_records` table with full context
- Partial syncs are first-class outcomes, visible in sync health UI
- All upserts must be idempotent

### Sync scheduling

- incremental syncs: configurable interval per organisation (default: every 15 minutes during business hours, every 60 minutes outside)
- nightly reconciliation: full re-sync and stale record detection
- manual re-sync: available from the UI for admin users

---

## Feed rendering model

The feed endpoint is stateless at request time except for token validation.

### Pattern

- precompute publication rows when availability records change
- render ICS from `availability_publications`
- cache feed body by `feed_id + etag` in Vercel KV
- invalidate only when a relevant record changes

### Feed endpoint

```text
GET /ical/:token.ics
```

### VEVENT output rules

For each VEVENT:

| Property | Value |
|---|---|
| `UID` | stable derived UID |
| `DTSTAMP` | publication timestamp |
| `SEQUENCE` | incrementing version |
| `SUMMARY` | title per privacy mode |
| `DESCRIPTION` | allowed metadata only |
| `LOCATION` | only if privacy permits |
| `CLASS` | `PUBLIC` or `PRIVATE` depending on privacy policy |
| `TRANSP` | `OPAQUE` for away/unavailable states |

### Privacy transforms

| Mode | SUMMARY example |
|---|---|
| `named` | Jane Smith, Working from home |
| `masked` | Out of office |
| `private` | Busy |

### ICS requirements

- deterministic UID generation (see UID strategy)
- SEQUENCE incrementing on change
- correct DTSTAMP handling
- correct all-day event encoding (DATE not DATE-TIME)
- cancellation-safe updates (STATUS:CANCELLED + incremented SEQUENCE)
- ETag and Last-Modified response headers
- signed and revocable feed tokens
- stable updates to avoid duplicate events in subscribed calendars

---

## Route structure (`apps/app`)

```text
apps/app/app/
├─ (dashboard)/
│  └─ page.tsx
├─ people/
│  └─ [personId]/
├─ availability/
│  ├─ page.tsx
│  ├─ new/
│  └─ [recordId]/
├─ calendar/
│  └─ page.tsx
├─ feeds/
│  ├─ page.tsx
│  └─ [feedId]/
├─ sync/
│  └─ page.tsx
├─ settings/
│  ├─ organisations/
│  ├─ teams/
│  ├─ privacy/
│  ├─ feeds/
│  └─ xero/
```

## API surface (`apps/api`)

```text
apps/api/src/routes/
├─ auth/xero/
├─ xero/
│  ├─ tenants
│  ├─ employees
│  ├─ leave
│  └─ sync
├─ availability/
│  ├─ records
│  ├─ people
│  └─ publications
├─ feeds/
│  ├─ list
│  ├─ preview
│  ├─ rotate-token
│  └─ ical/[token]
├─ admin/
│  ├─ reindex
│  ├─ rebuild-feed
│  └─ audit
```

---

## Security

- Workspace isolation on every query
- Organisation scoping on all data access
- Clerk auth on all authenticated routes
- Xero tokens encrypted at rest
- Feed tokens signed and revocable
- Audit logs for admin actions
- Privacy controls for sensitive leave categories
- Manager-only balance access where configured
- No tokens or raw payloads exposed to client
- No secrets in client bundles

---

## Build order

1. Workspace, organisation, people, team, location schema and seed data
2. Xero OAuth and tenant persistence (`packages/xero/oauth`, `packages/xero/tenants`)
3. Xero employee sync (`packages/xero/sync`, `packages/xero/au`, `packages/xero/nz`, `packages/xero/uk`)
4. Xero leave normalisation into `availability_records`
5. Manual availability CRUD
6. Feed model and token model
7. ICS renderer with stable UID and privacy modes (`packages/feeds`)
8. Feed preview and feed detail UI
9. Team calendar and person profile UI
10. Reconciliation jobs, sync health UI, and audit reporting

Each step should produce a deployable, testable vertical slice.

---

## Disconnection and data retention

### Default disconnect

- Mark Xero connection as disconnected
- Stop future syncs
- Retain previously synced canonical records as historical
- Set `publish_status = 'archived'` on source-backed records
- Mark `source_payload_json` for retention per policy
- Preserve audit history

### Destructive disconnect (explicit, optional)

- Soft delete source-backed records (`archived_at` timestamp)
- Document retention and purge semantics

---

## Non-negotiables

- TypeScript strict mode throughout
- Zod validation on all external input
- Clean separation between Xero-specific logic (`packages/xero`) and canonical domain logic (`packages/availability`)
- No complex accrual engine; display leave data from Xero only
- Stable ICS UIDs derived from business identity, not provider IDs alone
- Result pattern for service-layer errors
- Co-located tests from the first slice
- Australian English in all UI copy and documentation
