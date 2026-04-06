"use server";

import { auth } from "@repo/auth/server";

type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

export const revokeAllTokens = async (): Promise<Result<void>> => {
  const { orgId } = await auth();

  if (!orgId) {
    return { ok: false, error: "Not authenticated" };
  }

  // CalendarFeed token revocation requires the CalendarFeed DB table — not yet implemented.
  return {
    ok: false,
    error: "Token revocation is not yet available. Check back soon.",
  };
};
