"use server";

import { auth, clerkClient } from "@repo/auth/server";
import { z } from "zod";

const UpdateRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(["org:owner", "org:admin", "org:manager", "org:viewer"]),
});

type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

export const updateMemberRole = async (
  input: unknown
): Promise<Result<void>> => {
  const { orgId } = await auth();

  if (!orgId) {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = UpdateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const clerk = await clerkClient();
    await clerk.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId: parsed.data.membershipId,
      role: parsed.data.role,
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update role";
    return { ok: false, error: message };
  }
};
