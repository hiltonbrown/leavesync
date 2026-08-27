# Plan 086: Xero EmployeeGroupName & Team Mapping Spike Findings

- **Author**: Antigravity (Implementation Spike)
- **Date**: 2026-08-27
- **Base Plan**: `plans/086-spike-xero-employee-group-team-mapping.md`
- **Scope**: Primary-source API analysis, regional contract comparison, team ownership tracing, and definitive recommendation regarding Xero `EmployeeGroupName` mapping and manager hierarchy synchronization.

---

## Executive Summary & Recommendation

This spike investigated whether Xero's `EmployeeGroupName` field (exposed in Xero Payroll Australia) should be synchronised to Team Calendar `Team` entities and assigned to `Person.team_id`.

### Recommendation: **Option 1: No Mapping (Preserve Complete Team Calendar Ownership)**

**Team Calendar must NOT map Xero `EmployeeGroupName` to `Team` records.** `Team` entities, team memberships (`Person.team_id`), and manager reporting lines (`Person.manager_person_id`) must remain 100% owned and managed within Team Calendar.

### Summary of Core Reasons:
1. **Domain & Purpose Divergence**: In Xero Payroll AU, `EmployeeGroupName` reflects the organisation's payroll tracking category option used for general ledger (GL) cost allocation and payroll expense accounting (e.g. *"Direct Wages - Kitchen"*, *"Admin Cost Centre 101"*). In Team Calendar, `Team` represents operational roster units, peer availability groups, calendar feed publication scopes, and holiday assignment groups. Conflating payroll accounting codes with calendar planning boundaries degrades the user experience.
2. **Regional Inconsistency (AU-Only)**: `EmployeeGroupName` is an artifact of the legacy Australian Payroll v1.0 API. Official OpenAPI schemas and documentation confirm that **neither New Zealand (NZ Payroll v2.0) nor the United Kingdom (UK Payroll v2.0) exposes `EmployeeGroupName` or any employee group / tracking category field** on employee records. Mapping this field would introduce asymmetric tenant behavior across supported regions.
3. **Absence of Stable Identifiers in Xero**: `EmployeeGroupName` in Xero is an ephemeral free-text string without an immutable identifier (there is no `EmployeeGroupID` and no `/EmployeeGroups` endpoint in the Payroll API). Keying relational database entities (`teams.id`) on external mutable strings creates identifier churn and breaks dependent relational foreign keys (`feed_scopes`, `public_holiday_assignments`).
4. **Manager Hierarchy is Entirely Unsupported**: Official API specifications across all three regions (AU, NZ, UK) confirm that **Xero Payroll does NOT expose reporting lines, supervisor identifiers, or manager hierarchies**. Because approval routing and manager hierarchies must already be configured within Team Calendar, coupling team creation to payroll strings introduces architectural overhead without eliminating manual configuration.

---

## 1. Primary Source Research & Regional Contract

All external API capabilities and schema contracts were verified on **2026-08-27** against official Xero developer documentation and primary OpenAPI specifications.

### 1.1 Regional Matrix

