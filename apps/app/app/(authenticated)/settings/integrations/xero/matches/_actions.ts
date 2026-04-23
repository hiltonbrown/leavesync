"use server";

import { auth, currentUser } from "@repo/auth/server";
import type { Result } from "@repo/core";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ResolveMatchSchema = z.object({
  clerkUserId: z.string().trim().min(1).optional(),
  matchId: z.string().uuid(),
  resolution: z.enum(["ignore", "match"]),
});

type ActionError =
  | { code: "not_authorised"; message: string }
  | { code: "unknown_error"; message: string }
  | { code: "validation_error"; message: string };

type ActionResult<T> = Result<T, ActionError>;

export async function resolveXeroPersonMatchAction(input: {
  clerkUserId?: string;
  matchId: string;
  resolution: "ignore" | "match";
}): Promise<ActionResult<{ resolved: true }>> {
  const parsed = ResolveMatchSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message);
  }

  const [{ orgId, orgRole }, user] = await Promise.all([auth(), currentUser()]);
  if (
    !(orgId && user) ||
    (orgRole !== "org:owner" && orgRole !== "org:admin")
  ) {
    return notAuthorised();
  }

  const match = await database.xeroPersonMatch.findFirst({
    where: {
      clerk_org_id: orgId,
      id: parsed.data.matchId,
    },
    include: {
      candidate_person: {
        select: {
          clerk_user_id: true,
          id: true,
        },
      },
      xero_person: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!match) {
    return unknownError("Possible match not found.");
  }

  const resolvedClerkUserId =
    parsed.data.resolution === "match"
      ? (parsed.data.clerkUserId ??
        match.candidate_person?.clerk_user_id ??
        null)
      : null;
  if (parsed.data.resolution === "match" && !resolvedClerkUserId) {
    return validationError(
      "Enter the Clerk user ID to link, or create a candidate person with a linked user first."
    );
  }

  await database.$transaction(async (tx) => {
    if (parsed.data.resolution === "match" && resolvedClerkUserId) {
      await tx.person.update({
        where: { id: match.xero_person.id },
        data: {
          clerk_user_id: resolvedClerkUserId,
        },
      });
    }

    await tx.xeroPersonMatch.update({
      where: { id: match.id },
      data: {
        resolved_at: new Date(),
        resolved_by_user_id: user.id,
        resolved_clerk_user_id: resolvedClerkUserId,
        resolved_person_id: match.candidate_person?.id ?? null,
        resolution_note:
          parsed.data.resolution === "ignore"
            ? "Marked as separate records by admin."
            : "Linked Xero person to Clerk user.",
        status: parsed.data.resolution === "ignore" ? "ignored" : "matched",
      },
    });

    await tx.auditEvent.create({
      data: {
        action:
          parsed.data.resolution === "ignore"
            ? "xero.person_match_ignored"
            : "xero.person_match_resolved",
        actor_display:
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.emailAddresses[0]?.emailAddress ||
          user.id,
        actor_user_id: user.id,
        clerk_org_id: orgId,
        entity_id: match.id,
        entity_type: "xero_person_match",
        metadata: {
          resolvedClerkUserId,
          xeroPersonId: match.xero_person.id,
        },
        organisation_id: match.organisation_id,
        resource_id: match.id,
        resource_type: "xero_person_match",
      },
    });
  });

  revalidatePath("/settings/integrations/xero/matches");
  return { ok: true, value: { resolved: true } };
}

function notAuthorised(): ActionResult<never> {
  return {
    ok: false,
    error: {
      code: "not_authorised",
      message: "Only owners and admins can resolve Xero person matches.",
    },
  };
}

function unknownError(message: string): ActionResult<never> {
  return {
    ok: false,
    error: {
      code: "unknown_error",
      message,
    },
  };
}

function validationError(message?: string): ActionResult<never> {
  return {
    ok: false,
    error: {
      code: "validation_error",
      message: message ?? "Invalid match resolution input.",
    },
  };
}
