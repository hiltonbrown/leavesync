import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { Result } from "@repo/core";
import { appError } from "@repo/core";

/**
 * Gets the authenticated user's Clerk Organisation ID.
 * Throws if user is not authenticated or has not selected an organisation.
 * @deprecated Prefer getOrgId() or requireOrgResult() in server actions to avoid uncaught throws (500). Kept for layout/page guards where throw is intentional.
 */
export async function requireOrg(): Promise<string> {
  const authObject = await auth();

  if (!(authObject.isAuthenticated && authObject.orgId)) {
    throw new Error("Not authenticated or no organisation selected");
  }

  return authObject.orgId;
}

/**
 * Safe Result-based variant for server actions. Never throws.
 */
export async function requireOrgResult(): Promise<Result<string>> {
  const authObject = await auth();
  if (!(authObject.isAuthenticated && authObject.orgId)) {
    return {
      error: appError(
        "unauthorised",
        "Not authenticated or no organisation selected"
      ),
      ok: false,
    };
  }
  return { ok: true, value: authObject.orgId };
}

/**
 * Gets the authenticated user's Clerk Organisation ID safely.
 * Returns null if user is not authenticated or has not selected an organisation.
 */
export async function getOrgId(): Promise<string | null> {
  const authObject = await auth();
  return authObject.orgId ?? null;
}

/**
 * Checks if the authenticated user has a specific role.
 * Returns false if user is not authenticated instead of throwing, so server actions can map to Result and avoid 500.
 */
export async function requireRole(role: string): Promise<boolean> {
  const authObject = await auth();

  if (!authObject.isAuthenticated) {
    return false;
  }

  return await authObject.has({ role });
}

/**
 * Result-based role check for server actions.
 */
export async function hasRoleResult(role: string): Promise<Result<boolean>> {
  const authObject = await auth();
  if (!authObject.isAuthenticated) {
    return { error: appError("unauthorised", "Not authenticated"), ok: false };
  }
  const has = await authObject.has({ role });
  return { ok: true, value: has };
}

export type { User } from "@clerk/nextjs/server";
// Re-export Clerk auth functions for convenience
export { auth, currentUser } from "@clerk/nextjs/server";
