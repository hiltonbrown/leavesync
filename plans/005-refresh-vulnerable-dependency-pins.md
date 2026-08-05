# Plan 005: Refresh the root dependency overrides that pin vulnerable versions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7821f3a..HEAD -- package.json bun.lock apps/*/package.json packages/*/package.json`
> If any manifest or the lockfile changed since this plan was written, re-run `bun audit` and compare
> against the "Current state" figures before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `7821f3a`, 2026-08-05 (refreshed after dependency drift)
- **Execution status**: BLOCKED on 2026-08-05. The isolated update clears the
  `next`, `hono` and `fast-uri` audit entries, but `bun audit` still reports a
  high-severity `sharp` advisory through `workspace:api > next`. The shared Next
  config enables production image optimisation, so this meets the plan's
  runtime-reachable-advisory STOP condition. Create and complete a narrowly
  scoped sharp/Next remediation plan, then rerun this plan's full gate.

## Why this matters

The root `package.json` has an `overrides` block that exists specifically to
force transitive dependencies onto patched versions. It was introduced in commit
`dd13079` ("chore(deps): patch high-risk runtime advisories"), so the mechanism
is working as designed. The pins have since gone stale: three of them now name
versions that are themselves inside published advisory ranges, and because they
are overrides they actively hold the whole monorepo at those versions even
though patched releases exist.

The most significant is `next`, which resolves to `16.2.10` from the stale root
override even though every direct workspace declaration has moved to `16.2.12`.
The advisory range is `>=16.0.0 <16.2.11`, so the override sits below the fix. That range carries
four high-severity advisories relevant to this codebase:

- Middleware / Proxy bypass in App Router applications. `apps/app/proxy.ts` is
  the only pre-route authentication gate in the product.
- Server-Side Request Forgery in Server Actions on custom servers.
- Server-Side Request Forgery in rewrites via attacker-controlled destination
  hostname.
- Denial of Service in App Router using Server Actions. This application is
  built almost entirely on Server Actions.

Plus five moderate advisories including unauthenticated disclosure of internal
Server Function endpoints.

## Current state

### The overrides block

`package.json`, root of the repository:

```json
  "overrides": {
    "@grpc/grpc-js": "1.14.4",
    "fast-uri": "3.1.2",
    "hono": "4.12.25",
    "next": "16.2.10",
    "parse5": "^7.2.1",
    "protobufjs": "7.6.5",
    "vite": "8.0.16",
    "ws": "8.21.0"
  },
```

### The three stale pins, verified against `bun audit` on 2026-08-05

| Package | Pinned | Advisory range | Fixed at | Latest published |
|---|---|---|---|---|
| `next` | `16.2.10` (resolved) | `>=16.0.0 <16.2.11` | `16.2.11` | direct workspaces use `16.2.12` |
| `hono` | `4.12.25` | `<4.12.34` | `4.12.34` | `4.12.34` |
| `fast-uri` | `3.1.2` | `>=3.0.0 <3.1.5` | `3.1.5` | `3.1.5` |

The other five pins (`@grpc/grpc-js`, `parse5`, `protobufjs`, `vite`, `ws`) do
not appear in the current `bun audit` output and need no change.

`next` is also declared directly in seven workspace manifests. Confirm with:

```
grep -rn '"next":' apps/*/package.json packages/*/package.json
```

`hono` and `fast-uri` are transitive only (they arrive via `inngest`, `prisma`,
`react-email` and `@sentry/nextjs`), which is exactly why they are managed
through `overrides` rather than direct dependencies.

### Baseline audit figures

At commit `7821f3a`, `bun audit` reports **43 vulnerabilities (18 high, 23
moderate, 2 low)**. This includes four high `next` advisories and three high
`fast-uri` advisories. Record the exact output before you change anything so you
can show the delta afterwards.

### Repo conventions that apply here

- Package manager is Bun (`bun@1.3.14`). The lockfile is `bun.lock` and is
  committed. Never hand-edit it; regenerate with `bun install`.
