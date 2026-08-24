# Plan 072: Import every missing Xero payroll employee before reconciling Clerk access

> **Reconciliation outcome (2026-08-24)**: **REJECTED** because employee
> reactivation, missing-person lifecycle, Clerk mutations and browser UI must
> not ship as one change. Plans 097, 098 and 099 replace it in safe order. Do
> not execute this document.

> **Historical executor instructions (do not use)**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**:
> `git diff --stat 2e82ef4..HEAD -- packages/xero/src/read/employees.ts packages/xero/src/read/employees.test.ts packages/xero/src/au/read.test.ts packages/jobs/src/handlers/sync-xero-people.ts packages/jobs/src/handlers/sync-xero-people.integration.test.ts packages/availability/src/people/current-user-service.ts packages/availability/index.ts packages/availability/index.integration.test.ts 'apps/app/app/(authenticated)/people/_schemas.ts' 'apps/app/app/(authenticated)/people/_actions.ts' 'apps/app/app/(authenticated)/people/_actions.test.ts' 'apps/app/app/(authenticated)/people/page.tsx' 'apps/app/app/(authenticated)/people/page.test.tsx' 'apps/app/app/(authenticated)/people/people-client.tsx' 'apps/app/app/(authenticated)/people/people-client.test.tsx' docs/architecture/xero-people-sync.md`
> Plan 071 must be `DONE` before this plan starts, so its changes to the shared
> regional dispatch, people-sync handler and integration test are expected
> drift. Confirm the live code matches the "Required Plan 071 handoff" below.
> Treat any other in-scope drift, or a mismatch with that handoff, as a STOP
> condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: not applicable, rejected
- **Superseded by**: Plans 097, 098 and 099
- **Category**: bug
- **Planned at**: commit `2e82ef4`, 2026-08-23
- **Execution status**: REJECTED, superseded by Plans 097, 098 and 099

## Why this matters

Employee synchronisation and login access are different operations. When an
owner or admin syncs people, every payroll employee returned by the supported
Xero adapter must be represented by a Team Calendar `Person`, whether the
employee is active or inactive, has an email address or not, and has a Clerk
membership or not. Invitations and Clerk matching happen only after that import
has completed and must never cause an employee to be omitted.

The current implementation already has the core additive upsert, but its tests
do not prove the full contract. It also leaves a previously archived Xero person
archived when the same EmployeeID reappears. The original version of this plan
then conflated `xero_person_matches` with Clerk identity matching, even though
that table represents possible duplicate Team Calendar people and no production
code currently creates those rows.

This plan makes the import guarantee explicit, restores returning employees,
and adds one idempotent Clerk access flow. Existing Clerk members are linked by
unique email; the remaining active Xero people with real email addresses can be
invited in bulk. Clerk failures do not roll back or invalidate imported people.

## Product contract and definitions

- **"All Xero payroll employees"** means every employee returned by every page
  of a supported regional adapter with a valid, stable Xero EmployeeID and the
  provider-required first and last names. Active, inactive and terminated
  statuses are all imported. A missing email uses the existing deterministic
  `@noemail.teamcalendar.online` fallback.
- **"Already exists"** means the same Xero EmployeeID in the same
  `organisation_id`. Email is not an identity key and must not suppress import.
  A manual person with the same email remains separate and becomes an explicit
  conflict for access reconciliation. Do not merge or overwrite that manual
  record in this plan.
- A malformed provider row without a valid EmployeeID or provider-required name
  cannot be imported safely. It remains a record-level failure in
  `failed_records`, makes the run `partial_success`, and must be visible in the
  returned counts.
- Import completion does not create a Clerk user, send an invitation, or consume
  a Clerk membership. Those are downstream access-management operations.
- Only active, unarchived Xero people with a real email are invitation
  candidates. Inactive people and fallback-email people remain imported but are
  not invited.

## Lifecycle ownership and handoff to Plan 073

