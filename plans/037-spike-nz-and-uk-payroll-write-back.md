# Plan 037: Spike NZ and UK payroll support

> **Executor instructions**: This is a **spike**, not a build. Its deliverable
> is a written decision document, not working write-back. Follow the steps,
> answer the questions with evidence, and write the report. Do not implement NZ
> or UK payroll support as part of this plan. If anything in the "STOP
> conditions" section occurs, stop and report.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- packages/xero/src/nz packages/xero/src/uk packages/xero/src/write packages/jobs/src/handlers/sync-xero-people.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P3 (direction)
- **Effort**: M (the spike; the build it scopes is L or larger)
- **Risk**: LOW (nothing ships)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

Every product document says the platform supports three payroll regions.
`CLAUDE.md`: "It connects to Xero Payroll (AU, NZ, UK) bidirectionally".
`PRODUCT.md` line 69: "for small businesses running Xero Payroll (AU, NZ, UK)".
`AGENTS.md` and `GEMINI.md` say the same.

The code supports one. NZ and UK exist as complete, correctly typed,
correctly dispatched stubs that return `region_not_supported_error`:

```typescript
export function submitLeaveApplication(
  _input: SubmitLeaveApplicationInput
): Promise<
  XeroWriteResult<{ rawResponse: unknown; xeroLeaveApplicationId: string }>
> {
  // TODO(nz-payroll): implement NZ payroll leave write-back.
  return Promise.resolve({ ok: false, error: writeBackNotAvailableError });
}
```

`README.md` is the one document that is honest about it: "Team Calendar links
to Australian Xero Payroll files and syncs employees, leave records, and
balances on a schedule. New Zealand and United Kingdom support is planned."

The architecture is ready. `packages/xero/src/write/dispatch.ts` already
switches on `payrollRegion` for all four write operations and routes to the
right module. `packages/xero/src/uk/read.ts` and the people sync handler have
matching region gates. The scaffolding was clearly built with three regions in
mind and only one was filled in.

**The question this spike answers is not "how do we build NZ and UK". It is
"what would it actually cost, and is it the right next thing".** That is worth
answering before someone starts, because the honest answer might be "the AU
half is not finished" or "the demand is not there yet", and both are cheaper
conclusions than a half-built second region.

## Current state

### The stubs

`packages/xero/src/nz/write.ts` in full:

```typescript
import type {
  ApproveLeaveApplicationInput,
  DeclineLeaveApplicationInput,
  SubmitLeaveApplicationInput,
  WithdrawLeaveApplicationInput,
  XeroWriteResult,
} from "../write/types";

const writeBackNotAvailableError = {
  code: "region_not_supported_error" as const,
  message: "NZ payroll write-back is not yet available.",
};

const approvalNotAvailableError = {
  code: "region_not_supported_error" as const,
  message: "NZ payroll approval is not yet available.",
};

export function submitLeaveApplication(
  _input: SubmitLeaveApplicationInput
): Promise<
  XeroWriteResult<{ rawResponse: unknown; xeroLeaveApplicationId: string }>
> {
  // TODO(nz-payroll): implement NZ payroll leave write-back.
  return Promise.resolve({ ok: false, error: writeBackNotAvailableError });
}

export function approveLeaveApplication(
  _input: ApproveLeaveApplicationInput
): Promise<XeroWriteResult<{ rawResponse: unknown }>> {
  // TODO(nz-payroll): implement NZ payroll leave write-back.
  return Promise.resolve({ ok: false, error: approvalNotAvailableError });
}

export function declineLeaveApplication(
  _input: DeclineLeaveApplicationInput
): Promise<XeroWriteResult<{ rawResponse: unknown }>> {
  // TODO(nz-payroll): implement NZ payroll leave write-back.
  return Promise.resolve({ ok: false, error: approvalNotAvailableError });
}

export function withdrawLeaveApplication(
  _input: WithdrawLeaveApplicationInput
): Promise<XeroWriteResult<{ rawResponse: unknown }>> {
  // TODO(nz-payroll): implement NZ payroll leave write-back.
  return Promise.resolve({ ok: false, error: writeBackNotAvailableError });
}
```

`packages/xero/src/uk/write.ts` is the same shape.

### The dispatcher is complete

`packages/xero/src/write/dispatch.ts` handles all three regions for all four
operations, with a `default` returning `region_not_supported_error`:

```typescript
export async function submitLeaveApplicationForRegion(
  payrollRegion: PayrollRegion | string,
  input: SubmitLeaveApplicationInput
): Promise<
  XeroWriteResult<{ rawResponse: unknown; xeroLeaveApplicationId: string }>
> {
  switch (payrollRegion) {
    case "AU":
      return await submitAuLeaveApplication(input);
    case "NZ":
      return await submitNzLeaveApplication(input);
    case "UK":
      return await submitUkLeaveApplication(input);
    default:
      return unsupportedRegion();
  }
}
```

and `packages/xero/src/write/types.ts` line 27:

```typescript
export type PayrollRegion = "AU" | "NZ" | "UK";
```

### Reads are gated too

`packages/xero/src/uk/read.ts` line 11 returns `unsupportedReadRegion("UK")`,
and `packages/jobs/src/handlers/sync-xero-people.ts` lines 143-161 short-circuit
the people sync:

```typescript
      xeroTenant.payroll_region === "NZ" ||
      xeroTenant.payroll_region === "UK"
    ) {
      ...
        `Sync people skipped for region ${xeroTenant.payroll_region} as it is not yet available.`
```

So a customer who connects an NZ or UK Xero file today gets an organisation
with no people, no leave and no write-back, with a message explaining why.
**That is a well-built stub**, not a broken feature, and the spike should say
so.

### What AU actually implements

`packages/xero/src/au/write.ts` is the reference. It targets Xero's **Payroll
AU 1.0** API:

```typescript
  const response = await xeroRequest(input.xeroTenant, {
    body: payload,
    method: "POST",
    path: "/payroll.xro/1.0/LeaveApplications",
  });
```

with approve and decline at
`/payroll.xro/1.0/LeaveApplications/{id}/approve` and `/reject`, and a
`LeaveApplications[].LeavePeriods[].NumberOfUnits` payload shape.

**This is the crux of the spike.** Xero's NZ and UK payroll products are
different APIs with different resource models, not the same API with a
different base path. Assuming otherwise is the single largest risk in this
work.

## What the spike must answer

Seven questions. Answer each with evidence and a citation, not an impression.

### 1. Are NZ and UK the same API shape as AU?

Use Context7 to pull current Xero API documentation (`CLAUDE.md` requires
Context7 for library and API documentation). Establish for each region:

- the API family and version (`payroll.xro/1.0` versus `payroll.xro/2.0`
  versus something else);
- the resource that represents a leave request;
- whether an approve and a reject action exist as distinct endpoints, or
  whether status is a field on an update;
- the unit model (hours, days, leave periods) and how a date range maps to it;
- whether the create endpoint supports an idempotency key. AU does not, which
  is the subject of plan 017; if NZ or UK does, that changes the design there.

**Deliverable**: a table, one row per region, one column per question, with a
documentation link for each cell.

### 2. What does the inbound side need?

The write side is only half. `packages/xero/src/au/read.ts` implements employee,
leave record and leave balance reads with pagination
(`XERO_PAGE_SIZE = 100`). Establish the equivalent for each region:

- endpoints and pagination model;
- whether leave balances are exposed at all (this is not universal across
  Xero's payroll products, and `CLAUDE.md` states "Leave balances are always
  sourced from Xero; never calculated by Team Calendar", so a region without
  balances would need a product decision);
- how leave types are enumerated, since `resolveLeaveTypeId` depends on it.

### 3. What is the mapping cost into the canonical model?

