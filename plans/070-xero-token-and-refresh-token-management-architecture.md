# Plan 070: Xero Token & Refresh Token Management Architecture

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5993283..HEAD -- packages/xero/src/crypto/tokens.ts packages/xero/src/oauth/service.ts packages/xero/src/rate-limit/xero-fetch.ts packages/jobs/src/handlers/schedule-xero-syncs.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `5993283`, 2026-08-22

---

## Why this matters

Xero OAuth 2.0 uses ephemeral 30-minute access tokens and single-use 60-day sliding-window refresh tokens. In a distributed multi-tenant environment, uncoordinated token refreshes, race conditions, or unhandled exchange drops permanently break payroll connections, requiring manual customer re-authentication.

This plan establishes a hardened, comprehensive token management architecture that:
1. Prevents concurrent refresh races via transactional PostgreSQL advisory locks.
2. Performs proactive just-in-time token refreshes before all sync runs and payroll writes.
3. Automatically protects against the 60-day inactive refresh token cliff.
4. Enforces AES-256-GCM authenticated encryption with key versioning across all credential stores.
5. Captures and isolates post-exchange persistence failures without crashing running jobs.

---

## Current state

- **Encryption Layer** (`packages/xero/src/crypto/tokens.ts`):
  Uses `aes-256-gcm` with 12-byte IVs, 16-byte auth tags, and key version 1. Exposes `encryptXeroToken`, `decryptXeroToken`, and non-throwing `tryDecryptXeroToken`.
- **Proactive Refresh Mechanism** (`packages/xero/src/oauth/service.ts:653-708`):
  `ensureFreshXeroConnection` checks `TOKEN_REFRESH_BUFFER_MS` (5 minutes) and initiates a lock-guarded refresh if the access token is near expiry.
- **Concurrency Serialisation** (`packages/xero/src/oauth/service.ts:714-720`):
  Uses `pg_advisory_xact_lock(hashtextextended(connectionId, 0))` to serialise token exchanges per connection across cluster instances.
- **Single-Use Refresh Token Hazard** (`packages/xero/src/oauth/service.ts:550-610`):
  If the remote token exchange with Xero succeeds but the local database transaction fails to commit, the connection enters a `stale` state (`last_error_code: "refresh_persist_failed"`).

---

## Commands you will need

| Purpose   | Command                                                      | Expected on success |
|-----------|--------------------------------------------------------------|---------------------|
| Check     | `bun run check`                                              | exit 0              |
| Typecheck | `bun run typecheck`                                          | exit 0              |
| Unit tests| `bunx vitest run packages/xero/src/crypto/tokens.test.ts`    | all pass            |
| OAuth test| `bunx vitest run packages/xero/src/oauth/service.test.ts`    | all pass            |
| Full suite| `bun run test`                                               | all pass            |

---

## Scope

**In scope**:
- `packages/xero/src/crypto/tokens.ts`
- `packages/xero/src/oauth/service.ts`
- `packages/jobs/src/handlers/schedule-xero-syncs.ts`
- `packages/database/src/queries/schedulable-xero-tenants.ts`
- Co-located unit and integration tests in `packages/xero` and `packages/jobs`.

**Out of scope**:
- Modifying Clerk session tokens or user auth in `packages/auth`
- Modifying feed tokens in `packages/feeds`
- Changes to Xero OAuth scope definitions (`offline_access`, `payroll.employees`, etc.)

---

## Git workflow

- Branch: `advisor/070-xero-token-refresh-management`
- Commit style: Conventional Commits (`feat: add 45-day proactive refresh token rotation`, `fix: harden token refresh concurrency and error boundaries`)
- Do NOT push or open a PR unless explicitly instructed.

---

## Architecture & Lifecycle Specifications

```
                          [Xero OAuth Lifecycle]
                                    │
                                    ▼
                     [Initial Connect / Authorise]
                                    │
                                    ├─ Exchange Auth Code for Tokens
                                    ├─ Encrypt (AES-256-GCM, IV, AuthTag)
                                    ├─ Save Session (15m TTL) -> Connection
                                    ▼
                      [Inbound Sync or Write Request]
                                    │
                                    ▼
                       [ensureFreshXeroConnection]
                                    │
              ┌─────────────────────┴─────────────────────┐
              │                                           │
  (expires_at - now > 5m)                     (expires_at - now <= 5m)
              │                                           │
              ▼                                           ▼
       [Active Token]                           [Acquire Advisory Lock]
       (Use directly)                           pg_advisory_xact_lock()
                                                          │
                                                [Check Winner State]
                                             (Already refreshed by peer?)
                                                          │
                                                          ├─ Yes ──► [Return Fresh Expiry]
                                                          │
                                                          └─ No ──► [Exchange Refresh Token]
                                                                          │
                                                               ┌──────────┴──────────┐
                                                               │                     │
                                                           [Success]              [Failure]
                                                               │                     │
                                                       [Persist New IV,        [Mark Stale &
                                                        AuthTag, Expiry]        Alert Admin]
```