Plans 072 and 073 intentionally share the people-sync handler, so their
responsibilities must remain disjoint:

| Xero employee state after a complete read | Owning plan | Required result |
|---|---|---|
| EmployeeID is returned, including `INACTIVE` or `TERMINATED` | 072 | Upsert the Xero person by `(organisation_id, source_system, source_person_key)`, set `archived_at: null`, and map `is_active` from Xero status. |
| EmployeeID is returned after the local Xero person was archived | 072 | Update and unarchive the same `Person` row. Preserve its ID and all Team Calendar-owned fields. |
| EmployeeID is absent from a complete, authoritative snapshot | 073 | Soft-archive the existing unarchived Xero person, subject to Plan 073's safety threshold. |
| Read fails, is cancelled, or cannot prove complete pagination | Neither | Do not infer absence and do not archive any person. |
| Person has `source_system: "MANUAL"` | Neither | Never mutate it from Xero lifecycle reconciliation. |

This plan must not add a missing-ID scan or archive employees omitted from the
payload. Plan 073 consumes the stable import/reactivation behaviour established
here and adds the absence pass afterwards. The two plans must not be executed
or merged in parallel.

## Required Plan 071 handoff

Before changing code, verify all of the following in the live branch:

- The Plan 071 row in `plans/README.md` is `DONE`.
- `fetchEmployeesForRegion` dispatches AU, NZ and UK to implemented employee
  readers; none of those regions uses the current unsupported-region shortcut.
- Each regional employee reader returns success only after its complete
  pagination contract is satisfied, and returns an error for HTTP, parsing or
  truncation failures.
- `syncXeroPeople` no longer skips NZ or UK before calling the dispatcher.
- Regional integration tests prove NZ and UK employee ingestion.

If any item is false, stop. Do not reproduce or partially implement Plan 071
inside this plan.

## Current state

- At planned commit `2e82ef4`, `packages/xero/src/au/read.ts:41-105` fetches
  `/Employees?page=N`, appends
  every mapped page and stops only after a short page. There is no equivalent
  employee-pagination regression test in `packages/xero/src/au/read.test.ts`.
- `packages/xero/src/read/employees.ts:13-28` validates a present EmployeeID as
  a UUID inside the page schema. One malformed ID therefore rejects the entire
  page before the job can preserve valid siblings and record one failed row.
- `packages/jobs/src/handlers/sync-xero-people.ts:186-231` sets
  `fetched = employees.length`, processes every returned employee in batches,
  and reports `partial_success` when any record fails.
- `packages/jobs/src/handlers/sync-xero-people.ts:273-318` currently upserts by
  the stable composite key:

  ```typescript
  where: {
    organisation_id_source_system_source_person_key: {
      organisation_id: context.organisationId,
      source_person_key: employee.employeeId,
      source_system: "XERO",
    },
  },
  ```

  The create and update paths do not filter on status or email, which is
  correct. The update path does not set `archived_at: null`, so a returning or
  reconnected employee can stay hidden.
- `packages/jobs/src/handlers/sync-xero-people.integration.test.ts:91-184`
  proves two active AU employees, fallback email and repeat-run idempotency. It
  does not cover inactive employees, a manual same-email person, a previously
  archived Xero person, or the exact fetched/upserted/failed accounting
  invariant.
- `packages/availability/src/people/current-user-service.ts:165-222` already
  links a Clerk user to exactly one unlinked same-email person. It returns a
  conflict when more than one person matches, then creates a manual person only
  when no match exists. This is the canonical matching behaviour to reuse.
- `apps/api/app/webhooks/auth/route.ts:232-275` calls
  `ensureCurrentUserPerson` for `organizationMembership.created`. Therefore a
  newly accepted invitation already links to an imported Xero person when the
  email match is unique.
- `apps/app/app/actions/settings/invite-member.ts:13-44` is the existing
  single-invitation exemplar. It binds the Clerk Organisation from `auth()`,
  checks owner/admin access, supplies `inviterUserId`, and calls Clerk from a
  server action.
