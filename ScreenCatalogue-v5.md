# Team Calendar: Screen Catalogue v5

Definitive reference for every screen in `apps/app`, reconciled against the implemented code and reviewed for interaction quality. This version supersedes `ScreenCatalogue-v4.1.md` in full.

## Authority and precedence

When this catalogue and a project file disagree, resolve in this order:

1. `PRODUCT.md` (product truth, schema, sync behaviour, tenancy)
2. `CLAUDE.md` (repo conventions, package boundaries, environment)
3. `DESIGN.md` (colour tokens, typography, elevation, components)
4. `ScreenCatalogue-v4.1.md` (superseded; retained only as historical reference)

This catalogue never overrides token values, tenancy rules, or domain rules. It describes what each screen does and shows; `DESIGN.md` describes how it looks. Where v4.1 conflicted with the implemented code and the conflict was not itself a case of the code drifting from an authoritative file, the code wins and v4.1 is corrected. Every correction is recorded either in "What changed from v4.1" or in "Conflicts found".

---

## What changed from v4.1

| # | Change | Reason | Screens affected | Evidence |
|---|---|---|---|---|
| 1 | **Border radius table corrected.** Cards use 20px (`rounded-xl`), elevated surfaces (modals, popovers, sheets, dropdowns) use 16px (`rounded-2xl`), buttons and inputs use 14px (`rounded-md`), chips use 12px (`rounded-sm`). v4.1's "16px cards / 12px inputs" table contradicted `DESIGN.md`'s own frontmatter and body text, and the actual CSS. | v4.1's radius table was wrong against `DESIGN.md` and code, not a case of code drifting from a correct spec. | All screens | `DESIGN.md` frontmatter (`rounded.sm/md/lg/xl`), `packages/design-system/styles/globals.css:56,185-188` (`--radius: 1rem`, `--radius-sm/md/lg/xl`) |
| 2 | **Chart ramp is now formalised.** `DESIGN.md` documents `--chart-1` through `--chart-5` (sage family). v4.1 described this as "planned". | `DESIGN.md` now defines the token; v4.1 predates it. | S-15, S-16 | `DESIGN.md` "Chart Ramp" section; `packages/design-system/styles/globals.css` light/dark `--chart-1..5` |
| 3 | **Frost and blur are almost entirely unimplemented**, contrary to `DESIGN.md`'s elevation doctrine. Only the sticky header uses `backdrop-blur`; `Dialog`, `Popover`, `Sheet`, `DropdownMenu`, `Command`, and the toast primitive (`sonner.tsx`) carry no blur, no frost-alpha fill, no opaque fallback, and no `prefers-reduced-transparency` handling. | Systemic gap between `DESIGN.md` and `packages/design-system`. Recorded in Conflicts found rather than silently "fixed" in this doc-only pass. | Every screen with a modal, popover, dropdown, command palette, sheet, or toast (effectively all of them) | `packages/design-system/components/ui/dialog.tsx`, `popover.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `command.tsx`, `sonner.tsx` (no `blur`/`backdrop` hits); `apps/app/app/(authenticated)/components/header.tsx:29` (the one `backdrop-blur` usage in the whole app) |
| 4 | **S-02 is not purely Clerk-hosted.** A project-owned route, `/session-tasks/choose-organization`, exists and renders inside the branded `(auth)` layout (`BrandPanel`). Its content is a thin wrapper around Clerk's `TaskChooseOrganization` primitive with no custom form logic, but v4.1's "no custom route" claim is not accurate. | Code drifted from v4.1's stated resolution. | S-02 | `apps/app/app/(unauthenticated)/(auth)/session-tasks/choose-organization/page.tsx`, `packages/auth/components/choose-organization-task.tsx` |
| 5 | **`/availability` and `/leave-balances` exist as legacy redirect shims**, not live screens, and were absent from v4.1 entirely. They 302 to `/plans`/`/plans/new`/`/plans/[id]/edit` and `/people`/`/people/[id]` respectively, preserving only the `org` query parameter (all other params, e.g. `personId`, `startsAt` on `/availability/new`, are silently dropped even though the target routes accept them). | Undocumented in v4.1; genuine functional gap in param preservation. | New entries (redirect-only) | `apps/app/app/(authenticated)/availability/{page,new/page,[recordId]/edit/page}.tsx`, `apps/app/app/(authenticated)/leave-balances/page.tsx`, `apps/app/lib/navigation/org-url.ts` |
| 6 | **Sidebar nav item list corrected.** Actual items: Dashboard, My Plans, Calendar, Notifications, People, Calendar Feeds, Leave Reports, Out of Office, Leave Approvals, Public Holidays, Sync Health, Settings. "Plans" is "My Plans", "Feeds" is "Calendar Feeds", "Analytics" is two separate items (Leave Reports, Out of Office), and "Sync Health" (`/sync`, already catalogued as S-25) was missing from v4.1's navigation-shell description entirely. | v4.1's Navigation shell description drifted from the actual nav registry. | Navigation shell (all screens) | `apps/app/lib/navigation/nav-items.ts` |
| 7 | **No `/search` route exists.** Global search is implemented as a Cmd/Ctrl+K command palette (`CommandMenu`) reusing the same nav registry as the sidebar, not a page. v4.1's "uncatalogued `/search` route" question is resolved: there is no such route to catalogue. | Resolves a v4.1 open question. | Navigation shell | `apps/app/app/(authenticated)/components/command-menu.tsx`, `command-menu-trigger.tsx` |
| 8 | **`/settings/members` resolved.** Manages Clerk Organisation membership (invite, role change, remove) via the Clerk Backend SDK directly, entirely distinct from `/people` (which manages `Person` domain records). Custom-built UI, not Clerk's hosted `<OrganizationProfile/>`. Gated only by the `settings` layout's admin/owner check; the page itself has no `requirePageRole` call. | Resolves a v4.1 open question. | New entry S-27 | `apps/app/app/(authenticated)/settings/members/page.tsx`, `members-client.tsx`, `apps/app/app/actions/settings/{invite-member,remove-member,update-member-role}.ts` |
| 9 | **`/settings` and `/setup` resolved as redirects**, not screens: `/settings` → `/settings/general`; `/setup` → `/settings/getting-started`. | Resolves v4.1 open questions. | New entries (redirect-only) | `apps/app/app/(authenticated)/settings/page.tsx`, `apps/app/app/(authenticated)/setup/page.tsx` |
| 10 | **`/settings/danger` does not exist.** No file anywhere under `apps/app` matches. | Resolves a v4.1 open question; the route was speculative. | Removed from Uncatalogued routes | Repo-wide glob, zero matches |
| 11 | **`/support` is API-only.** `apps/api` has `POST /api/support/github-issue`, but no page under `apps/app` calls it or renders a support form. There is no `/support` screen to catalogue. | Resolves a v4.1 open question. | Removed from Uncatalogued routes (flagged in Decisions required for the missing UI entry point) | `apps/api/app/api/support/github-issue/route.ts`; zero matches for `**/support/**` under `apps/app` |
| 12 | **`/webhooks` does not exist as a UI screen.** `apps/api` has inbound webhook receivers (`app/webhooks/auth/route.ts` for Clerk, `app/webhooks/payments/route.ts` for Stripe): API route handlers, not `packages/webhooks` (which remains unused per the do-not-use list) and not a settings screen. | Resolves a v4.1 open question. | Removed from Uncatalogued routes | `apps/api/app/webhooks/{auth,payments}/route.ts`; zero matches for `**/webhooks/**` under `apps/app` |
| 13 | **Three new admin routes need catalogue entries**: `/settings/integrations/xero/connect` (OAuth callback and tenant/organisation attachment step), `/settings/integrations/xero/matches` (explicit-review reconciliation between Xero-synced and manually-created `Person` records), `/settings/getting-started` (derived-state onboarding checklist, also the target of the `/setup` redirect). | New surface, absent from v4.1. | New entries S-28, S-29, S-30 | `apps/app/app/(authenticated)/settings/integrations/xero/{connect,matches}/page.tsx`, `settings/getting-started/page.tsx` |
| 14 | **E-05 does not name the failed action.** The `XeroSyncFailedState` badge is hardcoded to the literal text "Xero sync failed" regardless of `failed_action`, and `toPlainLanguageMessage()` in `packages/xero/src/write/types.ts` selects copy by `XeroWriteError.code` (`auth_error`, `conflict_error`, etc.), never by which action (submit/approve/decline/withdraw) was attempted. The `failed_action` value is used only to choose which retry button to show, never surfaced in the message text or badge. | Direct contradiction of the v4.1 E-05 design requirement and the CLAUDE.md/PRODUCT.md contract that failures are surfaced with enough context to act on. | E-05, and every screen that renders it (S-04, S-09, S-10, S-25) | `apps/app/components/states/xero-sync-failed-state.tsx`, `packages/xero/src/write/types.ts:72-95`, `packages/availability/src/approvals/approval-service.ts:1424-1453` |
| 15 | **S-06 confirmation modal exists but its literal button copy differs from v4.1.** Actual labels: "Send to Xero" / "Retry Xero sync" (not "Confirm and submit"), "Try again" (matches), "Revert to draft" (not "Save as draft instead"). | v4.1 described intent-level copy that was never implemented verbatim. | S-06 | `apps/app/components/plans/submit-confirmation-modal.tsx` |
| 16 | **Notification type list corrected.** Actual `notification_type` enum: `sync_failed`, `sync_reconciliation_complete`, `feed_token_rotated`, `privacy_conflict`, `missing_alternative_contact`, `leave_submitted`, `leave_approved`, `leave_declined`, `leave_info_requested`, `leave_xero_sync_failed`, `leave_withdrawn`. "Leave peak warning" and "Plan confirmed" from v4.1 do not exist (Unbuilt). "Sync completed/partial/failed" collapses to `sync_failed` plus a distinct `sync_reconciliation_complete`, not three separate states. `leave_info_requested` (backing the real "Request more info" feature on S-10) was missing from v4.1 entirely. | v4.1's notification list did not match the schema. | S-12 | `packages/database/prisma/schema.prisma:202-214` |
| 17 | **Provenance chip icons (leaf/pencil) are not implemented anywhere found in this audit.** Provenance and status are conveyed by colour and text label only (e.g. "Linked"/"Manual" badges, sage/lavender tone fills) on `/people`, `/people/[personId]`, `/calendar`, and `/plans`. This is a WCAG 2.2 AA colour-differentiation gap, not merely a missed decoration. | `DESIGN.md`'s "Provenance Rule" requires colour to always pair with an icon; code does not. | S-04, S-07, S-08, S-09 | `apps/app/components/availability/availability-status.ts`; `apps/app/app/(authenticated)/people/people-client.tsx:342-358`; repo-wide search for a leaf icon component, zero matches |
| 18 | **Cross-surface provenance-token inconsistency.** On `/plans`, the "pending" (submitted, awaiting approval) status uses `accent-container` (lavender, the manual-provenance token) for its badge and row tint. On `/calendar`, the equivalent pending Xero-leave state uses the sage token with a dashed border instead. `DESIGN.md` explicitly prohibits substituting accent purple for a warning/pending state. | Genuine implementation inconsistency, not a documentation-only issue. Flagged as a Conflict since fixing it is a code change outside this pass's scope. | S-04, S-07 | `apps/app/app/(authenticated)/plans/_status.ts` (`planStatusStyles.pending`) vs `apps/app/components/availability/availability-status.ts` (`toneForCalendarEvent`) |
| 19 | **S-10 "Sync now" is mislabelled and inert.** The actual button reads "Sync approval state", not "Sync now", and `page.tsx` hard-codes `reconciliationEnabled={false}`, so the button always renders disabled with tooltip "Reconciliation is not yet enabled" even for admins and owners. | Functional gap; v4.1 described a working control. | S-10 | `apps/app/app/(authenticated)/leave-approvals/leave-approvals-client.tsx:157,236` |
| 20 | **S-10 has no Withdraw action.** v4.1's "resolved decision" that employees/admins can withdraw `submitted`/`approved` leave from the approvals screen does not hold in code: `leave-approvals-client.tsx` and its `_actions.ts` contain no withdraw button, modal, or action. Withdraw exists only on `/plans` (via the plan row actions), not on `/people/[personId]` as v4.1 also claimed. | Direct contradiction of a v4.1 "Resolved decision". Flagged, not silently overwritten, per the task's carry-forward rule. | S-09, S-10 | Grep for "withdraw" across `apps/app/app/(authenticated)/leave-approvals` and `apps/app/components/people`, no functional matches |
| 21 | **S-09 "Edit profile" is a non-functional stub.** Clicking it only sets inline text "Profile editing is not yet available."; no form, no fields, no server action. | Functional gap; v4.1 implied a working edit affordance. | S-09 | `apps/app/components/people/person-profile-content.tsx` |
| 22 | **Leave balance two-state logic is keyed differently than v4.1 described.** The manual editor shows whenever the Organisation's Xero connection is not currently active (`hasActiveXeroConnection === false`), independent of whether the specific person is Xero-linked; the read-only Xero table shows only when both the connection is active and the person is linked. A third state exists (connection active, person not linked) where neither table renders, only explanatory text. v4.1 described a strict binary keyed on connection alone. | Refines the v4.1 "Resolved decision" with the actual conditional logic; carried forward as a clarification, not a contradiction. | S-09 | `apps/app/components/people/person-profile-content.tsx` (`BalancesPanel`) |
| 23 | **Feed page-level role gating differs from v4.1.** `/feeds/new` and `/feeds/[feedId]` carry no `requirePageRole` call at all; access is effectively `org:viewer`+ at the page level, with the actual admin/owner enforcement happening server-side, independently, in both `apps/app/app/(authenticated)/feeds/_actions.ts` (`resolveAdminContext`) and `packages/feeds/src/feed-service.ts` (`isAdminOrOwner` on create/update/pause/resume/archive/restore/rotate/revoke). A viewer can load `/feeds/new`, fill the form, and have the submit action reject with "You do not have permission to manage feeds.", an instance of the "shown and then failing" anti-pattern the interaction review criteria explicitly warn against. Read access to feed detail is scope-based (`canViewFeed`), not role-based: a viewer with no linked `Person` record can view no feed at all; a viewer whose person falls outside a feed's scope gets a generic 404, not a permission-denied message. | Genuine drift from v4.1's page-level access claim; not a security gap (both the action layer and service layer enforce correctly, independently) but a role-clarity and error-identification interaction defect. | S-13, S-14, S-21 | `apps/app/app/(authenticated)/feeds/{new,[feedId]}/page.tsx`, `feeds/_actions.ts:277-323`; `packages/feeds/src/feed-service.ts:191-193,400-402,501-503,811-813`; `packages/feeds/src/scope/feed-scope.ts:271-352`; `packages/feeds/src/tokens/token-service.ts:167-169,264-266` |
| 24 | **`/feeds`'s "How to subscribe" is a single accordion with six client-specific items** (Outlook desktop, Outlook web, Google Calendar, Apple Calendar macOS, Apple Calendar iOS, Generic ICS), not per-client tabs, and there is no distinct "CalDAV" entry. | v4.1 described a tabbed structure that does not exist in code. | S-13 | `apps/app/components/feed/subscribe-instructions.tsx` |
| 25 | **Feed and public-holiday status/type tokens are reused across unrelated semantics.** Feed status uses `statusToneClasses.leave` (sage) for Active and `.holiday` (lavender) for Paused, both provenance tokens repurposed as lifecycle-status colours; public holiday rows use a seven-value `TYPE_CONFIG` (Bank/Custom/Public/School/Observance/Optional/Authorities) with inline-style colours, not the National/State-Regional/Custom taxonomy v4.1 described, and jurisdiction is shown as a text suffix in the Source column, not a badge. | v4.1's badge taxonomy does not match the implemented enum/config. | S-11, S-13 | `apps/app/components/feed/feed-table.tsx:248-261`; `apps/app/app/(authenticated)/public-holidays/public-holidays-list.tsx` (`TYPE_CONFIG`) |
| 26 | **Public holiday suppress/restore/delete controls and "Add custom holiday" are shown to every viewer of `/public-holidays`**, not gated client-side by role as the in-code comment on `page.tsx` claims. Enforcement is server-side only, inside each server action (`requireRole("org:admin")`), so a non-admin sees fully interactive controls and only learns they lack permission via a `toast.error("Permission denied")` after clicking. "Refresh from source" (`importFromSourceAction`) exists server-side but is never called from any component; there is no UI trigger for it anywhere in the app. | Contradicts the in-repo comment and v4.1's access description; a "shown and then failing" defect (Criterion 2) plus a missing feature (Criterion 1). | S-11, S-23 | `apps/app/app/(authenticated)/public-holidays/public-holidays-list.tsx`, `_actions.ts`; grep for `importFromSourceAction`, zero call sites outside tests |
| 27 | **`/notifications` opens two independent SSE connections.** The authenticated layout mounts one `NotificationsProvider` app-wide (feeding the header bell); `/notifications/page.tsx` mounts a second, separate `NotificationsProvider` pointed at the same stream URL. React context resolves to the nearest provider, so the page's own feed binds to the inner connection while the outer (bell) connection stays open concurrently. Neither connection surfaces a user-facing offline/error indicator during the silent exponential-backoff retry loop. | Functional inefficiency and a State coverage gap (Criterion 3), not present in v4.1. | S-12 | `apps/app/app/(authenticated)/layout.tsx`, `apps/app/app/(authenticated)/notifications/page.tsx`, `packages/notifications/components/provider.tsx` |
| 28 | **`/analytics/leave-reports` and `/analytics/out-of-office` implement far fewer charts than v4.1 described, and no date-range or filter UI, despite the backend supporting both.** Leave reports has one chart (leave days by team, bar); the claimed leave-by-type, leave-by-person, peak-absence heatmap, and leave-type donut do not exist. Out-of-office has two charts, both bar-family (a by-type bar mislabelled "donut" internally, and a stacked-bar monthly trend mislabelled "stacked area"); the claimed WFH-frequency, travel-frequency, and most-frequent-travellers list do not exist. Date range is hardcoded server-side to `this_year`; `packages/availability/src/analytics/date-range.ts` defines a full preset set that the UI never exposes. Public-holiday include/exclude and person-type filters are hardcoded, not user-controlled. | Major functional gap against v4.1's Task completion (Criterion 1) expectations. | S-15, S-16 | `apps/app/app/(authenticated)/analytics/leave-reports/page.tsx`, `analytics/out-of-office/page.tsx`, and their chart components |
| 29 | **`/sync`'s "Run sync now" only dispatches two of four job types**; `sync-xero-people` and `sync-xero-leave-records` buttons render permanently disabled with tooltip "This sync job is not registered yet." The claimed "pulse on the actively-running status dot" does not exist: the connection-status dot never pulses, and three unrelated elements do (`animate-pulse` on a header avatar skeleton, a "Running" text pill, and a running-status badge on both `/sync` and `/sync/[runId]`): so the "only sanctioned animation" claim is also false. `/sync/[runId]`'s "Re-run sync" is enabled only for `approval_state_reconciliation` runs, disabled for all other run types with the same tooltip. Failed-record counts are never colour-differentiated even when greater than zero. | Functional gap and inaccurate design-requirement claim. | S-25, S-26 | `apps/app/app/(authenticated)/sync/sync-client.tsx:37-50,282,467`, `sync/[runId]/sync-run-detail-client.tsx:253,317,355-357` |
| 30 | **`/settings/billing`'s admin-vs-owner distinction is computed but has no effect on rendering.** `getBillingSummary` hard-codes `hasUpgradeFlow`/`hasContactFlow` to `true` for both roles, and `BillingClient` takes no role prop; admin and owner see an identical page. The real owner-only gate (`getBillingSummaryForDashboard`, `hasUpgradeFlow: actingRole === "owner"`) lives on the dashboard widget, not this page. The visible Upgrade/Manage-billing gating is driven entirely by a global `isEarlyAccess()` flag, not by viewer role. | Contradicts v4.1's S-22 access description (owner-only full view; admin restricted). | S-22 | `packages/availability/src/settings/billing-service.ts:55-124`, `apps/app/app/(authenticated)/settings/billing/{page.tsx,billing-client.tsx}` |
| 31 | **`/settings/holidays` (S-23) does not itself host suppress, restore, or refresh-from-source actions**, contrary to both its own in-code comment and v4.1's description. It is a thin read-only summary (import/custom counts, next 12 holidays, links to `/public-holidays` and `/public-holidays/holidays/new`). Every actual mutation lives on `/public-holidays` (S-11), which is nominally the "member read" screen. | Contradicts the S-11/S-23 split as documented in both the code comments and v4.1. | S-11, S-23 | `apps/app/app/(authenticated)/settings/holidays/{page.tsx,holidays-client.tsx}` |
| 32 | **`/settings/audit-log` has no actor-type badges, no monospace ID styling outside the raw JSON blocks, and non-functional pagination.** The before/after "diff" is two side-by-side raw `JSON.stringify` `<pre>` blocks for at most the first 10 events with detail pre-fetched, not a field-level diff. `nextCursor` is computed server-side and passed to the client component but never consumed; only the first 50 events are ever reachable. | Contradicts v4.1's design requirements for this screen. | S-24 | `apps/app/app/(authenticated)/settings/audit-log/{page.tsx,audit-log-client.tsx}` |
| 33 | **`/settings/integrations/xero`'s Xero disconnect is two inline buttons in the card body ("Standard disconnect" / "Destructive disconnect"), gated by a shared confirmation `Input` ("type the organisation name"), not a modal dialog**, and the exact copy differs from v4.1: success toasts read "Xero disconnected and Xero-linked data purged." (destructive) and "Xero disconnected. Historical data is now read-only." (soft), not "clear data" phrasing. The shared `ConfirmActionDialog` component exists and is used elsewhere (members removal) but deliberately not here. `pauseTenantSyncAction`/`resumeTenantSyncAction` are fully implemented server-side with audit events but have zero UI entry point. | Refines v4.1's S-20 "resolved decision" with the actual implementation; the two-tier distinction is preserved in spirit (soft vs destructive, unequal visual weight via `variant="outline"` vs `variant="destructive"`) but the mechanism and copy differ, and pause/resume is a dead capability. | S-20 | `apps/app/app/(authenticated)/settings/integrations/xero/xero-client.tsx`, `_actions.ts:162-218` |