---

## Steps

### Step 1: Add Inactive Connection Long-Term Expiry Guard (45-day rotation)

1. In `packages/database/src/queries/schedulable-xero-tenants.ts`:
   - Add a query helper `findConnectionsNeedingTokenRotation` that identifies active connections where `last_refreshed_at < now() - 45 days` (preventing the 60-day Xero refresh token hard cliff for low-activity tenants).
2. In `packages/jobs/src/handlers/schedule-xero-syncs.ts`:
   - Include a rotation check during the scheduled sync maintenance pass to proactively call `ensureFreshXeroConnection` on dormant connections before their refresh tokens lapse.

**Verify**: `bunx vitest run packages/database/src/queries/schedulable-xero-tenants.test.ts` → all pass.

---

### Step 2: Harden Advisory Lock & Optimistic Version Checks

1. In `packages/xero/src/oauth/service.ts`:
   - Verify that all database reads within the advisory lock explicitly read `refresh_token_encrypted`, `refresh_token_iv`, `refresh_token_auth_tag`, and `key_version`.
   - Ensure the lock key `hashtextextended(connectionId, 0)` is consistently applied across both `refreshXeroOAuthConnection` and `ensureFreshXeroConnection`.
   - Confirm `updateMany` utilizes `where: { id: connectionId, refresh_token_encrypted: previousEncryptedValue }` to enforce optimistic locking against race conditions.

**Verify**: `bunx vitest run packages/xero/src/oauth/service.test.ts` → all pass.

---

### Step 3: Standardise Error Classification on Refresh Failures

1. In `packages/xero/src/oauth/service.ts`:
   - Map Xero token endpoint error responses into typed errors:
     - `invalid_grant` / `refresh_token_invalid`: Marks connection as `status: "stale"`, `last_error_code: "refresh_token_invalid"`.
     - `unauthorized_client` / `invalid_client`: Marks connection as `status: "stale"`, `last_error_code: "client_credentials_invalid"`.
     - Transient HTTP 5xx or network drops: Returns `network_error` without marking the connection stale, allowing retries.

**Verify**: `bunx vitest run packages/xero/src/oauth/` → all pass.

---

## Test plan

- **Unit Tests**:
  - `packages/xero/src/crypto/tokens.test.ts`: Verify encryption, decryption, invalid IV detection, and corrupted auth tag rejection.
  - `packages/xero/src/oauth/service.test.ts`:
    - Test `xeroConnectionRefreshDecision`: verify `"active"`, `"refresh"`, and `"inactive"` states given varying `expiresAt`, `now`, and token presence.
    - Test concurrent refresh simulation: verify that the advisory lock serialises requests and secondary callers return cached tokens without executing duplicate remote requests.
- **Integration Tests**:
  - `packages/xero/src/oauth/disconnect.integration.test.ts`: Verify that disconnect wipes token fields (`access_token_encrypted: ""`, `refresh_token_encrypted: ""`, auth tags nulled).

**Verification Command**: `bun run test` → all tests pass.

---

## Done criteria

- [ ] `bun run check` exits 0.
- [ ] `bun run typecheck` exits 0.
- [ ] `bun run test` exits 0 with all token encryption and refresh tests passing.
- [ ] All token columns (`access_token_encrypted`, `refresh_token_encrypted`) remain protected by AES-256-GCM with distinct IVs and auth tags.
- [ ] Concurrency collisions on token refresh are eliminated via advisory locks.
- [ ] `plans/README.md` status row updated.

---

## STOP conditions

Stop and report back if:
- `XERO_TOKEN_ENCRYPTION_KEY` is missing or invalid in environment validation.
- Database deadlock occurs on `pg_advisory_xact_lock` during multi-tenant parallel transactions.

---

## Maintenance notes

- If Xero amends token lifetimes (e.g. shortening access token lifespan from 30 minutes), adjust `TOKEN_REFRESH_BUFFER_MS` accordingly.
- Key rotation: To rotate encryption keys, increment `keyVersion` and execute a batch re-encryption script against existing `xero_connections` and `xero_oauth_sessions`.