- `apps/app/app/(authenticated)/settings/integrations/xero/matches/` resolves
  `xero_person_matches`. It is not a Clerk membership directory and must not be
  extended for this feature.
- The installed Clerk SDK is `@clerk/nextjs` 7.6.5. Its organisation API
  supports `createOrganizationInvitationBulk(organizationId, invitations)`.
  Clerk list endpoints are paginated, so the implementation must not assume the
  first 100 or 500 rows are the full membership or invitation set.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Employee mapper tests | `bunx vitest run packages/xero/src/read/employees.test.ts` | all pass |
| AU employee read tests | `bunx vitest run packages/xero/src/au/read.test.ts` | all pass |
| People sync integration | `bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts` | all pass with `DATABASE_URL` configured |
| Person-link integration | `bunx vitest run packages/availability/index.integration.test.ts` | all pass with `DATABASE_URL` configured |
| App action tests | `bunx vitest run 'apps/app/app/(authenticated)/people/_actions.test.ts'` | all pass |
| People page tests | `bunx vitest run 'apps/app/app/(authenticated)/people/page.test.tsx'` | all pass |
| App UI tests | `bunx vitest run 'apps/app/app/(authenticated)/people/people-client.test.tsx'` | all pass |
| Check | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | all workspaces pass |
| Integration gate | `bun run test:integration` | all workspaces pass with `DATABASE_URL` configured |
| Visual verification | `bun run dev` | authenticated app is available on port 3000 for the bounded browser checks; stop every agent-started process afterwards |

## Suggested executor toolkit

- Use the `clerk` skill, then its organisation and webhook guidance, for Clerk
  7 invitation and membership APIs. Use the installed SDK types as the final
  authority for method signatures.
- Use the `impeccable` skill in Operate mode for the People-directory dialog and
  async states. Follow `DESIGN.md` and `.impeccable.md`; this is an admin task,
  not a marketing surface.
- Read `PRODUCT.md` sections "Tenancy model", "people" and "Inbound sync flow"
  before changing persistence or identity rules.

## Scope

**In scope** (the only files to modify):

- `packages/xero/src/au/read.test.ts`
- `packages/xero/src/read/employees.ts`
- `packages/xero/src/read/employees.test.ts`
- `packages/jobs/src/handlers/sync-xero-people.ts`
- `packages/jobs/src/handlers/sync-xero-people.integration.test.ts`
- `packages/availability/src/people/current-user-service.ts`
- `packages/availability/index.ts`
- `packages/availability/index.integration.test.ts`
- `apps/app/app/(authenticated)/people/_schemas.ts`
- `apps/app/app/(authenticated)/people/_actions.ts`
- `apps/app/app/(authenticated)/people/_actions.test.ts`
- `apps/app/app/(authenticated)/people/page.tsx`
- `apps/app/app/(authenticated)/people/page.test.tsx` (create)
- `apps/app/app/(authenticated)/people/people-client.tsx`
- `apps/app/app/(authenticated)/people/people-client.test.tsx` (create)
- `docs/architecture/xero-people-sync.md`
- `plans/README.md` for status only

**Out of scope** (do not touch):

- `apps/app/app/(authenticated)/settings/integrations/xero/matches/`. That
  surface handles possible duplicate local people, not Clerk membership
  reconciliation.
- Automatic merging of a manual person and a Xero person with the same email.
- Invitations during the Xero job itself. `packages/jobs` must not depend on
  Clerk, and a Clerk outage must not make payroll import fail.
- Detecting or archiving Xero employees omitted from a completed Xero snapshot.
  Plan 073 owns that absence reconciliation and must land after this plan.
- Inviting inactive or archived people, or people with a fallback email.
- Changes to Xero OAuth scopes, token storage, leave sync, feed generation,
  Clerk dashboard configuration, database schema or migrations.
