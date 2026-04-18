import { requireRole } from "@repo/auth/helpers";

export class PermissionDeniedError extends Error {
  constructor() {
    super("Permission denied");
    this.name = "PermissionDeniedError";
  }
}

export async function requirePageRole(role: string): Promise<void> {
  const hasRole = await requireRole(role);
  if (!hasRole) {
    throw new PermissionDeniedError();
  }
}