| Dimension | Australia (AU) Payroll | New Zealand (NZ) Payroll | United Kingdom (UK) Payroll |
|---|---|---|---|
| **API Version** | `/payroll.xro/1.0` | `/payroll.xro/2.0` | `/payroll.xro/2.0` |
| **Official Docs** | [AU Employees API](https://developer.xero.com/documentation/api/payrollau/employees) | [NZ Employees API](https://developer.xero.com/documentation/api/payrollnz/employees) | [UK Employees API](https://developer.xero.com/documentation/api/payrolluk/employees) |
| **OpenAPI Spec** | [xero-payroll-au.yaml](https://raw.githubusercontent.com/XeroAPI/Xero-OpenAPI/master/xero-payroll-au.yaml) | [xero-payroll-nz.yaml](https://raw.githubusercontent.com/XeroAPI/Xero-OpenAPI/master/xero-payroll-nz.yaml) | [xero-payroll-uk.yaml](https://raw.githubusercontent.com/XeroAPI/Xero-OpenAPI/master/xero-payroll-uk.yaml) |
| **`EmployeeGroupName` Field** | **Present** (String, optional/nullable) | **Absent** (Not in schema) | **Absent** (Not in schema) |
| **Stable Group Identifier** | **None** (No `EmployeeGroupID`) | **None** | **None** |
| **Group Resource Endpoints** | **None** (No `/EmployeeGroups`) | **None** | **None** |
| **Tracking Categories on `/Employees`** | **Not Exposed** (Only via Accounting API) | **Not Exposed** | **Not Exposed** |
| **Supervisor / Manager Field** | **None** | **None** | **None** |
| **Leave Approver Flag** | `IsAuthorisedToApproveLeave` (Boolean) | **None** | **None** |

### 1.2 Detailed Findings per Region

#### A. Xero Payroll Australia (`AU`)
- **Schema Presence**: The AU OpenAPI specification defines `EmployeeGroupName` as a string element on `#/components/schemas/Employee` (and demonstrated in example payload line 312: `EmployeeGroupName: foo`).
- **Nature of the Field**: In Xero AU, an administrator can designate one Accounting Tracking Category to act as the Employee Group for payroll. When an employee is assigned to an option within that tracking category, the option name is returned in `EmployeeGroupName`.
- **Structural Gaps**:
  - The API does not expose the tracking category ID or option ID; only the string name is returned.
  - There is no `/EmployeeGroups` endpoint in the AU Payroll API to query, enumerate, create, or update groups.
  - `IsAuthorisedToApproveLeave` is a boolean flag indicating whether the employee has permission to approve leave in Xero, not a reference to who approves *their* leave.

#### B. Xero Payroll New Zealand (`NZ`)
- **Schema Absence**: The NZ Payroll v2.0 OpenAPI specification (`xero-payroll-nz.yaml`) and developer documentation confirm `Employee` contains only standard personal, contact, address, tax, and employment dates (`engagementType`, `startDate`, `endDate`).
- **No Grouping Mechanism**: No employee group, department, or tracking category field is exposed in the employee resource.
- **No Manager Hierarchy**: No supervisor or reporting relationship fields exist.

#### C. Xero Payroll United Kingdom (`UK`)
- **Schema Absence**: The UK Payroll v2.0 OpenAPI specification (`xero-payroll-uk.yaml`) confirms `Employee` contains personal identity, address, contract details (`contracts[]`), and employment status (`isOffPayrollWorker`).
- **No Grouping Mechanism**: `EmployeeGroupName` and tracking categories are completely absent from the UK Payroll schema.
- **No Manager Hierarchy**: No supervisor or reporting relationship fields exist.

---

## 2. Current Team Ownership & Invariants in Team Calendar

An inspection of the Team Calendar codebase confirms the current boundaries and call sites:

### 2.1 Database Schema (`packages/database/prisma/schema.prisma`)
- **`Team` Model**:
  ```prisma
  model Team {
    id              String   @id @default(uuid()) @db.Uuid
    clerk_org_id    String
    organisation_id String   @db.Uuid
    name            String
    created_at      DateTime @default(now())
    updated_at      DateTime @updatedAt

    organisation Organisation @relation(fields: [organisation_id], references: [id])
    people       Person[]

    @@index([clerk_org_id])
    @@index([organisation_id])
    @@map("teams")
  }
  ```
- **Key Schema Properties**:
  - `Team` is scoped to an `Organisation` within a Clerk organisation (`clerk_org_id`, `organisation_id`).
  - `Team` has **no database uniqueness constraint** on `(organisation_id, name)`.
  - `Team` has **no `source_system` or remote identifier** columns.
  - `Person.team_id` is a nullable foreign key referencing `teams.id` with `ON DELETE SET NULL`.
  - `Person.manager_person_id` is a self-referential foreign key referencing `people.id` (`manager` and `direct_reports`).

### 2.2 Relational Dependencies on `Team`
`Team.id` is not merely a display tag; it is an active foreign key anchor across core product features:
1. **Feed Scopes (`packages/feeds/src/scope/feed-scope.ts`)**:
   - `feed_scope_rule_type.team`: Generates calendar feeds scoped strictly to members of a given `team_id`.
2. **Public Holiday Scopes (`packages/database/prisma/schema.prisma`)**:
   - `public_holiday_assignment_scope_type.team`: Assigns specific holiday jurisdictions to teams.
3. **Calendar View & Analytics Filters (`packages/availability`)**:
   - `calendar-service.ts`, `leave-reports-service.ts`, and `out-of-office-service.ts` filter availability records by `person.team_id`.

### 2.3 Field Ownership Definition (`packages/availability/src/people/field-ownership.ts`)
The canonical field ownership service explicitly classifies `team`, `manager`, and `location` as local Team Calendar fields:
```typescript
export function fieldOwnershipForPerson(input: {
  xeroEmployeeId: string | null;
}): FieldOwnership {
  const syncedOwner: FieldOwner = input.xeroEmployeeId ? "xero" : "team-calendar";
  return {
    avatarUrl: "team-calendar",
    email: syncedOwner,
    firstName: syncedOwner,
    jobTitle: syncedOwner,
    lastName: syncedOwner,
    location: "team-calendar",
    manager: "team-calendar",
    personType: "team-calendar",
    startDate: syncedOwner,
    statusNote: "team-calendar",
    team: "team-calendar",
  };
}
```

### 2.4 People Sync Handler (`packages/jobs/src/handlers/sync-xero-people.ts`)
The `syncXeroPeople` job handler upserts `Person` rows using the unique composite key `(organisation_id, source_system, source_person_key)`.
- It updates identity and payroll fields (`first_name`, `last_name`, `email`, `job_title`, `start_date`, `employment_type`, `is_active`).
- It deliberately **leaves `team_id`, `manager_person_id`, and `location_id` untouched**, preserving manual configurations across syncs.
- This contract is documented in `docs/architecture/xero-people-sync.md` § Scenario A.

---

## 3. Evaluation of Options & Analysis of Hazards

Three architectural options were evaluated for handling `EmployeeGroupName`:

| Consideration | Option 1: No Mapping (Recommended) | Option 2: Initial Suggestion Only | Option 3: Authoritative Ongoing Sync |
|---|---|---|---|
| **Mapping Mechanism** | None. `Team` remains manual. | First-import auto-provisioning; no subsequent updates. | Continuous upsert of `Team` and `Person.team_id` on every sync run. |
| **Region Parity** | **Consistent**: All regions (AU, NZ, UK) manage teams uniformly. | **Asymmetric**: AU auto-provisions; NZ/UK requires manual setup. | **Asymmetric & Broken**: AU synchronises; NZ/UK cannot. |
| **Impact of Xero Rename** | **Zero impact**: Team Calendar teams and feed URLs unaffected. | **Duplicate teams created** if new employees join with updated names. | **Orphaned teams & broken feed scopes**: Old team abandoned; new team ID generated. |
| **Impact of Xero Group Deletion / Blank Value** | **Zero impact**. | **Zero impact** on existing records. | **Unassignment hazard**: Employees detached from teams silently. |
| **Accounting vs. Calendar Conflict** | **Avoided**: Teams represent actual coverage squads. | **Polluted on Day 1**: Payroll GL tags become Team Calendar teams. | **Permanent pollution**: Teams forced to match accounting dimensions. |
| **Schema Complexity** | **None**. | Low (requires name matching logic). | High (requires provenance tracking, opt-out flags, sync lock). |
| **Manager Sync Capability** | Unsupported (Manual config in TC). | Unsupported (Manual config in TC). | Unsupported (Manual config in TC). |

### Detailed Failure Modes of Mapping Options (Options 2 & 3):

1. **The Rename Cascade Problem (Option 3)**:
   - Because Xero provides no `EmployeeGroupID`, a rename in Xero (e.g. *"Engineering"* -> *"Product Engineering"*) appears in the sync payload as a completely new string.
   - The sync engine would find no team named *"Product Engineering"*, create a new `Team` row with a new UUID, and move the employees to it.
   - The original `Team` (with ID `team-uuid-1`) is left behind with zero members. Crucially, any **ICS Feed Subscriptions** configured with a `feed_scope` referencing `team-uuid-1` or **Public Holiday Assignments** attached to `team-uuid-1` are immediately broken.
2. **The "Day 2" Drift Problem (Option 2)**:
   - On initial connection, an organisation imports 15 employees with `EmployeeGroupName: "Front of House"`.
   - The administrator renames the team in Team Calendar to *"Bar & Restaurant Staff"* to reflect scheduling needs.
   - Six months later, a 16th employee is hired and synced from Xero with `EmployeeGroupName: "Front of House"`.
   - Option 2 would inspect the database, find no team with exact name *"Front of House"*, and recreate a duplicate *"Front of House"* team, splitting the squad across two teams.
3. **No Solution for Multi-Tenant / Multi-Region Organisations**:
   - A customer operating across Australia and New Zealand would experience jarring inconsistencies: Australian staff would be grouped by payroll codes, while New Zealand staff would remain unassigned.

---

## 4. Manager Hierarchy Decision

Plan 074 previously hypothesized that supervisor relationships could be imported alongside teams.

**Primary source verification definitively confirms that Xero Payroll APIs do NOT expose supervisor or reporting lines in any region.**
- Xero AU's `IsAuthorisedToApproveLeave` is an authorization capability flag, not a relationship pointer.
- Xero does not maintain an organizational chart or reporting hierarchy in its payroll data model.
- **Decision**: Manager hierarchy is **formally unsupported** for automated sync. It must not be approximated through heuristics. Team Calendar's existing direct-report hierarchy model (`Person.manager_person_id`) remains the authoritative source of truth, configured directly by administrators in Team Calendar.

---

## 5. Migration Impact & Codebase Hygiene

- **Database Migrations**: No schema alterations are required. The current `Team` and `Person` models in `schema.prisma` are complete and sufficient.
- **Product Runtime**: No code changes are required in `packages/xero`, `packages/jobs`, or `packages/availability`.
- **Documentation**:
  - `PRODUCT.md` and `docs/architecture/xero-people-sync.md` already correctly document that `team_id`, `location_id`, and `manager_person_id` are Team Calendar-owned fields.
  - Plan 074 is rejected and formally superseded by this finding document.

---

## 6. Proposed Follow-Up Plan Boundary

1. **Close Plan 086**: Conclude this spike with this decision document.
2. **No Follow-up Sync Implementation**: No implementation plan should be scheduled for `EmployeeGroupName` or manager sync from Xero.
3. **Future Team Management Enhancements**:
   - Any future work on teams should focus on Team Calendar's native administrative capabilities (e.g. bulk team assignment, CSV team import/export, or team-level notification preferences) rather than payroll adapter hooks.
