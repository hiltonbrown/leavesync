# 069: Xero People Synchronisation & Reconciliation Architecture

> Reconciled 2026-08-23 at `18a8bae` — moved from `plans/069-xero-people-sync-architecture-and-reconciliation.md` to `docs/architecture/` to resolve duplicate numbering; updated to reflect committed code: `person_type` mapping (contractor vs employee) and `syncResult` error surfacing in `dispatchManualSyncAction`.
>
> Updated by Plan 097 to reflect record-level employee page parsing and
> archival reactivation: one malformed employee record no longer discards its
> valid page neighbours, and a Person that returns from Xero after being
> archived (e.g. following a destructive disconnect) is reactivated in place
> rather than left archived.
>
> Updated by Plan 098 to confirm missing Xero people across complete snapshots:
> missing people are marked with `xero_missing_since` on first observation and
> archived only after at least 24 continuous hours of absence, guarded by
> whole-run bulk loss thresholds.

## Overview

This document details how people records are synchronised between **Xero Payroll** and **Team Calendar** when an administrator requests a sync (or when automated scheduled sync runs trigger). It describes:
1. The end-to-end sync workflow and execution lifecycle.
2. Ingestion rules, field mappings, and filtering (who is synced vs who is not).
3. The fate of users existing in Xero but not in Team Calendar.
4. The fate of users existing in Team Calendar but not in Xero (manual people, terminated employees, missing employees, and disconnected connections).

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
  │    └─ Each page parsed record-by-record: a malformed record becomes a
  │       mapping failure (mapping_error) without discarding valid neighbours
  │       on the same page. Pagination termination uses the raw page length
  │       Xero returned, never the count of records that mapped cleanly.
  └─ NZ / UK: Stubbed read adapter (Graceful success with notice)
             │
             ▼
[Clear Missing Markers for Returned IDs]
  └─ Any non-empty seen EmployeeID clears xero_missing_since before record validation
             │
             ▼
[Process in Batches of 50 (150ms delay)]
  ├─ Check cancel_requested_at
  ├─ Record mapping failures up front (mapping_error, source: raw EmployeeID or "unknown")
  ├─ Validate Employee (UUID, First Name, Last Name)
  │    └─ Invalid ──► [Log to failed_records (validation_error)]
  └─ Upsert into PostgreSQL 'people' table:
       ├─ Key: (organisation_id, source_system='XERO', source_person_key=employeeId)
       ├─ Map email (fallback: ${firstName}.${lastName}@noemail.teamcalendar.online)
       ├─ Map employment_type (employee, contractor, director, offshore)
       ├─ Map person_type (contractor → contractor, else employee; directors/offshore → employee)
       ├─ Set is_active = (Status == 'ACTIVE')
       ├─ Clear xero_missing_since (null)
       └─ Clear archived_at (reactivate) — the employee was returned by Xero
          in this run, so any prior archival no longer applies; is_active is
          mapped independently and does not gate reactivation
             │
             ▼
[Post-Batch Cancellation Check & Complete-Snapshot Absence Reconciliation]
  ├─ If cancelled / incomplete / failed fetch ──► [Skip absence pass]
  └─ If complete snapshot:
       ├─ Calculate unarchived Xero people (denominator) and absent candidates
       ├─ Whole-run guards: empty snapshot, missing ratio >= 20%, or missing count > 5
       │    └─ Guard triggered ──► Block marking & archival, status: 'partial_success'
       └─ If guards pass:
            ├─ First observation ──► Mark xero_missing_since = now() (archive nobody)
            └─ Mature observation (>= 24h absence) ──► Archive (archived_at = now(), is_active = false)
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
  - Coordinates sync lifecycle, concurrency control (30-minute stale run window), batch processing (50 records per batch with 150ms pauses), absence reconciliation with 24-hour persistent confirmation, and per-record failure containment.
