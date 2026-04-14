# LeaveSync: Screen Catalogue v3

This document is the definitive reference for every screen in `apps/app`. Each entry covers: route, access roles, purpose, user interactions, data displayed, and design requirements for the UI designer.

**Scope decisions (12 April 2026):**
- Leave submission and approval: full in-app workflow with synchronous Xero write-back. Xero remains payroll source of truth.
- Leave submitted in LeaveSync, Xero, or both: LeaveSync is the primary submission surface; Xero-side submissions are reflected on the next inbound sync.
- Xero write failures: surfaced inline to the acting user; employee and manager notified in-app. Record remains in `xero_sync_failed` state.
- Leave balances: fetched from Xero, displayed in submission form and plans screens.
- In-app notifications: real-time delivery via SSE (Server-sent events). Vercel-compatible, no WebSocket infrastructure.
- `/plans`: forward-looking draft records only (pre-submission intentions). Confirmed leave goes through the submission workflow.
- Public holidays: auto-sourced from Nager.Date API with manual overrides.
- Analytics: basic charts included in the initial build.

---

## Design system foundations

Apply globally. Not repeated per screen.

### Colour tokens

| Token | Value | Usage |
|---|---|---|
| Brand / primary action | `#336A3B` | CTAs, active nav states, success, brand moments |
| Surface base | White / near-white | Page background |
| Surface raised | Slightly tinted | Cards, panels, sidebars |
| Surface overlay | Darker tint | Modals, popovers |
| On-surface | Dark neutral (not `#000000`) | Body text, labels |
| On-surface muted | Lower-contrast neutral | Secondary labels, placeholders, metadata |
| Destructive | Red-family | Archive, revoke, decline, disconnect |
| Warning | Amber-family | Partial sync, expiring tokens, `xero_sync_failed` state |
| Info | Blue-family | Neutral informational callouts |
| Neutral border | Not for content separation | Form inputs only |

Depth: tonal surface layering, not borders or drop shadows. Drop shadows only on floating elements (popovers, dropdowns, modals).

### Approval status colours

| Status | Colour | Usage |
|---|---|---|
| Draft | Muted neutral | Not yet submitted |
| Submitted | Amber | Awaiting manager action |
| Approved | Brand green | Confirmed in Xero |
| Declined | Red-family | Declined in Xero |
| Withdrawn | Muted neutral | Withdrawn by employee |
| Xero sync failed | Amber + warning icon | Write-back to Xero failed |

### Record type category colours

| Category | Colour family | Record types |
|---|---|---|
| Approved leave | Soft red / rose | `annual_leave`, `sick_leave`, `personal_leave`, `long_service_leave`, `unpaid_leave` |
| Public holiday | Soft purple | `public_holiday`, `holiday` |
| Manual availability | Soft teal | `wfh`, `another_office`, `limited_availability` |
| Travel / offsite | Soft blue | `travelling`, `client_site`, `offsite_meeting` |
| Development | Soft amber | `training` |
| Draft / pending | Muted grey, dashed border | Any `draft` or `submitted` approval status |
| Contractor / other | Muted neutral | `contractor_unavailable`, `alternative_contact`, `other` |

Colour is never the sole differentiator. Each status and category also has a distinct icon and label.

### Typography

Font: **Plus Jakarta Sans** (Google Fonts), variable font.

| Scale | Usage |
|---|---|
| 24–32px semibold | Page titles |
| 18–20px semibold | Section headings, card headings |
| 14–16px regular | Body text, list items |
| 13–14px medium | Labels, table headers, metadata |
| 12px regular | Timestamps, hints, captions |

### Border radius

| Element | Radius |
|---|---|
| Cards, containers, panels | 16px |
| Inputs, selects, badges, small elements | 12px |
| Buttons | 12px |

### Motion

120–180ms ease-out. No decorative animation. One exception: a subtle pulse on an actively running sync status dot.

### Spacing

Base unit 4px. Common values: 8, 12, 16, 20, 24, 32, 48px. Card internal padding: 20–24px.

### WCAG 2.2 AA

All text and interactive elements meet AA contrast. Colour is never the sole differentiator.

### Navigation shell

**Desktop:** Persistent left sidebar. Items: Dashboard, Plans, Calendar, Leave Approvals, People, Public Holidays, Feeds, Notifications (with unread badge), Analytics (expandable: Leave Reports, Out-of-Office), Settings. Active item: brand green fill, white label. Inactive: on-surface muted. Collapsible to icon-only.

**Top bar (all screens):** Workspace / organisation switcher (left). Global search (centre). Notification bell with unread count badge (right). User avatar menu (right).

**Mobile:** Bottom tab bar for the five most-used items. Remaining items in a "More" tab.

---

## Authentication

### S-01: Sign in

**Route:** `/sign-in`
**Access:** Unauthenticated

**Purpose:** Authenticate the user.

**Interactions:** Email/password or SSO (Google, Microsoft). Forgot password triggers Clerk reset. Success redirects to Dashboard.

**Design requirements:**
- Centred card, 16px radius, 40px padding, white on brand-surface background.
- Wordmark above form. Brand green on primary button and wordmark only.
- 12px radius inputs, brand green focus ring.
- No decorative imagery or marketing copy.

---

### S-02: Workspace selection

**Route:** `/workspaces`
**Access:** Authenticated, pre-workspace

