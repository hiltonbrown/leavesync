import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { Result } from "@repo/core";
import { database } from "@repo/database";
import type { Prisma } from "@repo/database/generated/client";
import { z } from "zod";
import { invalidateFeedCache } from "../cache/feed-cache";

export type FeedActorRole =
  | "admin"
  | "manager"
  | "owner"
  | "viewer"
  | `org:${string}`;

export type TokenServiceError =
  | { code: "cross_org_leak"; message: string }
  | { code: "feed_not_found"; message: string }
  | { code: "initial_token_exists"; message: string }
  | { code: "not_authorised"; message: string }
  | { code: "token_not_found"; message: string }
  | { code: "unknown_error"; message: string }
  | { code: "validation_error"; message: string };

export interface TokenDisclosure {
  hint: string;
  plaintext: string;
  tokenId: string;
}

export interface TokenHistoryItem {
  createdAt: Date;
  id: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  rotatedFromTokenId: string | null;
  status: "active" | "expired" | "revoked";
}

export interface ActiveTokenHint {
  createdAt: Date;
  hint: string;
  lastUsedAt: Date | null;
  tokenId: string;
}

const BaseTokenInputSchema = z.object({
  actingUserId: z.string().min(1),
  clerkOrgId: z.string().min(1),
  feedId: z.string().uuid(),
  organisationId: z.string().uuid(),
});

const InitialTokenInputSchema = BaseTokenInputSchema;
const RotateTokenInputSchema = BaseTokenInputSchema.extend({
  actingRole: z.string().min(1),
});
const RevokeTokenInputSchema = z.object({
  actingRole: z.string().min(1),
  actingUserId: z.string().min(1),
  clerkOrgId: z.string().min(1),
  organisationId: z.string().uuid(),
  tokenId: z.string().uuid(),
});
const ListTokensInputSchema = z.object({
  clerkOrgId: z.string().min(1),
  feedId: z.string().uuid(),
  includeRevoked: z.boolean().default(false),
  organisationId: z.string().uuid(),
});
const ActiveTokenInputSchema = z.object({
  clerkOrgId: z.string().min(1),
  feedId: z.string().uuid(),
  organisationId: z.string().uuid(),
});

type InitialTokenInput = z.infer<typeof InitialTokenInputSchema>;

export const generateFeedTokenPlaintext = (): string =>
  randomBytes(30).toString("base64url");

export const hashFeedToken = (plaintext: string): string =>
  createHash("sha256").update(plaintext).digest("hex");

export async function createInitialToken(
  input: unknown
): Promise<Result<TokenDisclosure, TokenServiceError>> {
  const parsed = InitialTokenInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const token = await database.$transaction((tx) =>
      createInitialTokenWithClient(tx, parsed.data)
    );
    return token;
  } catch {
    return unknownError("Failed to create feed token.");
  }
}

export async function createInitialTokenWithClient(
  tx: Prisma.TransactionClient,
  input: InitialTokenInput
): Promise<Result<TokenDisclosure, TokenServiceError>> {
  const feed = await tx.feed.findFirst({
    where: scopedFeed(input),
    select: { id: true },
  });
  if (!feed) {
    return await feedNotFoundOrLeak(tx, input);
  }

  const existing = await tx.feedToken.findFirst({
    where: {
      clerk_org_id: input.clerkOrgId,
      feed_id: input.feedId,
      organisation_id: input.organisationId,
    },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: {
        code: "initial_token_exists",
        message: "This feed already has a token.",
      },
    };
  }

  const plaintext = generateFeedTokenPlaintext();
  const hint = plaintext.slice(-4);
  const token = await tx.feedToken.create({
    data: {
      clerk_org_id: input.clerkOrgId,
      feed_id: input.feedId,
      organisation_id: input.organisationId,
      token_hash: hashFeedToken(plaintext),
      token_hint: hint,
    },
    select: { id: true },
  });

  await auditToken(tx, input, "feeds.token_created", token.id, {
    actingUserId: input.actingUserId,
    feedId: input.feedId,
    hint,
    tokenId: token.id,
  });

  return { ok: true, value: { hint, plaintext, tokenId: token.id } };
}

export async function rotateToken(
  input: unknown
): Promise<
  Result<TokenDisclosure & { previousTokenId: string }, TokenServiceError>