- New Zealand and United Kingdom adapter implementation. Plan 071 owns those
  adapters and must be complete before this plan starts. This plan applies the
  same import invariant to all three supported regions without changing their
  provider-specific readers.

## Git workflow

- Branch: `advisor/072-complete-xero-import-and-clerk-access`
- Commit per logical unit using Conventional Commits, for example:
  `fix(jobs): restore every returning xero employee` and
  `feat(people): reconcile clerk access for imported employees`.
- Do not push or open a pull request unless explicitly instructed.

## Steps

### Step 1: Lock the complete Xero employee import contract

1. In `packages/xero/src/read/employees.ts`, let the page schema accept string
   EmployeeID values without applying UUID validation at page level. Preserve
   the raw ID in the mapped `XeroEmployee`; `validateEmployee` in the job remains
   the record-level authority. In `employees.test.ts`, prove that one malformed
   ID does not discard valid sibling employees and that a structurally invalid
   page still returns `{ ok: false }`.
2. In `packages/xero/src/au/read.test.ts`, add employee-response fixtures and a
   regression test where page 1 contains exactly 100 employees and page 2
   contains one employee. Assert that `fetchEmployees` requests both numbered
   pages and returns all 101 EmployeeIDs in order. Import `fetchEmployees`
   alongside the existing read functions.
3. In `packages/jobs/src/handlers/sync-xero-people.integration.test.ts`, expand
   the sync fixtures to include:
   - active and inactive or terminated employees;
   - an employee with no email;
   - a contractor;
   - an existing manual person with the same normalised email as a Xero
     employee;
   - an existing archived Xero person with the same EmployeeID.
4. In `packages/jobs/src/handlers/sync-xero-people.ts`, keep the current atomic
   upsert key and add `archived_at: null` to the update block. Do not add any
   `status`, email, Clerk or invitation predicate before the upsert.
5. Assert after the first run that every valid fetched EmployeeID has exactly
   one unarchived `source_system: "XERO"` row in the active organisation,
   including the inactive and no-email employees. Assert the manual same-email
   person remains unchanged. Assert the archived Xero row is unarchived while
   `is_active` continues to reflect its current Xero status.
6. Include one malformed-ID row beside valid employees. Assert the valid rows
   import, the malformed row creates one scoped `failed_records` entry, and the
   run is `partial_success` instead of a blanket failure.
7. Run the same valid payload again with changed Xero-owned fields. Assert there is
   still exactly one Xero row per EmployeeID and those fields update. Assert
   `fetched === upserted + failed`, `skipped === 0`, and the result is
   `succeeded` when every provider row is valid.

**Verify**:
`bunx vitest run packages/xero/src/read/employees.test.ts packages/xero/src/au/read.test.ts packages/jobs/src/handlers/sync-xero-people.integration.test.ts`
→ all tests pass; the pagination test returns 101 employees and the integration
test leaves one unarchived Xero row per valid EmployeeID.

### Step 2: Extract an existing-person-only Clerk linker

1. In `packages/availability/src/people/current-user-service.ts`, extract the
   existing linked-person and unique same-email logic into a named export such
   as `linkExistingPersonToClerkUser`. It accepts the existing dual-tenant
   context, a normalised Clerk profile and optional `expectedPersonId`. It
   returns a `Result` whose success
   value contains `status: "already_linked" | "linked" | "no_match"` and the
   matched `PersonView` for the first two statuses. `no_match` carries no person.
2. The helper must:
   - filter every read and write by both `clerk_org_id` and
     `organisation_id` using `scopedQuery`;
   - only consider unarchived people;
   - match email case-insensitively only when there is exactly one candidate;
   - return a conflict without writing when multiple people share the email;
   - when `expectedPersonId` is supplied, return a conflict if the Clerk user is
     already linked to another person or the unique email match is not the
     expected person. Never reassign a Clerk user implicitly;
   - use a scoped conditional update (`clerk_user_id: null`) so concurrent
     calls cannot silently overwrite another link;
   - never create a `Person`.