- **API & Rate-Limiting Layer**: [`packages/xero`](file:///home/hilton/Documents/teamcalendar/packages/xero)
  - `fetchEmployeesForRegion` (`src/read/dispatch.ts`): Dispatches region-specific reads.
  - `fetchEmployees` (`src/au/read.ts`): Paginated HTTP GET requests using `xeroFetch` conforming to Xero's rate limits (60 calls/minute, 5,000 calls/day, 5 concurrent calls per organisation).
  - `ensureFreshXeroConnection` (`src/oauth/service.ts`): Proactively refreshes expiring OAuth access tokens prior to API invocation.

---

## 2. Who is Synced vs. Who is NOT Synced

### Sync Eligibility Matrix

| Category | Synced? | Status in Team Calendar | Behaviour / Rules |
|---|:---:|---|---|
| **Active Xero AU Employees** | ✅ Yes | `is_active: true` | Upserted/updated with full identity and job details; `xero_missing_since` cleared. |
| **Terminated / Inactive Xero AU Employees** | ✅ Yes | `is_active: false` | Preserved for historical reporting and audit integrity; marked inactive; `xero_missing_since` cleared. |
| **Employees without an Email in Xero** | ✅ Yes | `is_active: (status == 'ACTIVE')` | Assigned deterministic fallback email: `${firstName}.${lastName}@noemail.teamcalendar.online`. |
| **Contractors / Directors / Offshore** | ✅ Yes | Mapped `employment_type` + `person_type` | `employment_type`: `employee`, `contractor`, `director`, `offshore` (default: `employee`); `person_type`: `contractor` if employment_type is contractor else `employee` (directors/offshore → `employee`). |
| **Employee Records That Do Not Parse (wrong shape, or malformed/missing EmployeeID)** | ❌ No | Logged to `failed_records` | Isolated at the page-mapping stage (`mapping_error`); does not block other records on the same page. If raw EmployeeID is present, clears missing marker. |
| **Employees with Missing / Malformed UUID (parses, fails handler check)** | ❌ No | Logged to `failed_records` | Fails the handler's UUID check (`validation_error`); does not block other employees. If raw EmployeeID is present, clears missing marker. |
| **Employees with Missing First or Last Name** | ❌ No | Logged to `failed_records` | Fails the handler's non-empty string check (`validation_error`). If raw EmployeeID is present, clears missing marker. |
| **Previously Archived Employees That Return in Xero** | ✅ Yes | `archived_at: null` (reactivated) | The existing Person row is reused (same Person ID, history preserved), unarchived, and `xero_missing_since` cleared; `is_active` is mapped independently from Xero's employment status. |
| **Missing Employees (Absent from Complete Snapshot)** | ⏳ Evaluated | `xero_missing_since` marked / `archived_at` set | Evaluated only on complete snapshots. First observation sets `xero_missing_since`. Archival occurs only after at least 24 continuous hours of absence, guarded by whole-run bulk loss thresholds. |
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
   - Manual people are never deleted, overwritten, marked missing, or modified by inbound Xero syncs.
   - All fields remain 100% owned by `team-calendar`.

2. **Employees Terminated or Made Inactive in Xero**:
   - Because Xero AU's `/Employees` endpoint returns all employees regardless of status, terminated employees are received during the sync.
   - Team Calendar updates their record to `is_active: false` and clears any missing marker.
   - Existing leave records, availability history, and calendar publications are preserved.

3. **Employees Removed / Missing from Xero API Payload**:
   - Absence is inferred strictly from **complete snapshots** (`complete: true`). If a sync is cancelled, failed, or truncated, no absence reconciliation is performed.
   - Any returned non-empty `EmployeeID` from `seenEmployeeIds` clears its `xero_missing_since` marker before record-level validation.
   - **Whole-run guards**: If the snapshot is empty (`rawItemCount === 0`), the missing ratio is `>= 20%` (e.g. 1 of 5, 1 of 2), or the missing count is `> 5`, the whole absence pass is blocked, and the run finishes as `partial_success` for manual review. No candidates are marked or archived when a guard fires.
   - **Two-phase absence confirmation**:
     - **First observation**: Missing candidates have `xero_missing_since` set to `now()`. Nobody is archived on a single missing observation.
     - **Mature observation (>= 24 hours)**: Candidates that have been continuously missing for at least 24 hours (`now - xero_missing_since >= 24h`) are archived (`archived_at = now()`, `is_active = false`).
     - Person ID, source keys (`source_person_key`, `xero_employee_id`), `clerk_user_id`, and availability/leave history are preserved on archival.
     - If an archived person reappears in a subsequent Xero sync, they are reactivated (`archived_at: null`, `xero_missing_since: null`).

4. **Destructive Xero Disconnection**:
   - If an administrator triggers a destructive disconnect of the Xero integration ([`disconnectXeroOAuthConnection`](file:///home/hilton/Documents/teamcalendar/packages/xero/src/oauth/service.ts)):
     - Synced people (`source_system = "XERO"`) are soft-deleted: `archived_at = now()`, `clerk_user_id = null`.
     - Synced `xero_employee_id` references are cleared (`null`).
     - Synced leave records and balances are archived/removed.
     - Manually created people (`source_system = "MANUAL"`) and manual availability entries remain unaffected.
   - If the Xero connection is later reconnected and the same EmployeeID is returned by a subsequent people sync, the existing (organisation_id, source_system, source_person_key) Person row is reused and reactivated (`archived_at: null`, `xero_missing_since: null`) rather than replaced. Person ID and historical records are preserved; `xero_employee_id` and Xero-owned fields are re-populated from the returned record.
