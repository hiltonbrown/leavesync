# Plan 025: Stop pointing in-product Help at the Mintlify Starter Kit

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- apps/docs apps/app/app/layout.tsx packages/design-system/index.tsx packages/auth/provider.tsx`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs, product
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

The authenticated app renders a Help link in Clerk's account and sign-in UI. It
points at `NEXT_PUBLIC_DOCS_URL`, which is `apps/docs`. `apps/docs` is the
unmodified Mintlify Starter Kit: it is titled "Starter Kit", its support link is
`mailto:support@mintlify.com`, its call-to-action button sends users to
`https://dashboard.mintlify.com`, and its content is Mintlify's own tutorial
pages about writing MDX.

So a signed-in customer who clicks Help in Team Calendar lands on a page that
tells them how to use Mintlify, offers them Mintlify's support address, and
invites them to sign in to Mintlify's dashboard. That is not a documentation
gap; it is the product actively directing paying users to a third party's
support desk.

The chain is short and fully traceable, which is what makes this cheap to fix
and easy to get wrong by fixing the wrong link.

## Current state

### The link chain, verified end to end

`apps/app/app/layout.tsx` lines 17-31:

```tsx
const RootLayout = ({ children }: RootLayoutProperties) => (
  <html className={fonts} lang="en" suppressHydrationWarning>
    <body suppressHydrationWarning>
      <AnalyticsProvider>
        <DesignSystemProvider
          afterSignOutUrl={env.NEXT_PUBLIC_WEB_URL}
          helpUrl={env.NEXT_PUBLIC_DOCS_URL}
          privacyUrl={webUrl("/legal/privacy")}
          termsUrl={webUrl("/legal/terms")}
        >
          {children}
        </DesignSystemProvider>
      </AnalyticsProvider>
    </body>
  </html>
);
```

`packages/design-system/index.tsx` passes it straight through, lines 30-40:

```tsx
    <ThemeProvider {...properties}>
      {auth ? (
        <AuthProvider
          afterSignOutUrl={afterSignOutUrl}
          helpUrl={helpUrl}
          privacyUrl={privacyUrl}
          termsUrl={termsUrl}
        >
```

`packages/auth/provider.tsx` hands it to Clerk, lines 65-69:

```tsx
  const options: NonNullable<AuthAppearance["options"]> = {
    privacyPageUrl: privacyUrl,
    termsPageUrl: termsUrl,
    helpPageUrl: helpUrl,
  };
```

Clerk renders `helpPageUrl` as the "Help" link in its sign-in, sign-up and user
profile surfaces.

Note the asymmetry that gives away the intent: `privacyUrl` and `termsUrl` are
built with the local `webUrl()` helper and point at real pages on the marketing
site (`/legal/privacy`, `/legal/terms`). Only `helpUrl` points at an unwritten
docs site.

### `apps/docs` is the untouched template

`apps/docs/mint.json`, first 30 lines:

```json
{
  "$schema": "https://mintlify.com/schema.json",
  "name": "Starter Kit",
  "logo": {
    "dark": "/logo/dark.svg",
    "light": "/logo/light.svg"
  },
  "favicon": "/favicon.svg",
  "fonts": {
    "family": "Plus Jakarta Sans"
  },
  "colors": {
    "primary": "#0D9373",
    "light": "#07C983",
    "dark": "#0D9373",
    "anchors": {
      "from": "#0D9373",
      "to": "#07C983"
    }
  },
  "topbarLinks": [
    {
      "name": "Support",
      "url": "mailto:support@mintlify.com"
    }
  ],
  "topbarCtaButton": {
    "name": "Dashboard",
    "url": "https://dashboard.mintlify.com"
  },
```

Its content tree is Mintlify's own tutorial:

```
apps/docs/
  introduction.mdx
  quickstart.mdx
  development.mdx
  essentials/
    code.mdx
    images.mdx
    markdown.mdx
    navigation.mdx
    reusable-snippets.mdx
    settings.mdx
  api-reference/
    introduction.mdx
    openapi.json
    endpoint/
```

None of it is about Team Calendar. The colours are Mintlify's green, not the
palette in `DESIGN.md`.

### `NEXT_PUBLIC_DOCS_URL` is optional

`packages/next-config/keys.ts` line 23:

```typescript
      NEXT_PUBLIC_DOCS_URL: z.string().url().optional(),
```

So it can legitimately be unset, and `helpUrl` becomes `undefined`. Clerk omits
the Help link entirely when `helpPageUrl` is undefined. **That is the safe
default and it is what this plan relies on.**

