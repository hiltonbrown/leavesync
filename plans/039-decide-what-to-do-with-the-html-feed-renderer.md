# Plan 039: Decide what to do with the HTML feed renderer

> **Executor instructions**: This is a **decision plan**, not a build. Its
> deliverable is a recommendation with evidence, plus whichever of two small
> code changes the user chooses. Follow the steps, answer the questions, and
> stop at the decision point. Do not build a feature. If anything in the "STOP
> conditions" section occurs, stop and report.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- packages/feeds/src/render packages/feeds/index.ts`
> If either changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P3 (direction)
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction, tech debt
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

`packages/feeds/src/render/render-html.ts` is 391 lines that render a feed's
events as a standalone HTML document. It is tested (59 lines of test), it has
been maintained across at least three commits including a rebrand pass, and it
is called from nowhere.

It is not exported from `packages/feeds/index.ts`, so no other package can
reach it. Nothing inside `packages/feeds` calls it either. It exists, compiles,
passes its tests, and does nothing.

Three commits tell the story:

```
47f460b feat(feeds): html renderer prototype
431b89e fix(feeds): normalise html renderer letter spacing
6b14003 final rebrand steps
```

A prototype that was polished twice and never wired up. That pattern usually
means one of two things: a feature someone intends to ship and has not
finished, or a feature that was superseded and nobody deleted. **Which one it
is determines whether 391 lines of maintained code are an asset or a liability,
and only the user knows.**

The cost of leaving it undecided is small but real: it is 391 lines that every
future reader of `packages/feeds` has to understand and dismiss, it is included
in the package's typecheck and test runs, and its rebrand commit shows it
already consumed maintenance effort for no return. The cost of deciding is
about an hour.

This is worth surfacing rather than quietly deleting, because a human-readable
feed view is a plausible product feature. `PRODUCT.md` describes ICS
publication to Outlook, Google Calendar and Apple Calendar. A shareable HTML
view of the same data, for people who do not subscribe to a calendar feed, is a
recognisable adjacent idea, and the code for it already exists.

## Current state

### The renderer

`packages/feeds/src/render/render-html.ts` lines 1-20:

```typescript
import type { PreviewEvent } from "../projection/feed-projection";

export interface RenderFeedHtmlInput {
  events: PreviewEvent[];
  feedName: string;
  generatedAt?: Date;
}

export function renderFeedHtml(input: RenderFeedHtmlInput): string {
  const generatedAt = input.generatedAt ?? new Date();
  const events = [...input.events].sort(
    (first, second) =>
      first.startsAt.getTime() - second.startsAt.getTime() ||
      first.summary.localeCompare(second.summary)
  );

  return `<!doctype html>
<html lang="en-AU" data-theme="light">
<head>
  <meta charset="utf-8">
```

Two exports: the input interface and the function. It consumes `PreviewEvent`
from the feed projection, which is the same type
`packages/feeds/src/preview/preview-service.ts` works with, so it is built on
the correct internal abstraction rather than on raw database rows.

Note `lang="en-AU"` and `data-theme="light"`: someone thought about locale and
theming. This is not a throwaway.

### It is unreachable

`packages/feeds/index.ts` does not export it:

```
grep -n "render-html\|renderHtml\|RenderFeedHtml" packages/feeds/index.ts
```

returns nothing.

Nothing calls it:

```
grep -rn "renderFeedHtml\|render-html" apps packages --include=*.ts --include=*.tsx | grep -v node_modules | grep -v "render-html.ts\|render-html.test.ts"
```

returns nothing at commit `75202db`.

### It is tested

`packages/feeds/src/render/render-html.test.ts` is 59 lines. Every other source
file in `packages/feeds` has a co-located test too, so this one is not an
anomaly in the package; it is consistent with a package that tests everything,
including things nothing uses.

### The one privacy question that matters

`renderFeedHtml` takes `PreviewEvent[]`. Whoever calls it decides which events
those are, and therefore what privacy transform has been applied.

`CLAUDE.md` is specific about where that happens: "Privacy transforms applied
during publication projection, not at render time." So the renderer is
correctly positioned, **provided its caller feeds it projected events**. There
is no caller, so there is nothing to verify today, and that is exactly the risk
if it is wired up carelessly later: an HTML view is far easier to share
accidentally than an ICS subscription, and a feed rendered from unprojected
events would expose leave detail that the equivalent ICS feed hides.

## The decision

Three options. The spike's job is to gather enough evidence for the user to
pick one.

**Option A: delete it.** Remove `render-html.ts` and its test. Reclaims 450
lines. Reversible from git history if the feature is wanted later, and the
commit history already documents the design.

**Option B: keep it and mark it explicitly.** Add a file-header comment
recording that it is an unwired prototype, what it was for, and what would need
to be true before it ships (a route, an auth model, and a privacy check). Costs
nothing, stops the next reader wondering.

**Option C: ship it.** Export it from `packages/feeds`, add a route in
`apps/api` alongside `GET /ical/:token.ics`, and reuse the existing feed token
validation. This is a real feature and needs its own plan; the spike's job is to
say whether it is worth writing.

**Recommendation to bring to the user: Option B, unless they say the feature is
wanted.** Deleting maintained, tested, correctly abstracted code is a decision
someone may regret, and marking it is nearly free. Option A becomes right if
the user says the idea is dead.

**Do not choose Option C in this plan.** If the user wants it, the answer is a
new plan, because a public HTML endpoint has an authentication model, a caching
story and a privacy review that this document has not done.

## Commands you will need

All read-only.

```
grep -rn "renderFeedHtml\|render-html" apps packages --include=*.ts --include=*.tsx | grep -v node_modules
git log --oneline --follow packages/feeds/src/render/render-html.ts
git log --oneline -20
bunx vitest run packages/feeds/src/render/render-html.test.ts
```

## Scope

**In scope, for the investigation:**

- Reading `packages/feeds/src/render/render-html.ts`, its test, and its git
  history
- Reading `PRODUCT.md` for any statement about an HTML or web view of a feed
- Writing the recommendation into `plans/039-findings.md`

**In scope, for the change, once the user has chosen:**

- Option A: delete `render-html.ts` and `render-html.test.ts`
- Option B: add a header comment to `render-html.ts`

**Explicitly out of scope:**

- Option C. Building the feature needs its own plan.
- Any route in `apps/api`.
- `packages/feeds/index.ts`, unless Option A requires removing an export (it
  does not; there is none).
- Any other unused code. If you find more while looking, list it in the
  findings and leave it.
- The preview service. It is a different thing (an in-product preview, plan 028
  covers testing it) and shares only the `PreviewEvent` type.

## Git workflow

```
git checkout -b spike/html-feed-renderer
```

Commit messages, depending on the option chosen:

```
docs(plans): record the HTML feed renderer decision
```

then one of:

```
chore(feeds): remove the unwired HTML renderer prototype
docs(feeds): mark the HTML renderer as an unwired prototype
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Confirm it is genuinely unreachable

