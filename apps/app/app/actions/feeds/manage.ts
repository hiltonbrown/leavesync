"use server";

import { createFeed, rotateFeedToken, setFeedStatus } from "@repo/feeds";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";

const CreateFeedActionSchema = z.object({
  name: z.string().min(1).max(120),
  organisationId: z.string().uuid(),
  privacyDefault: z.enum(["named", "masked", "private"]).default("named"),
  scopeType: z
    .enum(["all_staff", "team", "manager", "location", "event_type", "custom"])
    .default("all_staff"),
});

const FeedActionSchema = z.object({
  feedId: z.string().uuid(),
  organisationId: z.string().uuid(),
});

const FeedStatusActionSchema = FeedActionSchema.extend({
  status: z.enum(["active", "archived", "paused"]),
});

export type FeedActionResult =
  | {
      ok: true;
      feed?: {
        activeTokenHint: string | null;
        id: string;
        name: string;
        privacyDefault: string;
        scopeType: string;
        slug: string;
        status: string;
      };
      token?: string;
    }
  | { ok: false; error: string };

export async function createFeedAction(
  input: z.infer<typeof CreateFeedActionSchema>
): Promise<FeedActionResult> {
  const parsed = CreateFeedActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid feed",
    };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { ok: false, error: contextResult.error.message };
  }

  const result = await createFeed(contextResult.value, parsed.data);
  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  revalidateFeedPaths();
  return {
    ok: true,
    feed: result.value.feed,
    token: result.value.token,
  };
}

export async function setFeedStatusAction(
  input: z.infer<typeof FeedStatusActionSchema>
): Promise<FeedActionResult> {
  const parsed = FeedStatusActionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid feed status change" };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { ok: false, error: contextResult.error.message };
  }

  const result = await setFeedStatus(
    contextResult.value,
    parsed.data.feedId,
    parsed.data.status
  );

  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  revalidateFeedPaths();
  return { ok: true, feed: result.value };
}

export async function rotateFeedTokenAction(
  input: z.infer<typeof FeedActionSchema>
): Promise<FeedActionResult> {
  const parsed = FeedActionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid feed" };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { ok: false, error: contextResult.error.message };
  }

  const result = await rotateFeedToken(contextResult.value, parsed.data.feedId);
  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  revalidateFeedPaths();
  return {
    ok: true,
    feed: result.value.feed,
    token: result.value.token,
  };
}

function revalidateFeedPaths(): void {
  for (const path of ["/", "/feed", "/calendar", "/public-holidays"]) {
    revalidatePath(path);
  }
}