> {
  const parsed = RotateTokenInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  if (!isAdminOrOwner(parsed.data.actingRole)) {
    return notAuthorised();
  }

  try {
    const result = await database.$transaction(async (tx) => {
      const feed = await tx.feed.findFirst({
        where: scopedFeed(parsed.data),
        select: { id: true },
      });
      if (!feed) {
        return await feedNotFoundOrLeak(tx, parsed.data);
      }

      const activeTokens = await tx.feedToken.findMany({
        where: {
          clerk_org_id: parsed.data.clerkOrgId,
          feed_id: parsed.data.feedId,
          organisation_id: parsed.data.organisationId,
          status: "active",
        },
        orderBy: { created_at: "desc" },
        select: { id: true },
      });
      const previousToken = activeTokens[0];
      if (!previousToken) {
        return {
          ok: false,
          error: {
            code: "token_not_found",
            message: "This feed has no active token to rotate.",
          },
        } satisfies Result<never, TokenServiceError>;
      }

      await tx.feedToken.updateMany({
        data: { revoked_at: new Date(), status: "revoked" },
        where: {
          clerk_org_id: parsed.data.clerkOrgId,
          feed_id: parsed.data.feedId,
          organisation_id: parsed.data.organisationId,
          status: "active",
        },
      });

      const plaintext = generateFeedTokenPlaintext();
      const hint = plaintext.slice(-4);
      const token = await tx.feedToken.create({
        data: {
          clerk_org_id: parsed.data.clerkOrgId,
          feed_id: parsed.data.feedId,
          organisation_id: parsed.data.organisationId,
          rotated_from_token_id: previousToken.id,
          token_hash: hashFeedToken(plaintext),
          token_hint: hint,
        },
        select: { id: true },
      });

      await auditToken(tx, parsed.data, "feeds.token_rotated", token.id, {
        actingUserId: parsed.data.actingUserId,
        feedId: parsed.data.feedId,
        newHint: hint,
        newTokenId: token.id,
        previousTokenId: previousToken.id,
      });

      return {
        ok: true,
        value: {
          hint,
          plaintext,
          previousTokenId: previousToken.id,
          tokenId: token.id,
        },
      } satisfies Result<
        TokenDisclosure & { previousTokenId: string },
        TokenServiceError
      >;
    });

    if (result.ok) {
      await invalidateFeedCache({ feedId: parsed.data.feedId });
    }
    return result;
  } catch {
    return unknownError("Failed to rotate feed token.");
  }
}

export async function revokeToken(
  input: unknown
): Promise<Result<{ feedId: string; tokenId: string }, TokenServiceError>> {
  const parsed = RevokeTokenInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  if (!isAdminOrOwner(parsed.data.actingRole)) {
    return notAuthorised();
  }

  try {
    const result = await database.$transaction(async (tx) => {
      const token = await tx.feedToken.findFirst({
        where: {
          clerk_org_id: parsed.data.clerkOrgId,
          id: parsed.data.tokenId,
          organisation_id: parsed.data.organisationId,
        },
        select: { feed_id: true, id: true, status: true, token_hint: true },
      });
      if (!token) {
        return await tokenNotFoundOrLeak(tx, parsed.data);
      }

      if (token.status !== "revoked") {
        await tx.feedToken.update({
          data: { revoked_at: new Date(), status: "revoked" },
          where: { id: token.id },
        });
      }

      await auditToken(tx, parsed.data, "feeds.token_revoked", token.id, {
        actingUserId: parsed.data.actingUserId,
        feedId: token.feed_id,
        hint: token.token_hint,
        tokenId: token.id,
      });

      return {
        ok: true,
        value: { feedId: token.feed_id, tokenId: token.id },
      } satisfies Result<
        { feedId: string; tokenId: string },
        TokenServiceError
      >;
    });

    if (result.ok) {
      await invalidateFeedCache({ feedId: result.value.feedId });
    }
    return result;
  } catch {
    return unknownError("Failed to revoke feed token.");
  }
}

export async function listTokens(
  input: unknown
): Promise<Result<TokenHistoryItem[], TokenServiceError>> {
  const parsed = ListTokensInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const feed = await database.feed.findFirst({
      where: scopedFeed(parsed.data),
      select: { id: true },
    });
    if (!feed) {
      return await feedNotFoundOrLeak(database, parsed.data);
    }

    const tokens = await database.feedToken.findMany({
      orderBy: { created_at: "desc" },
      select: tokenHistorySelect,
      where: {
        clerk_org_id: parsed.data.clerkOrgId,
        feed_id: parsed.data.feedId,
        organisation_id: parsed.data.organisationId,
        ...(parsed.data.includeRevoked ? {} : { status: "active" as const }),
      },
    });

    return { ok: true, value: tokens.map(toTokenHistoryItem) };
  } catch {
    return unknownError("Failed to list feed tokens.");
  }
}

export async function getActiveTokenHint(
  input: unknown
): Promise<Result<ActiveTokenHint | null, TokenServiceError>> {
  const parsed = ActiveTokenInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const feed = await database.feed.findFirst({
      where: scopedFeed(parsed.data),
      select: { id: true },
    });
    if (!feed) {
      return await feedNotFoundOrLeak(database, parsed.data);
    }

    const token = await database.feedToken.findFirst({
      orderBy: { created_at: "desc" },
      select: {
        created_at: true,
        id: true,
        last_used_at: true,
        token_hint: true,
      },
      where: {
        clerk_org_id: parsed.data.clerkOrgId,
        feed_id: parsed.data.feedId,
        organisation_id: parsed.data.organisationId,
        status: "active",
      },
    });

    return {
      ok: true,
      value: token
        ? {
            createdAt: token.created_at,
            hint: token.token_hint,
            lastUsedAt: token.last_used_at,
            tokenId: token.id,
          }
        : null,
    };
  } catch {
    return unknownError("Failed to load active token hint.");
  }
}

