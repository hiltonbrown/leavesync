# Plan 032: Stop serialising encrypted Xero tokens into the client payload

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- "apps/app/app/(authenticated)/settings/integrations" packages/database/prisma/schema.prisma`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.
>
> **Secrets rule for this plan**: you will be looking at network payloads that
> may contain encrypted token material. Do not copy any observed value into a
> file, a commit message, a test fixture or your report. Describe what you saw
> by field name only.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none. Plan 031 touches the same client components for a
  different reason; see "Git workflow".
- **Category**: security
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

Two server components load Xero connections with an unrestricted `include` and
pass the resulting rows straight to `"use client"` components as props:

```typescript
  const organisations = await database.organisation.findMany({
    where: { archived_at: null, clerk_org_id: orgId },
    orderBy: [{ created_at: "asc" }, { name: "asc" }],
    include: { xero_connection: { include: { xero_tenant: true } } },
  });

  return <XeroClient organisations={organisations} />;
```

There is no `select`, so every column of `XeroConnection` comes back. That
model holds the OAuth token material:

```prisma
  access_token_encrypted           String                 @default("")
  access_token_iv                  String?
  access_token_auth_tag            String?
  refresh_token_encrypted          String                 @default("")
  refresh_token_iv                 String?
  refresh_token_auth_tag           String?
  token_key_version                Int                    @default(1)
  token_encrypted_at               DateTime?
```

Anything a server component passes as a prop to a client component is
serialised into the React Server Components payload and sent to the browser.
So every admin who opens the Xero settings page receives, in their browser:
the AES-256-GCM ciphertext of the access token, the ciphertext of the refresh
token, both initialisation vectors, both authentication tags, and the key
version.

`CLAUDE.md` states the rule this breaks in three separate places: "No tokens or
raw payloads exposed to client", "Xero tokens encrypted at rest using
AES-256-GCM; never stored in plaintext", and "No secrets in client bundles".

**How bad is it?** The ciphertext is not directly usable: decryption needs
`XERO_TOKEN_ENCRYPTION_KEY`, which lives only on the server. So this is not an
immediate account takeover. It is still a serious defect, for reasons that do
not depend on breaking AES:

- The payload lands wherever browser traffic lands: disk cache, proxy logs,
  browser extensions, error-reporting tools that capture network activity, and
  any screen-sharing or session-replay tooling.
- It moves the encrypted material outside the trust boundary the encryption was
  designed around. The threat model for encryption at rest is "an attacker who
  reads the database". Shipping ciphertext plus IV plus auth tag to every
  admin's browser widens that to "an attacker who reads any admin's browser
  storage", which is a much larger set.
- If `XERO_TOKEN_ENCRYPTION_KEY` is ever exposed (a leaked environment
  variable, a misconfigured log, a compromised deploy), the blast radius now
  includes every ciphertext that was ever shipped to a browser, not just the
  database at the moment of compromise. Encryption at rest buys you time after a
  breach; distributing the ciphertext spends it in advance.
- `refresh_token_encrypted` is the long-lived credential. Access tokens expire;
  refresh tokens are what a persistent attacker wants.

The fix is small: name the columns the page actually needs. Both pages already
know which fields they render, because the client components destructure them.

## Current state

### The two leaking pages

`apps/app/app/(authenticated)/settings/integrations/xero/page.tsx` in full:

```typescript
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { Metadata } from "next";
import { requirePageRole } from "@/lib/auth/require-page-role";
import { XeroClient } from "./xero-client";

export const metadata: Metadata = {
  description: "Manage Xero connections for each payroll organisation.",
  title: "Xero - Settings - Team Calendar",
};