**Purpose:** Workspace selection for users with multiple memberships.

**Interactions:** Select a workspace card to enter. "Create workspace" for permitted users.

**Design requirements:** Centred stack of raised-surface cards. Workspace name, role badge, last active timestamp. No sidebar.

---

## Core screens

### S-03: Dashboard

**Route:** `/dashboard` (alias `/`)
**Access:** All roles
**Country context:** Public holiday callouts filtered to the user's or organisation's location. AU: state-specific (QLD, NSW, VIC, SA, WA, TAS, ACT, NT). NZ: national plus regional anniversary days. UK: England/Wales, Scotland, or Northern Ireland set based on `region_code`.

**Purpose:** Role-appropriate at-a-glance summary.

**Interactions:** Read-only. Clicking records, people, or stat cards navigates to the relevant detail screen. Notification bell opens `/notifications`.

**Data displayed:**

*Employee:*
- Today's status (current record, if any).
- Active leave requests: status (submitted, approved, declined) with action prompts where relevant.
- Any records in `xero_sync_failed` state with a "Resolve" link.
- Upcoming approved leave and manual plans (next 14 days).
- Leave balances summary (remaining annual leave, personal leave) sourced from `leave_balances`.
- Next public holiday for their location.

*Manager:*
- Leave requests awaiting approval (count + link to `/leave-approvals`).
- Team members out today and this week.
- Upcoming peaks (multiple absences on the same date): amber highlight.
- Any team records in `xero_sync_failed` state.
- Next public holiday for the team's location(s).

*Admin:*
- Sync health: last sync, connection status, failed record count.
- Leave requests pending across the organisation.
- Active feed count and last rendered timestamps.
- Usage vs plan limits.
- `xero_sync_failed` record count with link to resolution screen.

**Design requirements:**
- Responsive grid: 2–3 columns desktop, 1 column mobile.
- Employee cards breathe; admin stat cards are denser.
- Leave balance summary (employee): horizontal strip of balance chips below the today card. Each chip: leave type name, remaining balance value and unit (days or hours per Xero region). Muted background.
- `xero_sync_failed` callout: amber-family card with warning icon. Not dismissible until resolved.
- Approval pending count (manager): prominent, links directly to `/leave-approvals`.
- No empty-state illustrations. Calm, brief sentences.

---

### S-04: Plans

**Route:** `/plans`
**Access:** All roles
**Country context:** Leave type names in the UI adapt to `country_code`. AU: "Annual Leave", "Personal/Carer's Leave", "Long Service Leave". NZ: "Annual Leave", "Sick Leave", "Bereavement Leave". UK: "Annual Leave", "Statutory Sick Pay leave". Labels are derived from the organisation's `country_code` and the leave type mapping in `packages/xero`.

**Purpose:** Surface for employees to record forward-looking intentions before formal submission. A plan is a draft record that has not yet been submitted to Xero. It is distinct from the submission workflow on `/leave-approvals` and from confirmed manual availability entries.

Plans hold records with `approval_status = 'draft'`. Once submitted, the record moves to the approval workflow and is no longer editable as a plan.

**Interactions:**
- "Add plan" opens the new plan form (`/plans/new`).
- Tab toggle: "My plans" (employee) / "Team plans" (manager).
- Filter: leave type, date range, status (draft / submitted).
- Clicking a plan row opens plan detail.
- "Submit for approval" on a draft plan: triggers the leave submission flow (confirmation modal showing leave type, dates, and remaining balance, then synchronous Xero write).
- "Delete draft" removes the plan entirely (no Xero write; it was never submitted).
- Xero-synced records are not shown here. They appear in `/calendar` and `/leave-approvals`.

**Data displayed per row:** Leave type chip, date range, duration, remaining balance for that leave type (from `leave_balances`), status badge (Draft / Submitted / Xero sync failed), created date.

**Design requirements:**
- Two-tab structure. Active tab: brand green underline.
- Draft records: muted background, dashed left border in category colour, "Draft" badge.
- `xero_sync_failed` rows: amber left border, warning icon, "Xero sync failed" badge, "Retry" and "View error" actions inline.
- "Submit for approval" button on each draft row: secondary style, not primary (the primary CTA is "Add plan").
- Remaining balance shown as a small chip beside the date range: "14 days remaining" in muted text. Pulls from `leave_balances`. If no balance data available, show "Balance unavailable" in muted text.
- "Add plan" button: primary, brand green, top right.
- Mobile: card list. Leave type chip and status badge on the first line; date range and balance on the second.

---

### S-05: New plan / Edit plan

**Route:** `/plans/new` (full page), `/plans/[planId]/edit` (intercepting-route modal overlay)
**Access:** All roles (employees create own; admins can create for others)

**Purpose:** Create or edit a draft plan (not a submission; no Xero write at this stage). The new plan form is a full page (`/plans/new`). Editing an existing plan opens as a modal dialog overlay on the plans list; the URL updates to `/plans/[planId]/edit` and the list remains visible behind the modal. Browser back button closes the modal.

**Interactions:**
- Fields: leave type (select), person (admin only; pre-filled for employee), date range, all-day toggle, start/end time (when not all-day), notes (internal).
- Leave balance display: as leave type is selected and date range is set, show the relevant balance from `leave_balances` and the calculated duration. If duration exceeds balance, show a warning (not a blocker at draft stage).
- "Save draft": creates/updates the plan with `approval_status = 'draft'`. No Xero write.
- "Save and submit": saves the plan and immediately triggers the submission flow (confirmation modal, then synchronous Xero write).
- "Cancel": returns to `/plans` without saving.