- CI runs `bun install --frozen-lockfile`, so `package.json` and `bun.lock` must
  be committed together and stay consistent.
- Conventional commits. The existing precedent for this exact kind of change is
  `dd13079 chore(deps): patch high-risk runtime advisories`.
- `packages/next-config/index.ts` carries Prisma 7 platform configuration
  (`serverExternalPackages`). A Next bump is the most likely thing to disturb it,
  so the build must be verified, not just the tests.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install / re-lock | `bun install` | exit 0, `bun.lock` updated |
| Audit | `bun audit` | see Step 4 for the expected delta |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |
| Build (required) | `bun run build` | exit 0, all apps build |
| Resolved version | `bun pm ls --all \| grep -E "next@\|hono@\|fast-uri@"` | shows the new versions |

## Scope

**In scope** (the only files you may modify):

- `package.json` (root) — the `overrides` block only
- `apps/api/package.json`, `apps/app/package.json`, `apps/web/package.json`,
  `apps/email/package.json`, `packages/design-system/package.json`,
  `packages/next-config/package.json`, `packages/seo/package.json` — only the
  `next` version specifier, and only in those that declare it
- `bun.lock` — regenerated by `bun install`, never hand-edited
- `plans/005-refresh-vulnerable-dependency-pins.md` — the decisions note in
  Step 5

**Out of scope** (do NOT touch, even though they look related):

- The five overrides that are not flagged (`@grpc/grpc-js`, `parse5`,
  `protobufjs`, `vite`, `ws`). Leave them exactly as they are.
- `bun update` or `bun update --latest` across the whole tree. This plan changes
  three pins deliberately; a blanket update is a different, much riskier change.
- Any application or package source file. If a version bump requires a code
  change, that is a STOP condition, not something to fix inline.
- The remaining advisories (`@hono/node-server`, `brace-expansion`, `dompurify`,
  `esbuild`, `js-yaml`, `postcss`, `sharp`, `socket.io-parser`, `undici`, `uuid`
  and `valibot`). Step 5 documents them; it does not fix them.

## Git workflow

- Branch: `advisor/005-refresh-dependency-pins`
- Single commit is appropriate here. Message style, matching `dd13079`:
  `chore(deps): refresh stale advisory pins for next, hono and fast-uri`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 0: Record the baseline

Run and save the output somewhere you can diff against later:

```
bun audit > /tmp/audit-before.txt 2>&1; tail -5 /tmp/audit-before.txt
```

**Verify**: the last lines report a vulnerability count. At the planned commit
that was `43 vulnerabilities (18 high, 23 moderate, 2 low)`. If your baseline
differs substantially, note the actual figure and carry on; the delta is what
matters, not the absolute number.

### Step 1: Update the three stale overrides

In the root `package.json`, change exactly three values inside `overrides`:

```json
    "fast-uri": "3.1.5",
    "hono": "4.12.34",
    "next": "16.2.12",
```

Use these exact versions. Do not use `^` ranges here: every existing entry in
this block is an exact pin, and the block's purpose is to force a specific
resolution. Do not bump `fast-uri` to `4.x` — `3.1.5` is the patch release that
exits the advisory range, and a major bump is a different decision.

**Verify**: `git diff package.json` shows exactly three changed lines.

### Step 2: Align the direct `next` declarations

Find every workspace that declares `next` directly:

```
grep -rn '"next":' apps/*/package.json packages/*/package.json
```

All seven direct declarations currently use `"16.2.12"`; do not modify them
unless a fresh worktree differs. If one does differ, align it to `"16.2.12"`,
preserving its existing prefix style.

**Verify**: `grep -rn '"next": "\^\?16\.2\.1[01]"' apps packages --include=package.json`
returns no matches, and every direct declaration reports `16.2.12`.

### Step 3: Regenerate the lockfile

```
bun install
```

**Verify**: exit 0, and `git status --short` shows `bun.lock` modified. Then
confirm the resolutions actually moved:

```
bun pm ls --all | grep -E "next@|hono@|fast-uri@" | sort -u
```

