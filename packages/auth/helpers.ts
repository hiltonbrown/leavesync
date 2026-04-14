import "server-only";

import { auth } from "@clerk/nextjs/server";

/**
 * Gets the authenticated user's Clerk Organisation ID.
 * Throws if user is not authenticated or has not selected an organisation.
 */
export async function requireOrg(): Promise<string> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error(
      "Not authenticated or no organisation selected"
    );
  }

  return orgId;
}

/**
 * Gets the authenticated user's Clerk Organisation ID safely.
 * Returns null if user is not authenticated or has not selected an organisation.
 */
export async function getOrgId(): Promise<string | null> {
  const { orgId } = await auth();
  return orgId ?? null;
}

/**
 * Checks if the authenticated user has a specific role.
 * Throws if user is not authenticated.
 */
export async function requireRole(role: string): Promise<boolean> {
  const { sessionClaims } = await auth();

  if (!sessionClaims) {
    throw new Error("Not authenticated");
  }

  const userRole = sessionClaims.metadata?.role;
  return userRole === role;
}

// Re-export Clerk auth functions for convenience
export { auth, currentUser } from "@clerk/nextjs/server";
export type { User } from "@clerk/nextjs/server";