## Design

There are three ways to fix this, and the choice is a product decision the
executor should not make alone.

**Option A: unwire the link (recommended for this plan).** Stop passing
`helpUrl` from `apps/app/app/layout.tsx`. Clerk drops the Help link. Nothing
points at the starter kit. Reversible in one line the moment real docs exist.

**Option B: point Help at a real support surface.** Repoint `helpUrl` at
something that exists, for example a `/legal/support` or `/contact` page on the
marketing site, using the same `webUrl()` helper as privacy and terms.
Requires that page to exist.

**Option C: write the documentation.** Replace `apps/docs` content and
branding with Team Calendar's. Correct in the long run, out of proportion as a
fix for a bad link, and a substantial writing task rather than an engineering
one.

**This plan implements Option A**, and Step 2 checks whether Option B is
available at no extra cost (if a support page already exists on the marketing
site, pointing at it is strictly better than removing the link). Option C is
recorded as a follow-up.

Option A is not "hiding the problem". The current state is worse than no Help
link: an absent link tells the user nothing, whereas the present one tells them
something false and routes them to a competitor's support address.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bun run build
```

To see the change in a browser:

```
bun run dev                # apps/app on port 3000
```

## Scope

**In scope:**

- `apps/app/app/layout.tsx` (one prop)
- `apps/web/app/layout.tsx` or equivalent, **only if** it also passes a
  `helpUrl`. Check; do not assume.

**Explicitly out of scope:**

- `apps/docs` contents, branding, `mint.json`, or deletion. Rewriting the docs
  is Option C and is a separate piece of work. Deleting the app entirely is a
  bigger decision than this plan should make.
- `packages/design-system/index.tsx` and `packages/auth/provider.tsx`. The
  `helpUrl` prop and the `helpPageUrl` mapping are correct plumbing and should
  stay, so the link can be reinstated in one line later.
- `NEXT_PUBLIC_DOCS_URL` itself. Leave the variable declared; `apps/docs` may
  still be served and linked from elsewhere.
- `privacyUrl` and `termsUrl`. Both point at real pages and are correct.
- Writing any documentation.

## Git workflow

```
git checkout -b fix/unwire-starter-kit-help-link
```

Commit message:

```
fix(app): stop linking in-product Help to the unwritten docs site
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline and see the problem

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0.

Then confirm the starter-kit content is really what ships:

```
grep -n "\"name\"\|mintlify" apps/docs/mint.json | head
```

**Expected**: `"name": "Starter Kit"`, a `mailto:support@mintlify.com` support
link and a `https://dashboard.mintlify.com` CTA.

### Step 2: Check whether a real support page exists

Before removing the link, see if Option B is available for free:

```
ls apps/web/app
grep -rn "support\|contact" apps/web/app --include=*.tsx -l 2>/dev/null | head
```

Look for a route such as `/contact`, `/support` or `/legal/support` in
`apps/web`.

**If one exists**: repoint `helpUrl` at it using the existing `webUrl()` helper,
exactly as `privacyUrl` and `termsUrl` do:

```tsx
          helpUrl={webUrl("/support")}
```

Then skip Step 3 and go to Step 4. Say clearly in your report that you took
Option B and which page you pointed at.

**If none exists**: proceed to Step 3 (Option A).

Do not create a support page as part of this plan. That is content work with
legal and operational implications (who answers it?).

### Step 3: Unwire the Help link

Edit `apps/app/app/layout.tsx`. Remove the `helpUrl` prop from
`DesignSystemProvider`, leaving the other three:

```tsx
        <DesignSystemProvider
          afterSignOutUrl={env.NEXT_PUBLIC_WEB_URL}
          privacyUrl={webUrl("/legal/privacy")}
          termsUrl={webUrl("/legal/terms")}
        >
```

Add a comment above the provider recording why, so nobody re-adds it without
thinking:

```tsx
        {/*
          No helpUrl: apps/docs is still the unmodified Mintlify Starter Kit,
          so linking Help there sends users to Mintlify's tutorial content and
          support address. Clerk omits the Help link when helpPageUrl is
          undefined. Restore this prop once real documentation exists.
        */}
```

Check whether `env.NEXT_PUBLIC_DOCS_URL` is now unused in this file. If it is,
that is fine: `env` is still used for `NEXT_PUBLIC_WEB_URL`. Do not remove the
`env` import. `bun run check` will flag a genuinely unused import.

**Verify**:

```
bun run typecheck
bun run check
grep -c "helpUrl" apps/app/app/layout.tsx
```