3. Refactor `ensureCurrentUserPerson` to call the helper first. Preserve its
   existing behaviour: only `no_match` proceeds to the seat check and manual
   person creation. Do not change the membership webhook contract.
4. Export the helper from `packages/availability/index.ts`.
5. Extend `packages/availability/index.integration.test.ts` for all three
   success statuses, case-insensitive matching, duplicate-email conflict,
   already-linked-to-another-person conflict, expected-person mismatch,
   cross-tenant isolation and a concurrent/stale update that fails closed.

**Verify**:
`bunx vitest run packages/availability/index.integration.test.ts` → all tests
pass and no test links a person outside both tenant keys.

### Step 3: Add one idempotent bulk access action

1. Add a Zod input schema in
   `apps/app/app/(authenticated)/people/_schemas.ts` for a server-derived bulk
   operation. The client supplies only `organisationId`; it must not supply
   `clerkOrgId`, email addresses or Clerk user IDs.
2. Add `reconcileImportedPeopleAccessAction` in
   `apps/app/app/(authenticated)/people/_actions.ts`:
   - require a signed-in owner or admin and obtain the Clerk Organisation ID
     from `auth()`;
   - resolve the active payroll entity with `getActiveOrgContext` and reject a
     mismatched organisation;
   - query all active, unarchived, unlinked Xero people in that exact dual
     tenant scope as candidates. Also query the IDs and normalised emails of all
     unarchived local people in the same scope so email cardinality includes
     manual people;
   - separate fallback emails ending in `@noemail.teamcalendar.online` before
     any Clerk call;
   - validate candidate emails with Zod. Count syntactically invalid Xero
     emails as `invalidEmail` and never pass them to Clerk;
   - count every candidate whose email belongs to more than one local person as
     `conflicts`, including the manual-person-plus-Xero-person case. Do not link
     or invite any person in that email group;
   - fetch every page of current organisation memberships and pending
     invitations. Use `limit: 500` plus `offset` until `totalCount` is
     exhausted; do not assume one page is complete;
   - normalise emails with trim plus lowercase and discard Clerk identifiers
     that are not valid email addresses;
   - for an existing Clerk member with exactly one local matching person, call
     `linkExistingPersonToClerkUser` with that Xero person's ID as
     `expectedPersonId`. If the Clerk user is linked to a different local
     person, count the Xero person as a conflict and never reassign the user;
   - exclude linked people, existing members, pending invitations and duplicate
     candidate emails from the invitation set;
   - call Clerk 7's
     `createOrganizationInvitationBulk(orgId, invitations)` once for the
     remaining unique emails, with `inviterUserId` and role `org:viewer` on
     every item. Do not invent a 20-item batching rule or loop over the
     single-invitation endpoint;
   - record one scoped `auditEvent` containing counts and person IDs, not raw
     provider payloads or Clerk secrets;
   - return this exact success value:

     ```typescript
     {
       status: "succeeded" | "partial_success";
       candidateCount: number;
       linked: number;
       invited: number;
       alreadyInvited: number;
       withoutEmail: number;
       invalidEmail: number;
       conflicts: number;
       failed: number;
     }
     ```

     Every count is a number of candidate people, not email groups. The
     invariant is `candidateCount === linked + invited + alreadyInvited +
     withoutEmail + invalidEmail + conflicts + failed`.
3. The action must be idempotent. A second call after successful invitation
   creation produces no duplicate invitations. If Clerk membership or pending
   invitation discovery fails before any write, return an error. If local links
   succeed but the bulk invitation call fails, return a partial-success value
   with those links and the failed invitation count so the UI reports the true
   outcome. Never delete, archive or roll back any imported `Person` because a
   Clerk operation failed.