---

## Reconciliation summary

Status definitions per the audit brief: `Matches`, `Drifted` (exists but differs from catalogue), `Undocumented` (route exists, no v4.1 entry), `Unbuilt` (catalogued, not implemented), `Retired` (correctly absent).

| ID | Screen | Route | Status | Summary |
|---|---|---|---|---|
| S-01 | Sign in | `/sign-in` | Matches | Clerk-wrapped, Auth Brand Panel present and token-correct. |
| S-31 | Sign up | `/sign-up` | Undocumented → catalogued | v4.1 listed as an uncatalogued route; now fully specified. |
| S-02 | Organisation selection | `/session-tasks/choose-organization` | Drifted | A project-owned route exists (v4.1 claimed none); content is a thin Clerk `TaskChooseOrganization` wrapper. |
| S-03 | Dashboard | `/` | Drifted | No `/dashboard` alias exists. Role differentiation is real and confirmed (five distinct views), deeper than v4.1 described. |
| S-04 | Plans | `/plans` | Drifted | "Team records" tab, not "Team plans"; no `loading.tsx`/`error.tsx`; pending-status token misuse (accent-container). |
| S-05 | New / edit plan | `/plans/new`, `/plans/[planId]/edit` (+ `@modal`) | Drifted | No `requirePageRole` call (implicit viewer-level guard); no live running-balance counter in the form itself. |
| S-06 | Leave submission confirmation | `components/plans/submit-confirmation-modal.tsx` | Drifted | Exists, but button copy differs ("Send to Xero"/"Revert to draft", not "Confirm and submit"/"Save as draft instead"). |
| S-07 | Calendar | `/calendar` | Drifted | No mobile FAB exists anywhere in the calendar surface; no `loading.tsx`/`error.tsx`. |
| S-08 | People | `/people` | Drifted | No provenance icon (leaf/pencil), text-only "Linked"/"Manual" badges; status chip renders at 20px not the 12px chip radius. |
| S-09 | Person profile | `/people/[personId]` (+ `@modal`) | Drifted | "Edit profile" is a non-functional stub; no withdraw action; balance two-state logic keyed on connection health, not per-person link status alone. |
| S-10 | Leave approvals | `/leave-approvals` | Drifted | No withdraw action exists on this screen; "Sync approval state" button is permanently disabled; failure copy never names the failed action. |
| S-11 | Public holidays | `/public-holidays` | Drifted | Admin controls shown to all viewers (server-enforced only); "Refresh from source" has no UI trigger; badge taxonomy is a 7-value type map, not National/State-Regional/Custom. |
| S-12 | Notifications | `/notifications` | Drifted | Type list differs from v4.1 (11 real types, 2 unbuilt, 1 new); opens two concurrent SSE connections when visited directly. |
| S-13 | Feeds | `/feeds` | Drifted | "How to subscribe" is one accordion (6 items), not per-client tabs; status colours reuse provenance tokens. |
| S-14 | Feed detail | `/feeds/[feedId]` (+ `@modal`) | Drifted | No `requirePageRole`; access is scope-based (`canViewFeed`); no "Expiring" token status exists in the schema; token history fetched but never rendered. |
| S-15 | Leave reports | `/analytics/leave-reports` | Drifted | Only 1 of 6 claimed charts exists; no date-range/filter UI despite backend support. |
| S-16 | Out-of-office analytics | `/analytics/out-of-office` | Drifted | Only 2 of 6 claimed charts exist, both bar-family (mislabelled internally as donut/stacked-area); no travellers list. |
| S-17 | Settings: General | `/settings/general` | Drifted | No flag icons; country is a `RadioGroup` with NZ/UK disabled and "(planned)" suffixed; server hard-blocks non-AU regardless of UI. |
| S-18 | Settings: Leave approval | `/settings/leave-approval` | Drifted | No synchronous-Xero-writes info callout exists on this page at all. |
| S-19 | Settings: Integrations | `/settings/integrations` | Drifted | Clerk-Org-level rollup with a stat grid, not a simple per-provider card grid. |
| S-20 | Settings: Xero detail | `/settings/integrations/xero` | Drifted | Disconnect is inline buttons, not a modal; pause/resume sync has no UI entry point. |
| S-21 | Settings: Feeds | `/settings/feeds` | Drifted | Does not create or configure individual feeds; owns two organisation-wide defaults and links out to `/feeds`. |
| S-22 | Settings: Billing | `/settings/billing` | Drifted | Admin/owner see an identical page; the real owner-only gate lives on the dashboard widget instead. |
| S-23 | Settings: Holidays | `/settings/holidays` | Drifted | Read-only summary; owns no suppress/restore/refresh actions despite its own in-code comment claiming otherwise. |
| S-24 | Settings: Audit log | `/settings/audit-log` | Drifted | No actor-type badges; raw JSON diff, not field-level; pagination cursor computed but unused. |
| S-25 | Sync health | `/sync` | Drifted | Only 2 of 4 job types dispatchable; pulse-animation claim is inaccurate (wrong element, not the only animation). |
| S-26 | Sync run detail | `/sync/[runId]` | Drifted | "Re-run sync" enabled only for reconciliation runs; failed count never colour-differentiated. |
| S-27 | Settings: Members | `/settings/members` | Undocumented → catalogued | Clerk Organisation membership management; distinct from `/people`. |
| S-28 | Settings: Xero connect | `/settings/integrations/xero/connect` | Undocumented → catalogued | OAuth callback and tenant/organisation attachment step. |
| S-29 | Settings: Xero person matches | `/settings/integrations/xero/matches` | Undocumented → catalogued | Explicit-review Xero/manual person reconciliation. |
| S-30 | Settings: Getting started | `/settings/getting-started` (+ `/setup` alias) | Undocumented → catalogued | Derived-state onboarding checklist, shared with the dashboard widget. |
| E-01 | Empty state | Component | Matches | `components/states/empty-state.tsx`. |
| E-02 | Data fetch error | Component | Drifted | Default copy differs from v4.1's exact wording; see E-02 entry. |
| E-03 | 404 | `apps/app/app/(authenticated)/not-found.tsx` | Drifted | No wordmark on the page itself (ambient sidebar wordmark only); no global (unauthenticated) 404 exists. |
| E-04 | Permission denied | Component | Matches | Copy matches v4.1 exactly. |
| E-05 | Xero sync failed (inline) | `components/states/xero-sync-failed-state.tsx` | Drifted | Badge is hardcoded "Xero sync failed" regardless of `failed_action`; message text is keyed by Xero error code, never by action. |
|: | `/availability`, `/availability/new`, `/availability/[recordId]/edit` | redirect shims | Undocumented | Pure 302 redirects to `/plans` equivalents; not live screens. Drop all query params except `org`. |
|: | `/leave-balances` | redirect shim | Undocumented | Pure 302 redirect to `/people` or `/people/[personId]`. |
|: | `/settings` | redirect shim | Undocumented | Redirects to `/settings/general`. |
|: | `/setup` | redirect shim | Undocumented | Redirects to `/settings/getting-started` (S-30). |
|: | `/search` | N/A | Retired (never built) | No route exists; global search is the Cmd/Ctrl+K command palette, not a page. Resolves the v4.1 open question. |
|: | `/settings/danger` | N/A | Retired (never built) | No file exists anywhere in the repo. Resolves the v4.1 open question. |
|: | `/support` | N/A | Retired (API-only) | `apps/api` has `POST /api/support/github-issue`; no `apps/app` page exists. See Decisions required. |
|: | `/webhooks` | N/A | Retired (API-only, out of scope) | `apps/api/app/webhooks/{auth,payments}` are inbound Clerk/Stripe receivers, not `packages/webhooks` and not a settings screen. |

---

## Design system foundations