export async function revokeAllFeedTokens(input: {
  clerkOrgId: string;
  organisationId: string;
}): Promise<Result<{ revokedCount: number }, TokenServiceError>> {
  try {
    const result = await database.feedToken.updateMany({
      data: { revoked_at: new Date(), status: "revoked" },
      where: {
        clerk_org_id: input.clerkOrgId,
        organisation_id: input.organisationId,
        status: "active",
      },
    });
    const feeds = await database.feed.findMany({
      select: { id: true },
      where: {
        clerk_org_id: input.clerkOrgId,
        organisation_id: input.organisationId,
      },
    });
    await Promise.all(
      feeds.map((feed) => invalidateFeedCache({ feedId: feed.id }))
    );
    return { ok: true, value: { revokedCount: result.count } };
  } catch {
    return unknownError("Failed to revoke feed tokens.");
  }
}

function scopedFeed(input: {
  clerkOrgId: string;
  feedId: string;
  organisationId: string;
}) {
  return {
    clerk_org_id: input.clerkOrgId,
    id: input.feedId,
    organisation_id: input.organisationId,
  };
}

async function feedNotFoundOrLeak(
  client: Prisma.TransactionClient | typeof database,
  input: { clerkOrgId: string; feedId: string; organisationId: string }
): Promise<Result<never, TokenServiceError>> {
  const exists = await client.feed.findFirst({
    where: { id: input.feedId },
    select: { clerk_org_id: true, organisation_id: true },
  });
  if (
    exists &&
    (exists.clerk_org_id !== input.clerkOrgId ||
      exists.organisation_id !== input.organisationId)
  ) {
    return {
      ok: false,
      error: {
        code: "cross_org_leak",
        message: "Feed is outside this organisation.",
      },
    };
  }
  return {
    ok: false,
    error: { code: "feed_not_found", message: "Feed not found." },
  };
}

async function tokenNotFoundOrLeak(
  tx: Prisma.TransactionClient,
  input: { clerkOrgId: string; organisationId: string; tokenId: string }
): Promise<Result<never, TokenServiceError>> {
  const exists = await tx.feedToken.findFirst({
    where: { id: input.tokenId },
    select: { clerk_org_id: true, organisation_id: true },
  });
  if (
    exists &&
    (exists.clerk_org_id !== input.clerkOrgId ||
      exists.organisation_id !== input.organisationId)
  ) {
    return {
      ok: false,
      error: {
        code: "cross_org_leak",
        message: "Token is outside this organisation.",
      },
    };
  }
  return {
    ok: false,
    error: { code: "token_not_found", message: "Token not found." },
  };
}

function auditToken(
  tx: Prisma.TransactionClient,
  input: { actingUserId: string; clerkOrgId: string; organisationId: string },
  action: string,
  tokenId: string,
  payload: Record<string, string | number | boolean | null>
) {
  return tx.auditEvent.create({
    data: {
      action,
      actor_user_id: input.actingUserId,
      clerk_org_id: input.clerkOrgId,
      organisation_id: input.organisationId,
      payload,
      resource_id: tokenId,
      resource_type: "feed_token",
    },
  });
}

const tokenHistorySelect = {
  created_at: true,
  id: true,
  last_used_at: true,
  revoked_at: true,
  rotated_from_token_id: true,
  status: true,
} as const;

function toTokenHistoryItem(token: {
  created_at: Date;
  id: string;
  last_used_at: Date | null;
  revoked_at: Date | null;
  rotated_from_token_id: string | null;
  status: "active" | "expired" | "revoked";
}): TokenHistoryItem {
  return {
    createdAt: token.created_at,
    id: token.id,
    lastUsedAt: token.last_used_at,
    revokedAt: token.revoked_at,
    rotatedFromTokenId: token.rotated_from_token_id,
    status: token.status,
  };
}

function isAdminOrOwner(role: string): boolean {
  return (
    role === "admin" ||
    role === "owner" ||
    role === "org:admin" ||
    role === "org:owner"
  );
}

function notAuthorised(): Result<never, TokenServiceError> {
  return {
    ok: false,
    error: {
      code: "not_authorised",
      message: "You do not have permission to manage feed tokens.",
    },
  };
}

function validationError(error: z.ZodError): Result<never, TokenServiceError> {
  return {
    ok: false,
    error: {
      code: "validation_error",
      message: error.issues[0]?.message ?? "Invalid token request.",
    },
  };
}

function unknownError(message: string): Result<never, TokenServiceError> {
  return { ok: false, error: { code: "unknown_error", message } };
}
