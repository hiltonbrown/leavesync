# Plan 072: Automated Clerk User Matching and Bulk Invitations

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5993283..HEAD -- apps/app/app/(authenticated)/settings/integrations/xero/matches apps/app/app/(authenticated)/people`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 069
- **Category**: direction
- **Planned at**: commit `5993283`, 2026-08-22

---

## Why this matters

When an organisation connects Xero and syncs employees, those employees exist in Team Calendar as calendar entities with no login credentials. Currently, admins must manually create matches or send individual invitations one by one.

This plan adds automated matching by verified business email address and a bulk-invitation wizard that allows admins to invite all unlinked employees into the Clerk Organisation with one click.

---

## Current state

- `apps/app/app/(authenticated)/settings/integrations/xero/matches/` only renders pending `xero_person_matches` for manual review.
- `Person` has `clerk_user_id` which binds a calendar profile to a Clerk auth identity.
- Unlinked employees require manually navigating to the matches screen and inputting Clerk User IDs.

---

## Commands you will need

| Purpose   | Command                                                      | Expected on success |
|-----------|--------------------------------------------------------------|---------------------|
| Check     | `bun run check`                                              | exit 0              |
| Typecheck | `bun run typecheck`                                          | exit 0              |
| Test app  | `bunx vitest run apps/app/app/(authenticated)/settings`      | all pass            |
| Full test | `bun run test`                                               | all pass            |

---

## Scope

**In scope**:
- `apps/app/app/(authenticated)/people/people-client.tsx`
- `apps/app/app/(authenticated)/people/_actions.ts`
- `apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts`
- `apps/app/app/(authenticated)/settings/integrations/xero/matches/matches-client.tsx`
- Tests covering matching and bulk invitation logic.

**Out of scope**:
- Changes to Xero OAuth tokens or sync adapters
- Bypassing Clerk Organization membership restrictions

---

## Git workflow

- Branch: `advisor/072-clerk-matching-bulk-invites`
- Commit style: Conventional Commits (`feat(people): add auto-matching by email and bulk clerk invitations`)
- Do NOT push or open a PR unless explicitly instructed.

---

## Steps

### Step 1: Implement Automatic Email Matching Server Action

1. In `apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts`:
   - Add `autoMatchXeroPeopleAction`: Queries unlinked `Person` rows (`clerk_user_id: null`) and compares lowercase `email` with current Clerk organization members retrieved via `@repo/auth/server` (`clerkClient.organizations.getOrganizationMembershipList`).
   - Automatically links matching members when the email is unique and confirmed.
   - Ignores fallback `@noemail.teamcalendar.online` addresses.

**Verify**: `bunx vitest run apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.test.ts` → all pass.

---

### Step 2: Implement Bulk Invitation Flow

1. In `apps/app/app/(authenticated)/people/_actions.ts`:
   - Add `inviteUnlinkedPeopleAction`: Takes a list of `personId`s, calls Clerk's Organization Invitations API (`clerkClient.organizations.createOrganizationInvitation`) for each valid corporate email address, and records audit logs.
2. In `apps/app/app/(authenticated)/people/people-client.tsx`:
   - Add an **"Invite Team to Log In"** button on the People directory banner when unlinked employees exist, with a modal confirming selected invitees.

**Verify**: `bun run check` and `bun run typecheck` → exit 0.

---

## Test plan

- Test email matching verification against Clerk memberships in `matches/_actions.test.ts`.
- Test bulk invitation payload validation and error containment in `people/_actions.test.ts`.

**Verification Command**: `bun run test` → all tests pass.

---

## Done criteria

- [ ] `bun run check` exits 0.
- [ ] `bun run typecheck` exits 0.
- [ ] `bun run test` exits 0.
- [ ] Unlinked employees with matching Clerk emails auto-link without manual ID entry.
- [ ] Admins can send bulk Clerk organization invitations directly from `/people`.
- [ ] `plans/README.md` status row updated.

---

## STOP conditions

Stop and report back if:
- Clerk rate limits bulk invitations (must implement batching of 20 per request).
- Email addresses conflict across multiple tenant records within the same Clerk Org.
