# LeaveSync Product Specification

## Product truth

LeaveSync is a visibility-first leave and availability publishing platform. It connects upstream payroll or HR systems, syncs approved leave and availability data, normalises it into a canonical model, and publishes through calendar feeds, HTML views, Slack, and Teams.

### Product boundaries

LeaveSync is not:
- a full HRIS
- a complex accrual engine
- a fake parity layer that pretends all connectors support the same features

LeaveSync *is* a native leave request and approval engine, allowing managers to manually add and approve leave events alongside synced provider data.

---

## Tenancy model

| Concept | Role |
|---|---|
| Tenant | Billing boundary, top-level workspace |
| Organisation | Business entity within a tenant; owns provider connections, feeds, and employees |
| Membership | User-to-tenant relationship, optionally scoped to one or more organisations |

A tenant may have multiple organisations. Billing, plan limits, and usage are enforced at tenant level.

---

## Core domain model

### Entities

| Entity | Purpose |
|---|---|
| Tenant | Billing and workspace boundary |
| Organisation | Business entity, owns connections and data |
| Membership | User access to tenant, optionally scoped to organisations |
| ProviderConnection | OAuth connection to a source system, scoped to an organisation |
| ProviderEntity | Upstream entity discovered during connection (e.g. Xero organisation) |
| Employee | Canonical employee record |
| EmployeeExternalRef | Links an employee to a provider-specific external ID |
| Team | Grouping of employees |
| Location | Work location for filtering and feeds |
| AbsenceType | Canonical leave/absence category |
| AbsenceEvent | Canonical absence record (see required fields below) |
| BalanceSnapshot | Point-in-time leave balance per employee per type |
| CalendarFeed | Published ICS or HTML feed, scoped to an organisation |
| CalendarFeedScope | Filter rules for a feed (team, location, absence type, custom) |
| NotificationChannel | Slack channel, Teams channel, or webhook target |
| NotificationRule | Matching rule that routes events to notification channels |
| PublicHoliday | Jurisdiction-level public holiday record |
| OrganisationHolidaySetting | Organisation-level public holiday configuration |
| SyncRun | Record of a sync execution |
| SyncCursor | Checkpoint for incremental sync per connection per entity type |
| FailedRecord | Dead-letter record for individual sync failures |
| WebhookEvent | Inbound webhook receipt record |
| AuditLog | Admin and system action log |
| Plan | Billing plan definition |
| PlanLimit | Per-plan limit definitions |
| TenantSubscription | Active subscription linking tenant to plan |
| UsageCounter | Metered usage per tenant |

### AbsenceEvent required fields

Every absence event must store:

- `id` (internal UUID)
- `organisation_id`
- `employee_id`
- `absence_type_id`
- `source_provider` (enum)
- `source_connection_id`
- `source_external_id`
- `status` (enum: confirmed, cancelled, tentative, unknown)
- `start_date`
- `end_date`
- `all_day` (boolean)
- `raw_source_payload` (JSONB)
- `canonical_event_uid` (deterministic, used in ICS; see UID strategy below)
- `event_sequence` (integer, incremented on change)
- `source_updated_at`
- `stale_source` (boolean, default false)
- `is_manual` (boolean, default false)
- `created_at`
- `updated_at`

---

## Canonical event UID strategy

