# Plan 081: Minimise and delimit user data in support issues

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- apps/api/app/api/support/github-issue packages/observability`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: Plan 066
- **Category**: security
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers finding**: S-08

## Why this matters

The support route forwards user-controlled text into GitHub issues that humans
and automation may consume. The boundary should send the minimum tenant/user
metadata and make untrusted fields structurally unmistakable. This reduces PII
spread and accidental instruction interpretation without pretending Markdown
escaping is a complete AI security boundary.

## Current state

`apps/api/app/api/support/github-issue/route.ts` authenticates and validates the
request, looks up the organisation, constructs a GitHub title/body and records
an audit event. The audit payload already uses opaque IDs rather than retaining
names or email. Preserve that property.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Focused | `cd apps/api && bunx vitest run app/api/support/github-issue/route.test.ts` | all pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | exit 0 |

## Scope

**In scope**: support route/test and an API-local pure issue-payload builder/test.

**Out of scope**: GitHub automation configuration, issue retention policy,
support UI and audit schema.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `advisor/081-support-boundary`
- Commit: `fix(api): minimise support issue data`
- Do not push or open a PR unless instructed.

## Steps

1. Snapshot the exact fields currently sent to GitHub and audit storage.
2. Add a pure builder that normalises title control characters, bounds lengths,
   labels every user field as untrusted and uses a dynamically safe Markdown
   fence or indentation. Include subject, message, reproduction, expected and
   actual text.
3. Remove direct names, emails and organisation names from GitHub metadata unless
   an operator-approved support need is documented. Keep opaque IDs needed for
   lookup. Do not add them to audit storage.
4. Add adversarial tests for newlines, backticks, Markdown, HTML and instruction-
   shaped text; run all gates.

## Test plan

Normal submission, every optional field, maximum lengths, fence breakout,
control characters, GitHub failure and opaque audit metadata.

## Done criteria

- [ ] GitHub receives only documented minimum identifiers.
- [ ] All user text is bounded and structurally labelled untrusted.
- [ ] Audit storage gains no PII.
- [ ] Failure behaviour and four gates pass; index updated.

## STOP conditions

Stop if support operations require removed PII, downstream automation executes
issue text as instructions, or GitHub's API contract rejects the safe format.

## Maintenance notes

Formatting is defence-in-depth. Automation must independently treat issue body
content as untrusted data.