export default async function XeroPage() {
  await requirePageRole("org:admin");

  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Organisation context is required.");
  }

  const organisations = await database.organisation.findMany({
    where: {
      archived_at: null,
      clerk_org_id: orgId,
    },
    orderBy: [{ created_at: "asc" }, { name: "asc" }],
    include: {
      xero_connection: {
        include: {
          xero_tenant: true,
        },
      },
    },
  });

  return <XeroClient organisations={organisations} />;
}
```

`apps/app/app/(authenticated)/settings/integrations/page.tsx` is identical
apart from the metadata and the component it renders (`IntegrationsClient`).

Note both pages are correctly gated: `requirePageRole("org:admin")` and a
`clerk_org_id` filter. **This is not a cross-tenant leak.** It is admins
receiving material their own product tells them they never will.

### The client components declare exactly what they need

`apps/app/app/(authenticated)/settings/integrations/xero/xero-client.tsx`
lines 1-35:

```tsx
"use client";

import type {
  Organisation,
  XeroConnection,
  XeroTenant,
} from "@repo/database/generated/client";
...
type OrganisationWithXero = Organisation & {
  xero_connection: (XeroConnection & { xero_tenant: XeroTenant | null }) | null;
};

interface XeroClientProps {
  organisations: OrganisationWithXero[];
}
```

The prop type is the full Prisma row type. That is what makes the leak
invisible in review: the types agree, the compiler is happy, and nothing in the
signature says "this includes secrets".

`integrations-client.tsx` and `matches-client.tsx` have the same shape (see
plan 031, which addresses the typing pattern; this plan addresses the data).

### The token columns

`packages/database/prisma/schema.prisma` lines 441-463:

```prisma
model XeroConnection {
  id                               String                 @id @default(uuid()) @db.Uuid
  clerk_org_id                     String
  organisation_id                  String                 @unique @db.Uuid
  status                           xero_connection_status @default(pending)
  access_token_encrypted           String                 @default("")
  access_token_iv                  String?
  access_token_auth_tag            String?
  refresh_token_encrypted          String                 @default("")
  refresh_token_iv                 String?
  refresh_token_auth_tag           String?
  xero_authorisation_connection_id String?
  token_key_version                Int                    @default(1)
  token_encrypted_at               DateTime?
  expires_at                       DateTime
  last_refreshed_at                DateTime?
  last_connected_at                DateTime?
  last_disconnected_at             DateTime?
  last_error_code                  String?
  last_error_message               String?
  stale_since                      DateTime?
  revoked_at                       DateTime?
  disconnected_at                  DateTime?
```

Eight columns must never reach a client: the six token fields,
`token_key_version` and `token_encrypted_at` (both of which describe the
encryption scheme and help an attacker who has ciphertext).

## Design

Replace `include` with an explicit `select` on both pages, naming only the
columns the client components render, and define one shared view type so the
two pages cannot drift apart.

**Allowlist, not denylist.** Do not write `omit: { access_token_encrypted:
true, ... }`. A denylist fails open: a column added to `XeroConnection` next
year is shipped to the browser unless someone remembers to add it. A `select`
fails closed.

Put the shared type and the `select` object in one module both pages import, so
the next page that needs Xero connection data has an obvious right answer.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bun run dev                # needed to inspect the RSC payload in Step 2 and Step 6
```

## Scope

**In scope:**

- `apps/app/app/(authenticated)/settings/integrations/xero/page.tsx`
- `apps/app/app/(authenticated)/settings/integrations/page.tsx`
- `apps/app/app/(authenticated)/settings/integrations/xero/xero-client.tsx`
  (prop type only)
- `apps/app/app/(authenticated)/settings/integrations/integrations-client.tsx`
  (prop type only)
- A new shared module for the select and the view type, co-located under
  `apps/app/app/(authenticated)/settings/integrations/`

**Explicitly out of scope:**

- The database schema. The columns are correct where they are.
- `packages/xero`. Token handling on the server is not changed.
- The two server actions files in the same directories. They do not pass rows
  to the client.
- `matches-client.tsx`. It imports `Person` and `XeroPersonMatch`, neither of
  which holds credentials. Plan 031 covers its typing.
- Moving these queries into a service package. That is the boundary question
  in plan 031 and it is a larger change; this plan fixes the leak where it is.
- Any rendering, styling or behaviour change. The client components must render
  identically.

## Git workflow

```
git checkout -b fix/stop-leaking-xero-token-material
```

Commit message:

```
fix(app): select only non-secret Xero connection fields for the client
```

**Ordering with plan 031**: plan 031 changes how these client components are
*typed* (moving them off raw Prisma row types onto view models). This plan
changes what *data* reaches them. They overlap in the same four files. **Land
this one first**: it is the security fix, it is smaller, and plan 031's view
models can then be built on the select this plan introduces.

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0. Record the test count.

### Step 2: Observe the leak

This step is what turns a plausible finding into a confirmed one. Do it before
changing anything.

```
bun run dev
```

Sign in as an org admin and open `/settings/integrations/xero` on an
organisation that has a connected Xero file. Open the browser devtools Network
tab, find the document or RSC request for that route, and search the response
body for the string `access_token_encrypted`.

**Expected**: the field name appears in the payload.

**Record only that the field name was present.** Do not copy the value into
your report, your notes, or anywhere else. If the field name is present, the
value is too, and that is all anyone needs to know.

**If the field name does not appear**, Next.js may be pruning unused props in
this configuration. That would change the severity substantially. Report what
you observed and go to STOP conditions rather than proceeding on an unconfirmed
premise.

If you cannot run a browser in this environment, say so explicitly. You can
still complete the fix, but you must not claim the leak was observed.

### Step 3: Determine exactly which fields the clients use

Read both client components in full and list every field they read from
`organisation`, `xero_connection` and `xero_tenant`.

```
grep -n "xero_connection\.\|xero_tenant\.\|organisation\." "apps/app/app/(authenticated)/settings/integrations/xero/xero-client.tsx" "apps/app/app/(authenticated)/settings/integrations/integrations-client.tsx"
```

Also check what they pass down to any child component, and what
`ProviderStatusBadge` (imported by `xero-client.tsx`) requires.

Write the list down. It is the `select` object. Expect it to include things
like `status`, `expires_at`, `last_connected_at`, `last_error_code`,
`last_error_message`, `revoked_at`, `disconnected_at`, and on the tenant side
`tenant_name` and `payroll_region`. **Derive the real list from the code, not
from this paragraph.**

### Step 4: Create the shared select and view type

Create
`apps/app/app/(authenticated)/settings/integrations/_connection-view.ts`:

```typescript
import "server-only";

import type { Prisma } from "@repo/database/generated/client";

/**
 * Fields of a Xero connection that are safe to send to the browser.
 *
 * This is an allowlist and must stay one. XeroConnection holds the AES-256-GCM
 * ciphertext of the access and refresh tokens together with their IVs, auth
 * tags and key version. Anything a server component passes to a "use client"
 * component is serialised into the RSC payload and delivered to the browser, so
 * an unrestricted include ships that material to every admin's machine.
 *
 * Add a field here only after confirming the client renders it. Never convert
 * this to an omit: a denylist fails open the next time a column is added.
 */
export const connectionViewSelect = {
  // ... the exact field list derived in Step 3
} satisfies Prisma.XeroConnectionSelect;

export const organisationWithConnectionSelect = {
  // ... organisation fields the clients use
  xero_connection: {
    select: {
      ...connectionViewSelect,
      xero_tenant: {
        select: {
          // ... tenant fields the clients use
        },
      },
    },
  },
} satisfies Prisma.OrganisationSelect;

export type OrganisationWithConnectionView =
  Prisma.OrganisationGetPayload<{
    select: typeof organisationWithConnectionSelect;
  }>;
```

The `satisfies` operator gives you the compile-time check that every named
field exists on the model, without widening the inferred type. `CLAUDE.md`
forbids unjustified `as` casts; `satisfies` avoids needing one.

**Verify**:

```
bun run typecheck
```

**Expected**: exits 0. A misspelled column name is a compile error here, which
is the point.

### Step 5: Use the select on both pages and narrow both prop types

In `apps/app/app/(authenticated)/settings/integrations/xero/page.tsx`, replace
the `include` with the shared select:

```typescript
  const organisations = await database.organisation.findMany({
    where: {
      archived_at: null,
      clerk_org_id: orgId,
    },
    orderBy: [{ created_at: "asc" }, { name: "asc" }],
    select: organisationWithConnectionSelect,
  });
```

Do the same in
`apps/app/app/(authenticated)/settings/integrations/page.tsx`.

Then narrow both client components' prop types. In `xero-client.tsx`, replace:

```tsx
import type {
  Organisation,
  XeroConnection,
  XeroTenant,
} from "@repo/database/generated/client";
...
type OrganisationWithXero = Organisation & {
  xero_connection: (XeroConnection & { xero_tenant: XeroTenant | null }) | null;
};

interface XeroClientProps {
  organisations: OrganisationWithXero[];
}
```

with:

```tsx
import type { OrganisationWithConnectionView } from "../_connection-view";

interface XeroClientProps {
  organisations: OrganisationWithConnectionView[];
}
```

Adjust the relative import path to match the actual file location. Do the same
in `integrations-client.tsx`.

**This is the load-bearing half of the fix.** With the prop type narrowed, a
future change that reintroduces the full row is a type error rather than a
silent regression.

**Verify**:

```
bun run typecheck
bun run check
```

**Expected**: both exit 0. If the typecheck complains that a client component
reads a field the select omits, that field belongs in the select **unless it is
one of the eight forbidden ones** (the six token columns, `token_key_version`,
`token_encrypted_at`). If a client genuinely reads one of those, go to STOP
conditions.

Note: the `"server-only"` import in `_connection-view.ts` means the client
components import only its **type**, which is erased at compile time and does
not pull the module into the client bundle. Confirm `bun run build` succeeds in
Step 7; if it complains about `server-only` reaching a client component, split
the type into a separate file without the `server-only` import.

### Step 6: Confirm the leak is closed

```
bun run dev
```

Repeat Step 2's inspection on both `/settings/integrations` and
`/settings/integrations/xero`.

Search the RSC payload for each forbidden field name:

```
access_token_encrypted
access_token_iv
access_token_auth_tag
refresh_token_encrypted
refresh_token_iv
refresh_token_auth_tag
token_key_version
token_encrypted_at
```

**Expected**: none of the eight appears.

Also confirm both pages render identically to before: the connection status,
the tenant name, the error messages and the connect/disconnect controls must
all still work. This fix must be invisible to the user.

### Step 7: Full verification

```
bun run check
bun run typecheck
bun run test
bun run build
```

**Expected**: all four exit 0.

## Test plan

Add tests to whichever test files cover these pages. At `75202db` there is no
`page.test.tsx` for either integrations page; check before assuming:

```
ls "apps/app/app/(authenticated)/settings/integrations/" "apps/app/app/(authenticated)/settings/integrations/xero/"
```

Write **one test that would have caught this**, in a new
`apps/app/app/(authenticated)/settings/integrations/_connection-view.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { connectionViewSelect } from "./_connection-view";

// The eight fields on XeroConnection that describe or contain the OAuth token
// material. None may ever be selected for a payload that reaches the browser.
const FORBIDDEN_FIELDS = [
  "access_token_auth_tag",
  "access_token_encrypted",
  "access_token_iv",
  "refresh_token_auth_tag",
  "refresh_token_encrypted",
  "refresh_token_iv",
  "token_encrypted_at",
  "token_key_version",
];

describe("connectionViewSelect", () => {
  it("selects no token material", () => {
    for (const field of FORBIDDEN_FIELDS) {
      expect(connectionViewSelect).not.toHaveProperty(field);
    }
  });

  it("is an allowlist, not an omit", () => {
    // Every value must be true (a selection), never false (an exclusion).
    // An omit-shaped object would fail open when a column is added.
    expect(Object.values(connectionViewSelect).every((v) => v === true)).toBe(
      true
    );
  });
});
```

The second test is the durable one: it stops someone converting the allowlist
into a denylist later, which is the change that would silently reopen this.

This is a unit test on a constant, which is unusual but correct here: the
security property is a property of that constant, and asserting it directly is
cheaper and more reliable than asserting it through a rendered payload.

Also verify no other page ships connection rows:

```
grep -rn "xero_connection" "apps/app/app" --include=*.tsx --include=*.ts | grep -v node_modules | grep -v "\.test\."
```

Read every hit. Report any other page that passes a connection row to a client
component; if you find one, fix it with the same shared select.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with at least two more tests than the Step 1
   baseline.
4. `bun run build` exits 0.
5. `grep -c "include: {" "apps/app/app/(authenticated)/settings/integrations/xero/page.tsx" "apps/app/app/(authenticated)/settings/integrations/page.tsx"`
   prints `0` for both.
6. Neither client component imports `XeroConnection` from
   `@repo/database/generated/client`:
   `grep -c "XeroConnection" "apps/app/app/(authenticated)/settings/integrations/xero/xero-client.tsx" "apps/app/app/(authenticated)/settings/integrations/integrations-client.tsx"`
   prints `0` for both.
7. `grep -c "omit:" "apps/app/app/(authenticated)/settings/integrations/_connection-view.ts"`
   prints `0`.
8. Step 6 was performed in a browser, none of the eight forbidden field names
   appeared in either page's payload, and both pages render as before. If a
   browser was unavailable, that is stated explicitly in the report.
9. `git diff --name-only` lists only files from the "In scope" list.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **Step 2 finds no token field in the payload.** Report exactly what you
  searched and what you found. The fix is still correct as defence in depth,
  but the severity claim in this plan would be wrong and the user should know
  before it is filed as a P1.
- **A client component genuinely reads a token field.** That would be a much
  larger defect than this plan describes: it would mean client-side code is
  meant to handle token material. Report which component, which field, and
  what it does with it. Do not add the field to the select.
- **You observe a token value anywhere you did not expect** (a log file, an
  error report, a test fixture, a committed file). Do not reproduce the value.
  Report the location and the field type and recommend rotating
  `XERO_TOKEN_ENCRYPTION_KEY` and re-encrypting, then stop.
- **The `grep` sweep in the test plan finds a third page** shipping connection
  rows. Fix it with the same select if it is mechanical; report it either way.
- **`server-only` in `_connection-view.ts` breaks the client build.** Split the
  exported type into a separate module without that import and note the change.
  Do not remove `server-only` from the module holding the select object.

## Maintenance notes

- **Allowlist, never denylist.** The `select` must stay a list of fields to
  include. Prisma's `omit` is available and looks equivalent, but it fails open:
  the next column added to `XeroConnection` would be shipped to browsers
  automatically. The second test in the test plan exists to enforce this.
- **The prop type is the real guard.** Narrowing `XeroClientProps` from the
  Prisma row type to the view type means a future change that reintroduces the
  full row fails the typecheck. Reverting the prop type back to
  `Organisation & { xero_connection: XeroConnection ... }` silently reopens the
  hole, so treat that as a security-relevant change in review.
- **The general rule**: any `include` on a model holding credentials, tokens or
  raw provider payloads is a defect when the result crosses into a client
  component. Besides `XeroConnection`, the models to watch are
  `AvailabilityRecord` (`source_payload_json`, `xero_write_error_raw`) and
  `FeedToken`. Plan 013 narrows the approvals query for the same reason.
- **This is admin-only and same-tenant.** Both pages are gated on
  `requirePageRole("org:admin")` and filtered by `clerk_org_id`, so no customer
  ever saw another customer's material. That is why this is a P1 and not a P0,
  and it should be stated accurately in any incident note: the trust boundary
  was widened, not breached.
- **Related plans**: 031 (moves these and other client components off raw
  Prisma row types generally, and consolidates the deep `@repo/database/src/*`
  imports); 013 (narrows the approvals list query away from
  `source_payload_json` and `xero_write_error_raw`).
