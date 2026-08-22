# 069: Xero People Synchronisation & Reconciliation Architecture

> Reconciled 2026-08-23 at `18a8bae` — moved from `plans/069-xero-people-sync-architecture-and-reconciliation.md` to `docs/architecture/` to resolve duplicate numbering; updated to reflect committed code: `person_type` mapping (contractor vs employee) and `syncResult` error surfacing in `dispatchManualSyncAction`.

## Overview

This document details how people records are synchronised between **Xero Payroll** and **Team Calendar** when an administrator requests a sync (or when automated scheduled sync runs trigger). It describes:
1. The end-to-end sync workflow and execution lifecycle.
2. Ingestion rules, field mappings, and filtering (who is synced vs who is not).
3. The fate of users existing in Xero but not in Team Calendar.
4. The fate of users existing in Team Calendar but not in Xero (manual people, terminated employees, and disconnected connections).

---

## 1. End-to-End People Sync Workflow

```
[User Action: Sync Now (/sync)]
             │
             ▼
[Server Action: dispatchManualSyncAction]
             │  (Validates auth, role org:admin/owner, and tenant context)
             ▼
[Concurrency Guard: syncRun check] ──(Active run exists?)──► [Cancel & Log Duplicate]
             │ (No active run)
             ▼
[Create sync_runs row: status='running', run_type='people']
             │
             ▼
[prepareTenant & ensureFreshXeroConnection] ──(Lapsed Token?)──► [Proactive OAuth Refresh]
             │
             ▼
[fetchEmployeesForRegion]
  ├─ AU: GET /payroll.xro/1.0/Employees (Paginated, rate-limited via xeroFetch)
  └─ NZ / UK: Stubbed read adapter (Graceful success with notice)
             │
             ▼
[Process in Batches of 50 (150ms delay)]
  ├─ Check cancel_requested_at
  ├─ Validate Employee (UUID, First Name, Last Name)
  │    └─ Invalid ──► [Log to failed_records (validation_error)]
  └─ Upsert into PostgreSQL 'people' table:
       ├─ Key: (organisation_id, source_system='XERO', source_person_key=employeeId)
       ├─ Map email (fallback: ${firstName}.${lastName}@noemail.teamcalendar.online)
       ├─ Map employment_type (employee, contractor, director, offshore)
       ├─ Map person_type (contractor → contractor, else employee; directors/offshore → employee)
       └─ Set is_active = (Status == 'ACTIVE')
             │
             ▼
[Finalise Run & Timestamp]
  ├─ Update xero_tenants (last_people_sync_at = now())
  ├─ Mark sync_runs (succeeded / partial_success / failed / cancelled; error surfacing via syncResult in dispatchManualSyncAction)
  └─ Emit SSE Notification (sync.run_status_changed)
```

### Key Components