**Design requirements:**
- Single-column form, moderate width (max 640px), centred on desktop.
- Balance panel: appears to the right of the date range fields on desktop (inline, not a sidebar panel). Shows: leave type, current balance, calculated duration, remaining after this request. Updates live as form changes.
- Duration exceeds balance: amber warning beneath the balance panel. Not a blocker at draft stage; blocker only at submission.
- "Save draft" is the secondary button. "Save and submit" is the primary, brand green.
- All-day toggle: immediately below date fields. Timed fields animate in/out.
- Modal edit (S-05 edit variant): rendered within a `DialogContent` (max width 640px, scrollable content). Modal closes via cancel button, background click, or browser back button.

---

### S-06: Leave submission confirmation modal

**Component:** Modal, triggered from `/plans` ("Submit for approval") or `/plans/[planId]/edit` ("Save and submit")
**Access:** Employee submitting own leave

**Purpose:** Final confirmation before the synchronous Xero write. Gives the employee a clear summary and the opportunity to cancel before the irreversible API call.

**Interactions:**
- Read-only summary: leave type, dates, duration, remaining balance after submission.
- "Confirm and submit": triggers synchronous Xero write. Button shows a loading state during the API call (typically under 2 seconds).
- On success: modal closes, record status updates to `submitted`, success toast notification shown, in-app notification sent to the manager.
- On failure: modal remains open. Error message shown in amber callout within the modal. Two options: "Try again" and "Save as draft instead". Employee and manager receive in-app notification of the failure.
- "Cancel": closes modal, no action taken.

**Design requirements:**
- Modal: 16px radius, white surface, 400px max width.
- Summary: clean, minimal. Leave type chip, date range, duration in a compact summary card inside the modal.
- Balance row: "Remaining after this request: X days". If this would bring balance to zero or below, show an amber note. Not a blocker (Xero may allow it depending on org settings).
- "Confirm and submit" button: primary, brand green. During API call: spinner replaces label, button disabled.
- Error state: amber callout at the top of the modal. Plain-language error message (no Xero error codes or technical detail). "Try again" and "Save as draft instead" as two separate buttons below.
- Failure is not a reason to close the modal automatically. The user must choose an action.

---

### S-07: Calendar

**Route:** `/calendar`
**Access:** All roles (employees see personal view; managers and admins see team or org view)
**Country context:** Public holidays on the calendar are filtered to each location's configured holiday set. AU: state-specific. NZ: national plus regional anniversary days. UK: England/Wales, Scotland, or Northern Ireland. Source: `public_holidays` table (auto-sourced + manual overrides).

**Purpose:** Visual calendar showing availability, leave, and public holidays across individuals and teams.

**Interactions:**
- View toggles: Day, Week, Month. Default: Week.
- Previous / next navigation and date-picker to jump to a specific date.
- Scope selector (manager/admin): "My team", "All teams", individual team, individual person.
- Filter bar: record type category, approval status, person type, location.
- Clicking a record block opens a popover: person name (subject to privacy mode), record type, approval status, date range, contactability. "View record" link.
- Submitted/pending leave shown with dashed borders and amber treatment.
- Approved leave shown with solid category colour fill.
- Public holidays: full-width non-interactive banner rows per date, labelled with holiday name and country/region flag emoji.
- Clicking a blank date opens the new plan form (`/plans/new`) pre-filled with that date.

**Design requirements:**
- Week view: person rows left (sticky), date columns top (sticky). Record blocks span date range.
- Month view: standard grid. Overflow: "+N more" popover.
- Day view: single-column, all people, time slots for timed events.
- Draft records: muted fill, dashed border. Submitted records: amber-tinted fill, dashed border. Approved: solid category fill. Declined: red-tinted, strikethrough label.
- Public holiday rows: soft purple-family background, not selectable.
- `xero_sync_failed` blocks: amber fill with small warning icon. Clicking shows error detail popover.
- "Add plan" FAB on mobile, fixed bottom-right, brand green.

---

### S-08: People (staff availability)

**Route:** `/people`
**Access:** Manager (own team), Admin, Owner

**Purpose:** Browse all people with current availability status.

**Interactions:**
- Search by name or email.
- Filter: team, location, person type, current status.
- Clicking a person row opens their profile (`/people/[personId]`).
- Admin: "Add person".

**Data displayed per row:** Avatar/initials, display name, job title, team, current availability status today, contactability (if out), next return date (if on leave), any active `xero_sync_failed` indicator.

**Design requirements:**
- Current status column is the most visually prominent, not the name column.
- Status chip: category colour + icon + label. "Available": no chip.
- `xero_sync_failed` indicator: small amber warning icon in the row. Tooltip: "This person has a leave record that failed to sync with Xero."
- Next return date: muted text, relative format ("Returns Monday").

---

### S-09: Person profile

**Route:** `/people/[personId]` (intercepting-route modal overlay)
**Access:** Employee (own), Manager (team), Admin, Owner

**Purpose:** Full detail for one person: settings, leave balances, current and upcoming records. Opens as a modal dialog overlay on the people list; the URL updates to `/people/[personId]`. The browser back button closes the modal and returns to the list.