Expected: no `next@16.2.10`, no `hono@4.12.25`, no `fast-uri@3.1.2` in the
output.

### Step 4: Confirm the advisories cleared and nothing broke

```
bun audit > /tmp/audit-after.txt 2>&1; tail -5 /tmp/audit-after.txt
diff /tmp/audit-before.txt /tmp/audit-after.txt
```

**Verify**: the `next`, `hono` and `fast-uri` sections are gone from the audit
output, and the high-severity count has dropped by at least 7 (four `next` highs
plus three `fast-uri` highs). `hono` currently contributes four moderate entries.

Then run the full gate, in this order:

```
bun run typecheck
bun run check
bun run test
bun run build
```

**Verify**: all four exit 0. The build step is not optional in this plan. A Next
patch bump can change route type generation or interact with
`serverExternalPackages` in `packages/next-config/index.ts`, and neither
typecheck nor the unit tests would catch that.

### Step 5: Record what was deliberately not fixed

`bun audit` will still report advisories after this change. Append a short
section to the bottom of this plan file, under a heading
`## Advisories accepted at <today's date>`, listing each remaining advisory with
one line on why it was not addressed. Base it on the actual post-change audit
output, and use this framing:

- Reached only at build or test time, not at runtime (for example bundler and
  documentation-tooling dependencies).
- Transitive through a pinned tool whose own patched release is not yet
  available.
- Severity low and not on a path that handles untrusted input.

If any remaining advisory turns out to be high severity AND reachable from
runtime application code, do not silently accept it. Add it to the note and flag
it explicitly in your completion report.

**Verify**: the section exists in this file and names every package still listed
by `bun audit`.

## Test plan

This plan changes no source code, so it adds no unit tests. Its verification is
the existing gate plus the audit delta:

- `bun audit` no longer lists `next`, `hono` or `fast-uri`.
- `bun run typecheck`, `bun run check`, `bun run test` and `bun run build` all
  pass, exactly as they did before the change.
- The build is the load-bearing check here: it is the only step that exercises
  the Next.js version end to end, and CI does not currently run it (see plan
  016, which adds it).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run check` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run build` exits 0
- [ ] `bun audit` output contains no section headed `next`, `hono` or `fast-uri`
- [ ] `bun pm ls --all | grep -c "next@16.2.10"` returns 0
- [ ] `git status --short` shows only `package.json`, workspace `package.json`
      files that declare `next`, `bun.lock`, and this plan file modified
- [ ] The "Advisories accepted" section has been added to this file
- [ ] Status row for plan 005 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- `bun install` reports a peer-dependency conflict it cannot resolve.
- `bun run build` fails after the bump. Report the full error. Do NOT edit
  application source to accommodate the new Next version as part of this plan;
  that is a separate change with a different risk profile.
- `bun run test` produces failures that were not present at Step 0.
- The audit still lists `next` after Step 3, which would mean an unpinned
  transitive path is reintroducing the old version. Report the dependency chain
  from the audit output.
- Any remaining advisory is high severity and reachable from runtime application
  code (not build or test tooling).

## Maintenance notes

- The `overrides` block is a security-patching mechanism, and its failure mode is
  silent: a pin that was correct when written becomes a *ceiling* holding the
  repo on a vulnerable version once a new advisory lands. It needs periodic
  re-checking, not just checking when it is added. Consider adding a scheduled
  `bun audit` job so this drift surfaces on its own.
- A reviewer should confirm the five untouched pins are byte-identical, and that
  no `^` or `~` prefix crept into the three changed entries.
- If a future Next bump requires source changes, do it as its own plan rather
  than widening this one; separating "move the pin" from "adapt to the new
  version" keeps the rollback story clean.
- Deliberately deferred: `fast-uri` 4.x. This plan takes the `3.1.5` patch to
  exit the advisory range with minimum blast radius. Moving to 4.x is a major
  bump across `prisma`, `react-email` and `@sentry/nextjs` and deserves its own
  evaluation.
