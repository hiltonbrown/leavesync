import "server-only";

import type { Result } from "@repo/core";
import { database } from "@repo/database";
import { z } from "zod";
import {
  type PreviewEvent,
  projectFeedEvents,
} from "../projection/feed-projection";
import {
  canViewFeed,
  isAdminOrOwner,
  normaliseRole,
} from "../scope/feed-scope";

export type PreviewServiceError =
  | { code: "cross_org_leak"; message: string }
  | { code: "feed_not_found"; message: string }
  | { code: "invalid_scope"; message: string }
  | { code: "not_authorised"; message: string }
  | { code: "unknown_error"; message: string }
  | { code: "validation_error"; message: string };

const PreviewFeedSchema = z.object({
  actingPersonId: z.string().uuid().nullable().optional(),
  actingRole: z.string().min(1),
  actingUserId: z.string().min(1),
  clerkOrgId: z.string().min(1),
  feedId: z.string().uuid(),
  horizonDays: z.number().int().min(1).max(90).default(30),
  organisationId: z.string().uuid(),
  privacyMode: z.enum(["named", "masked", "private"]).optional(),
});

export async function previewFeed(
  input: unknown
): Promise<Result<PreviewEvent[], PreviewServiceError>> {
  const parsed = PreviewFeedSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const role = normaliseRole(parsed.data.actingRole);
    const feed = await database.feed.findFirst({
      where: {
        clerk_org_id: parsed.data.clerkOrgId,
        id: parsed.data.feedId,
        organisation_id: parsed.data.organisationId,
      },
      select: {
        created_by_user_id: true,
        privacy_mode: true,
        scopes: {
          select: {
            scope_type: true,
            scope_value: true,
          },
        },
      },
    });
    if (!feed) {
      return await feedNotFoundOrLeak(parsed.data);
    }

    const requestedPrivacy = parsed.data.privacyMode ?? feed.privacy_mode;
    if (!isAdminOrOwner(role) && requestedPrivacy !== feed.privacy_mode) {
      return notAuthorised();
    }

    const visible = await canViewFeed({
      actingPersonId: parsed.data.actingPersonId ?? null,
      clerkOrgId: parsed.data.clerkOrgId,
      createdByUserId: feed.created_by_user_id,
      organisationId: parsed.data.organisationId,
      role,
      scopes: feed.scopes.map((scope) => ({
        scopeType: scope.scope_type,
        scopeValue: scope.scope_value,
      })),
    });
    if (!visible.ok) {
      return { ok: false, error: visible.error };
    }
    if (!visible.value) {
      return notAuthorised();
    }

    const result = await projectFeedEvents({
      actingPersonId: parsed.data.actingPersonId ?? null,
      actingRole: role,
      clerkOrgId: parsed.data.clerkOrgId,
      feedId: parsed.data.feedId,
      horizonDays: parsed.data.horizonDays,
      organisationId: parsed.data.organisationId,
      privacyMode: requestedPrivacy,
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return result;
  } catch {
    return {
      ok: false,
      error: {
        code: "unknown_error",
        message: "Failed to load feed preview.",
      },
    };
  }
}

async function feedNotFoundOrLeak(input: {
  clerkOrgId: string;
  feedId: string;
  organisationId: string;
}): Promise<Result<never, PreviewServiceError>> {
  const exists = await database.feed.findFirst({
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

function notAuthorised(): Result<never, PreviewServiceError> {
  return {
    ok: false,
    error: {
      code: "not_authorised",
      message: "You do not have permission to preview this feed.",
    },
  };
}

function validationError(
  error: z.ZodError
): Result<never, PreviewServiceError> {
  return {
    ok: false,
    error: {
      code: "validation_error",
      message: error.issues[0]?.message ?? "Invalid preview request.",
    },
  };
}