4. Return `ok: true` with `status: "partial_success"` when `conflicts`,
   `invalidEmail` or `failed` is non-zero. `failed` counts invitation candidates
   in a bulk request that threw. If the invitation set is empty, skip
   `createOrganizationInvitationBulk` entirely and return the reconciled counts.
   Return `ok: false` only for authentication, validation, Clerk discovery or a
   database failure that occurs before a meaningful result can be reported.
5. Follow the Result error style already used in `_actions.ts`; log operational
   detail through `@repo/observability/log` and return plain-language messages.

**Verify**:
`bunx vitest run 'apps/app/app/(authenticated)/people/_actions.test.ts'` → all
tests pass, including pagination, permission denial, dual-tenant isolation,
fallback/invalid-email exclusion, manual-plus-Xero email conflict,
already-linked-elsewhere conflict, existing-member linking,
pending-invitation deduplication, empty bulk avoidance, count reconciliation and
Clerk failure containment.

### Step 4: Add the People-directory access confirmation flow

1. In `apps/app/app/(authenticated)/people/page.tsx`, load only the counts the
   client needs to decide whether to show the access action. Query all active,
   unarchived, Xero-sourced people with `clerk_user_id: null` plus all
   unarchived local person emails in the same dual-tenant scope. Derive counts
   for actionable candidates (valid, non-fallback email with local cardinality
   one), fallback email, invalid email and local-email conflict. Do not infer
   these counts from the paginated directory rows and do not label the
   actionable count "eligible", because current Clerk membership and invitation
   state is resolved only when the action runs.
2. Create `apps/app/app/(authenticated)/people/page.test.tsx`. Mock the data
   sources and assert both tenant keys are applied, manual people participate in
   email-collision counts, and the derived counts passed to `PeopleClient` are
   correct for valid, fallback, invalid and conflicting emails.
3. In `apps/app/app/(authenticated)/people/people-client.tsx`, show **Invite
   team to log in** only to owners/admins when the actionable candidate count is
   greater than zero. Keep **Sync from Xero** as the primary import action; the
   invitation action must read visually and semantically as a separate
   follow-up.
4. Use the shared design-system `Dialog`, not a custom modal. The dialog must:
   - state that the Xero employees are already imported;
   - preview the number of unlinked candidates with a usable email and the
     counts that cannot be handled automatically because of fallback email,
     invalid email or a duplicate local email. Explain that existing Clerk
     members and pending invitations are reconciled after confirmation;
   - state that invitations grant the `viewer` role;
   - use **Send invitations** as the single primary confirmation and **Cancel**
     as the safe exit;
   - keep the dialog open on failure, preserve context and show a retryable
     error;
   - preserve button width, show a stable loading label, set `aria-busy`, and
     prevent duplicate submission;
   - announce success and partial success with an `aria-live` receipt containing
     the returned counts.
5. Keep the dialog within the viewport at 200% zoom and stack actions below
   640px. Use the existing radius, surface, typography and focus tokens from
   `DESIGN.md`; do not add new colours, nested cards or decorative shadows.
6. Create `people-client.test.tsx` and test button visibility, confirmation,
   loading, success, partial-success and failure states. Verify that a failed
   action does not close the dialog and that viewer/manager roles never see the
   action.
7. With the authenticated app running, inspect the dialog at a desktop viewport,
   below 640px, in dark mode and at 200% browser zoom. Verify keyboard focus
   order, visible focus, no clipped content, stacked narrow-screen actions and
   accurate live-region announcements. Use `vercel:agent-browser` if available;
   otherwise capture the same checks manually. This visual gate is required
   because jsdom cannot prove layout or zoom behaviour.
8. Stop every development process started for this verification. Confirm with
   `lsof -iTCP:3000 -sTCP:LISTEN` (and the other monorepo dev ports if the full
   command started them) that no agent-started listener remains.