`packages/availability` must not learn about Xero payload shapes
(`CLAUDE.md`: "Xero-specific types never leak into `packages/availability` or
`packages/feeds`"). So each region needs its own mapper into
`AvailabilityRecord`.

Establish: can `AvailabilityRecord` represent NZ and UK leave without schema
changes? Specifically check `record_type` (the
`availability_record_type` enum), the `all_day` flag, and how units are
recorded. **A required schema change is the difference between an L and an XL,
because it lands on every existing tenant.**

### 4. What breaks in the rest of the product?

Grep for AU assumptions outside `packages/xero`:

```
grep -rn "\"AU\"\|'AU'\|country_code" packages apps --include=*.ts --include=*.tsx | grep -v node_modules | grep -v "\.test\."
```

Known one already: `apps/app/app/(authenticated)/settings/general/_actions.ts`
rejects a country change with "Team Calendar currently supports Australian Xero
Payroll files only." There will be others: public holiday jurisdictions
(Nager.Date), timezone handling, working-day calculation
(`computeWorkingDays`), and date formatting.

**Deliverable**: a list of every AU assumption outside `packages/xero`, with
file and line.

### 5. What is the testing story?

AU write has `packages/xero/src/au/write.test.ts` with fixture-based tests, as
`CLAUDE.md` requires ("Fixture-based tests for Xero response mappers and
region-specific parsers"). Establish what fixtures NZ and UK need and where
they would come from: a real sandbox tenant, or hand-written from
documentation. Hand-written fixtures for an API nobody has called are the most
common way a region integration ships broken.

**Deliverable**: whether a Xero demo company exists for each region, and what
it takes to get one.

### 6. Is there demand?

This is a product question and the spike should ask it rather than assume it.
Look for evidence in the repository: does anything track connected tenants by
region? Are there NZ or UK organisations in any environment? Check the
`XeroTenant.payroll_region` column's real distribution if a database is
available.

**If there is no evidence either way, say so.** "We have no NZ or UK customers
and no waiting list" is a finding that should change the priority.

### 7. Should the documentation be corrected in the meantime?

Whatever the build decision, `CLAUDE.md`, `PRODUCT.md`, `AGENTS.md` and
`GEMINI.md` currently claim three-region support that does not exist.
`README.md` gets it right. Recommend specific wording, and note that plan 026
already corrects `AGENTS.md` and `GEMINI.md` for a different reason and could
carry this change too.

## Commands you will need

All read-only.

```
grep -rn "payroll_region" packages apps --include=*.ts | grep -v node_modules
grep -rn "\"AU\"" packages apps --include=*.ts --include=*.tsx | grep -v node_modules | grep -v "\.test\."
bunx vitest run packages/xero/src/write/dispatch.test.ts
```

Use Context7 for all Xero API documentation. Do not rely on training data for
API shapes: `CLAUDE.md` mandates Context7 for exactly this, and a wrong
assumption about the NZ API shape would invalidate the whole estimate.

**Do not call the Xero API.** This spike needs no credentials and should
request none.

## Scope

**In scope:**

- Reading code and documentation
- Writing `plans/037-findings.md` with the answers

**Explicitly out of scope:**

- **Implementing anything.** No changes to `packages/xero/src/nz/`,
  `packages/xero/src/uk/`, or any other source file.
- Correcting the documentation. Recommend it; plan 026 or a follow-up does it.
- Obtaining Xero credentials or sandbox tenants.
- Any schema change or migration.

## Git workflow

```
git checkout -b spike/nz-uk-payroll
```

Commit message:

```
docs(plans): record NZ and UK payroll spike findings
```

Only `plans/037-findings.md` should appear in the diff.

## Steps

### Step 1: Read the AU implementation end to end

Read, in full:

- `packages/xero/src/au/write.ts`
- `packages/xero/src/au/read.ts`
- `packages/xero/src/write/dispatch.ts` and `packages/xero/src/write/types.ts`
- `packages/xero/src/adapter/xero-write-adapter.ts`
- `packages/jobs/src/handlers/sync-xero-people.ts` (the region gate)

You are establishing the shape a second region has to fill. Write down every
AU-specific decision you encounter: endpoint paths, payload field names,
pagination, unit handling, error mapping.

### Step 2: Research each region's API via Context7

Answer questions 1 and 2. One table per question, one row per region, a
documentation link per cell.

Where documentation is ambiguous, **say it is ambiguous**. An estimate built on
a guess about an API shape is worse than an estimate with a stated unknown.

### Step 3: Assess the canonical mapping

Answer question 3. Read
`packages/availability/src/records/record-type-categories.ts` and the
`availability_record_type` enum in `packages/database/prisma/schema.prisma`.

State plainly whether a schema change is required. If it is, that is the single
most important sentence in the report.

### Step 4: Find the AU assumptions outside `packages/xero`

Answer question 4 with the grep above plus targeted reads of:

- `packages/availability/src/duration/working-days.ts`
- `packages/availability/src/holidays/holiday-service.ts` (Nager.Date
  jurisdictions)
- `apps/app/app/(authenticated)/settings/general/_actions.ts`
- anything else the grep surfaces

### Step 5: Assess testing and demand

Answer questions 5 and 6. For 6, if no evidence is available, write "no
evidence available" rather than speculating.

### Step 6: Write the findings document

Create `plans/037-findings.md` with these sections:

1. **Recommendation**, in one paragraph, at the top. One of: build NZ,
   build UK, build both, build neither yet, or "finish AU first". Say which and
   why in three sentences.
2. **Region comparison table** (questions 1 and 2).
3. **Canonical mapping assessment** (question 3), with a clear statement about
   schema changes.
4. **AU assumptions outside `packages/xero`** (question 4), with file and line
   for each.
5. **Testing story** (question 5).
6. **Demand evidence** (question 6), including "none available" if that is the
   answer.
7. **Effort estimate**, broken down by region and by layer (write, read,
   mapping, product surfaces, tests). Give a range, not a point estimate, and
   name the assumption each end depends on.
8. **Documentation correction** (question 7), with recommended wording.
9. **Open questions**, listing everything you could not resolve.

**Write the recommendation before the effort estimate is complete**, then
revise it. A recommendation written after the estimate tends to justify the
estimate rather than the other way round.

## Test plan

No tests. Nothing is built.

The quality bar for the deliverable is: **could someone else act on this
document without redoing the research?** Concretely:

- every API claim has a documentation link;
- every "this will need changing" has a file and line;
- every unknown is listed as an unknown rather than smoothed over;
- the effort estimate names its assumptions.

A reviewer should be able to disagree with the recommendation while accepting
the evidence. If the evidence only supports one conclusion, the spike was
written backwards.

## Done criteria

1. `plans/037-findings.md` exists with all nine sections.
2. The recommendation is one of the five stated options, stated in the first
   paragraph.
3. Every API claim cites a documentation source retrieved via Context7.
4. The canonical mapping section states explicitly whether a database schema
   change is required.
5. The AU-assumption list gives file and line for each entry.
6. The effort estimate is a range with named assumptions, per region and per
   layer.
7. `git diff --name-only` lists **only** `plans/037-findings.md`. No source
   file may appear.
8. `plans/README.md` has this plan's status row updated.

## STOP conditions

Stop and report rather than continuing if any of these occur:

- **Context7 cannot retrieve Xero payroll documentation for NZ or UK.** Say so
  and stop at question 1. An estimate without the API shape is not an estimate.
  Do not fall back on training data for API specifics.
- **You are asked for, or find, Xero credentials.** This spike needs none. Do
  not use any, do not reproduce any value, and report where you found them if
  they are somewhere they should not be.
- **You find yourself editing a source file.** Stop. This is a spike; the only
  output is the findings document.
- **The canonical model turns out to need a schema change.** Finish the spike,
  but flag this prominently: it changes the shape of the work from "add a
  region adapter" to "migrate every tenant", and it is the kind of thing that
  should reach the user before anyone plans a sprint around it.
- **AU write-back turns out to have gaps of its own** that would also affect NZ
  and UK. Plans 017 (duplicate leave applications) and 010 (token decrypt
  throwing) are two known ones. If you find more, list them: "finish AU first"
  is a legitimate recommendation and the evidence for it belongs here.

## Maintenance notes

- **The stubs are good and should stay.** They are correctly typed, correctly
  dispatched, and return an honest error. Whatever this spike concludes, do not
  delete them: the dispatcher's `default` branch would then be the only thing
  handling NZ and UK, and its message ("Unsupported payroll region") is less
  useful than the region-specific ones.
- **Plan 017 has a direct dependency on this.** It makes AU writes safe against
  duplicate leave applications by passing `retryOnAmbiguousFailure: false` in
  `packages/xero/src/au/write.ts`'s shared request helper. A new region file
  will not inherit that, and forgetting it would reintroduce duplicate payroll
  records in the new region. Whoever builds NZ or UK must read plan 017 first.
- **Plan 010 is similar**: it changes how token decryption failures surface in
  the AU read and write paths. A new region must use the same helper.
- **The documentation says three regions and the code says one.** Until that is
  corrected, every reader of `CLAUDE.md` or `PRODUCT.md` starts with a false
  belief about the system, including the next agent to work on it. Correcting
  the docs is worth doing regardless of the build decision, and it is nearly
  free.