**Interactions:**
- Admin/manager: edit person settings.
- Employee: view own profile; edit permitted fields.
- Leave balances panel: shows remaining balance per leave type, sourced from `leave_balances`. Last fetched timestamp shown. "Refresh balances" button (admin) triggers `sync-xero-leave-balances` for this person.
- Add/edit/reorder alternative contacts.
- Navigate to record detail from the record list.
- Admin: archive person.

**Data displayed:**
- Person header: name, job title, team, location, person type, source system badge, active/inactive status.
- Leave balances panel (admin/manager/employee): per leave type, remaining balance, unit (days/hours).
- Current status card.
- Default settings: contactability, privacy mode, feed inclusion.
- Alternative contacts.
- Upcoming records (next 30 days): includes approval status.
- Full history: paginated, descending.

**Design requirements:**
- Modal: rendered within a `DialogContent` (max width 640px, scrollable content).
- Content layout: single column in modal (not two-column desktop layout as originally designed). Stack header, status, balances, and records vertically.
- Leave balances panel: compact table. Leave type name left, balance right (aligned). Balance in bold. Last fetched timestamp in muted 12px below the table.
- Balance of zero: red-family text. Balance within 20% of typical entitlement: amber-family text.
- Locked Xero fields: muted input background, lock icon at right edge.
- Modal closes via cancel button, background click, or browser back button.

---

### S-10: Leave approvals

**Route:** `/leave-approvals`
**Access:** Manager (own team), Admin, Owner
**Country context:** Leave type labels adapt to `country_code`. AU: Xero Payroll AU types. NZ: Xero Payroll NZ types. UK: Xero Payroll UK types. Approval status labels use plain English ("Pending approval", "Approved", "Declined") rather than Xero's internal values.

**Purpose:** Full in-app leave approval workflow. Managers review, approve, or decline leave requests submitted by their team members. Approval and decline actions write synchronously back to Xero.

**Interactions:**
- Filter: status, person, leave type, date range.
- Clicking a row expands to show full detail: leave type, dates, duration, employee notes, remaining balance after approval, submission timestamp.
- "Approve" button: opens a confirmation modal showing the summary. On confirm, synchronous Xero write. On success, status updates to `approved`; employee and manager receive in-app notifications. On failure, amber error callout in the modal; record moves to `xero_sync_failed`.
- "Decline" button: opens a decline modal with a required reason field (text input). On confirm, synchronous Xero write. On success, status updates to `declined`; employee notified in-app. On failure, same error handling as approve.
- "Request more info" (optional): sends an in-app notification to the employee with the manager's question. Does not change the record status.
- Admin view: can approve or decline on behalf of any manager within the organisation.
- "Sync now" button: manual incremental sync to refresh approval states from Xero.

**Data displayed per row:** Employee name and avatar, leave type, date range, duration, status badge, submitted at timestamp. Expanded: employee notes, remaining balance, submission history.

**Design requirements:**
- Table on desktop, card list on mobile.
- Status badges: "Pending approval" (amber, dot + label), "Approved" (brand green), "Declined" (red), "Withdrawn" (muted), "Xero sync failed" (amber + warning icon).
- "Approve" button: primary, brand green, within the expanded row. "Decline" button: secondary destructive (red-outlined). "Request more info": tertiary text button.
- Approve confirmation modal: same design as S-06 (leave submission modal), adapted for manager context. Shows employee name, leave type, dates, duration, balance impact. "Confirm approval" is the primary button.
- Decline modal: white modal, 400px max width. Required reason field (textarea). "Confirm decline" is a destructive primary button (red fill). "Cancel" is secondary.
- `xero_sync_failed` rows: amber left border. Expanded view shows plain-language error and a "Retry" button.
- Informational note (not a warning): "Approval and decline actions are written to Xero Payroll immediately." Muted, small, below the page title.
- Balance impact in the expanded row: "Remaining balance after approval: X days." If the request would exceed balance, show an amber note. Not a blocker (Xero enforces its own validation).

---

### S-11: Public holidays

**Route:** `/public-holidays`
**Access:** All roles (read); Admin, Owner (manage overrides)
**Country context:**

- **Australia:** National holidays plus state-specific holidays per location's `region_code`. QLD: Brisbane Show Day (varies by region within QLD), Easter Saturday, Easter Monday. NSW: Bank Holiday (August). VIC: Melbourne Cup Day. SA: Proclamation Day. WA: Foundation Day, Queen's Birthday (September). TAS: Royal Hobart Regatta, Eight Hours Day. ACT: Family and Community Day, Reconciliation Day. NT: Picnic Day.
- **New Zealand:** National holidays plus regional anniversary days matched to `region_code`. Auckland Anniversary (last Monday of January), Wellington Anniversary (second Monday of January), Canterbury Anniversary (second Monday of November), Otago Anniversary (second Monday of March), etc.
- **United Kingdom:** England/Wales: 8 bank holidays. Scotland: 9 bank holidays (adds 2 January and St Andrew's Day, 30 November). Northern Ireland: 10 bank holidays (adds St Patrick's Day, 17 March, and Battle of the Boyne, 12 July).

**Purpose:** View and manage public holidays per location. Admins configure overrides and custom company holidays.

