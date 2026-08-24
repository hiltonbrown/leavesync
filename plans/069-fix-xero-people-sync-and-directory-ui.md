# Plan 069: Fix Xero People Synchronisation and Directory UI Gaps

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5993283..HEAD -- apps/app/app/(authenticated)/sync/_actions.ts apps/app/app/(authenticated)/sync/sync-client.tsx apps/app/app/(authenticated)/people/people-client.tsx apps/app/app/(authenticated)/people/page.tsx packages/jobs/src/handlers/sync-xero-people.ts packages/availability/src/people/people-service.ts apps/app/lib/navigation/nav-items.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `5993283`, 2026-08-22
- **Outcome**: DONE in implementation commit `18a8bae`; verified against
  `ecd49f5` on 2026-08-24. Residual promised regression coverage moved to Plan
  087.

## Why this matters

Users testing the product report that Xero employee synchronisation does not populate the People directory, and the UI provides misleading or broken feedback. Investigation reveals four compounding root causes:
1. `sync-xero-people.ts` sets `employment_type` but leaves `person_type` as `NULL`. When the People Directory filter is set to "Employees" or "Contractors", the database query filters by `person_type`, which excludes 100% of Xero-synced employees.
2. `dispatchManualSyncAction` ignores the execution result of `syncXeroPeople` and unconditionally returns `{ queued: true }`, causing the UI to show `"Sync queued."` or `"Sync completed successfully."` even when the sync immediately failed, cancelled, or was blocked by an earlier orphaned lock.
3. The People Directory page (`/people`) has no "Sync from Xero" action and does not subscribe to real-time sync notification events (`sync.run_status_changed`), leaving users with no way to trigger a sync or observe background sync completion without a hard page reload.
4. Admin navigation for `/sync` is not scoped by role in `nav-items.ts`, leading to permission denial states when accessed by non-admins.

Fixing these ensures that synced employees appear reliably in the People directory, filtering works across all employment categories, real-time live updates reflect sync status, and actionable error messages are surfaced when a sync fails.

---

## Current state

- `packages/jobs/src/handlers/sync-xero-people.ts` (lines 280–306):
  ```typescript
  await database.person.upsert({
    create: {
      clerk_org_id: context.clerkOrgId,
      display_name: `${employee.firstName} ${employee.lastName}`,
      email,
      employment_type: mapEmploymentType(employee.employmentType),
      first_name: employee.firstName,
      is_active: employee.status === "ACTIVE",
      job_title: employee.jobTitle ?? null,
      last_name: employee.lastName,
      organisation_id: context.organisationId,
      source_person_key: employee.employeeId,
      source_system: "XERO",
      start_date: employee.startDate ? new Date(employee.startDate) : null,
      xero_employee_id: employee.employeeId,
    },
    // ... update clause omits person_type as well
  ```
  `person_type` is left `NULL`, but `schema.prisma` defines `person_type` (`employee | contractor`).

- `packages/availability/src/people/people-service.ts` (lines 375–377):
  ```typescript
  ...(filters.personType === "all"
    ? {}
    : { person_type: filters.personType }),
  ```
  When filtering by `personType: "employee"`, all rows with `person_type: null` are excluded.

- `apps/app/app/(authenticated)/sync/_actions.ts` (lines 60–89):
  ```typescript
  const result = await dispatchManualSync({ ... });
  if (result.ok && result.value.queued) {
    // ...
    try {
      if (parsed.data.runType === "people") {
        await syncXeroPeople(handlerPayload);
      }
      // Return value of syncXeroPeople is discarded
    } catch {}
  }
  return result; // Always returns dispatchManualSync result, masking sync failures
  ```

- `apps/app/app/(authenticated)/people/people-client.tsx`:
  Lacks a `useNotificationEvents` subscription to `sync.run_status_changed`, and empty state only suggests adding people manually rather than triggering a sync.

- `apps/app/lib/navigation/nav-items.ts` (lines 77–78):
  `{ href: "/sync", icon: ActivityIcon, title: "Sync Health" }` lacks `roles: ADMIN_ROLES`.

---

## Commands you will need

| Purpose   | Command                                                      | Expected on success |
|-----------|--------------------------------------------------------------|---------------------|
| Check     | `bun run check`                                              | exit 0              |
| Typecheck | `bun run typecheck`                                          | exit 0              |
| Tests     | `bun run test`                                               | all pass            |
| Test jobs | `bunx vitest run packages/jobs/src/handlers/sync-xero-people`| all pass            |
| Test app  | `bunx vitest run apps/app/app/(authenticated)/people`        | all pass            |

---

## Scope

**In scope**:
- `packages/jobs/src/handlers/sync-xero-people.ts`
- `packages/availability/src/people/people-service.ts`
- `apps/app/app/(authenticated)/sync/_actions.ts`
- `apps/app/app/(authenticated)/sync/sync-client.tsx`
- `apps/app/app/(authenticated)/settings/integrations/xero/xero-client.tsx`
- `apps/app/app/(authenticated)/people/people-client.tsx`
- `apps/app/app/(authenticated)/people/page.tsx`
- `apps/app/lib/navigation/nav-items.ts`
- Co-located tests for changed files.

**Out of scope**:
- Direct Xero API write adapters in `packages/xero/src/au/write.ts`
- Feed generation in `packages/feeds`
- Modifying Prisma schema definitions (the schema already supports `person_type` and `employment_type`)

---

## Git workflow

- Branch: `advisor/069-fix-xero-people-sync-and-directory-ui`
- Commit style: Conventional Commits (`fix: map person_type on xero sync and fix directory filtering`, `feat: add live sync updates and trigger to people directory`)
- Do NOT push or open a PR unless explicitly instructed.

