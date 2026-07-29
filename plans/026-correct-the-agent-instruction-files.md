# Plan 026: Correct `AGENTS.md` and `GEMINI.md`, which describe the wrong product

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- AGENTS.md GEMINI.md CLAUDE.md README.md PRODUCT.md package.json packages/observability/keys.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

This repository ships three instruction files for coding agents: `CLAUDE.md`,
`AGENTS.md` and `GEMINI.md`. `CLAUDE.md` describes the product accurately.
`AGENTS.md` and `GEMINI.md` describe a **different, earlier product** and
contradict it on the single most important fact about the system.

Both state, in their opening section:

> Team Calendar does not manage payroll, accruals, or **leave approvals**.

The product's entire outbound half is leave approvals. `CLAUDE.md` lists four
write operations (submit, approve, decline, withdraw) that write back to Xero
synchronously. `PRODUCT.md` line 69 says "Employees submit and manage leave
inside Team Calendar; managers approve or decline; approved state writes back
to Xero synchronously via the Xero API." `README.md` line 5 says the same. The
codebase has `packages/availability/src/approvals/approval-service.ts`, an
approval state machine, decline-reason enforcement, and a manager approvals
queue.

An agent that reads `AGENTS.md` first, believes it, and is then asked to touch
approval code will reason from a false premise about what the product is for.
That is a worse failure than a missing document: a missing document prompts a
question, a wrong one produces confident wrong work. Given that `CLAUDE.md`
opens with "IMPORTANT: These instructions OVERRIDE any default behavior and you
MUST follow them exactly as written", the repo is telling agents to obey
mutually contradictory instructions depending on which file their harness
loads.

Three smaller corrections travel with it, listed under "Current state".

## Current state

### The contradiction, verbatim

`AGENTS.md` line 11:

```
Team Calendar does not manage payroll, accruals, or leave approvals. Xero is the source of truth for approved leave. Team Calendar standardises both Xero leave and manual availability entries (WFH, travelling, training, client site) into one publishable calendar domain.
```

`GEMINI.md` line 11:

```
Team Calendar does not manage payroll, accruals, or leave approvals. Xero is the only provider. Manual availability entries (WFH, travelling, training, client site) are added directly by users.
```

Against `CLAUDE.md`, which is correct:

```
Xero remains the payroll source of truth. Outbound writes (submit, approve, decline, withdraw) are synchronous and user-triggered. Inbound sync is pull-first via scheduled Inngest jobs. Leave balances are always sourced from Xero; never calculated by Team Calendar.
```

and `PRODUCT.md` line 69:

```
Team Calendar is a multi-tenant leave management and availability publishing platform for small businesses running Xero Payroll (AU, NZ, UK). Employees submit and manage leave inside Team Calendar; managers approve or decline; approved state writes back to Xero synchronously via the Xero API. Xero remains the payroll source of truth for balances and accruals, which Team Calendar reads but never calculates.
```

**`CLAUDE.md`, `PRODUCT.md` and `README.md` agree. `AGENTS.md` and `GEMINI.md`
are the outliers.** That is the direction of the fix: bring the two stale files
in line with the three correct ones, not the reverse.

### The architecture line also omits a layer

`AGENTS.md` line 9:

```
The architecture is: **Xero sync layer > canonical availability model > feed projection layer > ICS publishing layer**.
```

`CLAUDE.md`:

```
The architecture is: **Leave submission layer > bidirectional Xero sync layer > canonical availability model > feed projection layer > ICS publishing layer**
```

Two differences: the missing leave submission layer, and "Xero sync layer"
versus "bidirectional Xero sync layer". Both flow from the same stale premise.

### The command lists omit two commands CI depends on

`AGENTS.md` lines 361-375:

```bash
bun run dev
bun run build
bun run check
bun run fix
bun run test
bunx vitest run <path/to/test>
bun run migrate
bun run migrate:deploy
bun run db:push
bun run analyze
bun run clean
```

`GEMINI.md` lines 301-315 is the same list.

Missing: `bun run typecheck` and `bun run test:integration`. Both exist in the
root `package.json` and both are steps in `.github/workflows/ci.yml`. An agent
that runs the documented commands and reports green has not run the typecheck
that gates the merge.

`CLAUDE.md`'s own command table also omits `test:integration`, though it does
include `typecheck` indirectly? Check it during execution: read `CLAUDE.md`'s
Commands section and confirm what is listed before editing anything.

### `CLAUDE.md` names an environment variable that does not exist