```
grep -rn "renderFeedHtml\|RenderFeedHtmlInput\|render-html" apps packages --include=*.ts --include=*.tsx --include=*.json | grep -v node_modules
```

**Expected**: hits only in `render-html.ts` and `render-html.test.ts`.

Also check for dynamic use, which a name grep would miss:

```
grep -rn "render/render-html\|await import" packages/feeds --include=*.ts | grep -v node_modules
```

**If anything does reach it**, this plan's premise is wrong. Report what and
stop.

### Step 2: Read the history

```
git log --follow --oneline packages/feeds/src/render/render-html.ts
git show 47f460b --stat
```

Establish: what else landed in the commit that introduced it, and does that
commit's message or its sibling files suggest an intended caller that was never
built?

`47f460b feat(feeds): html renderer prototype` is the origin. Read its full
diff. If it added a route, an action or a page that was later removed, that is
the strongest available evidence about intent.

### Step 3: Check the product documentation

```
grep -rn -i "html\|web view\|shareable\|printable\|browser" PRODUCT.md | head -30
```

Read the surrounding sections of any hit. The question is whether a
human-readable web view of a feed is a stated product intention, a rejected
one, or unmentioned.

Also check `ScreenCatalogue-v4.1.md`, which is a screen inventory and would be
the natural place for a designed-but-unbuilt screen:

```
grep -rn -i "html\|feed view\|share" ScreenCatalogue-v4.1.md | head -20
```

### Step 4: Assess what shipping it would require

Not to build it, but to size it for the user. Read
`apps/api/app/ical/[token]/route.ts` and note what the ICS endpoint does for:

- token validation and revocation;
- caching (Vercel KV, `feed_id + etag`);
- privacy projection;
- the 304 path.

An HTML endpoint would need all of the same. **Write down the list.** If Option
C is ever chosen, this list is the plan's skeleton, and it is also the honest
answer to "how much work is it".

Note the one genuinely new question: an ICS feed is consumed by a calendar
client, an HTML page is consumed by a browser and is trivially shareable. Does
the same token model make sense for something a person can paste into a group
chat? That is a product and privacy question, not an engineering one, and it
should be flagged rather than answered here.

### Step 5: Write the findings and recommendation

Create `plans/039-findings.md`:

1. **Recommendation**, one paragraph, at the top: A, B or C, and why.
2. **Confirmation that it is unreachable**, with the greps you ran.
3. **What the history suggests** about intent (Step 2).
4. **What the product documentation says**, or that it says nothing (Step 3).
5. **What Option C would require**, as the list from Step 4, with the privacy
   and shareability question stated plainly.
6. **What is lost by deleting it**: 391 lines of a working, tested, correctly
   abstracted renderer that would have to be rewritten. Be specific rather than
   dismissive; this is the argument against Option A and it deserves a fair
   statement.

### Step 6: Ask the user, then make the change

Present the recommendation. **Wait for a decision.** Do not proceed on the
default; the whole point of this plan is that the answer is not in the code.

Then:

**If Option A**: delete both files.

