# Plan 118: Default public metadata to Australian English

> **Executor instructions**: Follow every step, write focused tests and keep
> scope limited to the metadata helper. The reviewer maintains the index.
>
> **Drift check (run first)**:
> `git diff --stat d29f65b..HEAD -- packages/seo/metadata.ts packages/seo/metadata.test.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 117 DONE
- **Category**: bug
- **Planned at**: commit `d29f65b`, 2026-08-30; reconciled after Plan 117

## Why this matters

The shared metadata helper declares `en_US` even though Team Calendar requires
Australian English. Social previews and crawlers should receive `en_AU` by
default while preserving an explicit override for any future non-Australian
surface.

## Current state

- `packages/seo/metadata.ts:39-45` hardcodes `openGraph.locale: "en_US"`.
- `createMetadata` merges caller properties into defaults with `lodash.merge`.
- No metadata helper test currently exists.
- Product copy and root HTML use Australian English.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused | `bunx vitest run packages/seo/metadata.test.ts` | all pass |
| Lint/typecheck | `bunx ultracite check packages/seo/metadata.ts packages/seo/metadata.test.ts && bun run --cwd packages/seo typecheck` | exit 0 |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | all exit 0 |

## Scope

**In scope**:
- `packages/seo/metadata.ts`
- `packages/seo/metadata.test.ts` (create)

**Out of scope**:
- Page titles/descriptions, HTML `lang`, i18n or translation support.
- Changes to image, canonical URL or Twitter metadata.

## Git workflow

- Branch: `codex/118-use-australian-open-graph-locale`
- Commit: `fix(seo): use Australian Open Graph locale`
- Do not push or merge.

## Steps

### Step 1: Add metadata tests

Test that a basic `createMetadata` call produces `en_AU`, and that a caller can
still explicitly override `openGraph.locale`. Follow Vitest conventions and do
not assert unrelated metadata fields beyond one sanity check for title merge.

**Verify**: default-locale assertion fails before production edit.

### Step 2: Correct the default

Change the default Open Graph locale to `en_AU`. Preserve merge behaviour and
all other metadata.

**Verify**: focused tests, lint and package typecheck pass.

### Step 3: Run gates

Run all repository gates and `git diff --check`.

## Test plan

- Default locale is `en_AU`.
- Explicit caller override remains respected.
- Existing title composition remains intact.

## Done criteria

- [x] Default Open Graph locale is Australian.
- [x] Explicit override is proven.
- [x] Focused and available full gates pass, subject to the recorded disposable-
  worktree deviations below.
- [x] Only in-scope files changed.

## STOP conditions

- Existing consumers intentionally rely on the US locale.
- `lodash.merge` prevents a safe explicit override.
- Fix requires broader internationalisation work.

## Maintenance notes

If the public site becomes multilingual, locale should become route-owned rather
than changing this default repeatedly.

## Execution review

- **Verdict**: APPROVE at `5dcaa72` on
  `codex/118-use-australian-open-graph-locale`.
- The test-first red phase observed `en_US` where `en_AU` was expected, while
  the explicit `en_GB` override already passed. After the one-line production
  edit, both locale tests and the title-composition sanity check passed.
- Executor verification passed targeted Ultracite, SEO package type-check, all
  17 unit tasks, the full integration suite and `git diff --check`. Reviewer
  inspected the two-file diff and independently reran the focused suite: 1 file
  and 2 tests passed.
- Full `check` reproduced four unrelated public-holiday diagnostics. Full
  type-check was blocked by duplicate Prisma types from the disposable
  dependency mounts. Temporary mounts and caches were removed; the worktree is
  clean.