ICS feeds require a stable, deterministic UID per event. Provider source IDs are not always stable across lifecycle transitions (Xero's LeaveApplicationID is an example).

**Canonical UID composition:**

```
{organisation_id}:{employee_id}:{canonical_absence_category}:{start_date}:{end_date}
```

Hash or encode this composite key to produce a valid ICS UID.

Store the provider's own ID (e.g. LeaveApplicationID) as `source_external_id` for reference only. Never derive the published UID from it alone.

---

## Connector truth

### Connector readiness

| Priority | Connector | Status |
|---|---|---|
| 1 | Xero Payroll AU | Primary. Fully scoped, ready to implement. |
| 2 | MYOB Payroll | Primary. Scoped with known constraints (see below). |
| 3 | Zoho People | Secondary. Scoped, implementation deferred until primary connectors are stable. |
| 4 | QuickBooks | Secondary. Capability-gated, implementation deferred. |

### Excluded sources

- **Zoho Books**: not a leave source. Zoho People is the correct Zoho product for leave data.
- **Wave**: no leave or absence API. Not a viable connector.

---

### Xero Payroll AU

| Capability | Supported |
|---|---|
| Employees | Yes |
| Absence types (via pay items) | Yes |
| Approved leave events | Yes |
| Leave balances | Yes |
| Teams | No (not native) |
| Locations | No (not native) |
| Webhooks (for LeaveSync scope) | No, polling only |
| Incremental sync | Polling with updated-since or If-Modified-Since |

**Identity:** LeaveApplicationID is not stable across all leave lifecycle transitions. Use composite canonical UID strategy.

**Rate limits:**
- 60 API calls per minute per organisation
- 5,000 API calls per day per organisation
- Maximum 5 concurrent requests per connected organisation
- App-wide: 10,000 calls per minute across all tenancies

**Commercial:** Xero developer pricing charges by connected-organisation count and API usage. Polling frequency and organisation count have direct cost implications. Scheduler design must optimise for correctness, rate limits, and cost, not just freshness.

---

### MYOB Payroll

| Capability | Supported |
|---|---|
| Employees | Yes |
| Entitlement categories | Yes |
| Balance-style entitlement snapshots | Yes |
| Approved leave events (verified parity with Xero) | No, do not claim |
| Teams | No |
| Locations | No |
| Webhooks | No, polling only |
| Incremental sync | Polling |

**Identity:** Map entitlement categories to canonical absence types for balance display only.

**Auth:** Access tokens expire after approximately 20 minutes. Proactive token refresh is required before every sync.

**Rate limits:** Assume large result sets for EmployeePayrollDetails. Design for safe paging and batching.

---

### Zoho People

| Capability | Supported |
|---|---|
| Employees | Yes |
| Leave types | Yes |
| Leave records | Yes |
| Leave balances | Yes |
| Teams | Verify at implementation |
| Locations | Verify at implementation |
| Webhooks | Customer-configured only (workflow rules), not provisioned by LeaveSync |
| Incremental sync | Polling default; webhook acceleration optional |

**Rate limits:**
- Maximum 200 records per request
- 30 requests per minute threshold
- 5-minute lock period when threshold is exceeded

**Webhook policy:** Zoho People may support admin-configured outbound webhooks through customer workflow rules. These are not provisioned programmatically by LeaveSync. Webhook acceleration is optional. Polling remains the default sync path.

---

### QuickBooks

| Capability | Supported |
|---|---|
| Employees | Yes |
| Time activity | Depends on product and scopes |
| Approved leave / PTO | Not verified, default false |
| Balances | Not verified, default false |
| Teams | No |
| Locations | No |
| Webhooks | Not verified, polling first |
| Incremental sync | Polling |

**Policy:** Capability-gated. Do not claim approved leave or PTO balance sync unless explicitly verified. Do not assume high-frequency sync is justified.

---

## Provider adapter contract

```typescript
export interface AvailabilitySourceAdapter {
  connect(input: OAuthCallbackInput): Promise<Result<ConnectionResult>>;
  listEntities(connectionId: ProviderConnectionId): Promise<Result<ProviderEntityRecord[]>>;
  listEmployees(
    connectionId: ProviderConnectionId,
    cursor?: SyncCursorValue
  ): Promise<Result<Page<EmployeeRecord>>>;
  listAbsenceTypes?(
    connectionId: ProviderConnectionId
  ): Promise<Result<AbsenceTypeRecord[]>>;
  listApprovedAbsences?(
    connectionId: ProviderConnectionId,
    range: DateRange,
    cursor?: SyncCursorValue
  ): Promise<Result<Page<AbsenceRecord>>>;
  listBalances?(
    connectionId: ProviderConnectionId
  ): Promise<Result<BalanceRecord[]>>;
  verifyWebhook?(input: WebhookVerificationInput): Promise<Result<WebhookVerificationResult>>;
  handleWebhook?(
    connectionId: ProviderConnectionId,
    payload: unknown
  ): Promise<Result<SourceDelta[]>>;
  detectCapabilities?(
    connectionId: ProviderConnectionId
  ): Promise<Result<ProviderCapabilities>>;
}
```

Optional methods are omitted when the provider lacks the capability. Each adapter lives in `packages/integrations/providers/{provider}/`.

---

## Provider capabilities

Persisted per connection. Never hardcoded at call sites.

```typescript
export interface ProviderCapabilities {
  supportsEmployees: boolean;
  supportsAbsenceTypes: boolean;
  supportsApprovedAbsences: boolean;
  supportsBalances: boolean;
  supportsTeams: boolean;
  supportsLocations: boolean;
  supportsWebhooks: boolean;
  supportsIncrementalSync: boolean;
}
```

If a provider only partially supports a feature: persist that honestly, surface it in UI, document it in docs, disable unsupported actions server-side.

---

## Sync model

### Initial sync

1. Fetch provider entities
2. Fetch employees
3. Fetch absence types (where supported)
4. Fetch relevant absence history (where genuinely supported)
5. Fetch balances (where supported)

### Incremental sync

- Polling by default.
- Webhooks only where explicitly verified.
- Store cursor or updated-since checkpoints per connection per entity type.
- Nightly reconciliation run.
- Manual re-sync available.

### SyncRun record

| Field | Type |
|---|---|
| id | UUID |
| run_type | enum (initial, incremental, reconciliation, manual) |
| provider_connection_id | FK |
| status | enum (queued, running, partial, succeeded, failed, dead_lettered) |
| started_at | timestamp |
| finished_at | timestamp (nullable) |
| records_in | integer |
| records_changed | integer |
| records_failed | integer |
| error_summary | text (nullable) |
| retry_count | integer |

### Retry and failure rules

- Transient failures: exponential backoff with jitter.
- Retries capped per provider and job type.
- Record-level failures do not fail the entire run unless a configurable threshold is breached.
- Failed records captured in FailedRecord table with full context.
- Partial syncs are first-class outcomes, visible in Sync Health.
- All upserts must be retry-safe (idempotent).

---

## Webhook handling

Where a provider supports webhooks:

- Verify signatures or HMAC.
- Support intent-to-receive flows if the provider requires it.
- Enforce replay protection.
- Store webhook receipt records.
- Process idempotently.
- Never assume ordering.
- Avoid heavy inline processing; queue for async handling where practical.

**Current provider status:** All four connectors use polling. Zoho People webhook acceleration is optional, customer-configured, and not a core dependency. This section defines the contract for when webhook support is added for any provider.

---

## Rate limiting and throttling

Provider-aware throttling is required.

- Queue or scheduler per provider.
- Tenant-safe concurrency controls.
- Chunked initial syncs.
- Incremental syncs prioritised over full re-syncs.
- Rate-limit responses must update connection health and retry timing.
- Large-tenant syncs must batch employees and absences safely.
- Never allow uncontrolled parallel sync storms.

---

## Disconnection and data retention

**Default disconnect:**
- Mark connection as disconnected.
- Stop future syncs.
- Retain previously synced canonical records as historical.
- Set `stale_source = true` on source-backed records.
- Preserve audit history.

**Destructive disconnect (optional, explicit flow):**
- Soft delete source-backed records.
- Document retention and purge semantics.

---

## Publishing model

### Output channels

| Channel | Model |
|---|---|
| ICS feeds | Signed, revocable token-based feeds for Outlook, Google Calendar, Apple Calendar |
| HTML calendar | Embeddable web view |
| Slack | Bot-token app, alerts and digests |
| Teams | Embeddable web tabs, alert summaries |

### Feed scopes

All staff, team, manager, location, absence type, custom.

### Feed privacy modes

Named, masked, private.

### ICS requirements

- Deterministic UID generation (see canonical UID strategy).
- SEQUENCE incrementing on change.
- Correct DTSTAMP handling.
- Correct all-day event encoding.
- Cancellation-safe updates (STATUS:CANCELLED + incremented SEQUENCE).
- ETag and Last-Modified response headers.
- Signed and revocable feed tokens.
- Stable updates to avoid duplicate events in subscribed calendars.

### Slack rules

- Bot-token app integration as default model.
- Do not model Slack as a raw ICS consumer.
- Support alert and digest delivery.
- Support notification channels and rule targeting.

### Teams rules

- Embeddable web calendar tabs.
- Alert summaries.
- Keep native Teams calendar integration simple; focus on the embedded web view model.

---

## Billing and entitlements

Billing schema must exist from the first foundation pass. Live checkout may be deferred, but plan enforcement must not.

### Entities

- **Plan**: tier definition (e.g. free, starter, pro, enterprise)
- **PlanLimit**: per-plan limits (active employees, connections, feeds, etc.)
- **TenantSubscription**: active subscription linking tenant to plan
- **UsageCounter**: metered usage per tenant per counter type

### Enforced limits

- Active employees
- Provider connections
- Feeds
- Organisations (if relevant)
- Slack/Teams features
- Analytics access

### Connector cost-awareness

Usage counters should support connector-cost-aware pricing decisions. Xero sync frequency and connected-organisation count have direct external commercial implications.

---

## Security

- Tenant isolation on every query.
- Clerk auth on all authenticated routes.
- Organisation scoping on all data access.
- Provider tokens encrypted at rest.
- Feed tokens signed and revocable.
- Audit logs for admin actions.
- Privacy controls for sensitive leave categories.
- Manager-only balance access where configured.
- No tokens or raw payloads exposed to client.

### Roles

| Role | Scope |
|---|---|
| owner | Full tenant access |
| admin | Full organisation access |
| manager | Team and direct-report access |
| viewer | Read-only filtered access |

---

## UX: authenticated app pages

Dashboard, Connections, Connection Detail, Employees, Absences, Feeds, Calendar Preview, Notifications, Balances, Public Holidays, Manual Events, Sync Health, Audit Log, Settings, Billing.

## UX: public website pages

Home, Features, Integrations (Xero, MYOB, Zoho People, QuickBooks), Pricing, Security, Compare vs LeaveCal, Compare vs Timetastic, Compare vs absence.io, Docs.

---

## Non-negotiables

- TypeScript throughout.
- Zod validation for all external input.
- Clean separation between provider-specific logic and canonical domain logic.
- No fake provider parity.
- No claim that Zoho Books is a leave source.
- No claim that Wave is a supported connector.
- No complex accrual engine. Display balances from source systems only.
- No low-quality mock integrations disguised as real support.

---

## Delivery approach

Work in small, production-ready vertical slices. Each slice should be deployable and testable. Avoid broad shallow scaffolding. Surface assumptions clearly. Keep naming consistent.
