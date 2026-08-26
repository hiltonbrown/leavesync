# Plan 099: Link active payroll people and add guarded Clerk invitations

> **Executor instructions**: Clerk access follows payroll import and confirmed
> absence reconciliation. Never roll back Person imports because Clerk fails.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/availability/src/people/current-user-service.ts packages/availability/src/people/clerk-access-service.ts packages/availability/src/people/clerk-access-service.integration.test.ts packages/availability/index.ts 'apps/app/app/(authenticated)/people/_schemas.ts' 'apps/app/app/(authenticated)/people/_actions.ts' 'apps/app/app/(authenticated)/people/_actions.test.ts' 'apps/app/app/(authenticated)/people/page.tsx' 'apps/app/app/(authenticated)/people/people-client.tsx' 'apps/app/app/(authenticated)/people/people-client.test.tsx'`
> Plans 097 and 098 must be DONE. Stop if current Clerk SDK types or organisation
> permissions differ from the contract below.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/097-harden-returned-xero-employee-import.md` DONE and `plans/098-confirm-missing-xero-people-before-archival.md` DONE
- **Category**: security
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after dependencies
- **Execution status**: TODO
- **Supersedes**: Clerk half of rejected Plan 072

## Clerk contract

- Mutations require both an authenticated owner/admin role and Clerk's
  organisation membership-management permission
  (`org:sys_memberships:manage`).
- Human-triggered invitations include `inviterUserId`.
- Invitations grant the least-privileged `org:viewer` role; role elevation is a
  separate Clerk membership action.
- The current bulk endpoint accepts at most 10 invitations per call and is
  rate-limited to 50 requests per hour per application instance. Reconfirm this
  against Clerk's
  [bulk invitation reference](https://clerk.com/docs/reference/backend/organization/create-organization-invitation-bulk)
  and installed SDK before editing; never assume all candidates fit one request.
- Membership and pending-invitation state make retries idempotent.
- This plan does not remove memberships for archived people. Plan 098 retains
  `clerk_user_id`; remote access removal needs its own owner/admin safety design.

## Why this matters

Payroll people and login access are different lifecycles. The app needs an
idempotent, reviewed way to link unique existing members and invite eligible
people without inviting stale, ambiguous or fallback-email records.

## Current state

- `current-user-service.ts:165-221` already links a unique same-email Person for
  the current user; reuse its normalisation and ambiguity principles.
- No bulk admin reconciliation service exists.
- The people page already has server action/schema/client test seams named in
  the drift check.
- Match the owner/admin server-action guard in
  `apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts:81-86`
  and add the Clerk system-permission check rather than replacing the role rule.
- Installed Clerk backend types expose organisation bulk invitations. Use the
  current official SDK signature, not a copied REST shape.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Availability | `bunx vitest run packages/availability/index.integration.test.ts` | link/candidate integration cases pass |
| Actions/UI | `bunx vitest run 'apps/app/app/(authenticated)/people/_actions.test.ts' 'apps/app/app/(authenticated)/people/people-client.test.tsx'` | permission, idempotency and UI cases pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |
| Browser | authenticated owner/admin people-page flow | review, confirm and result states work |

## Scope

Modify only drift-check paths, a focused availability access service/test, and
plan bookkeeping. Do not import/archive payroll people, mutate Clerk roles,
invite fallback emails, merge duplicate people or add background invitation
jobs.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `feat/099-clerk-access-reconciliation`
- Commit: `feat(people): reconcile Clerk access safely`
- Do not push or open a pull request unless instructed.

## Steps

1. Extract a reusable service that lists organisation memberships and pending
   invitations, normalises emails, and links only one-to-one email matches.
   Multiple Person or Clerk matches are explicit conflicts, never guessed.
2. Query invitation candidates with both tenant keys: active, unarchived,
   Xero-sourced, unlinked people with a real email. Exclude fallback addresses,
   existing members, pending invitations and every conflict.
3. Add an owner/admin server action with explicit permission checks, input
   validation and audit logging. Dispatch ordered batches of at most 10 with
   `inviterUserId`, never more than the remaining 50-request hourly budget.
   Retry only documented transient responses with bounded backoff; otherwise
   stop after the failed batch. Record returned item outcomes, or batch failure
   when the call throws, without rolling back people.
4. Add the people-page review UI showing linkable, invitable, already invited,
   member and conflict states. Require confirmation before external mutation.
5. Test unauthorised roles, cross-tenant IDs, duplicate emails, retry after
   partial failure, pending invitations, rate-limit failure and no-email people.
6. Run service/action/component tests, an authenticated browser flow, and every
   repository-required gate.

Use `packages/availability/src/people/clerk-access-service.ts` and co-located
integration test, exported from `packages/availability/index.ts`. Return a
browser-safe view model with only Person ID/name, normalised email, state and
non-sensitive conflict reason. All local reads/writes require both tenant keys.
Match only verified primary Clerk email addresses after trim/lowercase. The same
normalised email must occur exactly once among eligible people and exactly once
among organisation memberships.

The server action names are `loadClerkAccessCandidates` and
`inviteClerkAccessCandidates`; audit actions are
`people.clerk_access_reviewed` and `people.clerk_invitations_sent`, with only
organisation ID, inviter ID, candidate/succeeded/failed counts and provider
request ID allowlisted. If the current SDK does not expose per-item bulk
outcomes, report per-batch outcomes and do not fabricate per-item certainty.

## Step verification

1. Availability tests prove unique matches link and ambiguous/no-match cases do
   not mutate.
2. Integration tests prove the candidate query applies both tenant keys and all
   eligibility exclusions.
3. Action tests prove role/permission, `inviterUserId`, bounded batching, audit
   logging and per-item failure behaviour.
4. Component and browser tests prove explicit review/confirmation and all
   candidate/result states.
5. Focused suites include unauthorised, cross-tenant, duplicate, pending,
   partial retry, rate-limit and no-email cases.
6. Both focused commands, browser verification and full gates pass.

## Test plan

Follow the current Clerk mocks in app action tests and database factories in
availability integration tests. Assert exact provider calls without secrets.
Use fake membership/invitation pages to test pagination and retries.

## Done criteria

- [ ] Candidates exclude stale, fallback-email and ambiguous people.
- [ ] Repeated execution creates neither duplicate links nor invitations.
- [ ] Every Clerk mutation is authorised, attributed and audited.
- [ ] Provider failure cannot roll back payroll people.
- [ ] Focused, browser and repository gates pass.

## STOP conditions

Stop before mutation if the 10-item/50-request Clerk contract no longer holds, the
caller identity cannot populate `inviterUserId`, or Plan 098 is not DONE.

## Maintenance notes

Recheck Clerk endpoint limits on SDK upgrades. Membership/invitation pagination
and email normalisation must remain part of idempotency, not UI-only filtering.
