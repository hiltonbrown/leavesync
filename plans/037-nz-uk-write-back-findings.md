# Plan 037: New Zealand and United Kingdom Xero Payroll Write-Back Findings & Boundary Decision

- **Author**: Antigravity (Implementation Spike)
- **Date**: 2026-08-27
- **Base Plan**: `plans/037-spike-nz-and-uk-payroll-write-back.md`
- **Scope**: Outbound write-back spike covering NZ and UK Xero Payroll APIs, canonical contract compatibility, and product boundary recommendations.

---

## Executive Summary

Team Calendar's leave submission and approval workflow was built around the **Xero Payroll Australia (AU) v1 API**, which natively supports a two-stage application lifecycle (`SUBMITTED` -> `APPROVED` / `REJECTED` via dedicated action endpoints).

Investigation of official Xero OpenAPI specifications and developer documentation confirms that **Xero Payroll New Zealand (NZ) v2** and **Xero Payroll United Kingdom (UK) v2** do **not** have a two-stage leave application lifecycle, nor do they possess `/approve` or `/reject` sub-resource endpoints:
1. **No Pending / Submitted State**: In NZ and UK, `POST /payroll.xro/2.0/Employees/{EmployeeID}/Leave` directly creates leave records whose periods are immediately `Approved` (or `Estimated` / `Completed`).
2. **No Native Decline / Reject**: Neither NZ nor UK supports declining a leave application via the API. The only mutation to remove unwanted leave is `DELETE /payroll.xro/2.0/Employees/{EmployeeID}/Leave/{LeaveID}`, which is blocked once a pay run containing the leave period is posted (`Completed`).
3. **Partner Access Gate (UK)**: Live access to the Xero Payroll UK API requires formal Xero Partner accreditation. Fixture testing is feasible, but live tenant verification is restricted.

### Recommendation

**Maintain NZ and UK as Read-Only Sync regions** (aligned with the read-side expansion in Plans 100–109) and **do not implement eager write-back for NZ or UK in the core availability workflow**.

If outbound leave writing to NZ/UK is required in a future milestone, it must be designed as a **Deferred Post-Approval Write** (where Team Calendar manages submission and approval internally, writing to Xero only upon final manager approval), rather than attempting to emulate AU's eager submission pattern.

---

## Step 1: Canonical Write Contract Freeze

### 1.1 Interface Definition (`ExternalWritePort`)

