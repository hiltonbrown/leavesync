# Server-Side Data Loaders

This directory contains server-only data loaders that bridge the authenticated app UI with the database query layer.

All files are marked with `"use server"` and can only be imported in server contexts (Server Components, API routes, server actions).

## Architecture

```
Page (Server Component)
  ↓
getActiveOrgContext() ← Validates clerk_org_id + organisation_id
  ↓
load*Data() ← Composes query functions
  ↓
@repo/database/src/queries/* ← Tenant-safe read operations
  ↓
Database
```

Every page follows this pattern:
1. Resolve org context (`getActiveOrgContext`)
2. Load data (`load*Data`)
3. Pass to components

## Core Helper

### `getActiveOrgContext(organisationId: string)`

**Purpose**: Validates the active organisation context.

**Responsibility**:
- Gets authenticated `clerk_org_id` from `requireOrg()`
- Validates `organisation_id` is accessible within that Clerk Org
- Returns both IDs or a safe error

**Usage**:
```typescript
// In a Server Component
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";

export default async function Page({ params }: { params: { orgId: string } }) {
  const contextResult = await getActiveOrgContext(params.orgId);
  
  if (!contextResult.ok) {
    return <div>Organisation not found or not accessible</div>; // or notFound()
  }
  
  const { clerkOrgId, organisationId } = contextResult.value;
  // Use for all data loading...
}
```

## Data Loaders

### `loadDashboardData(clerkOrgId, organisationId)`

Loads dashboard overview data.

**Returns**:
```typescript
{
  pendingApprovals: Array<{ id, personName, recordType, startsAt, endsAt }>;
  activeFeeds: Array<{ id, slug }>;
  todayAbsences: Array<{ id, personName, recordType }>;
}
```

**Usage**:
```typescript
const dataResult = await loadDashboardData(clerkOrgId, organisationId);

if (!dataResult.ok) {
  // Handle error
  return <DashboardError message={dataResult.error.message} />;
}

const { pendingApprovals, activeFeeds, todayAbsences } = dataResult.value;
return <Dashboard data={{ pendingApprovals, activeFeeds, todayAbsences }} />;
```

---

### `loadTeamCalendarData(clerkOrgId, organisationId, dateRange, filters?)`

Loads people and their availability for a calendar view.

**Parameters**:
- `dateRange`: `{ startDate: Date, endDate: Date }`
- `filters` (optional): `{ teamId?: string, locationId?: string }`

**Returns**:
```typescript
{
  people: Array<{
    id, firstName, lastName, email, teamId, locationId
  }>;
  availability: Array<{
    id, personId, recordType, startsAt, endsAt, privacyMode, contactability
  }>;
}
```

**Usage**:
```typescript
const now = new Date();
const weekStart = startOfWeek(now);
const weekEnd = endOfWeek(now);

const dataResult = await loadTeamCalendarData(
  clerkOrgId,
  organisationId,
  { startDate: weekStart, endDate: weekEnd }
);

if (!dataResult.ok) throw new Error(dataResult.error.message);

const { people, availability } = dataResult.value;
return <TeamCalendar people={people} availability={availability} />;
```

---

### `loadPersonProfileData(clerkOrgId, organisationId, personId, dateRange)`

Loads complete person profile with availability and leave balances.

**Parameters**:
- `personId`: PersonId (branded type)
- `dateRange`: `{ startDate: Date, endDate: Date }`

**Returns**:
```typescript
{
  profile: {
    id, firstName, lastName, email, employmentType, isActive,
    team: { id, name } | null,
    location: { id, name } | null
  };
  availability: Array<{
    id, recordType, startsAt, endsAt, approvalStatus, privacyMode
  }>;
  leaveBalances: Array<{ leaveTypeXeroId, balance }>;
}
```

**Usage**:
```typescript
const dataResult = await loadPersonProfileData(
  clerkOrgId,
  organisationId,
  personId as PersonId,
  { startDate: now, endDate: nextMonth }
);

if (!dataResult.ok) return notFound();

const { profile, availability, leaveBalances } = dataResult.value;
return <PersonProfile profile={profile} availability={availability} balances={leaveBalances} />;
```

---

### `loadFeedManagementData(clerkOrgId, organisationId, feedId?)`

Loads feed list and optionally detailed feed information.