**Verify**:
`bunx vitest run 'apps/app/app/(authenticated)/people/page.test.tsx' 'apps/app/app/(authenticated)/people/people-client.test.tsx'`
→ all tests pass and cover scoped candidate derivation plus the complete async
state sequence. The browser inspection produces no accessibility, overflow or
console-error findings.

### Step 5: Reconcile documentation and run every gate

1. Update `docs/architecture/xero-people-sync.md` so Scenario A states the
   product contract from this plan: all valid Xero EmployeeIDs are imported
   independently of Clerk access; returning archived Xero people are restored;
   Clerk linking and invitations are downstream and optional.
2. Remove the current inaccurate statement that employees "can be linked
   explicitly via the Xero Person Matches settings". Document that unique
   same-email linking occurs when an organisation membership is reconciled or
   accepted, while ambiguous local duplicates require separate manual review.
3. In Scenario B, state that this plan does not infer absence or archive
   omitted Xero people. Cross-reference Plan 073 as the sole owner of that
   follow-on lifecycle pass so the documentation does not imply that Plan 072
   implements both sides of reconciliation.
4. Run every command in the table. Do not treat unit tests as a substitute for
   `bun run test:integration`.

**Verify**: `bun run check && bun run typecheck && bun run test && bun run test:integration`
→ every command exits 0.

## Test plan

- `packages/xero/src/read/employees.test.ts`:
  - a malformed EmployeeID remains a record-level value beside valid siblings;
  - a structurally invalid employee page still fails mapping.
- `packages/xero/src/au/read.test.ts`:
  - full 100-row page plus a short second page returns all EmployeeIDs;
  - both numbered URLs are requested exactly once.
- `packages/jobs/src/handlers/sync-xero-people.integration.test.ts`:
  - active, inactive, contractor and no-email employees all persist;
  - a malformed-ID row fails independently while valid siblings persist;
  - a manual same-email person does not suppress the Xero person;
  - an archived Xero person is restored;
  - repeat sync is idempotent and updates Xero-owned fields;
  - fetched, upserted, skipped and failed counts reconcile;
  - existing dual-tenant isolation test remains green.
- `packages/availability/index.integration.test.ts`:
  - existing link, unique email link, no match and conflict outcomes;
  - expected-person mismatch and already-linked-elsewhere conflict;
  - case-insensitive email handling;
  - no cross-organisation or cross-Clerk-Organisation linking;
  - conditional write fails closed under a stale/concurrent link.
- `apps/app/app/(authenticated)/people/_actions.test.ts`:
  - unauthenticated, viewer and manager callers are rejected before Clerk calls;
  - all Clerk membership and invitation pages are read;
  - fallback/invalid email, inactive, archived and cross-tenant people are
    excluded;
  - a manual-plus-Xero same-email pair is a conflict and is not invited;
  - existing members link, pending invitations skip, and remaining emails are
    passed once to the bulk invitation API as `org:viewer`;
  - repeated invocation is idempotent;
  - an empty invitation set does not call Clerk's bulk endpoint;
  - candidate outcome counts satisfy the specified invariant;
  - ambiguous emails and Clerk failures are reported without altering imports;
  - the audit event is dual-tenant scoped and contains no raw payload.
- `apps/app/app/(authenticated)/people/page.test.tsx`:
  - both tenant keys scope the candidate and local-person queries;
  - actionable, fallback, invalid and collision counts include all local people,
    not only the current directory page.
- `apps/app/app/(authenticated)/people/people-client.test.tsx`:
  - role and candidate-count visibility;
  - dialog summary and exact external effect;
  - keyboard-accessible confirmation and cancellation;
  - loading, success, partial-success and retryable failure states.

## Done criteria

All items must hold:

- [ ] The AU pagination regression returns all 101 fixture employees.
- [ ] One malformed EmployeeID produces one failed record without discarding
      valid sibling employees from the same Xero response.
- [ ] A people sync leaves exactly one unarchived Xero `Person` per valid fetched
      EmployeeID in the active organisation, regardless of status or email.