**Interactions:**
- Location selector at top: tabs or dropdown per configured location.
- Year selector: defaults to current year.
- Admin: suppress a holiday (removes from calendar and calculations without deleting).
- Admin: restore a suppressed holiday.
- Admin: "Add custom holiday" modal: name, date, applies-to (this location or all locations), recurrence (one-off or annual).
- Admin: "Refresh from source" re-fetches from Nager.Date API for the selected location and year.
- Admin: delete a custom holiday.

**Data displayed per holiday row:** Date, day of week, holiday name, type badge (National / State-Regional / Custom), observed date if different, source label (Auto-sourced / Custom), admin action column.

**Design requirements:**
- Location tabs: each shows country flag emoji, location name, region code.
- Holiday rows: date left-aligned (day of week in muted text below), holiday name centre, type badge right, action column far right.
- Type badges: "National" (muted neutral), "State/Regional" (muted teal), "Custom" (muted amber).
- Observed date note: small muted text below the holiday name ("Observed Monday 27 January"). Not a separate row.
- Suppressed rows: strikethrough on holiday name, muted row opacity. "Restore" link in action column.
- Custom holidays: amber-family left border (2px).
- "Add custom holiday" modal: name field, date picker, applies-to select (this location / all locations), recurrence toggle. "Save" primary. 16px radius modal.
- Read-only view (non-admins): action column hidden. Suppressed holidays hidden entirely.
- "Refresh from source" button: secondary, per-location. "Last updated: [timestamp]" in muted text beside it.

---

### S-12: Notifications

**Route:** `/notifications`
**Access:** All roles

**Purpose:** In-app notification feed (SSE-delivered) and email notification preferences.

**SSE delivery:** Notifications are pushed via Server-sent events from `GET /api/notifications/stream`. The app establishes the SSE connection on load and maintains it while the tab is active. New notifications update the unread count badge in the top bar in real time without polling.

**Interactions:**
- Two tabs: "Notifications" (feed) and "Preferences".
- Feed tab: mark individual notifications as read (click). "Mark all as read". Infinite scroll.
- Notification bell in top bar: unread badge. Clicking the bell opens a popover showing the three most recent unread notifications with a "View all" link.
- Preferences tab: toggle matrix per notification type (in-app / email).

**Notification types and recipients:**

| Type | Employee | Manager | Admin |
|---|---|---|---|
| Leave submitted (own) | ✓ | ✓ (their team) | |
| Leave approved | ✓ | | |
| Leave declined | ✓ | | |
| Leave withdrawn | | ✓ | |
| Xero sync failed (leave action) | ✓ | ✓ | ✓ |
| Sync completed / partial / failed | | | ✓ |
| Feed token rotated | | | ✓ |
| Privacy conflict | | | ✓ |
| Missing alternative contact | ✓ | | |
| Leave peak warning | | ✓ | ✓ |
| Plan confirmed | | ✓ (their team) | |

**Design requirements:**
- Feed: vertical list. Unread: 2px brand green left border, subtle surface tint. Read: no treatment.
- Icon per notification type: small, line-weight, category-appropriate (e.g. calendar icon for leave events, warning icon for sync failures).
- Timestamp: relative ("2 hours ago"). Absolute on hover.
- "Mark all as read": low-emphasis, top right of feed.
- Popover (bell click): 320px wide, max three rows, "View all notifications" link at bottom. Each row: icon, one-line summary, relative timestamp.
- Preferences tab: table layout. Left: notification type description. Middle: in-app toggle. Right: email toggle. Pill-style toggles. On = brand green. Off = neutral muted.
- Empty feed: "You are up to date." No illustration.

---

## Feed screens

### S-13: Feeds

**Route:** `/feeds`
**Access:** Manager (read), Admin, Owner

**Purpose:** List all ICS feeds with subscription URLs and instructions for subscribing in Outlook, Google Calendar, Apple Calendar, and other clients.

**Interactions:**
- Clicking a row navigates to feed detail.
- Quick-copy subscription URL via clipboard icon (tick animation on copy).
- Admin: pause/activate toggle per row.
- Admin: "New feed".
- "How to subscribe" accordion at top of page.

**"How to subscribe" content (tabbed by client):**

- **Outlook (desktop):** File > Account Settings > Internet Calendars > New. Paste URL. Set a name. Recommended update limit: every hour.
- **Outlook (web / Microsoft 365):** Calendar > Add calendar > Subscribe from web. Paste URL.
- **Google Calendar:** Left sidebar, + next to "Other calendars" > From URL. Paste URL. Select "Add calendar". Note: Google Calendar refreshes at most every 24 hours; this interval cannot be shortened.
- **Apple Calendar (macOS):** File > New Calendar Subscription. Paste URL. Set refresh to "Every hour" (default is daily).
- **Apple Calendar (iOS):** Settings > Calendar > Accounts > Add Account > Other > Add Subscribed Calendar. Paste URL.
- **Other / generic CalDAV:** The URL is a standard iCalendar (ICS) feed compatible with any CalDAV client.

**Design requirements:**
- "How to subscribe" accordion: collapsed by default for returning users (preference persisted). Expanded on first visit.
- Accordion interior: tab strip with recognisable icons per client. Tab content: numbered step list. Google 24-hour limitation called out in a muted info note (not a warning). This is material information for users expecting real-time updates.
- Feed table/cards below. Status: Active (brand green dot), Paused (amber dot), Archived (muted dot).
- Copy icon: always visible on mobile; on hover on desktop. Tick for 1.5s on success.

---

### S-14: Feed detail

