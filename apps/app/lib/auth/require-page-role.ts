import { requireRole } from "@repo/auth/helpers";

const ROLE_HIERARCHY = ["org:viewer", "org:manager", "org:admin", "org:owner"];

export class PermissionDeniedError extends Error {
  constructor() {
    super("Permission denied");
    this.name = "PermissionDeniedError";
  }
}

export async function requirePageRole(role: string): Promise<void> {
  const allowedRoles = rolesAtOrAbove(role);
  const accessResults = await Promise.all(
    allowedRoles.map((allowedRole) => requireRole(allowedRole))
  );
  const hasRole = accessResults.some(Boolean);
  if (!hasRole) {
    throw new PermissionDeniedError();
  }
}

function rolesAtOrAbove(role: string): string[] {
  const index = ROLE_HIERARCHY.indexOf(role);
  if (index === -1) {
    return [role];
  }
  return ROLE_HIERARCHY.slice(index);
}