Carried forward from v4.1, corrected against `DESIGN.md` where they diverged (see "What changed from v4.1" #1-#3).

### Colour tokens

Implemented as CSS custom properties on `[data-theme="light"]`/`[data-theme="dark"]`. Never hardcoded hex; never `#000000` for text.

| Role | Token | Notes |
|---|---|---|
| Primary action, CTAs, brand | `primary` (`#336A3B`) | Earns its place; not a background wash. |
| Signature sage surface | `primary-container` (`#6DA671`) | Large primary surfaces, success and growth metrics. |
| Xero-synced provenance | `secondary` / `secondary-container` (`#4B6542` / `#CAE8BC`) | Sage. |
| Manual-entry provenance, informational state | `accent` / `accent-container` (`#5E4F99` / `#E5DFFF`) | Purple. Never co-leads with sage; never used for warning/pending (see Conflicts found #18). |
| Page background | `surface` (`#FCF8FF`) | Cool-tinted, never cream. |
| Cards and panels | `surface-container-*` tiers | Tonal hierarchy, not borders. |
| Primary text | `on-surface` (`#1C1A26`) | |
| Secondary text, metadata | `on-surface-variant` (`#46454E`) | |
| Destructive actions, errors, `xero_sync_failed` | `error` (`#BA1A1A`) / `error-container` (`#FFDAD6`) | Code confirms `error`/`error-container` is what's actually used for sync-failed states, not amber (see below). |
| Chart categorical scale | `--chart-1` … `--chart-5` | Sage family: `#336A3B`, `#6DA671`, `#4B6542`, `#CAE8BC`, `#57624F` (light); lightened equivalents in dark. Now formalised in `DESIGN.md`, no longer "planned". |
| Pending, partial sync, expiring tokens | **No formal token exists.** | Confirmed by repo-wide search: no `--color-warning` or equivalent custom property anywhere in `packages/design-system`. The only amber usage found in the entire codebase is raw Tailwind (`bg-amber-500`, `text-amber-700`) on `/settings/billing` for past-due/paused plan status and usage-bar-at-80%. Every other "needs attention" state in the app (calendar pending leave, plans pending row, `xero_sync_failed` everywhere) uses `error`/`error-container` or, in one confirmed inconsistency, `accent-container` (see Conflicts found #18). This is a required `DESIGN.md` addition, not a fact to invent a hex value for. |

### Border radius (corrected against DESIGN.md and `globals.css`)

| Element | Radius | CSS variable |
|---|---|---|
| Cards, containers, panels | 20px | `rounded-xl` → `--radius-xl` |
| Elevated surfaces (modals, popovers, dropdowns, sheets, command palette, toasts) | 16px | `rounded-2xl` (Tailwind's built-in `1rem` default; this codebase does not redefine `--radius-2xl`, so it coincides with `--radius`/`--radius-lg`) |
| Buttons, inputs | 14px | `rounded-md` → `--radius-md` |
| Chips, badges, small elements | 12px | `rounded-sm` → `--radius-sm` |

No 4px or 8px radii anywhere. **Implementation note, not a token error:** several screens apply `rounded-2xl` (16px) to ordinary persistent card surfaces where `DESIGN.md` specifies 20px (`/plans` route cards, `/people/[personId]` core-fields card, feed table cards): a real visual-QA gap between the token math and the documented card radius, distinct from the modal/popover usage of `rounded-2xl`, which is spec-correct.

### Elevation and frost

Persistent surfaces use tonal layering only: no borders, no shadows, no blur. **Confirmed gap:** `DESIGN.md` requires frosted fill and backdrop blur on every elevated transient surface (modals, popovers, dropdowns, command palette, sticky chrome, toasts, sheets, date pickers), each with an opaque `@supports`/`prefers-reduced-transparency` fallback. Repo-wide search found `backdrop-blur` in exactly one place: the sticky header (`apps/app/app/(authenticated)/components/header.tsx:29`): and even that instance has no opaque fallback or reduced-transparency handling. `Dialog`, `Popover`, `Sheet`, `DropdownMenu`, `Command`, and the toast primitive (`sonner.tsx`) all render with plain opaque or semi-opaque fills (`bg-black/50` overlay, `bg-background` content) and zero blur. See Conflicts found for the recommended consolidated rule.

### Provenance chips

| Provenance | Chip | Meaning |
|---|---|---|
| Synced from Xero | `secondary-container` fill, `on-secondary-container` text, sage leaf icon (per `DESIGN.md`) | Leave pulled from or written to Xero Payroll. |
| Manual entry | `accent-container` fill, `on-accent-container` text, pencil icon (per `DESIGN.md`) | WFH, travel, training, client site, and other non-Xero records. |

**Confirmed gap:** no leaf or pencil icon exists anywhere in `apps/app/components` or `apps/app/app`. Every provenance signal found in this audit (`/people`, `/people/[personId]`, `/calendar`, `/plans`) is colour-only or colour-plus-text-label ("Linked"/"Manual"), never colour-plus-icon. This is a WCAG 2.2 AA finding (Criterion 5), not a cosmetic one, since a subset of provenance surfaces (the People list Xero badge, `StatusChip` on the profile header) carry no text label either, colour alone.

### Typography, spacing, motion, WCAG floor, copy and language, navigation shell

Carried forward from v4.1 unchanged; no `DESIGN.md` divergence found. Navigation shell corrected per "What changed from v4.1" #6-#7: actual sidebar items are Dashboard, My Plans, Calendar, Notifications, People, Calendar Feeds, Leave Reports, Out of Office, Leave Approvals, Public Holidays, Sync Health, Settings; global search is the Cmd/Ctrl+K command palette (`CommandMenu`), not a page.

---

## Screen inventory

| ID | Screen | Route | Guard literal | Access roles | Status | Evidence |
|---|---|---|---|---|---|---|
| S-01 | Sign in | `/sign-in` | Unauthenticated | Unauthenticated | Matches | `apps/app/app/(unauthenticated)/(auth)/sign-in/[[...sign-in]]/page.tsx` |
| S-31 | Sign up | `/sign-up` | Unauthenticated | Unauthenticated | Undocumented → catalogued | `apps/app/app/(unauthenticated)/(auth)/sign-up/[[...sign-up]]/page.tsx` |
| S-02 | Organisation selection | `/session-tasks/choose-organization` | Unauthenticated (post sign-up Clerk task) | Authenticated, pre-organisation | Drifted | `apps/app/app/(unauthenticated)/(auth)/session-tasks/choose-organization/page.tsx` |
| S-03 | Dashboard | `/` | `requirePageRole("org:viewer")` | All | Drifted | `apps/app/app/(authenticated)/page.tsx:24` |
| S-04 | Plans | `/plans` | `requirePageRole("org:viewer")` | All | Drifted | `apps/app/app/(authenticated)/plans/page.tsx:34` |
| S-05 | New / edit plan | `/plans/new`, `/plans/[planId]/edit` | No `requirePageRole`; implicit viewer via `currentUser()` + `requireActiveOrgPageContext` | All | Drifted | `apps/app/app/(authenticated)/plans/record-form-data.ts:24-37` |
| S-06 | Leave submission confirmation | Modal component | Inherits caller's guard | Employee (submit), any actor with a `xero_sync_failed` record (retry) | Drifted | `apps/app/components/plans/submit-confirmation-modal.tsx` |
| S-07 | Calendar | `/calendar` | `requirePageRole("org:viewer")` | All | Drifted | `apps/app/app/(authenticated)/calendar/page.tsx:42` |
| S-08 | People | `/people` | `requirePageRole("org:viewer")` | All (read); Admin/Owner (`Add person` at `requirePageRole("org:admin")`) | Drifted | `apps/app/app/(authenticated)/people/page.tsx:23`; `people/new/page.tsx:18` |
| S-09 | Person profile | `/people/[personId]` (+ `@modal`) | `requirePageRole("org:viewer")` | All (scoped) | Drifted | `apps/app/app/(authenticated)/people/[personId]/page.tsx`; `people/@modal/(.)[personId]/page.tsx` |
| S-10 | Leave approvals | `/leave-approvals` | `requirePageRole("org:manager")` | Manager, Admin, Owner | Drifted | `apps/app/app/(authenticated)/leave-approvals/page.tsx:68` |
| S-11 | Public holidays | `/public-holidays` (+ `holidays/new`) | `requirePageRole("org:viewer")`; mutating actions independently call `requireRole("org:admin")` | All (read); Admin/Owner (mutate, server-enforced only) | Drifted | `apps/app/app/(authenticated)/public-holidays/page.tsx:30`; `_actions.ts` |
| S-12 | Notifications | `/notifications` | `requirePageRole("org:viewer")` | All | Drifted | `apps/app/app/(authenticated)/notifications/page.tsx:48` |
| S-13 | Feeds | `/feeds` (+ `new`) | `requirePageRole("org:viewer")` (list); no page-level guard on `new`, action-layer `resolveAdminContext` enforces admin/owner | All (read); Admin/Owner (manage, action-layer enforced) | Drifted | `apps/app/app/(authenticated)/feeds/page.tsx:33`; `feeds/new/page.tsx`; `feeds/_actions.ts:277-323` |
| S-14 | Feed detail | `/feeds/[feedId]` (+ `@modal`) | No page-level guard; `getFeedDetail`'s `canViewFeed` scope check | Scope-dependent; Admin/Owner see all | Drifted | `apps/app/app/(authenticated)/feeds/[feedId]/page.tsx`; `packages/feeds/src/scope/feed-scope.ts:271-310` |
| S-15 | Leave reports | `/analytics/leave-reports` | `requirePageRole("org:manager")` | Manager, Admin, Owner | Drifted | `apps/app/app/(authenticated)/analytics/leave-reports/page.tsx:41` |
| S-16 | Out-of-office analytics | `/analytics/out-of-office` | `requirePageRole("org:manager")` | Manager, Admin, Owner | Drifted | `apps/app/app/(authenticated)/analytics/out-of-office/page.tsx:38` |
| S-17 | Settings: General | `/settings/general` | `requirePageRole("org:admin")` (+ layout gate) | Admin, Owner | Drifted | `apps/app/app/(authenticated)/settings/general/page.tsx:20` |
| S-18 | Settings: Leave approval | `/settings/leave-approval` | `requirePageRole("org:admin")` (+ layout gate) | Admin, Owner | Drifted | `apps/app/app/(authenticated)/settings/leave-approval/page.tsx:17` |
| S-19 | Settings: Integrations | `/settings/integrations` | `requirePageRole("org:admin")` (+ layout gate) | Admin, Owner | Drifted | `apps/app/app/(authenticated)/settings/integrations/page.tsx:14` |
| S-20 | Settings: Xero detail | `/settings/integrations/xero` | `requirePageRole("org:admin")` (+ layout gate) | Admin, Owner | Drifted | `apps/app/app/(authenticated)/settings/integrations/xero/page.tsx:14` |
| S-21 | Settings: Feeds | `/settings/feeds` | `requirePageRole("org:admin")` (+ layout gate) | Admin, Owner | Drifted | `apps/app/app/(authenticated)/settings/feeds/page.tsx:24` |
| S-22 | Settings: Billing | `/settings/billing` | `requirePageRole("org:admin")` (+ layout gate); `requireRole("org:owner")` computed but unused by rendering | Admin, Owner (rendered identically) | Drifted | `apps/app/app/(authenticated)/settings/billing/page.tsx:28,36-37` |
| S-23 | Settings: Holidays | `/settings/holidays` | `requirePageRole("org:admin")` (+ layout gate) | Admin, Owner | Drifted | `apps/app/app/(authenticated)/settings/holidays/page.tsx:22` |
| S-24 | Settings: Audit log | `/settings/audit-log` | `requirePageRole("org:admin")` (+ layout gate) | Admin, Owner | Drifted | `apps/app/app/(authenticated)/settings/audit-log/page.tsx:22` |
| S-25 | Sync health | `/sync` | `requirePageRole("org:admin")` | Admin, Owner | Drifted | `apps/app/app/(authenticated)/sync/page.tsx:33` |
| S-26 | Sync run detail | `/sync/[runId]` | `requirePageRole("org:admin")` | Admin, Owner | Drifted | `apps/app/app/(authenticated)/sync/[runId]/page.tsx:35` |
| S-27 | Settings: Members | `/settings/members` | No page-level `requirePageRole`; layout-only gate (`orgRole === "org:owner" \|\| "org:admin"`, raw string check) | Admin, Owner | Undocumented → catalogued | `apps/app/app/(authenticated)/settings/{layout.tsx:12-22,members/page.tsx}` |
| S-28 | Settings: Xero connect | `/settings/integrations/xero/connect` | `requirePageRole("org:admin")` (+ layout gate) | Admin, Owner | Undocumented → catalogued | `apps/app/app/(authenticated)/settings/integrations/xero/connect/page.tsx:21` |
| S-29 | Settings: Xero person matches | `/settings/integrations/xero/matches` | `requirePageRole("org:admin")` (+ layout gate) | Admin, Owner | Undocumented → catalogued | `apps/app/app/(authenticated)/settings/integrations/xero/matches/page.tsx:21` |
| S-30 | Settings: Getting started | `/settings/getting-started` (+ `/setup` redirect) | `requirePageRole("org:admin")` (+ layout gate) | Admin, Owner | Undocumented → catalogued | `apps/app/app/(authenticated)/settings/getting-started/page.tsx:21`; `setup/page.tsx` |
| E-01 | Empty state | Component | N/A | All | Matches | `apps/app/components/states/empty-state.tsx` |
| E-02 | Data fetch error | Component | N/A | All | Drifted | `apps/app/components/states/fetch-error-state.tsx` |
| E-03 | 404 | `apps/app/app/(authenticated)/not-found.tsx` | N/A | All | Drifted | `apps/app/app/(authenticated)/not-found.tsx` |
| E-04 | Permission denied | Component | N/A | All | Matches | `apps/app/components/states/permission-denied-state.tsx` |
| E-05 | Xero sync failed (inline) | Component | N/A | All | Drifted | `apps/app/components/states/xero-sync-failed-state.tsx` |

---

## Authentication

### S-01: Sign in

**Route:** `/sign-in` (catch-all `[[...sign-in]]`), no modal or intercept behaviour.
**Guard:** Unauthenticated. Access: unauthenticated.
**Evidence:** `apps/app/app/(unauthenticated)/(auth)/sign-in/[[...sign-in]]/page.tsx`; `packages/auth/components/sign-in.tsx`; `packages/auth/components/{auth-form-frame,embedded-auth-appearance}.tsx`; `apps/app/app/(unauthenticated)/(auth)/layout.tsx`; `apps/app/app/styles.css:40-88`.

**Purpose:** Authenticate the user via Clerk.

**User interactions, as-built:** A thin wrapper around Clerk's `SignIn` component (`ClerkSignIn`), itself wrapped in `AuthFormFrame` (title "Welcome back", description "Sign in to manage leave and availability for your organisation."). Clerk owns the actual input fields, validation, and SSO flow; `embeddedAuthAppearance` hides Clerk's own header (`elements.header: "hidden"`) since `AuthFormFrame` supplies it instead. Success redirects into the app (Clerk-managed).

**Role variations:** None; unauthenticated only.

**Data displayed:** None beyond the Clerk sign-in form itself.

**States:** Loading/error/validation states are Clerk-managed within its own component; no custom handling found.

**Design requirements:** Two-column layout (`apps/app/app/(unauthenticated)/(auth)/layout.tsx`): `BrandPanel` (`auth-panel` class) on the left, hidden below `lg`; form pane on the right with a mobile-only `ModeToggle` and `MobileBrand`. The Auth Brand Panel uses the dedicated `--auth-*` tokens from `apps/app/app/styles.css` (`--auth-panel` gradient `#14301b → #21482a → #336a3b` light, `--auth-glow` radial overlay, `--auth-ink` text tokens, `--auth-in`/`--auth-wfh`/`--auth-off` matching the sage/lavender/ghost availability-dot motif) exactly as `DESIGN.md`'s "Auth Brand Panel" section specifies. `.auth-rise` entrance animation respects `prefers-reduced-motion`.

**`[v5 proposal]` interaction improvements:** None; this screen matches its intent closely and no criterion surfaced a defect.

---

### S-31: Sign up

**[proposed catalogue addition is not required: this route already exists and is fully catalogued here; it was only "uncatalogued" in v4.1 pending confirmation.]**

**Route:** `/sign-up` (catch-all `[[...sign-up]]`), no modal or intercept behaviour.
**Guard:** Unauthenticated. Access: unauthenticated.
**Evidence:** `apps/app/app/(unauthenticated)/(auth)/sign-up/[[...sign-up]]/page.tsx`; `packages/auth/components/sign-up.tsx`.

**Purpose:** Create a new Clerk Organisation, or accept an existing invitation.

**User interactions, as-built:** Same pattern as S-01: `ClerkSignUp` wrapped in `AuthFormFrame` (title "Create your organisation", description "Start a new Team Calendar organisation, or accept an invitation from your team email."), same `embeddedAuthAppearance`, same `(auth)` layout and Brand Panel. On completion, Clerk routes the user into the S-02 organisation-choice task if applicable.

**Role variations:** None; unauthenticated only.

**Data displayed:** None beyond the Clerk sign-up form.

**States:** Clerk-managed.

**Design requirements:** Identical to S-01 (same layout, same Brand Panel).

**`[v5 proposal]` interaction improvements:** None; matches intent.

---

### S-02: Organisation selection

**Route:** `/session-tasks/choose-organization`, reached via Clerk's session-tasks redirect flow. Not a modal or intercept; a full page within the `(auth)` layout.
**Guard:** Unauthenticated route group; gated by Clerk session-task state (user is authenticated but has an unresolved "choose organisation" task). Access: authenticated, pre-organisation.
**Evidence:** `apps/app/app/(unauthenticated)/(auth)/session-tasks/choose-organization/page.tsx`; `packages/auth/components/choose-organization-task.tsx`.

**Purpose:** Organisation selection and creation for users who are members of multiple Clerk Organisations, or who have a pending invitation, before entering the app. Personal accounts are disabled, so every user belongs to at least one Organisation eventually. Switching organisations after entry is handled separately by `<OrganizationSwitcher />` (not found in the header in this audit; see Decisions required #1).

**User interactions, as-built:** Renders Clerk's own `TaskChooseOrganization` primitive directly, with `redirectUrlComplete="/"`. Team Calendar supplies no custom list rendering, form fields, or interaction logic; the component is presentationally inherited from the surrounding `(auth)` layout (Brand Panel visible), but functionally 100% Clerk-hosted.

**Role variations:** None; pre-organisation state has no role yet.

**Data displayed:** Clerk-managed organisation list/invitation state.

**States:** Clerk-managed.

**Design requirements:** Inherits the Brand Panel/`AuthFormFrame` shell from the `(auth)` layout, same as S-01/S-31. No separate design spec required beyond Clerk's `appearance` API mapping (already covered by `embeddedAuthAppearance`, though this specific component was not confirmed to receive that prop: see Decisions required #2).

**`[v5 proposal]` interaction improvements:** None proposed; correction is documentary only (see "What changed from v4.1" #4).

---

## Core screens

### S-03: Dashboard

**Route:** `/` (root of the authenticated app). No `/dashboard` alias exists in code; the `components/dashboard/` directory is a shared component library, not a second route. No modal behaviour.
**Guard:** `requirePageRole("org:viewer")`. Access: all roles.
**Evidence:** `apps/app/app/(authenticated)/page.tsx:24`; `apps/app/app/(authenticated)/dashboard-body.tsx`; `packages/availability/src/dashboard/dashboard-service.ts`; `apps/app/components/dashboard/{admin-view,manager-view,employee-view,viewer-view,admin-empty-view,dashboard-skeleton}.tsx`.
**Country context:** Public holiday callouts filtered by the acting person's or team's `location_id`/`region_code`, sourced through the same `public_holidays` queries used by S-11.

**Purpose:** Role-appropriate at-a-glance summary and entry point.

**User interactions, as-built:** Each card exposes an optional "Review" CTA linking deeper into the app (e.g. the org-wide Xero-sync-failed card links to `/people?xeroSyncFailedOnly=true`). `QuickActionsCard` hard-codes three shortcuts: "Create a new plan" (`/plans/new`), "View my calendar" (`/calendar?scopeType=my_self`), "Open notifications" (`/notifications`). `DashboardLiveUpdates` (client, always mounted) subscribes to SSE and shows a toast with a "Refresh" action on relevant `notification.created` or `sync.run_status_changed` events; it does not auto-refresh.

**Role variations:** Confirmed genuinely role-aware, not a single shared view. `resolveDashboardRole()` returns one of `owner | admin | manager | employee | viewer`, each rendering a distinct card set inside the shared `DashboardScaffold`:
- *Owner/Admin:* `SyncHealthCard`, `OrgPendingApprovalsCard`, `ActionItemsCard`, `TodayStatusCard` (lead); `OrgXeroSyncFailedCard`, `ActiveFeedsCard`, `UsageVsLimitsCard`, `RecentAuditEventsCard`, `UpcomingRecordsCard`, `NextPublicHolidayCard`, `QuickActionsCard`, `BalancesCard` (rail).
- *Manager:* `CoverageTimeline`, `TeamTodayCard`, `ApprovalQueueCard`, `ActionItemsCard` (lead); `TodayStatusCard`, `UpcomingPeaksCard`, `TeamThisWeekCard`, `UpcomingRecordsCard`, `NextPublicHolidayCard`, `QuickActionsCard`, `BalancesCard`, `TeamXeroSyncFailedCard` (rail).
- *Employee:* `ActionItemsCard`, `TodayStatusCard`, `UpcomingRecordsCard` (lead); `QuickActionsCard`, `NextPublicHolidayCard`, `BalancesCard` (rail).
- *Viewer, or any role with no linked `Person` record:* a bare stub with only the fixed subtitle "Your account does not have a person profile in this organisation yet. Contact the account owner if this looks wrong." Owner/admin with no person record instead see `AdminEmptyView` (onboarding CTAs for People/Calendar/Feeds).

**Data displayed:** Per-card data as listed above; each card independently typed as `{status: "error", message} | {status: "ready", data}`, so one card's fetch failure does not fail the page.

**States:** Loading: `apps/app/app/(authenticated)/loading.tsx` (shared route-level skeleton) plus a dashboard-specific `DashboardSkeleton` matching the asymmetric grid shape, streamed via `Suspense`. Error: `apps/app/app/(authenticated)/error.tsx`, branching to `PermissionDeniedState` on `PermissionDeniedError`, else `FetchErrorState`. Empty: `AdminEmptyView` (admin/owner, no person) or bare `ViewerView` (other roles, no person). `xero_sync_failed`: `OrgXeroSyncFailedCard`/`TeamXeroSyncFailedCard`, each with its own empty state ("No failed records") and error fallback.

**Design requirements:** `DashboardGrid` collapses to a single column below `1024px` (`lg` breakpoint), asymmetric `lg` split otherwise. `DashboardCardShell` composes `Card`/`CardAction`/`CardContent`/`CardHeader`/`CardTitle` and applies `rounded-2xl border-0 shadow-sm`: the `shadow-sm` on a persistent (non-elevated) surface is a minor deviation from the Hairline Ceiling Rule's "at most `shadow-sm`" allowance, so it is technically compliant, not a violation.

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Give the `viewer`-role, no-person-record dashboard the same onboarding-style guidance `AdminEmptyView` gives admins, rather than a single sentence with no next step. *Criterion 1 (Task completion): the primary next action is not visible.*
- **[v5 proposal]** `DashboardLiveUpdates`'s toast-only refresh prompt should also update the unread/count badges it references without requiring a manual click, or at minimum should announce the update via an `aria-live` region for screen reader users who may not see the toast. *Criterion 9 (WCAG 2.2 AA): status announcement for asynchronous results.*

---

### S-04: Plans

**Route:** `/plans`. No modal behaviour on the list itself (create/edit open as modals, see S-05).
**Guard:** `requirePageRole("org:viewer")`. Access: all roles.
**Evidence:** `apps/app/app/(authenticated)/plans/page.tsx:34`; `plans-client.tsx`; `_status.ts`.
**Country context:** Leave type names adapt to `country_code` via the leave-type mapping in `packages/xero`.

**Purpose:** Surface for employees to record and manage `AvailabilityRecord`s (leave and manual availability) before or after synchronous Xero write-back.

**User interactions, as-built:** Two tabs, "My records" (all roles) and "Team records" (manager+ only, both hidden client-side and hard-redirected server-side for non-managers). Filters: Category (all/Xero leave/local-only), Status (all/draft/submitted/approved/declined/withdrawn/`xero_sync_failed`), From/To date, all in a plain GET form. "New record" header CTA and a matching empty-state CTA both link to `/plans/new`. `xero_sync_failed` rows render `XeroSyncFailedState` inline in the Actions cell with Retry/"Revert to draft" buttons.

**Role variations:** Employee sees own records only ("My records"); manager+ additionally sees "Team records". No other role-conditional rendering found.

**Data displayed:** Per row: leave-type/record-type chip, date range, duration, status badge, remaining-balance text (plain table cell, not a styled chip: a naming mismatch against "chip" language in prior documentation), created date.

**States:** Loading: no `loading.tsx` in this route directory; falls through to the shared `(authenticated)/loading.tsx`. Error: manual inline `FetchErrorState` branch in `page.tsx` (not a route-level `error.tsx`), copy: "We could not load leave and availability records. Reload the page, then check the Xero connection if leave records still look out of date." Empty: title "No plans yet" (default filters) or "No matching plans" (filtered); description varies accordingly; neither uses "Oops"/"Nothing here yet"/"Looks like". `xero_sync_failed`: per-row `XeroSyncFailedState`, see E-05.

**Design requirements:** Draft rows: `bg-muted text-muted-foreground` badge, hover-only row tint (no persistent tint). `xero_sync_failed` rows: persistent `bg-error-container/45` row tint (correct tonal-layering usage on a persistent surface). **Pending (submitted) rows use `accent-container`** (lavender, the manual-provenance token) for both badge and row tint: see Conflicts found #18, this is a token-semantics violation, not a documentation error.

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Move the "pending" status off `accent-container` onto a token that does not double as manual-record provenance (ideally the still-missing warning/amber token; failing that, the sage-plus-dashed-border treatment `/calendar` already uses for the identical state). *Criterion 5 (Provenance legibility): colour must never double as two different meanings on the same product.*
- **[v5 proposal]** Add a route-level `loading.tsx`/`error.tsx` for `/plans` instead of the manual inline branch, so a genuine unhandled exception (not just a service `Result` failure) gets the same `FetchErrorState` treatment other routes get automatically. *Criterion 3 (State coverage).*
- **[v5 proposal]** Render the remaining-balance figure as a proper chip/badge rather than plain table text, consistent with how balance is presented in the S-06 modal. *Criterion 1 (Task completion): visual hierarchy for a number the user needs to act on.*

---

### S-05: New / edit plan

**Route:** `/plans/new` (full page); `/plans/[planId]/edit` (full page); both also have `@modal` intercepting-route siblings (`(.)new`, `(.)[planId]/edit`) that render the identical form inside `InterceptingModalShell` when navigated to from within the app. `@modal/default.tsx` renders `null` so a hard refresh/direct link falls back to the full page.
**Guard:** No `requirePageRole` call. Implicit `org:viewer`+ via `currentUser()` (redirects to `/` if absent) and `requireActiveOrgPageContext`. Access: all roles (employees create/edit own; admin/owner/manager can select another person via `canSelectPerson`).
**Evidence:** `apps/app/app/(authenticated)/plans/{new,[planId]/edit}/page.tsx`; `plans/record-form-data.ts:24-155`; `plans/record-form.tsx`; `plans/@modal/(.)new/page.tsx`, `@modal/(.)[planId]/edit/page.tsx`, `@modal/default.tsx`; `apps/app/components/modals/intercepting-modal-shell.tsx`.

**Purpose:** Create or edit a draft `AvailabilityRecord`, and optionally trigger the synchronous Xero submission via S-06.

**User interactions, as-built:** Fields, in order: intent toggle (Leave/Availability), Person (select, admin/owner/manager only; read-only label otherwise), Leave/Availability type (select, options depend on intent), Starts/Ends date, "All day" checkbox, Start/End time (shown only when not all-day), Contactability, Privacy (Named/Masked/Private), internal Notes. A static current-Xero-balance line is shown when relevant ("Current Xero balance: N days before this request." or "Balance has not synced yet."); this is **not** a live running remaining-balance counter: that calculation only appears inside the S-06 confirmation modal after Save. Buttons: for Xero-connected leave, "Save draft"/"Save changes" (secondary) plus "Save and submit" (primary, opens S-06 on success); for local-only availability or when Xero is disconnected, a single "Save"/"Save changes" button with no submit path.

**Role variations:** Admin/owner/manager can select which person the record is for; other roles create/edit only their own.

**Data displayed:** Prefilled from `?personId=`/`?startsAt=` query params on create, or the existing record on edit.

**States:** Loading: none route-specific. Empty: N/A (a form). Error: `notFound()` if the record doesn't resolve or the requester lacks visibility. `xero_sync_failed`/retry: handled inside S-06, not this screen directly.

**Design requirements:** Modal variant uses `InterceptingModalShell`, `rounded-2xl` (16px, spec-correct for an elevated surface). Escape, background click, and the dialog's close button all resolve through Radix's default `onOpenChange` → `router.back()`, so browser back correctly unwinds the intercepted route. The underlying `Dialog` primitive provides focus trapping and Escape-to-close by default (Radix), but ships with **no backdrop blur** (see Design system foundations, Elevation and frost).

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Add a genuine live "N days remaining if this request is approved" counter to the form itself, recalculated as dates/leave type change, rather than only surfacing it after Save inside the confirmation modal. *Criterion 1 (Task completion): the user commits to Save before seeing the number that would let them decide against submitting.*
- **[v5 proposal]** Preserve all incoming query parameters (not just `org`) when the legacy `/availability/new` and `/availability/[recordId]/edit` redirects fire, so `personId`/`startsAt` deep links keep working. *Criterion 7 (Navigation and wayfinding): deep-link correctness.*

---

### S-06: Leave submission confirmation

**Component:** Modal (`SubmitConfirmationModal`), triggered from `/plans/new`/`/plans/[planId]/edit` ("Save and submit") and from `/plans` (row-level "Retry" on a `xero_sync_failed` record).
**Guard:** Inherits the caller's guard (`org:viewer`+); no independent gate.
**Evidence:** `apps/app/components/plans/submit-confirmation-modal.tsx`; `apps/app/app/(authenticated)/plans/record-form.tsx:423-443`; `plans-client.tsx:431-451`.

**Purpose:** Final confirmation before the synchronous Xero write. Presents a summary and a chance to cancel before the API call, and (on failure) an inline retry/revert path.

**User interactions, as-built:** Title "Send leave to Xero?" (submit mode) / "Retry Xero submission?" (retry mode). Summary block: leave type, dates, duration, balance impact. Buttons: "Cancel" (secondary) and "Send to Xero"/"Retry Xero sync" (primary, spinner while pending). **Both** buttons are `disabled={isPending}`, so double-submission is genuinely prevented. On failure, the modal stays open, shows `XeroSyncFailedState` inline with the plain-language message plus "Try again" and "Revert to draft" buttons. While `isPending`, the modal's own Escape/background-click/close-button are suppressed (`handleOpenChange` checks `!isPending`), so an in-flight Xero write cannot be dismissed accidentally.

**Role variations:** None; behaviour is identical for every role able to reach it.

**Data displayed:** Leave type, date range, duration, "Remaining after this request" balance figure.

**States:** Pending (spinner, disabled buttons), success (modal closes), failure (`XeroSyncFailedState` inline, retry/revert).

**Design requirements:** `rounded-2xl` (16px, correct for an elevated surface). No backdrop blur (see Elevation and frost gap).

**`[v5 proposal]` interaction improvements:** None; this screen's underlying flow (confirm, block dismissal while pending, offer retry and revert on failure) already satisfies the review criteria. Its button copy differs from v4.1's wording, corrected as a documentation change under "What changed from v4.1" #15, not a UI change.

---

### S-07: Calendar

**Route:** `/calendar`. No modal behaviour; clicking a record opens a popover, clicking a blank date/slot navigates to `/plans/new` (which then opens as a modal per S-05).
**Guard:** `requirePageRole("org:viewer")`. Access: all roles (scoped).
**Evidence:** `apps/app/app/(authenticated)/calendar/page.tsx:42`; `calendar/_schemas.ts`; `apps/app/components/calendar/{calendar-toolbar,calendar-event-chip,calendar-event-popover,calendar-day-view,calendar-week-view,calendar-month-view,calendar-timeline}.tsx`.
**Country context:** Public holidays filtered to each location's configured set (`public_holidays`).

**Purpose:** Visual calendar of availability, leave, and public holidays across individuals and teams.

**User interactions, as-built:** View select: Day/Week/Month (real, all three implemented). A second surface toggle switches between the grid views and a `CalendarTimeline` "Coverage" view. Previous/Next/Today navigation plus a computed period label. Scope select: Myself/My team/All teams/specific team/specific person, default computed per role (admin/owner → all teams, manager → my team, others → myself). Filter sheet (slide-out, not inline): record category (provenance: all/Xero leave/local-only), approval status (including `xero_sync_failed`), person type, location. Clicking a record opens a popover (name, type, status, date range, contactability, notes, inline error block if `xero_sync_failed`, "View plan" link if editable else a static "View-only access" pill). Clicking a blank date/slot navigates to `/plans/new` with the date/person prefilled.

**Role variations:** Scope selector default differs by role (above); no other content differs by role beyond what the scope/visibility query naturally returns.

**Data displayed:** Record chips coloured by provenance/status tone (sage = Xero leave, lavender = manual/holiday, error-red = `xero_sync_failed`); public holiday rows/pills in the lavender `accent-container` tone.

**States:** No route-level `loading.tsx`/`error.tsx`; a manual inline `FetchErrorState` branch handles `getCalendarRange` failures (excluding the expected `invalid_scope` case). No dedicated empty-state component; each view (day/week/month) renders its own zero-events case inline via the dashed "add" launcher.

**Design requirements:** Chips: `rounded-xl px-2 py-1 text-xs ring-1`, tone from `statusToneClasses` (sage `bg-secondary` for Xero leave, lavender `bg-accent-container` for manual/holiday, error `bg-error-container` for `xero_sync_failed`), `dashed` treatment (85% opacity, dashed border) for submitted/pending, 65% opacity for drafts. Public holiday rows use the same lavender `accent-container` token, not a distinct holiday colour. Popovers are elevated surfaces per `DESIGN.md` (see the frost gap noted in Design system foundations: no blur confirmed in this component either).

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Add a persistent, thumb-reachable "Add" affordance for mobile. No floating action button exists anywhere in the calendar surface (confirmed by exhaustive search); the only "add" entry points are the toolbar button (which wraps off-screen on narrow viewports) and per-cell dashed launchers that are easy to miss. *Criterion 10 (Mobile): thumb reach for primary actions.*
- **[v5 proposal]** Pair the calendar chip's provenance colour with the leaf/pencil icon `DESIGN.md` specifies; currently colour is the sole differentiator between Xero-synced and manual events on this screen (public holidays share the manual lavender tone with no icon distinguishing the two). *Criterion 5 (Provenance legibility) / Criterion 9 (WCAG 2.2 AA): colour must never be the sole differentiator.*

---

### S-08: People

**Route:** `/people`. No modal on the list itself; row click opens S-09's modal.
**Guard:** `requirePageRole("org:viewer")` (list); `requirePageRole("org:admin")` on `/people/new`. Access: all roles (read); Admin/Owner (`Add person`, `includeArchived` filter).
**Evidence:** `apps/app/app/(authenticated)/people/page.tsx:23`; `people-client.tsx`; `people/new/page.tsx:18`; `people/new/_actions.ts:40-43` (server-side re-check).

**Purpose:** Browse all people with current availability status.

**User interactions, as-built:** Debounced (250ms) name/email search. Filters: Team, Location, Person type, Status (13-value list derived from record types), Xero link (Any/Linked/Manual), "Xero sync failed only" checkbox, "Include archived" checkbox (rendered only for admin/owner; server-side forces `false` for any other role even via crafted query string). "Add person" CTA (admin/owner only, in header and empty state).

**Role variations:** Admin/owner see "Include archived" and "Add person"; other roles do not (hidden, not disabled: correct per Criterion 2's "hidden is preferred for unavailable actions"). `createManualPersonAction` independently re-checks the role server-side.

**Data displayed:** Per row: avatar/initials, name, job title/person type, "Archived" badge if applicable, team, location, `StatusChip` (current availability), Xero column ("Linked"/"Manual" text badge, no icon, plus an `AlertTriangleIcon` count pill when `xeroSyncFailedCount > 0`).

**States:** No route-specific `loading.tsx`; falls through to the shared skeleton. Error: `FetchErrorState`, `entityName="people"`. Empty: "No people yet" (zero people at all, description mentions connecting Xero or adding manually) / "No people found" (filtered to zero).

**Design requirements:** `StatusChip` renders `rounded-xl`, which computes to **20px** in this codebase's token scheme: the card radius, not the 12px chip radius `DESIGN.md` specifies for this element type. No leaf/pencil provenance icon on the Xero column; colour/text-only.

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Correct the `StatusChip` radius to the 12px chip token (`rounded-sm` in this scheme) so it reads as a chip rather than a small card. *Criterion 5 / DESIGN.md Corner Rule.*
- **[v5 proposal]** Add the leaf/pencil provenance icon to the Xero "Linked"/"Manual" badge. *Criterion 5 (Provenance legibility) / Criterion 9 (WCAG 2.2 AA).*

---

### S-09: Person profile

**Route:** `/people/[personId]` (full page) and `/people/@modal/(.)[personId]` (intercepting modal, `size="wide"`, opened when navigated to from within the app; falls back to the full page on direct load via `@modal/default.tsx`).
**Guard:** `requirePageRole("org:viewer")` on both the full page and the modal (duplicated, unexported `loadProfileViewModel` logic in each file). Access: all roles (scoped by visibility rules inside the service layer).
**Evidence:** `apps/app/app/(authenticated)/people/[personId]/page.tsx`; `people/@modal/(.)[personId]/page.tsx`; `people/@modal/default.tsx`; `apps/app/components/people/{person-profile-content,alternative-contacts-panel}.tsx`.

**Purpose:** Full detail for one person: core fields, current status, leave balances, upcoming/history records, alternative contacts.

**User interactions, as-built:** Header (avatar, name, job title, `StatusChip`, "Archived" badge, `XeroSyncFailedState` block if applicable, "Refresh balances" and "Edit profile" buttons) plus a "Current status" aside. Below, four tabs: Upcoming, History, Balances, Alternative contacts (client-side `useState`, with the initial tab settable via `?tab=`). **"Edit profile" is a non-functional stub**: its click handler only sets inline text "Profile editing is not yet available."; there is no edit form. Alternative contacts support full add/edit/delete/reorder (drag-and-drop plus keyboard-accessible up/down buttons, `aria-live` move announcements), gated to admin/owner, the profile subject, or their manager.

**Role variations:** "Refresh balances" gated by role (admin/owner) **and** Xero link **and** active connection, in that priority order, each with its own disabled-button tooltip reason. Alternative-contact management gated to admin/owner, self, or manager. **No withdraw action exists on this screen** for any role, despite v4.1's resolved decision claiming otherwise (see "What changed from v4.1" #20). No archive-person action exists in the UI for any role.

**Data displayed:** Core fields (Email, Person type, Start date, Location, Team, Manager, Status note: Email and Start date show a `LockIcon` when Xero-owned, no other visual dimming); leave balances (see below); alternative contacts; upcoming records (next 30 days) and full paginated history.

**States:** Balances panel is genuinely three-state, keyed on connection health first, person-link second:
- Xero connected **and** person linked → read-only table, "Last refreshed: {timestamp}" or "Never refreshed".
- Xero **not** actively connected (regardless of this person's link status) → the same table gains an "Edit" column (admin/owner only) with an inline manual-balance form; non-admins see the table with a caption "Only admins and owners can edit manual balances."
- Xero connected **but** this person not linked → neither table renders; plain text "Balances available only when Xero is connected and this person is linked."

No route-specific `loading.tsx` for the `@modal` segment. Error: `notFound()` on an unresolvable/invisible record.

**Design requirements:** Modal `size="wide"` → `sm:max-w-[720px]`, `rounded-2xl` (16px, spec-correct). Ordinary page cards inside the profile (Core fields, aside) also use `rounded-2xl` (16px), where `DESIGN.md` specifies 20px for persistent card surfaces: no radius differentiation between the modal shell and the cards it contains.

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Either implement "Edit profile" or hide/relabel it until it is built ("Coming soon", disabled with a reason). *Criterion 2 (Role clarity): a clickable primary-looking button that does nothing but print a sentence is exactly the "shown and then failing" pattern this criterion warns against.*

**Note (not a `[v5 proposal]`, an open product question):** the withdraw-location contradiction between this screen, S-10, and `/plans` is not resolved here since fixing it requires a product decision this catalogue cannot make unilaterally. See Conflicts found #4 and Decisions required #3.

**Note (design-token correction, not an interaction proposal):** the profile's Core-fields and aside cards use `rounded-2xl` (16px); `DESIGN.md` specifies 20px for persistent card surfaces. See Design system foundations.

---

### S-10: Leave approvals

**Route:** `/leave-approvals`. No modal on the list; Approve/Decline/Request-info open as modals; row expansion is inline, not a route change.
**Guard:** `requirePageRole("org:manager")`, wrapped in a local `try/catch` rendering `PermissionDeniedState` inline (a different pattern from `/people`'s uncaught-and-bubbled approach: see Conflicts found #5). Access: Manager (own team), Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/leave-approvals/page.tsx:68`; `leave-approvals-client.tsx`; `apps/app/components/approvals/{approve-confirmation-modal,decline-modal,request-info-modal}.tsx`; `packages/availability/src/approvals/approval-service.ts`; `packages/xero/src/write/types.ts:72-95`.
**Country context:** Leave type labels adapt to `country_code`.

**Purpose:** In-app approval workflow. Managers review, approve, decline, or request more information on submitted leave; all Xero writes are synchronous.

**User interactions, as-built:** Status filter (single-select, includes `xero_sync_failed`) plus an "Include failed" checkbox; date/person/record-type filters exist in the schema and service but have no UI control. Row expansion (click, or `Enter`/Space with `tabIndex`) reveals a `DetailPanel`; row-scoped keyboard shortcuts `A` (approve) and `D` (decline) are documented via a `Kbd` legend. Approve/Decline open confirmation modals (below). **Request more info is a real, implemented feature**, not catalogue-only: sends an in-app `leave_info_requested` notification, does not touch Xero, valid only on `submitted` records. **A "Sync approval state" button exists but is hard-coded disabled** (`reconciliationEnabled={false}` in `page.tsx`) regardless of role, tooltip "Reconciliation is not yet enabled".

**Role variations:** Manager sees own team; admin/owner see all, and can act on behalf of any manager. `canDispatchReconciliation` (the "Sync approval state" button, currently inert for everyone) is computed as `role === "admin"` covering both `org:admin` and `org:owner`.

**Data displayed:** Per row: employee name/avatar, leave type, date range, duration, `StatusBadge` (all statuses render as `variant="secondary"` except `xero_sync_failed`, which alone gets `variant="destructive"`: Pending/Approved/Declined/Withdrawn are visually indistinguishable from each other beyond text), submitted-at. Expanded: employee notes, balance impact ("N days remaining after approval": the same post-approval figure everywhere it appears, no before/after breakdown), submission history.

**States:** Approve modal: title "Approve this leave?", summary block plus balance impact, "This will send approval to Xero Payroll and notify the employee.", buttons "Cancel"/"Confirm and approve" (both `disabled={isPending}`, confirmed double-submission prevention). Decline modal: title "Decline this leave?", reason `Textarea` (3-1000 chars, **enforced** client-side via a disabled submit button and re-validated server-side, fails closed if the org setting can't be read), "Confirm decline" (destructive). **Failure copy never names the failed action**: `XeroSyncFailedState`'s message is `toPlainLanguageMessage()`, keyed purely by `XeroWriteError.code` (auth/conflict/network/not_found/rate_limit/region/unknown/validation), never by whether it was an approve or decline attempt; `failed_action` is used only to choose which retry button to render. Info note (always visible, not conditional): "Approval and decline actions are written to Xero Payroll immediately."

**Design requirements:** Row actions: Approve primary, Decline destructive-outlined, Request-info tertiary text. `XeroSyncFailedState` uses the shared error/red tone (`bg-error-container text-destructive`), not amber (no amber token exists: see Design system foundations).

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Make the failure message name the attempted action explicitly ("Approve to Xero failed: {plain-language reason}"), composing `failed_action` into the copy rather than relying on surrounding context (which modal was open) to convey it. *Criterion 4 (Error recovery): this is the exact requirement E-05 exists to satisfy, and it is not met anywhere in the app.*
- **[v5 proposal]** Either wire "Sync approval state" to a real dispatch or remove the always-disabled control; a permanently disabled button with no path to enablement is dead chrome that erodes trust in the rest of the page's controls. *Criterion 1 (Task completion) / Criterion 12 (Latency honesty): implies a capability that does not exist.*
- **[v5 proposal]** Differentiate the Pending/Approved/Withdrawn status badges visually (not just by text), consistent with how `/plans` and `/calendar` differentiate the same states. *Criterion 5 / Criterion 9 (WCAG 2.2 AA): status conveyed by text alone across an otherwise uniform pill is a scannability regression for a screen managers "visit frequently, often briefly" per PRODUCT.md.*
- **[v5 proposal]** Unify the `PermissionDeniedError` handling pattern with `/people`'s (bubble to `error.tsx` rather than a local `try/catch`), or document why the two differ. *Criterion 3 (State coverage): inconsistent error-boundary behaviour between visually similar screens.*

---

### S-11: Public holidays

**Route:** `/public-holidays` (list) and `/public-holidays/holidays/new` (full page), plus `@modal/(.)holidays/new` (intercepting modal).
**Guard:** `requirePageRole("org:viewer")` on the list; no page-level guard on `holidays/new` or its modal. Every mutating action (`suppressHolidayAction`, `restoreHolidayAction`, `addCustomHolidayAction`, `deleteCustomHolidayAction`, `importFromSourceAction`) independently calls `requireRole("org:admin")`. Access: all roles (read); Admin/Owner (mutate, server-enforced only: **not** gated in the rendered component, see below).
**Evidence:** `apps/app/app/(authenticated)/public-holidays/page.tsx:30`; `public-holidays-list.tsx`; `_actions.ts`; `holidays/new/{page.tsx,new-holiday-modal.tsx}`; `public-holidays/@modal/(.)holidays/new/page.tsx`; `public-holidays/@modal/default.tsx`.
**Country context:** AU state-specific, NZ regional-council granularity, UK per-nation (England & Wales / Scotland / Northern Ireland), sourced from Nager.Date plus manual overrides.

**Purpose:** View and (for admins, in practice) manage public holidays per location.

**User interactions, as-built:** Year (numeric input, min 2000) and Location (select, "All locations" default) filters, plus an "Include suppressed" checkbox, all viewer-accessible. Suppress (X icon), Restore (rotate-ccw icon), and Delete (trash, custom holidays only) buttons, and "Add custom holiday", render **unconditionally for every viewer of the page**, and the list component takes no role prop at all. A non-admin who clicks any of these gets a `toast.error("Permission denied")` only after the server action runs. **"Refresh from source" has no UI trigger anywhere**; `importFromSourceAction` exists and is admin-gated but is never called from any component (confirmed by a repo-wide grep with zero call sites outside its own test file). "Add custom holiday" modal fields: Name (max 100), Date, "Recurs annually" checkbox; the modal never exposes jurisdiction/location scoping despite the underlying action accepting it; every custom holiday created here is forced org-wide.

**Role variations:** None rendered; all differentiation is server-side-only per action (see above: this is itself the primary finding for this screen).

**Data displayed:** Date | Day | Name | Type | Source | Actions. Type badge is a 7-value map (Bank holiday, Custom, Public holiday, School, Observance, Optional, Authorities), not a National/State-Regional/Custom taxonomy; jurisdiction (country/region) is shown as text in the Source column ("Nager.Date (AU-NSW)" / "Manual"), not a separate badge. Suppressed rows: `opacity-60`, struck Date/Day/Name.

**States:** Empty: title "No public holidays", description "Team Calendar imports your organisation's country holidays automatically. Add a custom holiday for company-specific dates.", "Add custom holiday" CTA shown unconditionally (same gating gap as the row actions).

**Design requirements:** `DESIGN.md` chip/badge tokens; type-badge colours are inline `style` attributes rather than Tailwind token classes in the current implementation (worth a token-compliance pass, though no hex-outside-`DESIGN.md` violation was found in the values used).

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Hide suppress/restore/delete/"Add custom holiday" from non-admin viewers client-side, matching the pattern `/feeds` already uses (`canManage` prop hiding, not just server-side rejection). *Criterion 2 (Role clarity): "shown and then failing" is explicitly the anti-pattern to avoid; the feeds screen in the same codebase already demonstrates the preferred pattern.*
- **[v5 proposal]** Either wire "Refresh from source" to the existing `importFromSourceAction`, or remove any documentation/UI affordance implying it exists. *Criterion 1 (Task completion): a described capability with no reachable trigger.*
- **[v5 proposal]** Expose jurisdiction/location scoping in the "Add custom holiday" form, since the backend already supports it. *Criterion 1: the form silently narrows what the underlying system can do.*

---

### S-12: Notifications

**Route:** `/notifications`. No modal behaviour.
**Guard:** `requirePageRole("org:viewer")`. Access: all roles.
**Evidence:** `apps/app/app/(authenticated)/notifications/page.tsx:48`; `notifications-client.tsx`; `_actions.ts`; `apps/app/app/(authenticated)/components/notifications-provider.tsx`; `packages/notifications/components/provider.tsx`; `apps/app/components/notifications/bell.tsx`; `packages/notifications/src/types/notification-type-registry.ts`; `packages/database/prisma/schema.prisma:202-214`.

**Purpose:** In-app notification feed (SSE-delivered) and per-user notification preferences.

**SSE delivery:** `GET /api/notifications/stream`, `EventSource` with `withCredentials: true`; exponential backoff on error (1s → 2s → 4s → 8s → 16s, capped 30s, no user-visible offline indicator during retry). **Confirmed defect:** the authenticated layout mounts one `NotificationsProvider` app-wide (feeding the bell), and `/notifications/page.tsx` mounts a second, independent one: visiting this route opens two concurrent SSE connections to the same stream for the same user.

**User interactions, as-built:** Two custom tab buttons (not a `Tabs` component), "Notifications"/"Preferences", query-param-driven (`?tab=`). Feed: click a notification to mark read and navigate to its `actionUrl`; separate "Mark read" button to mark-read without navigating; "Mark all as read" (disabled at zero unread). Bell popover (header): up to 3 recent unread, "Mark all as read", "View all" → `/notifications`; unread badge caps display at "99+", uses raw `bg-red-600`, not a `DESIGN.md` token.

**Notification types (11, confirmed against both the TypeScript registry and the Prisma enum, exact match):** `leave_submitted`, `leave_approved`, `leave_declined`, `leave_withdrawn`, `leave_info_requested`, `leave_xero_sync_failed`, `sync_failed`, `sync_reconciliation_complete`, `feed_token_rotated`, `privacy_conflict`, `missing_alternative_contact`. See "What changed from v4.1" #16 for the corrected comparison against the prior 11-type list.

**Role variations:** None; every action funnels through `requirePageRole("org:viewer")`, correct for a personal (not admin) surface.

**Data displayed:** Notification feed (type icon, title, relative timestamp with absolute on hover, unread indicator); preferences matrix grouped Leave lifecycle → Approval flow → Sync → System, each row with independent in-app/email `Switch` toggles, the last-enabled channel on a row disabled with tooltip "At least one channel must be enabled" (enforced via disabled state only, no separate validation message).

**States:** Empty (unfiltered): "No notifications yet", description "No notifications yet. You'll see updates here when leave is submitted, approved or needs attention." Empty (filtered): "No matches", "No notifications match these filters." Bell popover empty: "No new notifications."

**Design requirements:** Unread row: `primary` left border plus `surface-container` tint (matches `DESIGN.md`). Bell badge should use a `DESIGN.md` token, not raw `bg-red-600` (there is no dedicated notification-badge token; `error` is the closest documented candidate).

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Have `/notifications` reuse the layout-level `NotificationsProvider` (via context) instead of mounting a second one, eliminating the duplicate SSE connection. *Criterion 12 (Latency honesty) / efficiency: two live connections per visit is wasted infrastructure with no user-facing benefit.*
- **[v5 proposal]** Surface a visible "reconnecting" state during the exponential-backoff retry loop, since a sustained outage currently produces no signal at all. *Criterion 3 (State coverage): "offline or stale data" is explicitly named as a state to check for.*
- **[v5 proposal]** Replace the bell's raw `bg-red-600` badge with the `error` token. *Criterion 5 (Provenance legibility): status colour drawn from outside the documented palette is exactly the kind of ad hoc colouring the provenance/status system exists to prevent.*

---

## Feed screens

### S-13: Feeds

**Route:** `/feeds` (list), `/feeds/new` (full page + `@modal/(.)new` intercept).
**Guard:** `requirePageRole("org:viewer")` on the list. No page-level guard on `/feeds/new`; admin/owner enforcement happens in `feeds/_actions.ts`'s `resolveAdminContext()` (server-derived role, cannot be spoofed) and again in `packages/feeds/src/feed-service.ts`'s `isAdminOrOwner`. Access: all roles (read); Admin/Owner (manage, action-layer enforced, not page-gated).
**Evidence:** `apps/app/app/(authenticated)/feeds/page.tsx:33`; `feeds/new/page.tsx`; `feeds/@modal/(.)new/page.tsx`; `feeds/@modal/default.tsx`; `feeds/_actions.ts:277-323`; `apps/app/components/feed/{feed-table,subscribe-instructions}.tsx`; `packages/feeds/src/feed-service.ts:191-193`; `packages/feeds/src/scope/feed-scope.ts:345-352`.

**Purpose:** List all ICS feeds with subscription URLs and setup instructions.

**User interactions, as-built:** "How to subscribe" is a **single accordion** with six client-specific items (Outlook desktop, Outlook web, Google Calendar, Apple Calendar macOS, Apple Calendar iOS, Generic ICS: no distinct CalDAV entry), not per-client tabs. "Copy URL" reads from an in-memory client token session; if no plaintext token is cached this session, it redirects to `/feeds/{id}?panel=rotate` instead of copying anything. Admin/owner-only Pause/Resume/Archive/Rotate/"New feed" controls are correctly hidden (not just disabled) for non-managers, via a `canManage` prop: the one screen in this audit that gets the hide-vs-disable pattern right.

**Role variations:** `canManage` (admin/owner) unlocks Pause/Resume/Rotate/Archive and the "All of organisation" scope option on create; everyone else sees a read-only list scoped by `canViewFeed`.

**Data displayed:** Per feed: name, scope summary, status dot (Active = sage `secondary` tone, Paused = lavender `accent-container` tone, Archived = muted tone: provenance tokens repurposed as lifecycle-status colours, not a dedicated status palette), subscribe URL (masked).

**States:** Empty: "No feeds yet", description "New organisations normally start with a default all-staff feed. No feed is currently available for this organisation."; "Create feed" CTA shown only to `canManage`.

**Design requirements:** Feed cards use `rounded-2xl` (16px); `DESIGN.md` specifies 20px for persistent card surfaces (see Design system foundations radius note).

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Give feed lifecycle status its own tone rather than reusing the sage/lavender provenance tokens, which now mean three different things across the app (Xero-provenance, manual-provenance, and feed-Active/Paused). *Criterion 5 (Provenance legibility): reusing a load-bearing colour code for an unrelated meaning undermines the "provenance at a glance" principle everywhere else it's used.*
- **[v5 proposal]** When no cached plaintext token exists, "Copy URL" should say so plainly ("Rotate to get a new link") rather than silently redirecting into the rotate panel with no explanation of why. *Criterion 11 (Copy): the redirect is unexplained; Criterion 1: the user does not understand why clicking Copy took them somewhere else.*

---

### S-14: Feed detail

**Route:** `/feeds/[feedId]` (full page + `@modal/(.)[feedId]` intercept, `size="wide"`).
**Guard:** No page-level `requirePageRole`. Visibility is scope-based via `getFeedDetail`'s `canViewFeed`: admin/owner always see all feeds; a viewer/manager with no linked `Person` record sees none (immediate `false`); a linked person sees only feeds within their own scope (self, team, or manager's transitive reports); anyone outside scope gets a generic Next.js `notFound()`: a 404, not a permission-denied message. Access: scope-dependent (not simply "Manager read, Admin/Owner manage" as v4.1 claimed).
**Evidence:** `apps/app/app/(authenticated)/feeds/[feedId]/page.tsx`; `feeds/@modal/(.)[feedId]/page.tsx`; `feeds/@modal/default.tsx`; `packages/feeds/src/scope/feed-scope.ts:271-352`; `packages/feeds/src/preview/preview-service.ts:35-88`; `apps/app/components/feed/{feed-detail,one-time-token-panel}.tsx`.

**Purpose:** Full feed configuration, token management, and preview.

**User interactions, as-built:** "Rotate token" and "Archive feed" are **inline confirmation banners**, not separate modals (`bg-error-container` styled, Rotate/Archive destructive button plus Cancel). Rotate copy: "Rotating the token invalidates the current subscribe URL. Subscribers will need the new URL to continue syncing."; Archive copy: "Archiving {name} stops it from publishing and revokes its tokens. Existing subscribers will see a stopped calendar. This can be reversed from the Archived filter, but tokens must be recreated." "Show URL"/"Hide URL" only ever reveals a server-masked hint URL (`https://…/ical/••••{hint}.ics`): the real, usable subscribe URL is shown exactly once, immediately after create or rotate, via `OneTimeTokenPanel`. Preview tabs: admin/owner see Named/Masked/Private; everyone else sees only the feed's own configured mode (enforced server-side in `previewFeed`, not just hidden in the UI).

**Role variations:** `canManage` (admin/owner) unlocks Rotate/Pause/Resume/Archive/Edit and all three preview modes; scoped viewers/managers get read-only detail plus their single privacy-mode preview.

**Data displayed:** Feed name, scope, privacy mode, include-public-holidays setting, "Active token: {hint}, created {date}" or "No active token" (no expiry countdown: the `feed_token_status` enum has only `active | expired | revoked`, no "Expiring" state, and although `getFeedDetail` fetches a full token-history list, `FeedDetail`'s props never carry it, so the rotation history is dead data, never rendered).

**States:** Preview empty: "No upcoming events. Your feed will update automatically when leave or availability is added."

**Design requirements:** `rounded-2xl` modal shell (16px, spec-correct).

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Replace the generic 404 a viewer sees when a feed exists but is outside their scope with a permission-denied-style message ("This feed is not shared with your team"), distinguishable from a genuinely nonexistent feed. *Criterion 9 (WCAG 2.2 AA / error identification): a 404 for an authorisation failure misidentifies the actual problem.*
- **[v5 proposal]** Render the token rotation history that `getFeedDetail` already fetches (Active/Expired/Revoked entries across rotations), since it is computed server-side and currently discarded. *Criterion 1 (Task completion): an admin auditing token history has no way to see it despite the data existing.*
- **[v5 proposal]** Convert the Rotate/Archive inline confirmation banners to genuine confirmation modals for consistency with how every other irreversible action in the product (Decline, Xero disconnect) is confirmed, and to make the irreversibility harder to miss on a busy detail page. *Criterion 6 (Destructive and irreversible actions).*

---

## Analytics

### S-15: Leave reports

**Route:** `/analytics/leave-reports`. No modal behaviour.
**Guard:** `requirePageRole("org:manager")`. Access: Manager (own team), Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/analytics/leave-reports/page.tsx:41`; `leave-days-by-team-chart.tsx`; `export-csv-button.tsx`; `packages/availability/src/analytics/date-range.ts`.
**Country context:** Leave type labels adapt to `country_code`; public holidays excluded from leave-day calculations, hardcoded (see below), not user-toggleable.

**Purpose:** Leave pattern analytics on approved `xero_leave`/`team_calendar_leave` records.

**User interactions, as-built:** **Only one chart exists**: "Leave days by team" (bar, top 10 teams, single series on `--chart-1`). The leave-by-type, leave-by-person, peak-absence heatmap, and leave-type-breakdown donut described elsewhere do not exist anywhere in this directory. Four summary stat cells: Leave days, Approved records, People with leave, Average days. "Export CSV" is implemented and functional (paginated server export, capped at 10,000 records, client-side Blob download). **No date-range preset UI, no filters, and no include/exclude-public-holidays toggle exist**; `resolveDateRange({preset: "this_year"})`, `personType: "all"`, and `includePublicHolidays: false` are all hardcoded server-side, despite `packages/availability/src/analytics/date-range.ts` defining a full preset set (`this_month`, `last_month`, `this_quarter`, `last_quarter`, `this_year`, `last_year`, `last_12_months`, `custom`) that the UI never surfaces. No drill-to-record-list interaction exists (the drilldown query is only ever called from the CSV export action, not from any clickable chart element).

**Role variations:** Manager sees own team's data; admin/owner see the whole organisation (scoping is server-side in the report query, not separately verified in this pass beyond the role gate).

**Data displayed:** As above; zero hardcoded hex colours found, all chart colour is `var(--chart-1)`.

**States:** Empty: "No approved leave records" (exact copy for the chart card when the query returns nothing).

**Design requirements:** Chart uses the formalised `--chart-1..5` ramp correctly (`DESIGN.md` "Chart Ramp").

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Either build the date-range preset selector, filters, and public-holiday toggle the service layer already supports, or remove any documentation implying they exist; a manager cannot currently see last month's leave pattern at all through this UI. *Criterion 1 (Task completion): the primary task ("see leave patterns over a period I choose") cannot be completed.*
- **[v5 proposal]** Make the stat cells and chart clickable through to the underlying record list, reusing the drilldown query that already exists for CSV export. *Criterion 1: numbers with no path to the underlying detail force a second, unrelated navigation to `/plans` or `/leave-approvals` and manual re-filtering.*

---

### S-16: Out-of-office and travel analytics

**Route:** `/analytics/out-of-office`. No modal behaviour.
**Guard:** `requirePageRole("org:manager")`. Access: Manager (own team), Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/analytics/out-of-office/page.tsx:38`; `ooo-days-by-type-chart.tsx`; `ooo-days-monthly-chart.tsx`.
**Country context:** Country-neutral canonical record types.

**Purpose:** Analytics on manual availability records (WFH, travel, offsite, training).

**User interactions, as-built:** **Only two charts exist**, both bar-family: "Out-of-office by type" (internally named `donutChartData` in code but rendered as a `BarChart`, not a donut) and "Monthly trends" (a stacked `BarChart` across all OOO record types together, internally implying "stacked area" but not one). WFH-frequency and travel/offsite-frequency as separate charts, and a most-frequent-travellers list, do not exist anywhere in the codebase. Five summary stat cells: Out-of-office days, Approved records, People out-of-office, Average days, Most common type. Same hardcoded `this_year`/`personType: "all"` gap as S-15; no public-holiday toggle applies here.

**Role variations:** Same pattern as S-15.

**Data displayed:** Monthly-trends chart correctly cycles through `--chart-1` … `--chart-5` for its multiple series (the by-type breakdown, whatever types exist in the data: not WFH-specific). Zero hardcoded hex colours found.

**States:** Same empty-state pattern as S-15 (not independently quoted by the research pass, presumed consistent).

**Design requirements:** Chart ramp usage is consistent with S-15 and correctly documented once, per `DESIGN.md`.

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Same date-range/filter gap as S-15: build the UI for the presets and filters the service layer already supports. *Criterion 1 (Task completion).*
- **[v5 proposal]** Add the most-frequent-travellers list PRODUCT.md's user context implies HR admins need ("high data density is acceptable; they need control and confidence"). *Criterion 1: a named use case with no current surface.*

**Note (not a `[v5 proposal]`, an implementation-naming observation):** the internal variable `donutChartData` and this screen's card copy both imply a donut chart that was never built; a bar chart renders instead. Renaming the variable to match what actually ships would prevent this exact catalogue drift from recurring.

---

## Settings

Settings screens share a left sub-navigation (`SettingsNav`) plus a collective layout gate: `apps/app/app/(authenticated)/settings/layout.tsx` checks `orgRole === "org:owner" || orgRole === "org:admin"` (a raw string comparison, not the `requirePageRole()` helper used elsewhere) and silently `redirect("/")`s otherwise: not the `PermissionDeniedState`/E-04 treatment the rest of the app uses for a denied page. Most individual settings pages additionally call `requirePageRole("org:admin")` themselves (double-gated); `/settings/members` relies solely on the layout gate.

### S-17: Settings > General

**Route:** `/settings/general`.
**Guard:** `requirePageRole("org:admin")` + layout gate. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/settings/general/page.tsx:20`; `general-client.tsx`; `_actions.ts`.
**Country context:** `country_code` drives the region selector; `region_code` determines the public holiday set.

**Purpose:** Core Clerk-Organisation and payroll-Organisation configuration.

**User interactions, as-built:** Two independently-saved cards. **Account card**: Account name (editable, writes through to Clerk), Account slug (disabled, "Account slug is set when the account is created."). **Payroll entity card**: Organisation name; Country as a `RadioGroup` (AU/NZ/UK, NZ and UK **disabled** and suffixed "(planned)"); Region (select, options depend on country); Primary timezone (select, fixed list of 6 IANA zones). Changing country/region shows an info note: "Changing your country or region affects which public holidays and Xero payroll regions are available. Team Calendar imports available public holidays automatically and existing custom/suppressed records are preserved."; changing country specifically also requires a confirmation checkbox ("I understand and want to continue") before Save is enabled: though since NZ/UK are disabled in the RadioGroup, this path is only ever reachable as a no-op (AU to AU). The server independently hard-blocks any non-AU country regardless of the UI: "Team Calendar currently supports Australian Xero Payroll files only." No "workspace" terminology anywhere (confirmed by grep).

**Role variations:** None found; admin and owner see the identical page.

**Data displayed:** As above.

**States:** N/A beyond per-card save success/error toasts.

**Design requirements:** No flag icons on the country selector (it is a `RadioGroup`, not the flagged `Select` v4.1 described).

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Since NZ/UK are permanently disabled and the server hard-blocks them, drop the confirmation-checkbox flow entirely (it is currently dead UI reachable only as an AU→AU no-op) or replace it with a clear "coming soon" state on the disabled options. *Criterion 11 (Copy) / Criterion 1: implies a capability (multi-country switching) that cannot currently be exercised.*

---

### S-18: Settings > Leave approval

**Route:** `/settings/leave-approval`.
**Guard:** `requirePageRole("org:admin")` + layout gate. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/settings/leave-approval/page.tsx:17`; `leave-approval-settings-client.tsx`.

**Purpose:** Configure approval display behaviour and manager visibility scope.

**User interactions, as-built:** All controls auto-save immediately on change (header copy confirms this; there is no page-level Save button): "Show pending leave on calendar", "Show declined records by default", "Notify managers on status change" (switches); "Manager visibility scope" (Direct reports only / All team leave including indirect reports, `RadioGroup`); "Leave request advance days" (number input); "Require decline reason" (switch, copy: "Decline reasons help employees understand decisions. Disabling this is not recommended."); "Default privacy mode" (Named/Masked/Private, `RadioGroup`); "Restore defaults" (ghost button). **No synchronous-Xero-writes info callout exists on this page at all**: confirmed absent by full-directory grep for "Xero" and "synchronous", contrary to what a prior spec described. `defaultFeedPrivacyMode` and `feedsIncludePublicHolidaysDefault` are part of the same settings object and reset by "Restore defaults" here, but have no corresponding control on this page: they live on `/settings/feeds` (S-21) instead.

**Role variations:** None found.

**Data displayed:** Current org settings values.

**States:** Toast per auto-saved change.

**Design requirements:** Standard toggle/select form styling.

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Add the synchronous-Xero-writes info callout this page's own subject matter calls for (approval-flow settings, directly adjacent to where the irreversibility of Xero writes matters most), matching the pattern already used on `/leave-approvals` itself. *Criterion 12 (Latency honesty): the one settings screen most related to Xero write-back is the one missing the disclosure other screens carry.*
- **[v5 proposal]** Move `defaultFeedPrivacyMode`/`feedsIncludePublicHolidaysDefault` controls onto this page (or clearly cross-link to `/settings/feeds`), since "Restore defaults" here silently resets settings this page never shows. *Criterion 1 (Task completion): a reset button whose scope is invisible to the user.*

---

### S-19: Settings > Integrations

**Route:** `/settings/integrations`.
**Guard:** `requirePageRole("org:admin")` + layout gate. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/settings/integrations/page.tsx:14`; `integrations-client.tsx`.

**Purpose:** Clerk-Organisation-level rollup of Xero connection health across every payroll `Organisation`.

**User interactions, as-built:** A single "Xero Payroll" card with a rolled-up status badge, a 4-stat grid (Payroll organisations / Connected / Stale or error / Not connected), a per-organisation status list, and "Manage Xero" linking to S-20. Header copy: "Xero is shared at the Clerk Organisation level and attached per payroll organisation." This is a rollup dashboard, not the "card grid, landscape orientation" per-integration layout v4.1 described (no "Coming soon" placeholder cards were found for future integrations).

**Role variations:** None found.

**Data displayed:** Per-organisation name, tenant name, payroll region (if connected), status badge.

**States:** N/A beyond the stat grid reflecting live counts.

**Design requirements:** Status chip family consistent with S-20.

**`[v5 proposal]` interaction improvements:** None surfaced; the rollup design is coherent for its stated purpose.

---

### S-20: Settings > Xero detail

**Route:** `/settings/integrations/xero`.
**Guard:** `requirePageRole("org:admin")` + layout gate. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/settings/integrations/xero/page.tsx:14`; `xero-client.tsx`; `_actions.ts:162-218`.
**Country context:** Payroll region (AU/NZ/UK) shown per tenant, text-only (not colour-coded).

**Purpose:** Xero OAuth management and per-tenant sync configuration, one card per payroll `Organisation`.

**User interactions, as-built:** Per-org card: status badge, error banner (plain-language `last_error_message`, not raw payload, correct per the `xero_write_error`/`xero_write_error_raw` split), payroll region shown as text in the card description, 4-stat sync-timestamp grid (People/Leave/Balances/Reconciliation), "Connect Xero"/"Reconnect Xero" (redirects to `apps/api`'s OAuth start), "Refresh tokens", and per-tenant manual sync triggers (Sync people/Sync leave records/Sync balances/Reconcile approval state). **Disconnect is two inline buttons in the card body** ("Standard disconnect" outline / "Destructive disconnect" destructive-styled), gated by a shared "type the organisation name to confirm" text input, **not** a modal dialog, though the shared `ConfirmActionDialog` component exists and is used elsewhere in the app. Exact success copy: "Xero disconnected and Xero-linked data purged." (destructive) / "Xero disconnected. Historical data is now read-only." (standard). **`pauseTenantSyncAction`/`resumeTenantSyncAction` are fully implemented server-side (with audit events) but have no UI entry point at all**, a confirmed dead capability.

**Role variations:** None found beyond the shared admin/owner gate.

**Data displayed:** As above.

**States:** Error banner when `last_error_message` is present.

**Design requirements:** The soft/destructive button pair carries genuinely unequal visual weight (`variant="outline"` vs `variant="destructive"`), satisfying the intent of v4.1's "must not look equivalent" rule even though the mechanism (inline buttons, not a two-panel modal) differs from what was documented.

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Wire "Pause sync"/"Resume sync" into the UI using the already-built server actions. *Criterion 1 (Task completion): a fully-built, audited capability with no way to trigger it.*
- **[v5 proposal]** Move the disconnect flow into `ConfirmActionDialog`, the pattern already used elsewhere in this exact settings area, for consistency and to give the irreversible "purge" option the same modal weight as other destructive confirmations in the product (Decline, Archive feed). *Criterion 6 (Destructive and irreversible actions): inline buttons on a busy card are easier to misclick than a modal that demands a separate confirming action.*

---

### S-21: Settings > Feeds

**Route:** `/settings/feeds`.
**Guard:** `requirePageRole("org:admin")` + layout gate. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/settings/feeds/page.tsx:18-24,24`; `feeds-client.tsx`.

**Purpose:** Organisation-wide **defaults** for new feeds, plus a browse/launch list into individual feed management at `/feeds`. **Does not itself create or configure individual feeds**, contrary to its own in-code comment ("S-21 ... creates and configures feeds"). The page's own header copy contradicts that comment: "Organisation defaults for new feeds. Detailed feed lifecycle actions stay in the main feed area."

**User interactions, as-built:** "Default privacy mode for new feeds" (`RadioGroup`, auto-saved), "Include public holidays in new feeds" (switch, auto-saved), and an "All feeds" list (name, scope summary, status, "Open" → `/feeds/{feedId}`) with a "Create new feed" button that links to `/feeds/new` (not a local creation flow).

**Role variations:** None found.

**Data displayed:** Two org-wide defaults plus a read-only feed list.

**States:** N/A beyond auto-save toasts.

**Design requirements:** Consistent with other settings screens' card layout.

**`[v5 proposal]` interaction improvements:**
**Note (not a `[v5 proposal]`, an implementation-comment observation):** the page's own in-code comment claims it "creates and configures feeds", which caused this catalogue's prior drift (v4.1 inherited the comment's claim, not the shipped behaviour). Correcting the comment to match the header copy it sits above would prevent this recurring.

---

### S-22: Settings > Billing

**Route:** `/settings/billing`.
**Guard:** `requirePageRole("org:admin")` + layout gate; `requireRole("org:owner")` is separately computed to derive `actingRole`, but the result has no effect on what renders. Access: Admin and Owner see an identical page (see "What changed from v4.1" #30).
**Evidence:** `apps/app/app/(authenticated)/settings/billing/page.tsx:28,36-37`; `billing-client.tsx`; `packages/availability/src/settings/billing-service.ts:55-124`.

**Purpose:** View plan, status, and usage. No self-service checkout gating differs by role on this specific page (the real owner-only distinction lives on the dashboard's billing widget, via a sibling function `getBillingSummaryForDashboard`, not this page's `getBillingSummary`).

**User interactions, as-built:** Read-only plan card (label, billing-period end or "not set", status badge: active/trialing → primary tone, canceled/unpaid → destructive tone, past_due/paused/incomplete → amber raw-Tailwind tone, the only amber usage found outside `/sync`/`/analytics`); usage card (progress bars per metric: Payroll entities, Seats, Feeds: amber at ≥80%, destructive at ≥100%, raw Tailwind classes, no named token). Whether "Manage billing"/"Upgrade to Premium" render at all is gated by a global `isEarlyAccess()` flag, not by `hasUpgradeFlow`/`hasContactFlow` (both hard-coded `true` server-side and never consumed by the client component). During early access, a card reads: "Paid self-service billing, plan upgrades, and customer portal actions are disabled during closed early access." / "Your organisation is participating in closed early access for Australian Xero Payroll teams. Pricing and commercial terms will be confirmed prior to any future paid billing activation."

**Role variations:** **None**: the computed `isOwner`/`actingRole` distinction has no visible effect anywhere on this page.

**Data displayed:** Plan, status, usage vs limits.

**States:** Over-limit banner ("This account is over one or more plan limits.") when applicable.

**Design requirements:** Amber usage here is the only place in the whole app besides itself that uses raw Tailwind amber (`bg-amber-500/15 text-amber-700`), reinforcing the case that a formal warning token is needed (see Design system foundations).

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Either implement the owner-only restriction v4.1 documented (matching the dashboard widget's actual `getBillingSummaryForDashboard` behaviour) or formally retire that decision; the current state is dead server-side plumbing that suggests a restriction the page does not enforce. *Criterion 2 (Role clarity): the code computes a distinction it then ignores, which is a maintenance trap as much as a UX one.*

---

### S-23: Settings > Holidays

**Route:** `/settings/holidays`.
**Guard:** `requirePageRole("org:admin")` + layout gate. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/settings/holidays/page.tsx:16-20,22`; `holidays-client.tsx`.
**Country context:** Matches S-11.

**Purpose:** Admin overview of public holidays. **Owns no suppress/restore/refresh-from-source actions**, contrary to its own in-code comment and v4.1's description; every actual mutation lives on `/public-holidays` (S-11).

**User interactions, as-built:** Two stat cards (Imported holidays, Custom holidays), an "Upcoming holidays" card (next 12), "Add custom holiday" (links to `/public-holidays/holidays/new`, the same route S-11 uses), "View all" (links to `/public-holidays`). Own header copy is honest about this: "A thin admin wrapper over the public holiday service and public holiday screens."

**Role variations:** None; admin-only page with no internal role branching.

**Data displayed:** Two counts plus a 12-item upcoming list.

**States:** N/A.

**Design requirements:** Consistent visual treatment with S-11.

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Either move suppress/restore/refresh-from-source onto this page (since it is the nominal "admin config" counterpart per both its own comment and v4.1) or correct the comment and any documentation to describe it accurately as a summary-and-launch page. *Criterion 1 / Criterion 7 (Navigation and wayfinding): an admin looking for holiday management tools on the page literally named for that purpose finds none.*

---

### S-24: Settings > Audit log

**Route:** `/settings/audit-log`.
**Guard:** `requirePageRole("org:admin")` + layout gate. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/settings/audit-log/page.tsx:22`; `audit-log-client.tsx`.

**Purpose:** Review audit events.

**User interactions, as-built:** GET-form filters (From/To date, Action prefix, Entity ID). Each event row is a native `<details>`/`<summary>` disclosure (not a custom accordion component). Expanding shows a `JSON.stringify` metadata block, and: only for the first 10 events on the page that have detail pre-fetched: a two-column raw-JSON before/after block. **This is not a field-level diff**: no highlighting of what actually changed, just two side-by-side JSON dumps. "Export CSV" is implemented and functional.

**Role variations:** None found.

**Data displayed:** `event.action`, entity type/ID, actor display (plain text, not a badge), timestamp.

**States:** N/A beyond the filter form's own empty-results case (not independently confirmed in this pass).

**Design requirements:** **No actor-type badges exist** (User/System/Sync distinction is plain inline text, not a coloured `Badge` component, contrary to v4.1). **No dedicated monospace treatment for entity IDs** in the row header (only the JSON `<pre>` blocks get monospace styling by default). **Pagination is non-functional**: `nextCursor` is computed server-side and passed as a prop but never read by the client component: only the first 50 events are ever reachable through this UI, despite the service layer explicitly supporting cursor pagination.

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Wire the "Load more" control the `nextCursor` prop already supports; a fixed 50-event window on an audit log for an organisation with any meaningful history is a genuine task-completion failure for its stated purpose. *Criterion 1 (Task completion).*
- **[v5 proposal]** Add actor-type badges (User/System/Sync) as `DESIGN.md` specifies, and render a real field-level diff (highlight changed keys) rather than two unaligned JSON dumps. *Criterion 1 / Criterion 5: an audit log whose "diff" requires the reader to manually compare two JSON blobs defeats its own purpose.*

---

## Sync screens

### S-25: Sync health

**Route:** `/sync`.
**Guard:** `requirePageRole("org:admin")`. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/sync/page.tsx:33`; `sync-client.tsx:37-50,204-304,282,467`.

**Purpose:** Monitor inbound Xero sync run health across all tenants in the current Clerk Organisation.

**User interactions, as-built:** Per-tenant summary cards: name, payroll-region badge, connection status dot, a four-cell "last synced" grid (People/Leave records/Balances/Reconciliation; not a single combined "last successful sync + last status" pair as v4.1 described), a "N pending failures" link (shown only when > 0, linking to a pre-filtered `/sync?status=failed,partial_success&xeroTenantId=...`), and an `XeroSyncFailedState` block when `failedRunsLast30Days > 0` or `pendingFailedRecords > 0`. **"Run sync now" only dispatches two of four job types**, Sync people and Sync leave records buttons render permanently `disabled` with tooltip "This sync job is not registered yet."; only Sync balances and Reconcile approvals are functional. Run history table: Tenant/Run type/Status/Trigger/Started/Duration/Records/Triggered by/View; the Records column shows plain unstyled text ("N upserted, N failed"), **no colour differentiation even when failures are present**.

**Role variations:** None found beyond the shared admin/owner gate.

**Data displayed:** As above; filters for Tenant/Run type/Status/Trigger (date-range fields exist in the schema but have no visible input).

**States:** N/A beyond the failure-callout card.

**Design requirements:** **The claimed "pulse on the actively running sync status dot, the only sanctioned animation in the product" is inaccurate on two counts.** `ConnectionDot` never pulses (static `<span>`, no `animate-pulse` class). Three unrelated elements do pulse: a header avatar-loading skeleton (unrelated to sync), a "Running" text pill on this page, and a running-status `Badge` reused on both this page and S-26.

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Wire "Sync people" and "Sync leave records" manual dispatch, or remove the buttons until they are; two of four advertised manual-sync controls are permanently inert. *Criterion 1 (Task completion): PRODUCT.md states "Manual re-sync: available from the UI for admin users" without qualifying which jobs.*
- **[v5 proposal]** Colour the Records column's failed count when greater than zero, consistent with how failure counts are treated everywhere else in the product. *Criterion 5 / Criterion 1: a zero and a large failure count currently look identical at a glance.*
**Note (not a `[v5 proposal]`, a documentation-accuracy observation):** three separate `animate-pulse` usages exist (header avatar skeleton, "Running" text pill, running-status badge), not the single sanctioned instance v4.1 described; if "one sanctioned animation" is meant to hold as a real product constraint, the other two should be reconsidered.

---

### S-26: Sync run detail

**Route:** `/sync/[runId]`.
**Guard:** `requirePageRole("org:admin")`. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/sync/[runId]/page.tsx:35`; `sync-run-detail-client.tsx:253,317,355-357`.

**Purpose:** Full detail and failed records for one sync run.

**User interactions, as-built:** Four stat cells (Records fetched/upserted/skipped/failed, no colour differentiation even for the failed count). Failed records list, each a collapsible `<article>` (monospace `sourceRemoteId`, `recordType`/`errorCode` badges, first line of `errorMessage`; expanding reveals the full message and, if present, a "Show/Hide raw payload" `<pre>` block: matching the `xero_write_error_raw`/audit-only-payload contract, since only admins reach this screen). **"Re-run sync" is enabled only when `runType === "approval_state_reconciliation"`**; every other run type is disabled with "This sync job is not registered yet." "Export as CSV" is implemented and functional, shown only when failed records exist.

**Role variations:** None found.

**Data displayed:** Sourced from the `failed_records` dead-letter table via `getRunDetail` (confirmed, joined to the `sync_runs` row).

**States:** N/A beyond the re-run confirmation ("Re-running starts a fresh sync. Previous failed records stay in the audit trail. Select Continue re-run to proceed.").

**Design requirements:** Monospace applied to `sourceRemoteId` but not consistently to the raw-payload `<pre>` block's own class (relies on browser default `<pre>` styling) nor to the error-message text.

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Enable "Re-run sync" for every run type the corresponding S-25 dispatch supports (once that gap is closed), not just reconciliation. *Criterion 1 (Task completion), same underlying gap as S-25.*
- **[v5 proposal]** Colour-differentiate the "Records failed" stat cell when greater than zero. *Criterion 5.*

---

## Settings: newly catalogued screens

### S-27: Settings > Members

**[proposed catalogue addition is not required: this route already exists and is fully catalogued here; it was only "uncatalogued" in v4.1 pending confirmation.]**

**Route:** `/settings/members`.
**Guard:** No page-level `requirePageRole` call; relies entirely on the `settings/layout.tsx` admin/owner gate (raw `orgRole` string check). Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/settings/{layout.tsx:12-22,members/page.tsx,members/members-client.tsx}`; `apps/app/app/actions/settings/{invite-member,remove-member,update-member-role}.ts`.

**Purpose:** Manage **Clerk Organisation membership** (invite, role change, remove) directly against the Clerk Backend SDK. Entirely distinct from `/people` (S-08), which manages `Person` domain records that may or may not be linked to a Clerk user (`clerk_user_id`); S-29 exists specifically to reconcile the two. In one sentence: `/settings/members` answers "who can log in and what Clerk role they hold"; `/people` answers "who exists as a leave/availability subject, Xero-linked or not."

**User interactions, as-built:** Custom-built UI (design-system `Table`/`Select`/`Avatar`/`Button`/`Input`, a custom `RoleBadge`, and the shared `ConfirmActionDialog`): **not** Clerk's hosted `<OrganizationProfile/>`/`<OrganizationMembers/>` components. Invite: email input + role select (Admin/Manager/Viewer always; Owner only if the acting user is already an owner) → server-checked again independently. Members table: role cell is a read-only `RoleBadge` for self or (if the acting viewer isn't an owner) for any `org:owner` row, else an editable role `Select`; server blocks assigning owner unless the caller is already an owner ("Only owners can assign the owner role."). Remove: `ConfirmActionDialog` (destructive), body "Remove {name} from this organisation? They will lose all access immediately." Pending invitations list (email, role, sent date) has no revoke/resend action.

**Role variations:** Owner sees the "Owner" role option and can edit other owners' roles; admin cannot.

**Data displayed:** Member list (avatar, name, email, role), pending invitation list.

**States:** Success/error toasts per action.

**Design requirements:** Uses the shared `ConfirmActionDialog` (correct pattern, contrast with S-20's disconnect flow which does not).

**`[v5 proposal]` interaction improvements:**
- **[v5 proposal]** Add revoke/resend for pending invitations; currently a mis-sent invite has no in-app remedy. *Criterion 1 (Task completion).*

---

### S-28: Settings > Xero connect

**[proposed catalogue addition is not required: this route already exists and is fully catalogued here; it is new undocumented surface per "What changed from v4.1" #13.]**

**Route:** `/settings/integrations/xero/connect`.
**Guard:** `requirePageRole("org:admin")` + layout gate. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/settings/integrations/xero/connect/page.tsx:21`; `connect-client.tsx`.

**Purpose:** OAuth callback and tenant/organisation attachment step. Initiation happens from S-20's "Connect Xero" button (redirects to `apps/api`'s `GET /api/xero/oauth/start`); the user lands back here with a `?session=` parameter resolving a pending OAuth session.

**User interactions, as-built:** "Select a Xero tenant" (single-select list of tenants from the pending session). "Attach to an existing payroll organisation" (select, disabled if a preset organisation ID was already supplied) or, if none exist, "Create the first payroll organisation" (uses the selected tenant's name as the default label). "Complete connection" writes an audit event and fires a best-effort initial sync (people/leave records/leave balances) before redirecting back to the calling page.

**Role variations:** None; admin/owner only.

**Data displayed:** Pending session's tenant list, existing Organisation list.

**States:** N/A beyond the completion redirect.

**Design requirements:** Standard settings card layout.

**`[v5 proposal]` interaction improvements:** None surfaced; this screen's purpose and flow are internally coherent.

---

### S-29: Settings > Xero person matches

**[proposed catalogue addition is not required: this route already exists and is fully catalogued here; it is new undocumented surface per "What changed from v4.1" #13.]**

**Route:** `/settings/integrations/xero/matches`.
**Guard:** `requirePageRole("org:admin")` + layout gate. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/settings/integrations/xero/matches/page.tsx:21`; `matches-client.tsx`; `_actions.ts`.

**Purpose:** Explicit-review reconciliation between Xero-synced `Person` records and existing manually-created candidate `Person` records, resolving ambiguous identity matches produced by inbound Xero people sync. Header copy: "Possible matches are never merged automatically. Review and resolve each one explicitly."

**User interactions, as-built:** Per pending match card: the Xero person's name/email, the stored candidate person (or "No candidate person was stored for this match."), a Clerk-user-ID input (pre-filled from the candidate's existing link if any), and two actions: "Link to Clerk user" (resolution `match`) and "Keep separate" (resolution `ignore`). Server-side, linking verifies the target Clerk user is actually an org member ("That user is not a member of this account. Invite them first, then link the person.") and not already linked to a different person ("That user is already linked to another person in this organisation."). Every resolution writes an audit event.

**Role variations:** None; admin/owner only.

**Data displayed:** Pending `XeroPersonMatch` rows.

**States:** Empty: "Team Calendar will show possible Xero and manual person matches here for explicit admin review."

**Design requirements:** Standard card layout; no destructive styling needed since matches are additive/reversible-by-re-review, not deletions.

**`[v5 proposal]` interaction improvements:** None surfaced; the explicit-review model (no auto-merge) is a defensible, well-implemented safety design as-is.

---

### S-30: Settings > Getting started

**[proposed catalogue addition is not required: this route already exists and is fully catalogued here; it is new undocumented surface per "What changed from v4.1" #13.]**

**Route:** `/settings/getting-started`. `/setup` is a pure redirect to this route.
**Guard:** `requirePageRole("org:admin")` + layout gate. Access: Admin, Owner.
**Evidence:** `apps/app/app/(authenticated)/settings/getting-started/page.tsx:21`; `apps/app/app/(authenticated)/setup/page.tsx`; `apps/app/components/onboarding/onboarding-checklist.tsx`; `apps/app/lib/server/load-onboarding-state.ts`.

**Purpose:** Derived-state onboarding checklist, shared verbatim with the dashboard's onboarding widget (`variant="settings"` vs `variant="dashboard"`, differing only in CTA button size). Header copy: "Return to setup guidance at any time. These steps help you publish availability, but they do not block normal app use."

**User interactions, as-built:** No manual "mark complete": every step's status is inferred live from database counts. Steps (four "required", one conditional/optional): Review organisation profile → `/settings/general`; **Connect Xero** (shown only while the Clerk Org has zero connections in any status, not counted toward the required-steps ratio) → `/settings/integrations/xero`; Add or sync people → `/people`; Review public holidays → `/settings/holidays`; Review calendar feed → `/feeds`. Each step shows a `StatusBadge` (Done/Next/Later/Optional); progress reads "{completed}/{required} required steps complete".

**Role variations:** None; admin/owner only.

**Data displayed:** Live-derived completion state per step.

**States:** N/A; the checklist itself is the empty/progress/complete state machine.

**Design requirements:** Standard card/list layout, `StatusBadge` reusing the primary/muted token pair.

**`[v5 proposal]` interaction improvements:** None surfaced; the derived-state (no manual dismissal) design correctly avoids a stale checklist.

---

## Legacy redirect shims

Not live screens; each is a pure server-side `redirect()` with no rendered UI, listed here so every `page.tsx` under `apps/app` has exactly one status per the acceptance criteria.

| Route | Redirects to | Evidence |
|---|---|---|
| `/availability` | `/plans` | `apps/app/app/(authenticated)/availability/page.tsx` |
| `/availability/new` | `/plans/new` | `apps/app/app/(authenticated)/availability/new/page.tsx` |
| `/availability/[recordId]/edit` | `/plans/{recordId}/edit` | `apps/app/app/(authenticated)/availability/[recordId]/edit/page.tsx` |
| `/leave-balances` | `/people/{personId}` if `?personId=` present, else `/people` | `apps/app/app/(authenticated)/leave-balances/page.tsx` |
| `/settings` | `/settings/general` | `apps/app/app/(authenticated)/settings/page.tsx` |
| `/setup` | `/settings/getting-started` (S-30) | `apps/app/app/(authenticated)/setup/page.tsx` |

All six preserve only the `org` query parameter via `withOrg()`; `personId`/`startsAt` and any other incoming params are silently dropped, a confirmed functional gap for the `/availability/*` group (see "What changed from v4.1" #5).

**`[v5 proposal]`** Have `withOrg()` (or the individual redirect handlers) forward the full incoming query string, not just `org`, so old bookmarks/links to `/availability/new?personId=…&startsAt=…` keep working. *Criterion 7 (Navigation and wayfinding): deep-link correctness.*

---

## Error and empty state components

### E-01: Empty state

**Component:** `apps/app/components/states/empty-state.tsx` (`EmptyState`), wrapping the design-system `Empty`/`EmptyHeader`/`EmptyTitle`/`EmptyDescription`/`EmptyContent` primitives. Optional `title`, required `description`, optional `actionSlot`.

Brief, calm sentence; CTA only if a primary action creates the first record. No illustrations. Confirmed clean of "Oops"/"Nothing here yet"/"Looks like" across every empty-state instance read in this audit.

### E-02: Data fetch error

**Component:** `apps/app/components/states/fetch-error-state.tsx` (`FetchErrorState`). Default title: `"Unable to load {entityName}"`. **Default description (corrected against v4.1):** "Try again. If the issue continues, check the Xero connection and contact support with this page name.": not the shorter "Unable to load [entity]. Try again or contact support if the issue continues." v4.1 quoted. Optional `retrySlot` for a "Try again" button. No technical detail surfaced to any role in the instances read.

### E-03: 404

**Component:** `apps/app/app/(authenticated)/not-found.tsx`, using the same `Empty`/`EmptyHeader`/`EmptyTitle`/`EmptyDescription`/`EmptyContent` primitives. Title "Page not found", description "The page or resource you were looking for does not exist or you do not have access to it.", CTA "Go to Dashboard" → `/`. **Corrections against v4.1:** no wordmark element exists on the page itself (the ambient sidebar wordmark from the parent `AppLayout` remains visible since this route renders inside it, but the page's own content carries none); it is not fully chromeless: the global sidebar persists around it, since the file lives under `(authenticated)`. **No global (unauthenticated) 404 exists**: a repo-wide check confirmed there is no `apps/app/app/not-found.tsx`; unmatched routes outside the authenticated tree fall through to Next.js's default behaviour.

### E-04: Permission denied

**Component:** `apps/app/components/states/permission-denied-state.tsx` (`PermissionDeniedState`). Default title "Permission Denied", description "You do not have permission to view this page.", CTA "Go to Dashboard" → `/`. Matches v4.1 exactly. Triggered by `PermissionDeniedError` from `requirePageRole()`, caught either by the shared `apps/app/app/(authenticated)/error.tsx` boundary (most screens) or by a local `try/catch` inside the page itself (`/leave-approvals`; `/dashboard`'s `dashboard-body.tsx` also renders it inline for a missing user): this is an inconsistent pattern across screens, not a single mechanism (see Conflicts found #5).

### E-05: Xero sync failed (inline)

**Component:** `apps/app/components/states/xero-sync-failed-state.tsx` (`XeroSyncFailedState`). Not a full screen; used inline on `/plans`, `/leave-approvals`, `/people/[personId]`, `/calendar` (popover), and `/sync`.

**Confirmed, material correction against v4.1:** the badge is **hardcoded to the literal text "Xero sync failed"** regardless of `failed_action`: there is no conditional rendering based on which action (submit/approve/decline/withdraw) failed. The `message` body text is `record.xeroWriteError`, produced by `toPlainLanguageMessage()` in `packages/xero/src/write/types.ts`, which selects copy purely by `XeroWriteError.code` (`auth_error`, `conflict_error`, `network_error`, `not_found_error`, `rate_limit_error`, `region_not_supported_error`, `unknown_error`, `validation_error`): never by which action was attempted. `failed_action` is stored and used only to decide which retry button (`retry_approval`/`retry_decline`/etc.) to render, never composed into the visible copy. v4.1's requirement that the badge name the failed action, e.g. "Submit to Xero failed", is **not met anywhere in the shipped product**.

Styling uses `statusToneClasses.failed` (`bg-error-container text-destructive ring-destructive/30`) and a destructive `Badge` with `AlertTriangleIcon`: the `error`/red family, not amber (no amber token exists, see Design system foundations). Two action slots: `retrySlot` (re-attempts the same synchronous write) and `revertSlot` (label varies by call site: "Revert to draft" on `/plans`, "Revert to pending" on `/leave-approvals`: both functionally equivalent to v4.1's "Save as draft", differently worded).

**`[v5 proposal]`** Compose `failed_action` into the visible message ("Approve to Xero failed: {plain-language reason}") instead of relying on the badge's static text and surrounding page context to convey which action failed. *Criterion 4 (Error recovery): this is the single most concrete, repeated finding in this audit: E-05 exists specifically to solve this and does not.*

---

## Proposed new screens

No new full screens are proposed. Every functional gap surfaced in this audit (missing filters, disabled buttons, unwired server actions, unrendered token history) is an improvement to an *existing* screen, tagged `[v5 proposal]` in that screen's own entry, not a case for a screen that does not exist today. The one candidate considered and rejected for this section:

**A dedicated `/support` page.** `apps/api` exposes `POST /api/support/github-issue` (plus an audit-persistence helper), but no `apps/app` page calls it or renders a support-request form. This could justify a `[proposed catalogue addition]`, but its intended audience, placement, and whether it is meant to be user-facing at all cannot be determined from code or governing files alone (no PRODUCT.md or CLAUDE.md reference to a user-facing support screen). Recorded in Decisions required instead of proposed here, per the constraint against inventing screen purpose.

---

## Resolved decisions

Carried forward from v4.1 (binding from 27 May 2026) unless code contradicts them, in which case the contradiction is flagged rather than the decision silently overwritten.

| # | Decision | Detail | Screens | v5 status |
|---|---|---|---|---|
| 1 | **Leave balance editability** | Balances are read-only and locked when Xero is connected. Admin-managed manual balances are editable only when Xero is not connected. Two panel states required. | S-09 | **Refined, not contradicted.** The actual condition is more granular than a strict binary: the manual editor keys off org-wide connection health (`hasActiveXeroConnection`), independent of this specific person's link status, and a third state exists (connection active, person unlinked) where neither panel renders. See "What changed from v4.1" #22. |
| 2 | **Standard disconnect retains all history** | A standard Xero disconnect keeps all historical data; only the destructive option clears data. | S-20 | **Confirmed in code.** Exact toast copy differs ("Xero disconnected. Historical data is now read-only." / "...and Xero-linked data purged.") but the two-tier distinction holds. |
| 3 | **Withdraw is in phase-one scope** | Employees can withdraw own `submitted`/`approved` leave; admins can withdraw any. Synchronous Xero write, `failed_action = withdraw` on failure. | S-09, S-10, E-05 | **Contradicted.** Withdraw does not exist as a UI action on either S-09 or S-10; grepped both directories with zero functional matches. Withdraw does exist on `/plans` (row-level action), which was not the location this decision specified. See "What changed from v4.1" #20 and Decisions required. |
| 4 | **S-02 is Clerk-hosted** | No custom organisation-selection route. | S-02 | **Contradicted.** `/session-tasks/choose-organization` is a real, project-owned route (required by Clerk's session-tasks flow), rendering inside the branded `(auth)` layout. Its *content* is a thin Clerk `TaskChooseOrganization` wrapper with no custom logic, so the decision's intent (no custom business logic) survives even though its literal claim (no route) does not. |
| 5 | **S-14 route is `/feeds/[feedId]`** | The `/feed/[feedId]` variant is retired. | S-14 | **Confirmed.** Only `/feeds/[feedId]` exists in code; no singular `/feed/` route found. |

---

## Conflicts found

Every case in this audit where files, catalogue, and code disagreed, with a recommended consolidated rule. Numbered independently of the "What changed from v4.1" table for cross-reference clarity; several restate items from that table with their recommended resolution made explicit.

1. **Border radius.** `DESIGN.md`'s frontmatter/body (20/16/14/12px) versus v4.1's table (16/12px) versus the CSS (`globals.css` confirms 20/16/14/12px exactly). **Recommended rule:** `DESIGN.md` and the CSS are correct and mutually consistent; v4.1's table was simply wrong. No code change needed; only the documentation needed correcting (done in this version).

2. **Frost and backdrop blur.** `DESIGN.md` mandates frost fill plus blur on every elevated transient surface, with opaque fallbacks and `prefers-reduced-transparency` handling. The codebase implements blur in exactly one place (the sticky header), with no opaque fallback even there, and zero frost/blur on `Dialog`, `Popover`, `Sheet`, `DropdownMenu`, `Command`, or the toast primitive. **Recommended rule:** this is a genuine implementation gap, not a documentation error: `DESIGN.md`'s doctrine is coherent and intentional (frost as a structural "this floats" signal). Recommend closing the gap in `packages/design-system` (add frost-alpha fill, blur, opaque `@supports` fallback, and `prefers-reduced-transparency` handling to the shared `Dialog`/`Popover`/`Sheet`/`DropdownMenu`/`Command`/`Sonner` primitives) rather than weakening `DESIGN.md` to match current code, since the current flat-opaque treatment is indistinguishable from a persistent surface and undermines the "frost signals elevation" principle across the entire product. This is a code change outside this documentation-only pass's scope; flagged for the next implementation slice.

3. **Provenance colour reused for unrelated meanings.** `secondary-container` (sage, Xero-provenance) and `accent-container` (lavender, manual-provenance) are both reused as lifecycle-status colours on `/feeds` (Active/Paused) and, in one case, `accent-container` is used for a *warning/pending* state on `/plans` that `DESIGN.md` explicitly prohibits substituting purple into. **Recommended rule:** provenance tokens should never be repurposed for status/lifecycle semantics on a different entity type; feed status and pending-leave status both need their own tone (ideally from the still-missing warning/amber token, formalised as a `DESIGN.md` addition: see below) rather than borrowing sage/lavender.

4. **Withdraw location.** v4.1's carried-forward Resolved decision #3 places withdraw on S-09 and S-10; code implements it only on `/plans`. **Recommended rule:** update the Resolved decision to reflect `/plans` as the sole withdraw surface, or treat this as a real product gap and build withdraw onto S-09/S-10 as originally decided. This is a product decision, not a documentation call this catalogue can make unilaterally: see Decisions required #3.

5. **`PermissionDeniedError` handling is inconsistent across screens.** Some pages let the error bubble to the shared `apps/app/app/(authenticated)/error.tsx` boundary (e.g. `/people`); `/leave-approvals` and the dashboard's `dashboard-body.tsx` instead catch it locally and render `PermissionDeniedState` inline. Both produce the same visible E-04 output, so this is not user-visible today, but it is a maintenance inconsistency that risks silent divergence (e.g. a future page that forgets the local catch and instead shows a raw error). **Recommended rule:** standardise on the ancestor `error.tsx` boundary everywhere `requirePageRole` can throw, removing the local `try/catch` duplication.

6. **Missing formal warning/amber token.** Confirmed absent from `packages/design-system` in three independent searches. Every "needs attention but isn't failed" state in the app either borrows `error`/`error-container` (E-05, all `xero_sync_failed` treatments) or, inconsistently, raw Tailwind amber (`/settings/billing` only) or the manual-provenance lavender token (`/plans` pending status, a genuine violation). **Recommended rule:** formalise a `--color-warning`/`--color-warning-container` pair in `DESIGN.md`, sage-adjacent in lightness but visually distinct from both `error` and `accent`, and migrate the raw-Tailwind and lavender-borrowed instances to it. Recorded as a required `DESIGN.md` addition per the task's constraint against inventing an un-sanctioned hex value.

---

## Decisions required

1. **Is `<OrganizationSwitcher />` present anywhere in the product?** No occurrence was found in the header, sidebar, or any settings screen across all six research passes, yet PRODUCT.md and CLAUDE.md both name it as the mechanism for switching Clerk Organisations post-entry. Checked: `header.tsx`, `sidebar.tsx`, `custom-user-button.tsx` (imports only, not exhaustively read), all settings pages. If it exists inside `CustomUserButton` or elsewhere unexamined, say so; if it does not exist at all, that is a product-level gap this catalogue cannot silently paper over.

2. **Does the Clerk `appearance` API (`embeddedAuthAppearance`) actually apply to `TaskChooseOrganization` on S-02?** Confirmed applied to `SignIn`/`SignUp`; not confirmed for the `ChooseOrganizationTask` wrapper, which passes no `appearance` prop in the code read. Yes/no answer needed before specifying S-02's design requirements with confidence.

3. **Should withdraw be built on S-09/S-10 as the carried-forward Resolved decision states, or should that decision be retired in favour of `/plans` as the sole withdraw surface?** This changes user-visible outcomes (whether a manager can withdraw an employee's leave from the approvals queue at all) and was flagged per the task's halt-and-report criteria rather than decided unilaterally in this pass.

4. **Is a user-facing `/support` screen in scope?** `apps/api` has a working `POST /api/support/github-issue` endpoint with no `apps/app` caller. Checked: full repo glob for `**/support/**` under both apps; no UI component references the endpoint. If in scope, its intended audience (all roles? admin only?) and placement need a product decision before a screen entry can be written.

5. **Is the `/plans` "pending" status's use of `accent-container` (lavender) intentional, or should it be corrected to match `/calendar`'s sage-plus-dashed treatment for the same state?** Both are live in production code today, disagreeing with each other on the same product concept. A single-choice answer (either surface's treatment becomes canonical) unblocks Conflict #3 above.

6. **Should the always-disabled controls found in this audit (S-10's "Sync approval state"; S-25's "Sync people"/"Sync leave records" manual dispatch; S-26's "Re-run sync" for non-reconciliation run types) be wired up, or removed until they are ready?** Each is a small scope of work (a new job registration or dispatch wiring) that falls outside this documentation-only pass's remit per the task's halt-and-report criteria ("a proposed improvement that would require a new job or API surface").

---

## Version footer

**Version:** 5.0
**Date:** 16 August 2026
**Supersedes:** `ScreenCatalogue-v4.1.md` (May 2026) in full. All v4.1 content has been reconciled against the implemented code in `apps/app` as of this date; drift, undocumented routes, and unbuilt claims are recorded above rather than carried forward silently. Six new screens are catalogued for the first time (S-27 through S-30, S-31, and S-02's route correction); no screens were retired outright, though four routes resolve to redirect shims rather than live UI. Next review should re-run this reconciliation after the frost/blur, warning-token, and withdraw-location decisions (see Conflicts found and Decisions required) are resolved in code or product direction.