**Expected**: typecheck and check exit 0; the grep prints `0`.

### Step 4: Check the other apps

```
grep -rn "helpUrl" apps --include=*.tsx | grep -v node_modules
```

**Expected**: no remaining occurrences in `apps/` other than the one you set in
Step 2 (Option B only).

If `apps/web` or `apps/api` also passes a `helpUrl`, apply the same treatment.
If neither does, say so.

### Step 5: Verify in the running app

```
bun run dev
```

Open `http://localhost:3000`, sign in, and open the Clerk user button menu and
the account page.

**Expected (Option A)**: no Help link appears anywhere in Clerk's UI. Privacy
and Terms links are still present and still resolve to the marketing site.

**Expected (Option B)**: the Help link appears and resolves to the support page
you chose, not to a Mintlify page.

If you cannot run a browser in this environment, say so explicitly rather than
claiming the step passed. The static checks in Steps 3 and 4 are necessary but
not sufficient for a UI change.

### Step 6: Full verification

```
bun run check
bun run typecheck
bun run test
bun run build
```

**Expected**: all four exit 0.

## Test plan

No unit tests. This is a single prop on a root layout, and the assertion that
matters ("no Help link renders") is a property of Clerk's component tree, not
of this repo's code. A test that asserts `helpUrl` is absent from a JSX literal
would test the file's text, not the behaviour.

The verification is Step 5, done in a browser, plus the Step 4 grep proving no
other app still passes the prop.

If the user later takes Option C and writes real documentation, the reinstated
`helpUrl` should be verified the same way: by clicking it.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with an unchanged test count.
4. `bun run build` exits 0.
5. `grep -rn "helpUrl" apps --include=*.tsx | grep -v node_modules` returns
   either nothing (Option A) or exactly one line pointing at a
   `webUrl(...)`-built marketing-site path (Option B). It must **not** return a
   line containing `NEXT_PUBLIC_DOCS_URL`.
6. Step 5 was performed in a browser and its result recorded, or its omission
   was stated explicitly.
7. `git diff --name-only` lists at most `apps/app/app/layout.tsx`.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **`apps/docs` turns out to have real Team Calendar content** that the
  `mint.json` branding merely fails to reflect. Read
  `apps/docs/introduction.mdx` and `apps/docs/quickstart.mdx` before assuming.
  If the content is genuine, the correct fix is rebranding `mint.json`, not
  unwiring the link, and the user should decide. Report what you found.
- **The Help link still renders after Step 3.** That would mean Clerk falls
  back to a default help URL when `helpPageUrl` is undefined, which this plan
  assumes it does not. Report the URL it renders and stop.
- **Removing the prop breaks the build or the typecheck.** `helpUrl` is
  declared optional in `DesignSystemProviderProperties`
  (`packages/design-system/index.tsx` line 11: `helpUrl?: string;`), so it
  should not. If it does, something else depends on it being passed; report
  what.
- **You are tempted to delete `apps/docs`.** Do not. It is a workspace with a
  port allocation, a `NEXT_PUBLIC_DOCS_URL` variable, a CI-adjacent
  `mintlify broken-links` lint script, and possibly a deployment. Removing it
  is a separate decision.

## Maintenance notes

- **The plumbing survives deliberately.** `helpUrl` remains a supported prop
  through `DesignSystemProvider` and `AuthProvider` down to Clerk's
  `appearance.options.helpPageUrl`. Reinstating the link when documentation
  exists is one line in `apps/app/app/layout.tsx`. Do not "clean up" the
  unused prop from the design system or auth packages; that would turn a
  one-line restoration into a three-package change.
- **The template-leftover pattern is worth a sweep.** `apps/docs` is not the
  only next-forge artefact still wired into the product: `CLAUDE.md` lists ten
  packages as "Not in use", `biome.jsonc` excludes paths for two of them (plan
  022), and `packages/notifications/keys.ts` declares Knock variables the
  product does not use (plan 023). When auditing, "does this string mention a
  vendor we do not use?" is a productive grep.
- **If Option C is ever taken**, the docs need more than content: `mint.json`
  carries Mintlify's green palette, while `DESIGN.md` defines this product's
  colour tokens. Rebranding and writing are one task, not two, and the Help
  link should stay unwired until both are done.
- **Related plans**: plan 023 removes the Knock configuration and rewrites the
  `.env.example` files, which mention `NEXT_PUBLIC_DOCS_URL`. Plan 026
  corrects documentation drift in `AGENTS.md`, `GEMINI.md` and `CLAUDE.md`.
  Neither conflicts with this one.