---

## Steps

### Step 1: Fix `person_type` Ingestion and Directory Filtering

1. In `packages/jobs/src/handlers/sync-xero-people.ts`:
   - Map `person_type` during `person.upsert`:
     ```typescript
     const employmentType = mapEmploymentType(employee.employmentType);
     const personType = employmentType === "contractor" ? "contractor" : "employee";
     ```
   - Add `person_type: personType` to both `create` and `update` blocks of `database.person.upsert`.
2. In `packages/availability/src/people/people-service.ts`:
   - Update `buildPeopleWhere` to handle legacy records where `person_type` is null:
     ```typescript
     ...(filters.personType === "all"
       ? {}
       : {
           OR: [
             { person_type: filters.personType },
             {
               person_type: null,
               employment_type: filters.personType === "contractor" ? "contractor" : { not: "contractor" },
             },
           ],
         }),
     ```

**Verify**: `bunx vitest run packages/availability/src/people/people-service.test.ts packages/jobs/src/handlers/sync-xero-people.integration.test.ts` → all pass.

---

### Step 2: Surface Actual Sync Results in Manual Sync Actions and UI

1. In `apps/app/app/(authenticated)/sync/_actions.ts`:
   - Inspect the returned `syncResult` from `syncXeroPeople(handlerPayload)`.
   - If `syncResult.ok` is `true` but `syncResult.value.status === "failed"` or `"cancelled"`, return:
     ```typescript
     return {
       ok: false,
       error: {
         code: "sync_failed",
         message: syncResult.value.errorSummary || "People sync run failed or was cancelled.",
       },
     };
     ```
   - If `syncResult.ok === false`, return `{ ok: false, error: syncResult.error }`.
2. In `apps/app/app/(authenticated)/sync/sync-client.tsx` and `apps/app/app/(authenticated)/settings/integrations/xero/xero-client.tsx`:
   - Handle returned failure messages properly and display toast/status alerts reflecting whether the run succeeded, completed with failures, or encountered an error.

**Verify**: `bunx vitest run apps/app/app/(authenticated)/sync/_actions.test.ts` → all pass.

---

### Step 3: Add Live SSE Updates and "Sync from Xero" Affordance to People Directory

1. In `apps/app/app/(authenticated)/people/people-client.tsx`:
   - Import `useNotificationEvents` from `@repo/notifications/components/provider`.
   - Subscribe to `sync.run_status_changed`:
     ```typescript
     useEffect(
       () =>
         subscribe((event) => {
           if (
             event.type === "sync.run_status_changed" &&
             event.payload.organisationId === organisationId
           ) {
             router.refresh();
           }
         }),
       [organisationId, router, subscribe]
     );
     ```
   - In `renderEmptyState` and the header actions, when Xero is connected and the user is an admin, add a **Sync from Xero** button that invokes `dispatchManualSyncAction({ organisationId, runType: "people", xeroTenantId })`.
2. In `apps/app/app/(authenticated)/people/page.tsx`:
   - Pass `xeroTenantId` and `hasActiveXeroConnection` to `PeopleClient` from the active organisation context.

**Verify**: `bunx vitest run apps/app/app/(authenticated)/people/` → all pass.

---

### Step 4: Restrict `/sync` Navigation to Admin Roles

1. In `apps/app/lib/navigation/nav-items.ts`:
   - Add `roles: ADMIN_ROLES` to the `/sync` nav item:
     ```typescript
     { href: "/sync", icon: ActivityIcon, roles: ADMIN_ROLES, title: "Sync Health" },
     ```

**Verify**: `bun run check` and `bun run typecheck` → exit 0.

---

## Test plan

- **Unit / Integration Tests**:
  - `packages/jobs/src/handlers/sync-xero-people.integration.test.ts`: Verify `person_type` is correctly written as `"employee"` or `"contractor"` alongside `employment_type`.
  - `packages/availability/src/people/people-service.test.ts`: Verify filtering by `personType = "employee"` and `personType = "contractor"` matches both populated `person_type` and fallback `employment_type`.
  - `apps/app/app/(authenticated)/sync/_actions.test.ts`: Verify `dispatchManualSyncAction` returns an error result when the underlying sync fails.
  - `apps/app/app/(authenticated)/people/people-client.test.tsx`: Verify `useNotificationEvents` listener calls `router.refresh()` on `sync.run_status_changed`.

**Verification Command**: `bun run test` → all tests pass.

---

## Done criteria

- [ ] `bun run check` exits 0 (no lint or formatting violations).
- [ ] `bun run typecheck` exits 0.
- [ ] `bun run test` exits 0 with all new test assertions passing.
- [ ] Filtering by "Employees" or "Contractors" in the People directory returns synced Xero employees.
- [ ] The People directory auto-refreshes when a sync status change event is received via SSE.
- [ ] Failed manual sync requests surface clear error toasts instead of false `"Sync queued."` success states.
- [ ] `plans/README.md` status row updated.

---

## STOP conditions

Stop and report back if:
- Database unique constraints on `(organisation_id, xero_employee_id)` conflict with existing manual records and require an interactive merge flow.
- The active Clerk organisation contains no XeroTenant row, indicating OAuth onboarding was not completed.
- `bun run typecheck` fails due to un-exported types across workspace boundaries.

---

## Maintenance notes

- When extending people sync to NZ/UK regions in future iterations, ensure `person_type` continues to be mapped consistently alongside `employment_type`.
- If an admin disconnects Xero, `person_type` values remain on the archived rows for audit integrity.