`CLAUDE.md`'s environment table lists:

| Variable | Used by | Purpose |
|---|---|---|
| `SENTRY_DSN` | `packages/observability` | Sentry error tracking |

`packages/observability/keys.ts` declares no `SENTRY_DSN`. It declares:

```typescript
    server: {
      BETTERSTACK_API_KEY: z.string().optional(),
      BETTERSTACK_URL: z.string().url().optional(),

      // Added by Sentry Integration, Vercel Marketplace
      SENTRY_ORG: z.string().optional(),
      SENTRY_PROJECT: z.string().optional(),
    },
    client: {
      // Added by Sentry Integration, Vercel Marketplace
      NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    },
```

Confirm the variable exists nowhere:

```
grep -rn "SENTRY_DSN" packages apps --include=*.ts --include=*.tsx | grep -v node_modules | grep -v NEXT_PUBLIC
```

At commit `75202db` this returns nothing.

## Commands you will need

All run from the repo root.

```
bun run check              # Biome lints Markdown? Check whether it does before relying on it
bun run typecheck
bun run test
```

These are here for the final sanity pass only. This plan edits Markdown, so
none of them will catch a mistake in the content. **The verification for this
plan is reading, not running**, which is stated plainly in the test plan
below.

## Scope

**In scope:**

- `AGENTS.md`
- `GEMINI.md`
- `CLAUDE.md` (the `SENTRY_DSN` row only, plus the Commands section if it is
  also missing `test:integration`)

**Explicitly out of scope:**

- `README.md`, `PRODUCT.md`, `DESIGN.md`, `SECURITY.md`,
  `ScreenCatalogue-v4.1.md`. All were checked and `README.md` and `PRODUCT.md`
  are accurate on the points this plan corrects. Do not edit them.
- Rewriting `AGENTS.md` or `GEMINI.md` wholesale, merging them, or replacing
  either with a pointer to `CLAUDE.md`. Tempting, and possibly right, but it is
  a decision about how the user wants to run their agents. See "Maintenance
  notes".
- Any source file, any configuration, any environment variable.
- `.env.example` files. Plan 023 owns those, and it explicitly does **not** add
  a `SENTRY_DSN` entry to make the stale documentation true.
- Adding `SENTRY_DSN` to `packages/observability/keys.ts`. The documentation is
  wrong, not the code.

## Git workflow

```
git checkout -b docs/correct-agent-instruction-files
```

Commit message:

