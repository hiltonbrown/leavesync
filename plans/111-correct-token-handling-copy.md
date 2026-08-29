# Plan 111: Separate data-collection scope from credential protection

> **Executor instructions**: Follow the plan exactly, run every verification,
> and touch only in-scope files. The reviewer maintains the index.
>
> **Drift check (run first)**:
> `git diff --stat 45357d92..HEAD -- apps/web/app/integrations/page.tsx apps/web/app/integrations/integrations.test.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 110 DONE
- **Category**: bug
- **Planned at**: commit `45357d92`, 2026-08-30; reconciled after Plan 110
- **Execution status**: DONE, approved at `5fa417a1` on 2026-08-30

## Why this matters

The “Never reads” panel currently includes plaintext feed and OAuth tokens.
Credentials necessarily pass through server memory and request paths. The
actual security contract is stronger and more precise: OAuth credentials are
encrypted at rest, plaintext feed tokens are not persisted, and sensitive
processing remains server-side.

## Current state

- `apps/web/app/integrations/page.tsx:70-76` groups salary, calendar contents
  and plaintext credentials under `Never reads`.
- `packages/xero/src/au/read.ts:69-89` decrypts an access token in server memory
  to authenticate Xero requests.
- `apps/api/app/ical/[token]/route.ts:38-60` receives a feed bearer token and
  resolves it server-side.
- `apps/web/app/integrations/page.tsx:301-304` already contains the accurate
  encryption-at-rest and server-side explanation.

## Commands you will need

Use the same focused, lint, web typecheck and four repository gate commands as
Plan 110. Every command must exit 0.

## Suggested executor toolkit

- Use `impeccable` with its `clarify` reference. Preserve the trust hierarchy:
  collection scope and credential safeguards must be distinct concepts.

## Scope

**In scope**:
- `apps/web/app/integrations/page.tsx`
- `apps/web/app/integrations/integrations.test.ts`

**Out of scope**:
- Token formats, encryption, persistence or server code.
- Security-page copy.
- New security guarantees not proven by PRODUCT.md and implementation.

## Git workflow

- Branch: `codex/111-correct-token-handling-copy`
- Commit: `fix(web): clarify integration credential handling`
- Do not push or merge.

## Steps

### Step 1: Extend the regression test

Assert that `Plaintext feed or OAuth tokens` is absent from the `Never reads`
content and that the page retains the accurate encrypted-at-rest, revocable and
server-side safeguards. Do not assert secret values or token shapes.

**Verify**: the new negative assertion fails before the production edit.

### Step 2: Correct the information architecture

Keep salary, banking, tax, superannuation and personal-calendar contents in the
collection-scope panel. Remove credentials from that list. Tighten the existing
server-side security section if needed so it clearly owns credential
protection, without duplicating itself or claiming plaintext credentials are
never processed.

**Verify**: focused test and targeted lint pass.

### Step 3: Run all gates

Run web typecheck, repository check, typecheck, unit tests, integration tests and
`git diff --check`.

## Test plan

- Negative assertion for the false absolute claim.
- Positive assertions for encryption at rest and server-side processing.
- No snapshot and no sensitive implementation detail in fixtures.

## Done criteria

- [ ] Collection-scope copy contains only data categories.
- [ ] Credential safeguards use the implemented invariants.
- [ ] Focused test proves both.
- [ ] All gates pass and scope is clean.

## STOP conditions

- The implementation no longer matches the cited credential invariants.
- Security review requires wording beyond the documented contract.
- Any proposed test would reproduce a token or secret value.

## Maintenance notes

Use “never persisted in plaintext” only for persistence. Do not shorten it to
“never read”, “never handled” or “never exposed” without checking the exact
boundary being described.

## Review record

- Executor commit: `5fa417a1` on branch
  `codex/111-correct-token-handling-copy`.
- Scope: exactly the integrations page and focused test.
- Independent review passed 2 focused tests, targeted Ultracite, web and
  repository typecheck, 17/17 unit-test tasks, 5/5 integration-test tasks and
  diff checks.
- The isolated symlinked dependency layout caused four unrelated Biome
  unnecessary-condition diagnostics in unchanged public-holiday files. The
  Plan 110 base passed the full check independently with identical files;
  targeted lint on both changed files passed. This environment-only deviation
  was accepted.
