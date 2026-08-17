import "server-only";

import { auth } from "@clerk/nextjs/server";

/**
 * Gets the authenticated user's Clerk Organisation ID.
 * Throws if user is not authenticated or has not selected an organisation.
 */
export async function requireOrg(): Promise<string> {
  const authObject = await auth();

  if (!authObject.isAuthenticated || !authObject.orgId) {
    throw new Error("Not authenticated or no organisation selected");
  }

  return authObject.orgId;
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
 * Throws if user is not authenticated.
 */
export async function requireRole(role: string): Promise<boolean> {
  const authObject = await auth();

  if (!authObject.isAuthenticated) {
    throw new Error("Not authenticated");
  }

  return await authObject.has({ role });
}

export type { User } from "@clerk/nextjs/server";
// Re-export Clerk auth functions for convenience
export { auth, currentUser } from "@clerk/nextjs/server";