- **Trigger Layer**: [`apps/app/app/(authenticated)/sync/_actions.ts`](file:///home/hilton/Documents/teamcalendar/apps/app/app/(authenticated)/sync/_actions.ts)
  - `dispatchManualSyncAction`: Validates caller permissions via Clerk (`org:admin` or `org:owner`) and resolves the organisation scope before dispatching.
- **Job Handler Layer**: [`packages/jobs/src/handlers/sync-xero-people.ts`](file:///home/hilton/Documents/teamcalendar/packages/jobs/src/handlers/sync-xero-people.ts)
  - Coordinates sync lifecycle, concurrency control (30-minute stale run window), batch processing (50 records per batch with 150ms pauses), and per-record failure containment.
- **API & Rate-Limiting Layer**: [`packages/xero`](file:///home/hilton/Documents/teamcalendar/packages/xero)
  - `fetchEmployeesForRegion` (`src/read/dispatch.ts`): Dispatches region-specific reads.
  - `fetchEmployees` (`src/au/read.ts`): Paginated HTTP GET requests using `xeroFetch` conforming to Xero's rate limits (60 calls/minute, 5,000 calls/day, 5 concurrent calls per organisation).
  - `ensureFreshXeroConnection` (`src/oauth/service.ts`): Proactively refreshes expiring OAuth access tokens prior to API invocation.

---

## 2. Who is Synced vs. Who is NOT Synced

### Sync Eligibility Matrix

| Category | Synced? | Status in Team Calendar | Behaviour / Rules |
|---|:---:|---|---|
| **Active Xero AU Employees** | ✅ Yes | `is_active: true` | Upserted/updated with full identity and job details. |
| **Terminated / Inactive Xero AU Employees** | ✅ Yes | `is_active: false` | Preserved for historical reporting and audit integrity; marked inactive. |
| **Employees without an Email in Xero** | ✅ Yes | `is_active: (status == 'ACTIVE')` | Assigned deterministic fallback email: `${firstName}.${lastName}@noemail.teamcalendar.online`. |
| **Contractors / Directors / Offshore** | ✅ Yes | Mapped `employment_type` + `person_type` | `employment_type`: `employee`, `contractor`, `director`, `offshore` (default: `employee`); `person_type`: `contractor` if employment_type is contractor else `employee` (directors/offshore → `employee`). |
| **Employees with Missing / Malformed UUID** | ❌ No | Logged to `failed_records` | Fails Zod UUID check (`validation_error`); does not block other employees. |
| **Employees with Missing First or Last Name** | ❌ No | Logged to `failed_records` | Fails non-empty string check (`validation_error`). |
| **NZ & UK Payroll Employees** | ⏳ Pending | N/A | Region employee read adapters are currently stubbed in the adapter layer. |
| **Paused / Revoked Tenants** | ❌ No | N/A | Run aborted early (`status: "cancelled"` or `"failed"`). |

---

## 3. Discrepancy Reconciliation: Users in Xero vs. Team Calendar

### Scenario A: User is in Xero, but NOT yet in Team Calendar

1. **Automatic Ingestion**:
   - On sync, a new `Person` record is inserted with `source_system = "XERO"` and `xero_employee_id = employeeId`.
2. **Dual Ownership Model**:
   - Per [`fieldOwnershipForPerson`](file:///home/hilton/Documents/teamcalendar/packages/availability/src/people/field-ownership.ts):
     - **Xero-owned fields** (`firstName`, `lastName`, `email`, `jobTitle`, `startDate`): Synchronised from Xero on every run.
     - **Team Calendar-owned fields** (`team_id`, `location_id`, `manager_person_id`, `statusNote`, `default_privacy_mode`, `default_contactability`, `include_in_feeds_by_default`): Managed locally by Team Calendar administrators and users.
3. **Clerk Authentication Binding**:
   - The new `Person` record is created without a `clerk_user_id`.
   - When the employee is invited to the Clerk organisation, their identity can be linked explicitly via the [Xero Person Matches settings](file:///home/hilton/Documents/teamcalendar/apps/app/app/(authenticated)/settings/integrations/xero/matches/page.tsx) without altering payroll keys.

### Scenario B: User is in Team Calendar, but NOT in Xero

1. **Manually Created People (`source_system = 'MANUAL'`)**:
   - Added directly via the Team Calendar UI.
   - **Completely isolated from Xero syncs**: The `sync-xero-people` job operates strictly on the composite key `(organisation_id, source_system='XERO', source_person_key)`.
   - Manual people are never deleted, overwritten, or modified by inbound Xero syncs.
   - All fields remain 100% owned by `team-calendar`.

2. **Employees Terminated or Made Inactive in Xero**:
   - Because Xero AU's `/Employees` endpoint returns all employees regardless of status, terminated employees are received during the sync.
   - Team Calendar updates their record to `is_active: false`.
   - Existing leave records, availability history, and calendar publications are preserved.

3. **Employees Removed / Missing from Xero API Payload**:
   - Inbound sync is **additive and idempotent**. If an employee record is omitted or deleted in Xero, Team Calendar does not automatically delete the local `Person` row.

4. **Destructive Xero Disconnection**:
   - If an administrator triggers a destructive disconnect of the Xero integration ([`disconnectXeroOAuthConnection`](file:///home/hilton/Documents/teamcalendar/packages/xero/src/oauth/service.ts)):
     - Synced people (`source_system = "XERO"`) are soft-deleted: `archived_at = now()`, `clerk_user_id = null`.
     - Synced `xero_employee_id` references are cleared (`null`).
     - Synced leave records and balances are archived/removed.
     - Manually created people (`source_system = "MANUAL"`) and manual availability entries remain unaffected.