**Route:** `/feed/[feedId]` (intercepting-route modal overlay)
**Access:** Manager (read), Admin, Owner

**Purpose:** Full feed configuration, token management, and preview. Opens as a modal dialog overlay on the feeds list; the URL updates to `/feed/[feedId]`. The browser back button closes the modal and returns to the list.

**Interactions:**
- "Copy subscription URL".
- "Rotate token": confirmation modal, then immediate new token.
- "Pause" / "Activate".
- "Edit feed".
- "Preview feed": upcoming events per privacy mode tab.
- "Archive feed": destructive, confirmation required.
- "How do I add this to my calendar?": quiet link below the URL field. Opens the `/feed` how-to accordion in a modal.

**Design requirements:**
- Modal: rendered within a `DialogContent` (max width 640px, scrollable content). Content layout: single column in modal (not two-column desktop as originally designed).
- URL: monospace, masked by default. "Show" toggle reveals full URL.
- Token status: Active (green), Expiring (amber), Revoked/Expired (red). Dot + label.
- "Rotate token": secondary destructive (red-outlined).
- Preview: tabbed (Named / Masked / Private). Upcoming event rows: date, title as published, record type chip.
- Modal closes via cancel button, background click, or browser back button.

---

## Analytics

### S-15: Leave reports

**Route:** `/analytics/leave-reports`
**Access:** Manager (own team), Admin, Owner
**Country context:** Leave type labels in charts and tables adapt to `country_code`. AU: Xero Payroll AU types. NZ and UK: their respective types. Public holidays excluded from leave day calculations unless the "Include public holidays" toggle is active.

**Purpose:** Leave pattern analytics based on Xero-synced `availability_records` with `source_type` of `xero_leave` or `leavesync_leave` and `approval_status = 'approved'`.

**Interactions:**
- Date range picker: presets (this month, last month, this quarter, last quarter, this year, custom).
- Filter: team, location, person type, leave type.
- Toggle: include/exclude public holidays.
- Toggle: by person / by team aggregate.
- Export CSV.
- Clicking a chart data point drills to the underlying record list.

**Charts:**
- Leave days taken by type (stacked bar, by month).
- Leave days taken by person (bar, sortable by total).
- Leave days by team aggregate (bar).
- Peak absence heatmap calendar (colour intensity = people absent per date).
- Leave type breakdown donut (proportion of each type in period).
- Summary stat cells: total leave days, average per person, most common leave type, busiest absence date.

**Design requirements:**
- Summary stat cells: four cells in a row. Large number, label, secondary metric ("vs prior period").
- Charts: clean, minimal. No 3D. No decorative grid lines. 12px muted axis labels. Hover tooltips.
- Category colours match the global system.
- Heatmap: white (zero) to brand green (high). Labelled colour scale.
- Chart cards: white raised surface, 16px radius.
- Export: low-emphasis, top right. Icon + "Export CSV" label.
- Mobile: single-column charts. Heatmap replaced by peak dates table.

---

### S-16: Out-of-office and travel analytics

**Route:** `/analytics/out-of-office`
**Access:** Manager (own team), Admin, Owner
**Country context:** Record type labels are country-neutral canonical types. Public holiday context uses the configured holiday set for each location.

**Purpose:** Analytics on manual availability records: WFH patterns, travel, offsite, and general out-of-office trends.

**Interactions:**
- Date range picker (same presets as S-15).
- Filter: record type category, team, location, person.
- Toggle: include/exclude public holidays.
- Export CSV.
- Clicking a data point drills to the underlying record list.

**Charts:**
- WFH frequency by person (bar: days per month).
- Travel and offsite frequency by person (bar).
- Out-of-office type breakdown donut (WFH vs travelling vs client site vs training vs other).
- Team WFH pattern: stacked area chart by week (average people WFH per day of week; useful for office/desk planning).
- Most frequent travellers: top-N list (person name, total travel days).
- Summary stat cells: total WFH days, total travel days, most common type, most frequently out-of-office person.

**Design requirements:**
- Consistent chart style with S-15.
- Team WFH pattern chart clearly labelled: "Average in-office vs remote by day of week".
- Teal category colour for WFH; blue for travel. Consistent with global colour system.

---

## Settings

Settings screens share a left sub-navigation sidebar within the settings section. Sub-nav items: General, Leave Approval, Integrations, Feeds, Billing, Holidays, Audit Log. Sub-nav is separate from the main app sidebar.

### S-17: Settings > General

**Route:** `/settings/general`
**Access:** Admin, Owner
**Country context:** `country_code` drives state/region selector. AU: QLD, NSW, VIC, SA, WA, TAS, ACT, NT. NZ: Auckland, Wellington, Canterbury, Otago, Waikato, Bay of Plenty, Hawke's Bay, Marlborough, Nelson, Southland, Taranaki, Manawatu-Wanganui, Northland, Gisborne, West Coast. UK: England and Wales, Scotland, Northern Ireland. Selected `region_code` determines the public holiday set applied to this organisation.

**Purpose:** Core workspace and organisation configuration.

**Interactions:**
- Edit workspace name, default timezone (IANA).
- Edit organisation name, `country_code`, `region_code`, primary timezone.
- Save per section independently.
- Changing `country_code` or `region_code` shows an informational note: "Changing this will update the public holiday set for this organisation. Existing manual overrides are preserved."