**Parameters**:
- `feedId` (optional): FeedId to load detailed info

**Returns**:
```typescript
{
  feeds: Array<{ id, slug, createdAt }>;
  selectedFeed?: {
    id, slug,
    scopes: Array<{ id, ruleType, ruleValue }>,
    tokens: Array<{ id, expiresAt, revokedAt, createdAt }>
  };
}
```

**Usage**:
```typescript
// Load all feeds
const dataResult = await loadFeedManagementData(clerkOrgId, organisationId);

if (!dataResult.ok) throw new Error(dataResult.error.message);

const { feeds } = dataResult.value;
return <FeedList feeds={feeds} />;

// Load specific feed
const detailResult = await loadFeedManagementData(
  clerkOrgId,
  organisationId,
  feedId as FeedId
);

if (!detailResult.ok) return notFound();

const { selectedFeed } = detailResult.value;
return <FeedDetail feed={selectedFeed} />;
```

---

### `loadNotificationsData(clerkOrgId, filters?)`

Loads notifications for the authenticated user.

**Parameters**:
- `filters` (optional): `{ isRead?: boolean, types?: string[] }`

**Returns**:
```typescript
{
  notifications: Array<{
    id, type, payload, isRead, createdAt
  }>;
  unreadCount: number;
}
```

**Usage**:
```typescript
const dataResult = await loadNotificationsData(clerkOrgId, {
  isRead: false // Only unread
});

if (!dataResult.ok) return <NotificationsError />;

const { notifications, unreadCount } = dataResult.value;
return <NotificationCenter notifications={notifications} unreadCount={unreadCount} />;
```

## Error Handling

All loaders return `Result<T, AppError>`:

```typescript
if (!result.ok) {
  const { code, message } = result.error;
  
  switch (code) {
    case "not_found":
      // Data doesn't exist or is out of scope
      return notFound();
    
    case "unauthorised":
      // Authentication issue
      return <Unauthorized />;
    
    case "internal":
      // Database error
      return <ErrorBoundary message="Failed to load data" />;
    
    default:
      throw new Error(message);
  }
}
```

## Example: Complete Page Implementation

```typescript
// app/(authenticated)/calendar/page.tsx
import { notFound } from "next/navigation";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";
import { loadTeamCalendarData } from "@/lib/server/load-team-calendar-data";
import { startOfWeek, endOfWeek } from "date-fns";

interface Props {
  searchParams: { org?: string };
}

export default async function CalendarPage({ searchParams }: Props) {
  // Validate org
  const orgId = searchParams.org || "";
  const contextResult = await getActiveOrgContext(orgId);
  
  if (!contextResult.ok) {
    return notFound();
  }
  
  const { clerkOrgId, organisationId } = contextResult.value;
  
  // Load data
  const now = new Date();
  const dataResult = await loadTeamCalendarData(
    clerkOrgId,
    organisationId,
    {
      startDate: startOfWeek(now),
      endDate: endOfWeek(now)
    }
  );
  
  if (!dataResult.ok) {
    throw new Error(dataResult.error.message);
  }
  
  const { people, availability } = dataResult.value;
  
  // Render
  return (
    <div>
      <h1>Team Calendar</h1>
      <TeamCalendarGrid people={people} availability={availability} />
    </div>
  );
}
```

## Key Rules

1. **Always validate org context first**
   - Never assume `organisation_id` is valid
   - Use `getActiveOrgContext()` to validate and resolve

2. **Pass shaped data to components**
   - Loaders return only what's needed for rendering
   - Components never call queries directly
   - No `"use client"` components call database functions

3. **Handle errors gracefully**
   - `not_found` → Return `notFound()` or custom 404
   - `unauthorised` → Return auth error page
   - `internal` → Log and return error boundary

4. **Keep loaders thin**
   - One loader per page feature (dashboard, calendar, profile)
   - Compose query functions, don't add business logic
   - Shape data only for rendering needs

## Integration Checklist

- [ ] Server component imports from `@/lib/server/*`
- [ ] Validates org context before loading data
- [ ] Checks `result.ok` before accessing `.value`
- [ ] Passes already-shaped data to components
- [ ] Handles error codes appropriately
- [ ] No Prisma imports in page files
- [ ] No direct query function imports in components
