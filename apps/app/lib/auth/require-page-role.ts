import "server-only";

import { auth } from "@repo/auth/server";

const ROLE_HIERARCHY = [
  "org:viewer",
  "org:manager",
  "org:admin",
  "org:owner",
] as const;

export class PermissionDeniedError extends Error {
  constructor() {
    super("Permission denied");
    this.name = "PermissionDeniedError";
  }
}

/**
 * Page/layout guard: throws PermissionDeniedError if user lacks required role.
 * Now handles unauthenticated gracefully (returns PermissionDenied, not "Not authenticated" throw) so callers get a consistent 403/redirect instead of 500.
 */
export async function requirePageRole(role: string): Promise<void> {
  const authObject = await auth();
  if (!authObject.isAuthenticated) {
    throw new PermissionDeniedError();
  }
  const allowedRoles = rolesAtOrAbove(role);
  const accessResults = await Promise.all(
    allowedRoles.map((allowedRole) => authObject.has({ role: allowedRole }))
  );
  const hasRole = accessResults.some(Boolean);
  if (!hasRole) {
    throw new PermissionDeniedError();
  }
}

/**
 * Safe boolean check for server actions. Never throws. Use this in actionContext and map false to Result { code: "not_authorised" }.
 */
export async function hasPageRole(role: string): Promise<boolean> {
  const authObject = await auth();
  if (!authObject.isAuthenticated) {
    return false;
  }
  const allowedRoles = rolesAtOrAbove(role);
  const results = await Promise.all(
    allowedRoles.map((r) => authObject.has({ role: r }))
  );
  return results.some(Boolean);
}

function rolesAtOrAbove(role: string): string[] {
  const index = ROLE_HIERARCHY.indexOf(role as (typeof ROLE_HIERARCHY)[number]);
  if (index === -1) {
    return [role];
  }
  return ROLE_HIERARCHY.slice(index);
}