The canonical write contract is defined in [`packages/core/src/ports/external-write-port.ts`](file:///home/hilton/Documents/teamcalendar/packages/core/src/ports/external-write-port.ts) and exported via `@repo/core`:

```typescript
export interface ExternalWritePort {
  submitLeaveApplication: (
    input: SubmitLeaveInput
  ) => Promise<Result<{ remoteId: string; rawResponse: unknown }, ProviderWriteError>>;

  approveLeaveApplication: (
    input: ApproveLeaveInput
  ) => Promise<Result<void, ProviderWriteError>>;

  declineLeaveApplication: (
    input: DeclineLeaveInput
  ) => Promise<Result<void, ProviderWriteError>>;

  withdrawLeaveApplication: (
    input: WithdrawLeaveInput
  ) => Promise<Result<void, ProviderWriteError>>;

  resolveEmployeeId: (input: {
    personId: string;
    clerkOrgId: string;
    organisationId: string;
  }) => Promise<Result<string, ProviderResolutionError>>;

  resolveLeaveTypeId: (input: {
    personId: string;
    recordType: string;
    clerkOrgId: string;
    organisationId: string;
  }) => Promise<Result<string, ProviderResolutionError>>;
}
```

### 1.2 Call Sites and Database State Transitions

#### A. Submission Workflow ([`packages/availability/src/plans/submit-service.ts`](file:///home/hilton/Documents/teamcalendar/packages/availability/src/plans/submit-service.ts))
- **Trigger**: `submitDraftRecord` / `retrySubmission`
- **Preconditions**:
  - `record.source_type === "team_calendar_leave"`
  - `record.approval_status === "draft"` (or `"xero_sync_failed"` on retry)
  - Active Xero connection resolved for tenant
  - Employee and LeaveType mappings resolved via adapter
- **Concurrency Control**: Acquires a temporary lease by setting `xero_write_claimed_at = now()` with `XERO_WRITE_CLAIM_TTL_MS = 2 minutes`.
- **Outbound Call**: `externalWritePort.submitLeaveApplication(...)`
- **Database Transitions**:
  - **Success**:
    - `approval_status`: `"draft"` -> `"submitted"`
    - `source_remote_id`: sets returned `remoteId` (Xero `LeaveApplicationID`)
    - `source_payload_json`: stores raw response for audit
    - `submitted_at`: timestamped
    - `derived_sequence`: incremented by 1
    - `xero_write_claimed_at`: cleared to `null`
  - **Failure**:
    - `approval_status`: `"xero_sync_failed"`
    - `failed_action`: `"submit"`
    - `xero_write_error`: plain-language error message
    - `xero_write_error_raw`: audit JSON payload
    - `xero_write_claimed_at`: cleared to `null`

#### B. Approval Workflow ([`packages/availability/src/approvals/approval-service.ts`](file:///home/hilton/Documents/teamcalendar/packages/availability/src/approvals/approval-service.ts))
- **Trigger**: `approve` / `retryApproval`
- **Preconditions**: `approval_status === "submitted"`, `source_remote_id` present
- **Outbound Call**: `externalWritePort.approveLeaveApplication({ remoteId: record.source_remote_id, ... })`
- **Database Transitions**:
  - **Success**:
    - `approval_status`: `"submitted"` -> `"approved"`
    - `approved_at`: timestamped
    - `approved_by_person_id`: set to approver's `person_id`
    - `derived_sequence`: incremented
    - `xero_write_error` / `xero_write_error_raw`: cleared to `null` / `DbNull`
  - **Failure**:
    - `approval_status`: `"xero_sync_failed"`
    - `failed_action`: `"approve"`
    - `xero_write_error`: mapped error message

#### C. Decline Workflow ([`packages/availability/src/approvals/approval-service.ts`](file:///home/hilton/Documents/teamcalendar/packages/availability/src/approvals/approval-service.ts))
- **Trigger**: `decline` / `retryDecline`
- **Preconditions**: `approval_status === "submitted"`, `source_remote_id` present, optional/mandatory `reason` (min 3 chars)
- **Outbound Call**: `externalWritePort.declineLeaveApplication({ remoteId: record.source_remote_id, reason, ... })`
- **Database Transitions**:
  - **Success**:
    - `approval_status`: `"submitted"` -> `"declined"`
    - `approval_note`: stored decline reason
    - `derived_sequence`: incremented
  - **Failure**:
    - `approval_status`: `"xero_sync_failed"`
    - `failed_action`: `"decline"`
    - `approval_note`: preserved reason

#### D. Withdrawal Workflow ([`packages/availability/src/plans/submit-service.ts`](file:///home/hilton/Documents/teamcalendar/packages/availability/src/plans/submit-service.ts))
- **Trigger**: `withdrawSubmission`
- **Preconditions**: `approval_status in ["submitted", "approved"]`, `source_remote_id` present
- **Outbound Call**: `externalWritePort.withdrawLeaveApplication({ remoteId: record.source_remote_id, ... })`
- **Database Transitions**:
  - **Success**:
    - `approval_status`: -> `"withdrawn"`
    - `withdrawn_at`: timestamped
    - `derived_sequence`: incremented
  - **Failure**:
    - `approval_status`: `"xero_sync_failed"`
    - `failed_action`: `"withdraw"`

### 1.3 Error Contract

All write port operations return a standardized `Result<T, ProviderWriteError>` where `ProviderWriteError` conforms to:
- `code`: `"validation_error" | "conflict_error" | "auth_error" | "not_found_error" | "rate_limit_error" | "network_error" | "region_not_supported_error" | "unknown_error"`
- `userMessage`: Plain-language text from [`toPlainLanguageMessage`](file:///home/hilton/Documents/teamcalendar/packages/xero/src/write/types.ts#L72-L95)
- `rawPayload`: Stored in `xero_write_error_raw` (admin audit only)
- `correlationId` & `httpStatus`: Preserved for debugging

---

## Step 2: Primary Source Research & Regional Comparison

Official specifications and documentation inspected on **2026-08-27**:
- **NZ Payroll OpenAPI**: `https://raw.githubusercontent.com/XeroAPI/Xero-OpenAPI/master/xero-payroll-nz.yaml`
- **UK Payroll OpenAPI**: `https://raw.githubusercontent.com/XeroAPI/Xero-OpenAPI/master/xero-payroll-uk.yaml`
- **NZ Developer Docs**: `https://developer.xero.com/documentation/api/payrollnz/employeeleave`
- **UK Developer Docs**: `https://developer.xero.com/documentation/api/payrolluk/employeeleave`
- **UK Overview & Partner Access**: `https://developer.xero.com/documentation/api/payrolluk/overview`

### Regional Architecture Comparison

| Dimension | Australia (`AU`) | New Zealand (`NZ`) | United Kingdom (`UK`) |
|---|---|---|---|
| **API Path Version** | `/payroll.xro/1.0` | `/payroll.xro/2.0` | `/payroll.xro/2.0` |
| **Endpoint Base** | `/LeaveApplications` | `/Employees/{EmployeeID}/Leave` | `/Employees/{EmployeeID}/Leave` |
| **Data Scope** | Organisation-wide batch or single | Scoped to individual `EmployeeID` | Scoped to individual `EmployeeID` |
| **Naming Convention** | `PascalCase` (`LeaveApplicationID`, `StartDate`) | `camelCase` (`leaveID`, `startDate`) | `camelCase` (`leaveID`, `startDate`) |
| **Create Endpoint** | `POST /payroll.xro/1.0/LeaveApplications` | `POST /payroll.xro/2.0/Employees/{EmployeeID}/Leave` | `POST /payroll.xro/2.0/Employees/{EmployeeID}/Leave` |
| **Created State in Xero** | `SUBMITTED` | `Approved` (inside `periods[].periodStatus`) | `Approved` (inside `periods[].periodStatus`) |
| **Approve Endpoint** | `POST /LeaveApplications/{id}/approve` | **None** (does not exist) | **None** (does not exist) |
| **Decline / Reject Endpoint**| `POST /LeaveApplications/{id}/reject` | **None** (does not exist) | **None** (does not exist) |
| **Update Endpoint** | `POST /LeaveApplications/{id}` | `PUT /Employees/{EmployeeID}/Leave/{LeaveID}` | `PUT /Employees/{EmployeeID}/Leave/{LeaveID}` |
| **Delete / Cancel Endpoint**| **None** (managed via status transition) | `DELETE /Employees/{EmployeeID}/Leave/{LeaveID}` | `DELETE /Employees/{EmployeeID}/Leave/{LeaveID}` |
| **Idempotency Support** | App-layer lease lock (`xero_write_claimed_at`) | Official `Idempotency-Key` header | Official `Idempotency-Key` header |
| **OAuth Scopes** | `payroll.employees`, `payroll.settings` | `payroll.employees`, `payroll.settings` | `payroll.employees`, `payroll.settings` |
| **Partner Permission Gate** | Open (standard OAuth2 app) | Open (standard OAuth2 app) | **Restricted** (requires Xero Partner approval) |

---

## Step 3: Decision Matrix

For every canonical operation in Team Calendar, regional compatibility is categorized as:
- **Supported**: Direct 1-to-1 API capability exists.
- **Emulatable**: Possible via alternative orchestration (e.g. deferred write or compensating delete), but requires contract adjustment.
- **Unsupported**: The API cannot represent the requested operation.
- **Unverified Live**: Blocked by external access/partner permission.

| Canonical Operation | AU Payroll | NZ Payroll | UK Payroll | Technical & Architectural Notes |
|---|---|---|---|---|
| **Submit Leave** (`draft` -> `submitted`) | **Supported** (`POST /LeaveApplications`) | **Emulatable** (creates `Approved` leave immediately) | **Emulatable** (creates `Approved` leave immediately; Unverified Live) | Calling create at submission time immediately enters approved leave into NZ/UK payroll schedules before manager review. |
| **Approve Leave** (`submitted` -> `approved`) | **Supported** (`POST /approve`) | **Unsupported natively** (Leave is already approved) | **Unsupported natively** (Leave is already approved; Unverified Live) | No `/approve` endpoint exists in NZ or UK v2. |
| **Decline Leave** (`submitted` -> `declined`) | **Supported** (`POST /reject` with reason) | **Emulatable via DELETE** (if unpaid) | **Emulatable via DELETE** (if unpaid; Unverified Live) | No `/reject` endpoint. Deleting removes the record, but loses decline reason in Xero and fails if pay run is `Completed`. |
| **Withdraw Leave** (Pre-approval) | **Supported** (`POST /reject`) | **Emulatable via DELETE** | **Emulatable via DELETE** (Unverified Live) | Calls `DELETE /Employees/{EmployeeID}/Leave/{LeaveID}`. |
| **Withdraw Leave** (Post-approval) | **Supported** (`POST /reject`) | **Emulatable via DELETE** (if unpaid) | **Emulatable via DELETE** (if unpaid; Unverified Live) | Deletion fails if pay run has posted in Xero. |
| **Revert to Draft** (`failed` -> `draft`) | **Supported** (Local state reset) | **Supported** (Local state reset) | **Supported** (Local state reset) | Purely internal Team Calendar transition. |
| **Retry Submission** (`failed` -> `submitted`) | **Supported** | **Supported** (via `POST` + `Idempotency-Key`) | **Supported** (via `POST` + `Idempotency-Key`; Unverified Live) | NZ/UK benefit from native HTTP `Idempotency-Key`. |
| **Approval State Reconciliation** | **Supported** (GET status) | **Supported** (GET periodStatus) | **Supported** (GET periodStatus; Unverified Live) | Inbound status checks map `Approved` / `Completed` / `Estimated`. |

### Fixture-Testable vs. Live-Tenant Requirements

- **NZ Payroll**: Full read and write contracts are fixture-testable and can be validated against live developer/custom connection tenants without special partner agreements.
- **UK Payroll**: Read and write contracts are fixture-testable via mock schemas, but live test runs against UK payroll files require Xero Partner status and explicit app authorization from Xero.

---

## Step 4: Strategic Evaluation & Recommendations

### Evaluation of Approaches

#### Approach 1: Eager Pre-Approval Write + Delete-on-Decline (Rejected)
- **Mechanism**: Execute `POST /Employees/{EmployeeID}/Leave` upon employee submission. If a manager declines, call `DELETE`.
- **Flaws**:
  1. *Compliance and Payroll Hazard*: Leave is visible to payroll administrators as approved as soon as an employee drafts or submits it.
  2. *State Desynchronization*: If a payroll run is posted before the manager reviews the leave, the subsequent `DELETE` will be rejected by Xero (400 validation error), trapping Team Calendar in an unresolvable failure loop.

#### Approach 2: Region-Aware Deferred Post-Approval Write-Back (Viable Future Architecture)
- **Mechanism**:
  - **Submission**: Leave transitions `draft -> submitted` strictly within Team Calendar. No Xero write occurs; `source_remote_id` remains `null`.
  - **Approval**: When the manager approves, Team Calendar calls `POST /payroll.xro/2.0/Employees/{EmployeeID}/Leave`. The returned `leaveID` is saved as `source_remote_id`, and status transitions to `approved`.
  - **Decline**: Internal status becomes `declined`; no Xero API call is required.
  - **Withdrawal**: If withdrawn pre-approval, internal transition only. If withdrawn post-approval, calls `DELETE /Employees/{EmployeeID}/Leave/{LeaveID}`.
- **Trade-offs**: Requires refactoring `ExternalWritePort`, `submit-service.ts`, and `approval-service.ts` to accommodate heterogeneous write timings across regions (AU writes on submission, NZ/UK writes on approval).

#### Approach 3: Read-Only Sync Boundary for NZ and UK (Recommended)
- **Mechanism**:
  - NZ and UK tenants support comprehensive inbound read synchronization (employees, leave records, leave balances, leave status reconciliation) via Plans 100–109.
  - Leave submissions and approvals for NZ and UK organisations are directed to Xero Payroll (or entered in Team Calendar as non-syncing manual availability records like WFH, travelling, training).
  - Outbound write adapter methods for NZ and UK explicitly return `region_not_supported_error` with clear user messaging: *"Sending leave to Xero is not yet available for this payroll region. Manage this leave directly in Xero for now."*

---

## Conclusion and Recommended Boundary

### 1. Primary Recommendation
Adopt **Approach 3 (Read-Only Boundary)** for New Zealand and United Kingdom payroll connections in the current release.

### 2. Follow-Up Plan Sequence

| Plan Slice | Objective | Dependencies |
|---|---|---|
| **Plans 100–109** | Deliver production-ready AU, NZ, and UK read and balance synchronization slices. | Plan 058 |
| **Plan 037-F1** (Documentation) | Update `PRODUCT.md` and `README.md` to formally document the regional boundary: AU has bidirectional sync (read + write-back); NZ and UK have read-only synchronization. | None |
| **Future Phase: Regional Write-Back** | If multi-region outbound write is prioritized, implement Approach 2 (Deferred Post-Approval Write) after securing UK Xero Partner credentials. | Plans 100–109, Partner Access |

### 3. STOP Conditions for Future Write-Back Work
- Do not attempt outbound UK write implementation until Xero Partner access is provisioned for the app.
- Do not implement eager pre-approval writes (Approach 1) for NZ or UK under any circumstance.
- Do not modify `ExternalWritePort` without an explicit migration plan for existing AU approval workflows.

### 4. Required Documentation Alignments
- **`PRODUCT.md`**: Update lines 32, 69, and 285–295 to clarify that synchronous outbound write-back applies to AU Payroll, while NZ and UK payroll integrations operate in inbound read synchronization mode.
- **`packages/xero/src/write/types.ts`**: The existing `region_not_supported_error` message accurately reflects this policy and is already wired into user-facing error dialogs.