- [ ] Re-running the sync creates no duplicate Xero people and restores a
      previously archived matching Xero person.
- [ ] A manual same-email person neither blocks import nor gets overwritten.
- [ ] `fetched === upserted + failed` and `skipped === 0` for the complete
      import fixtures.
- [ ] No Clerk client or invitation import exists in
      `packages/jobs/src/handlers/sync-xero-people.ts`:
      `rg -n "clerkClient|createOrganizationInvitation" packages/jobs/src/handlers/sync-xero-people.ts`
      returns no matches.
- [ ] Bulk access reconciliation reads every membership/invitation page,
      matches only unique real emails and sends one bulk invitation request for
      the remaining actionable people.
- [ ] A manual person sharing an email with a Xero person and a Clerk user
      already linked elsewhere both produce conflicts, not invitations or
      automatic reassignment.
- [ ] The access result count invariant holds, and an empty invitation set makes
      no bulk Clerk call.
- [ ] Fallback-email and inactive employees remain imported and are never
      invited.
- [ ] The existing membership webhook still links an accepted invitation to a
      unique same-email Xero person without creating a manual duplicate.
- [ ] `bun run check`, `bun run typecheck`, `bun run test` and
      `bun run test:integration` all exit 0.
- [ ] Desktop, narrow-screen, dark-mode and 200%-zoom browser checks pass with
      no clipped content, focus-order errors or console errors.
- [ ] The union of `git diff --name-only 2e82ef4..HEAD`,
      `git diff --cached --name-only`, `git diff --name-only` and
      `git ls-files --others --exclude-standard` contains no files outside the
      in-scope list, apart from `plans/README.md` status-only changes.
- [ ] The Plan 072 row in `plans/README.md` is updated to `DONE` only after all
      gates pass.

## STOP conditions

Stop and report back without improvising if:

- The intended meaning of "already exists" is email-based automatic merging of
  manual and Xero people. This plan deliberately uses Xero EmployeeID as the
  payroll identity and does not auto-merge manual data.
- Plan 071 has not landed, any supported regional employee reader can return a
  partial list as success, or NZ/UK still use the unsupported-region shortcut.
  Complete the owning regional-adapter plan first.
- The live Xero adapter applies an active-only filter or returns an incomplete
  page without an explicit error. Do not claim complete import until the
  adapter contract is corrected and tested.
- A real tenant contains conflicting rows where one row owns
  `source_person_key = EmployeeID` and another owns
  `xero_employee_id = EmployeeID`. This needs a data-reconciliation decision,
  not an automatic merge.
- The installed Clerk 7 SDK does not expose
  `createOrganizationInvitationBulk` with the signature recorded above, or the
  live API documents a per-call item cap not represented here. Verify the
  installed types and report the exact constraint instead of falling back to an
  unbounded single-invitation loop.
- The implementation needs a schema migration or a Clerk dependency in
  `packages/jobs`.
- `bun run test:integration` cannot run because `DATABASE_URL` is unavailable.
  Report the missing gate; do not mark the plan complete based on unit tests.

## Maintenance notes

- Any new regional employee adapter must prove complete pagination and the same
  status/email-independent import contract before it is considered supported.
- Keep Xero EmployeeID as the payroll identity. Email can change and is only a
  conservative access-reconciliation hint.
- Keep Clerk access failure isolated from payroll import. A Clerk outage may
  delay linking or invitations, but it must never remove or hide Xero people.
- Keep lifecycle ownership directional: Plan 072 handles every returned
  EmployeeID and restores matching archived rows; Plan 073 handles only IDs
  absent from a complete snapshot. Do not combine those branches into one
  status-based archive rule.
- Review future invitation changes against Clerk's current pagination and rate
  limits. Do not copy historical batch-size assumptions into new code.
- If product later chooses automatic manual/Xero person merging, design a
  separate audited merge plan covering foreign keys, historical availability,
  feeds and rollback. Do not fold it into access reconciliation.