```
docs: correct the product description in AGENTS.md and GEMINI.md
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Read all five documents before editing any

Read, in full:

- `CLAUDE.md`
- `AGENTS.md`
- `GEMINI.md`
- `PRODUCT.md` (at least the overview and domain model sections)
- `README.md` (at least the first 40 lines)

This is not optional and it is not busywork. The whole failure mode this plan
addresses is documents drifting apart, and you cannot reconcile five documents
you have read two of. Note every place where `AGENTS.md` or `GEMINI.md` says
something the other three contradict; the list below is what was found at
commit `75202db`, but the files are long and more may have accumulated.

### Step 2: Fix the product description in `AGENTS.md`

Replace line 11:

```
Team Calendar does not manage payroll, accruals, or leave approvals. Xero is the source of truth for approved leave. Team Calendar standardises both Xero leave and manual availability entries (WFH, travelling, training, client site) into one publishable calendar domain.
```

with text consistent with `CLAUDE.md` and `PRODUCT.md`:

```
Employees submit and manage leave in Team Calendar; managers approve or decline; approved state writes back to Xero Payroll synchronously. Xero remains the payroll source of truth for balances and accruals, which Team Calendar reads but never calculates. Alongside Xero-synced leave, Team Calendar captures manual availability entries (WFH, travelling, training, client site) and standardises both into one publishable calendar domain.
```

Then replace line 9's architecture summary:

```
The architecture is: **Xero sync layer > canonical availability model > feed projection layer > ICS publishing layer**.
```

with `CLAUDE.md`'s:

```
The architecture is: **Leave submission layer > bidirectional Xero sync layer > canonical availability model > feed projection layer > ICS publishing layer**.
```

Also check line 7 (the one-line product summary). `AGENTS.md` calls it "a
multi-tenant availability publishing platform"; `CLAUDE.md` and `PRODUCT.md`
call it "a multi-tenant leave management and availability publishing platform".
Align it.

**House style, from `CLAUDE.md`**: Australian English, no em dashes. Check your
replacement text for both. `grep -c "—" AGENTS.md` after editing.

### Step 3: Fix the same passages in `GEMINI.md`

`GEMINI.md` is a near-copy of `AGENTS.md` with a different preamble. Apply the
same three corrections to its equivalents (line 11, line 9, line 7), keeping
its own phrasing conventions where they differ harmlessly.

Note that `GEMINI.md` line 11 also says "Xero is the only provider", which is
true and matches `CLAUDE.md`'s "not a multi-connector abstraction layer (Xero
only at this stage)". Keep that clause.

**Verify** the false claim is gone from both:

```
grep -n "does not manage payroll" AGENTS.md GEMINI.md
```

**Expected**: no output.

```
grep -n "leave approvals" AGENTS.md GEMINI.md
```

**Expected**: no output claiming the product does not do them. Read any
remaining hits in context.

### Step 4: Add the missing commands to both files

In `AGENTS.md`'s Commands block (line 363-375) and `GEMINI.md`'s (line
303-315), add the two missing commands. Place them next to their relatives:

```bash
bun run dev
bun run build
bun run check
bun run fix
bun run typecheck
bun run test
bun run test:integration
bunx vitest run <path/to/test>
bun run migrate
bun run migrate:deploy
bun run db:push
bun run analyze
bun run clean
```

**Verify every command exists** before writing it:

```
node -e "const s=require('./package.json').scripts; for (const c of ['dev','build','check','fix','typecheck','test','test:integration','migrate','migrate:deploy','db:push','analyze','clean']) console.log(c, c in s ? 'OK' : 'MISSING')"
```

**Expected**: every line reads `OK`. If any reads `MISSING`, do not document
it.

Add a note under the block in both files, since the omission caused real
confusion:

```
`typecheck` and `test:integration` are both CI gates. A change is not verified until `bun run check`, `bun run typecheck`, `bun run test` and `bun run test:integration` all pass.
```

### Step 5: Check and fix `CLAUDE.md`'s Commands section

Read `CLAUDE.md`'s Commands block. At commit `75202db` it lists:

```
bun run dev
bun run build
bun run check
bun run fix
bun run test
bunx vitest run <path>
bun run migrate
bun run migrate:deploy
bun run db:push
bun run analyze
bun run clean
```

If `typecheck` or `test:integration` is absent, add them, same as Step 4. Use
the same verification command.

### Step 6: Fix the `SENTRY_DSN` row in `CLAUDE.md`

In the environment variable table, change:

```
| `SENTRY_DSN` | `packages/observability` | Sentry error tracking |
```

to:

```
| `NEXT_PUBLIC_SENTRY_DSN` | `packages/observability` | Sentry error tracking (client DSN) |
```

While in that table, cross-check every other row against the actual `keys.ts`
files:

```
for f in packages/*/keys.ts; do echo "== $f"; grep -oE "^\s+[A-Z][A-Z_0-9]+:" "$f" | tr -d ' :' | sort -u | tr '\n' ' '; echo; done
```

Report any other row naming a variable that does not appear in that output. Fix
obvious spelling drift; **report rather than guess** if a row names a variable
that exists nowhere and you cannot tell what it was meant to be.

**Verify**:

```
grep -n "SENTRY_DSN" CLAUDE.md
```

**Expected**: exactly one hit, and it reads `NEXT_PUBLIC_SENTRY_DSN`.

### Step 7: Cross-document consistency sweep

Run these and read every hit:

```
grep -n "architecture is" CLAUDE.md AGENTS.md GEMINI.md
grep -n "source of truth" CLAUDE.md AGENTS.md GEMINI.md README.md PRODUCT.md
grep -rn "approval\|approve" AGENTS.md GEMINI.md | head -20
```

**Expected**: the architecture lines are now identical in all three agent
files; no remaining statement in `AGENTS.md` or `GEMINI.md` denies that the
product handles approvals.

### Step 8: House-style check

```
grep -c "—" AGENTS.md GEMINI.md CLAUDE.md
```

**Expected**: `0` for each. `CLAUDE.md` bans em dashes repo-wide and the text
you wrote must comply.

Spot-check spelling in your added text: Australian English means
"organisation", "standardises", "normalises", "behaviour", not the American
forms. Note that identifiers in code (`clerk_org_id`, `organizations`) keep
their actual spelling; only prose changes.

### Step 9: Final pass

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all exit 0. None of them inspects Markdown content, so a green
result here proves only that you did not accidentally edit a source file.
Confirm that with:

```
git diff --name-only
```

**Expected**: only `.md` files.

## Test plan

**There is no automated test for this plan and there should not be.** The
defect is semantic drift between prose documents; a test that could catch it
would have to encode the product definition somewhere fourth, creating another
document to drift.

The verification is:

1. Step 1 (read all five documents).
2. Step 7 (the cross-document grep sweep).
3. A final read-through of the diff, asking of each changed sentence: does
   `CLAUDE.md`, `PRODUCT.md` or `README.md` say something that contradicts
   this? If yes, one of them is wrong and you should stop rather than pick a
   winner.

Record in your report which of the three canonical documents you used as the
source for each correction. "Aligned with `PRODUCT.md` line 69" is a reviewable
claim; "fixed the description" is not.

## Done criteria

All of the following, verbatim:

1. `grep -c "does not manage payroll" AGENTS.md GEMINI.md` prints `0` for both.
2. `grep -c "Leave submission layer" AGENTS.md GEMINI.md CLAUDE.md` prints `1`
   for each.
3. `grep -c "bun run typecheck" AGENTS.md GEMINI.md CLAUDE.md` prints at least
   `1` for each.
4. `grep -c "bun run test:integration" AGENTS.md GEMINI.md CLAUDE.md` prints at
   least `1` for each.
5. `grep -n "SENTRY_DSN" CLAUDE.md` returns exactly one line and it contains
   `NEXT_PUBLIC_SENTRY_DSN`.
6. `grep -c "—" AGENTS.md GEMINI.md CLAUDE.md` prints `0` for each.
7. Every command listed in all three files exists in the root `package.json`
   (Step 4's Node check reports `OK` for all).
8. `git diff --name-only` lists only `AGENTS.md`, `GEMINI.md` and `CLAUDE.md`.
9. `bun run check`, `bun run typecheck` and `bun run test` all exit 0.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **`CLAUDE.md`, `PRODUCT.md` and `README.md` disagree with each other** on a
  point you are about to correct. This plan assumes they agree and that
  `AGENTS.md`/`GEMINI.md` are the outliers. If the three canonical documents
  are themselves inconsistent, you cannot pick a winner: report the conflicting
  passages with file and line and let the user decide which is true.
- **`AGENTS.md` or `GEMINI.md` contains a statement you cannot verify against
  the code.** Prose about product intent is not always checkable, but
  statements about commands, file paths, architecture and environment
  variables are. If you find an unverifiable claim, leave it and list it in
  your report; do not delete documentation on suspicion.
- **A row in `CLAUDE.md`'s environment table names a variable that exists
  nowhere** and you cannot determine what it was meant to be. Report it. A
  wrong guess in an instruction file is exactly the defect this plan exists to
  remove.
- **You are tempted to replace `AGENTS.md` or `GEMINI.md` with a pointer to
  `CLAUDE.md`.** That may well be the right long-term answer but it changes how
  the user's other agents behave. Out of scope; raise it instead.
- **The two files have drifted in more places than this plan lists.** Likely,
  given they are 407 and 356 lines. Fix what this plan names, list the rest
  with file and line, and stop. A partial, verified correction is worth more
  than a wholesale rewrite nobody reviewed.

## Maintenance notes

- **Three instruction files describing one product is the root cause.** Every
  correction in this plan has to be applied twice, and the next product change
  will drift them again. The structural fix is to make `CLAUDE.md` (or
  `PRODUCT.md`) the single source and reduce `AGENTS.md` and `GEMINI.md` to a
  short preamble plus a pointer. Most agent harnesses read whichever file is
  named for them and follow a link fine. That is a decision for the user, which
  is why this plan does not take it, but it is the change that stops this
  recurring.
- **The specific drift to watch**: anything describing what the product *does
  not* do. Those sentences age fastest, because a shipped feature quietly
  falsifies them while nothing in CI notices. `AGENTS.md`'s "does not manage
  leave approvals" was presumably true before the approval workflow was built.
- **`CLAUDE.md`'s environment table needs the same periodic check** as the
  `.env.example` files (plan 023, Step 8): every documented variable should
  appear in some `keys.ts`, and every `keys.ts` variable that matters should be
  documented. The one-line `for f in packages/*/keys.ts` loop in Step 6 is the
  check.
- **Related plans**: plan 023 rewrites the `.env.example` files and removes the
  Knock configuration; it deliberately does not add a `SENTRY_DSN` entry to
  match the old documentation. Plan 022 removes stale references to unused
  packages from `biome.jsonc`. All three are instances of the same class:
  configuration and documentation still describing the next-forge template
  rather than this product.