**Design requirements:**
- Two raised cards: "Workspace" and "Organisation".
- Country select: flag icons per option.
- State/region selector: conditional on country. Searchable.
- Save button per card, not a global page save.
- Info note on country/region change: muted info style, not a warning callout.

---

### S-18: Settings > Leave approval

**Route:** `/settings/leave-approval`
**Access:** Admin, Owner

**Purpose:** Configure leave approval display behaviour and manager visibility scope.

**Interactions:**
- Toggle: show submitted (pending) leave on team calendar before approval.
- Toggle: show declined leave on the leave approvals screen.
- Toggle: notify managers when a team member's leave status changes.
- Select: approval visibility scope ("All managers see all team leave" / "Managers see only direct reports").
- Save.

**Design requirements:**
- Simple toggle/select form.
- Informational callout at top: "Leave approval actions are written to Xero Payroll immediately and cannot be undone from LeaveSync. Declined leave must be re-submitted in LeaveSync or Xero." Info style, not warning.
- Toggle rows: label left, one-line description below label, toggle right.

---

### S-19: Settings > Integrations

**Route:** `/settings/integrations`
**Access:** Admin, Owner

**Purpose:** Manage external integrations. Currently Xero only.

**Interactions:**
- View integration cards with status.
- "Connect" or "Manage" per integration.
- Future integrations shown as greyed-out "Coming soon" cards.

**Data per integration card:** Name, logo, one-sentence description, status chip, last sync timestamp (if connected).

**Design requirements:**
- Card grid, landscape orientation.
- Status: "Connected" (brand green chip), "Not connected" (muted), "Error" (red chip).
- Xero card: top-left, most prominent. Xero logo. "Sync approved leave and employee data from Xero Payroll (AU, NZ, UK). Submit and approve leave directly from LeaveSync."
- Coming soon cards: greyed out, not interactive, "Coming soon" label.

---

### S-20: Settings > Xero detail

**Route:** `/settings/integrations/xero`
**Access:** Admin, Owner
**Country context:** Payroll region (AU, NZ, UK) shown per tenant. Determines which Xero Payroll API is used for both inbound and outbound sync.

**Purpose:** Xero OAuth management and per-tenant sync configuration.

**Interactions:**
- "Connect Xero": OAuth flow.
- "Refresh connection": re-initiates OAuth.
- Per-tenant: status, last employee sync, last leave sync, last balance sync, linked organisation.
- Per-tenant: "Pause sync" / "Resume sync".
- Per-tenant: "Disconnect" (standard or destructive, clearly differentiated).
- "Run sync now" per tenant.

**Design requirements:**
- Connection status card at top with primary actions.
- Tenant cards: one per tenant. Payroll region badge (AU / NZ / UK text label, not colour-coded). Sync timestamps. Per-tenant action buttons.
- Disconnect modal: two options clearly separated. Standard described neutrally. Destructive described with amber-background panel and red "Destructive disconnect" button. The two must not look equivalent.

---

### S-21: Settings > Feeds

**Route:** `/settings/feeds`
**Access:** Admin, Owner

**Purpose:** Create and configure ICS feeds.

**Interactions:**
- "New feed": three-step form.
- Edit existing feed.
- Archive feed.

**Design requirements:**
- Three-step form with progress indicator: (1) name and scope type, (2) scope values, (3) privacy and inclusion.
- Scope type select: each option has a one-line description.
- Conditional scope value fields animate in on scope type change.
- "Create feed" active only when required fields are valid.

---

### S-22: Settings > Billing

**Route:** `/settings/billing`
**Access:** Owner only

**Purpose:** View plan, status, and usage. No checkout in initial build.

**Interactions:**
- Read-only plan detail.
- Usage counters vs limits.
- "Upgrade" / "Contact us" link.

**Design requirements:**
- Plan name prominently displayed. Status badge: Active (brand green), Cancelled (muted red), Past due (amber).
- Usage: progress bars. Amber at 80%, red at 100%.
- "Upgrade" button: secondary, not aggressive.

---

### S-23: Settings > Holidays

**Route:** `/settings/holidays`
**Access:** Admin, Owner
**Country context:** Full country-specific holiday configuration. See S-11 for AU, NZ, and UK detail. This screen is the admin configuration surface for the data displayed in S-11.

**Purpose:** Admin configuration for public holidays: suppress, restore, add custom days, refresh from API.

**Interactions:**
- Location selector. Year selector.
- Suppress / restore auto-sourced holidays.
- "Add custom holiday": name, date, applies-to, recurrence.
- "Refresh from source" per location.
- Delete custom holidays.

**Design requirements:**
- Consistent visual treatment with S-11.
- Admin action column visible. Suppress/restore controls and "Add custom holiday" button.
- Source label per row. Suppressed rows: strikethrough, muted.
- "Refresh from source": secondary button. "Last updated: [timestamp]" beside it.
- "Add custom holiday" modal: name, date picker, applies-to select, recurrence toggle. 16px radius.

---

### S-24: Settings > Audit log

**Route:** `/settings/audit-log`
**Access:** Admin, Owner

**Purpose:** Review all audit events.

**Interactions:**
- Filter: entity type, actor, action, date range.
- Expand row for before/after diff.
- Export CSV.