```
git rm packages/feeds/src/render/render-html.ts packages/feeds/src/render/render-html.test.ts
bun run check
bun run typecheck
bun run test
```

**Expected**: all exit 0, with the test count **lower** by however many tests
`render-html.test.ts` contained. Record the number.

**If Option B**: add a header comment to `render-html.ts`, above the import:

```typescript
/**
 * Unwired prototype. Nothing calls this and it is not exported from the
 * package root.
 *
 * It renders a feed's projected events as a standalone HTML document, as a
 * human-readable counterpart to the ICS feed at GET /ical/:token.ics. It was
 * kept rather than deleted because it is complete, tested, and built on the
 * correct abstraction (PreviewEvent from the feed projection).
 *
 * Before wiring it to a route, three things need deciding:
 *   1. Authentication. The ICS token model assumes a calendar client holds the
 *      URL. An HTML page is trivially shareable, so the same token may not be
 *      an appropriate credential for it.
 *   2. Privacy. Callers must pass projected events. Privacy transforms happen
 *      during publication projection, not at render time, so a caller that
 *      passes unprojected events would expose leave detail the equivalent ICS
 *      feed hides.
 *   3. Caching. The ICS endpoint caches by feed_id + etag in Vercel KV and
 *      serves 304s. An HTML endpoint needs an equivalent or it re-renders on
 *      every request.
 *
 * See plans/039-findings.md.
 */
```

Adjust the wording to match what Steps 2 to 4 actually found. **Do not commit a
comment that states something the investigation did not establish.**

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all exit 0 with an unchanged test count.

**If Option C**: write nothing further. Report that the user chose to build it
and that it needs its own plan, with the Step 4 list as the starting point.

## Test plan

**Option A**: no new tests; the test count drops by exactly the number in
`render-html.test.ts`. Verify with `bun run test` before and after, and record
both.

**Option B**: no tests. A comment changes nothing.

**Option C**: out of scope.

In both A and B, the requirement is that **no other test changes**. If deleting
an unreachable file breaks something, it was not unreachable and Step 1 was
wrong.

## Done criteria

For the investigation, in all cases:

1. `plans/039-findings.md` exists with all six sections.
2. The recommendation is A, B or C, stated in the first paragraph.
3. Step 1's greps are reproduced in the findings with their output.
4. The Option C requirements list is present, including the shareability
   question.

Then, depending on the choice:

**Option A:**

5. `test -f packages/feeds/src/render/render-html.ts` returns non-zero.
6. `bun run check`, `bun run typecheck` and `bun run test` all exit 0.
7. The test count dropped by exactly the number of tests in the deleted file,
   and no other suite changed.

**Option B:**

5. `grep -c "Unwired prototype" packages/feeds/src/render/render-html.ts`
   prints `1`.
6. `bun run check`, `bun run typecheck` and `bun run test` all exit 0 with an
   unchanged test count.

**Option C:**

5. No source file was changed. `git diff --name-only` lists only
   `plans/039-findings.md`.

## STOP conditions

Stop and report rather than continuing if any of these occur:

- **Something does reach `renderFeedHtml`** (Step 1). The plan's premise is
  wrong. Report the caller.
- **The user has not chosen an option.** Do not proceed on the recommendation.
  This plan exists because the answer is a product decision, and guessing it
  wrong means either deleting something wanted or preserving something dead.
- **Deleting the files breaks a test or the typecheck** (Option A). Report
  what; it means something depended on it in a way the greps missed.
- **`PRODUCT.md` describes an HTML feed view as a shipped feature.** Then the
  gap is between documentation and code, not dead code, and it is a different
  finding. Report it.
- **You find other unreachable modules** while looking. List them in the
  findings and leave them. A sweep for dead code is a different task with a
  different risk profile, and doing it opportunistically inside a decision plan
  is how something load-bearing gets deleted.

## Maintenance notes

- **This is the general shape of "prototype drift"**: code that was built,
  polished, and never connected. It is worth a periodic check, because the
  polish commits (`431b89e fix(feeds): normalise html renderer letter spacing`,
  `6b14003 final rebrand steps`) show maintenance effort being spent on
  something with no consumer. A grep for exported symbols with no importer
  would find others.
- **If Option B is taken, the comment is the artefact.** Its value is entirely
  in being accurate. If the renderer is later wired up, delete the comment in
  the same commit; a stale "unwired prototype" header on live code is worse
  than no header.
- **If Option C is ever taken, the privacy point is the one to get right.**
  `CLAUDE.md` places privacy transforms in the publication projection, not at
  render time, and `renderFeedHtml` correctly takes already-projected
  `PreviewEvent`s. The failure mode is a caller that reaches for raw records
  because they are closer to hand. Any HTML endpoint plan needs a test that
  asserts the rendered output honours each privacy mode, in the same shape plan
  028 specifies for the preview service.
- **Related plans**: 028 (tests the preview service, which shares the
  `PreviewEvent` type), 033 (removes other dead code and stale manifest
  entries), 025 (the Mintlify starter kit, another built-but-not-finished
  surface).