**Design requirements:**
- Dense table. Monospace for entity IDs and JSON diff values.
- Before/after diff: two-column in expanded row. Changed fields highlighted.
- Actor type badges: "User" (neutral), "System" (muted blue), "Sync" (muted green).
- Timestamp: relative with absolute on hover.

---

## Sync screens

### S-25: Sync health

**Route:** `/sync`
**Access:** Admin, Owner

**Purpose:** Monitor inbound Xero sync run health across all tenants.

**Interactions:**
- "Run sync now" per tenant.
- Clicking a sync run row opens S-26.
- Filter: tenant, run type, status.

**Data displayed:**
- Per-tenant summary cards: name, last successful sync, last status, records in/changed/failed, connection status, last balance sync.
- Run history table.

**Design requirements:**
- Summary cards per tenant. Running sync: pulse animation on status dot. Only purposeful animation in the product.
- Failed count in red when > 0. Dense table for run history.

---

### S-26: Sync run detail

**Route:** `/sync/[runId]`
**Access:** Admin, Owner

**Purpose:** Full detail and failed records for one sync run.

**Interactions:**
- Expand failed record for error detail.
- "Re-run sync".
- "Export failed records" CSV.

**Design requirements:**
- Large-number stat cells at top.
- Failed records: monospace IDs and error messages. Expandable rows.

---

## Error and empty states

### E-01: Empty state

Brief calm sentence. CTA only if a primary action creates the first record. No illustrations unless the context strongly benefits from one. No "Oops", "Nothing here yet", or "Looks like".

### E-02: Data fetch error

"Unable to load [entity]. Try again or contact support if the issue continues." Secondary "Try again" button. No technical detail for non-admins.

### E-03: 404

Minimal. Wordmark, "Page not found", "Go to Dashboard" link. No navigation shell.

### E-04: Permission denied

"You do not have permission to view this page." "Go to Dashboard" link.

### E-05: Xero sync failed (inline)

Not a full screen. An inline state on records in `/plans`, `/leave-approvals`, `/calendar`, and `/people/[personId]`.

**Design requirements:**
- Amber-family left border (2px) on the affected row or card.
- Warning icon inline with the record label.
- "Xero sync failed" badge in amber.
- Expanded view (on click): plain-language error message. "Retry" button (re-attempts the synchronous Xero write). "Save as draft" option to revert the record to draft state.
- Retry triggers the same synchronous write flow. Success clears the failed state. Failure refreshes the error message.

---

## Screen inventory

| ID | Screen | Route | Roles |
|---|---|---|---|
| S-01 | Sign in | `/sign-in` | Unauthenticated |
| S-02 | Workspace selection | `/workspaces` | Authenticated |
| S-03 | Dashboard | `/dashboard` | All |
| S-04 | Plans | `/plans` | All |
| S-05 | New / edit plan | `/plans/new`, `/plans/[planId]/edit` | All |
| S-06 | Leave submission confirmation | Modal component | Employee |
| S-07 | Calendar | `/calendar` | All (scoped) |
| S-08 | People (staff availability) | `/people` | Manager, Admin, Owner |
| S-09 | Person profile | `/people/[personId]` | All (scoped) |
| S-10 | Leave approvals | `/leave-approvals` | Manager, Admin, Owner |
| S-11 | Public holidays | `/public-holidays` | All (read); Admin, Owner (manage) |
| S-12 | Notifications | `/notifications` | All |
| S-13 | Feeds | `/feeds` | Manager (read), Admin, Owner |
| S-14 | Feed detail | `/feeds/[feedId]` | Manager (read), Admin, Owner |
| S-15 | Leave reports | `/analytics/leave-reports` | Manager, Admin, Owner |
| S-16 | Out-of-office analytics | `/analytics/out-of-office` | Manager, Admin, Owner |
| S-17 | Settings: General | `/settings/general` | Admin, Owner |
| S-18 | Settings: Leave approval | `/settings/leave-approval` | Admin, Owner |
| S-19 | Settings: Integrations | `/settings/integrations` | Admin, Owner |
| S-20 | Settings: Xero detail | `/settings/integrations/xero` | Admin, Owner |
| S-21 | Settings: Feeds | `/settings/feeds` | Admin, Owner |
| S-22 | Settings: Billing | `/settings/billing` | Owner |
| S-23 | Settings: Holidays | `/settings/holidays` | Admin, Owner |
| S-24 | Settings: Audit log | `/settings/audit-log` | Admin, Owner |
| S-25 | Sync health | `/sync` | Admin, Owner |
| S-26 | Sync run detail | `/sync/[runId]` | Admin, Owner |
| E-01 | Empty state | Component | All |
| E-02 | Data fetch error | Component | All |
| E-03 | 404 | `/not-found` | All |
| E-04 | Permission denied | Component | All |
| E-05 | Xero sync failed (inline) | Component | All |

---

*Last updated: April 2026. Scope decisions from 12 April 2026 review incorporated. Supersedes v2.*

---

### Uncatalogued screens (exist in app, not yet documented)

| Route | Notes |
| --- | --- |
| `/sign-up` | Clerk sign-up flow. Complement to S-01. |
| `/search` | Global search results. Referenced in nav bar description but no screen entry. |
| `/settings` | Settings section index. Likely a redirect or landing page for the settings sub-nav. |
| `/settings/members` | Team member management. Distinct from the People section. |
| `/settings/danger` | Destructive actions / danger zone. |
| `/support` | In-app support. |
| `/webhooks` | Webhook management. |
