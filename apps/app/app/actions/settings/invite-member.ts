"use server";

import { auth, clerkClient } from "@repo/auth/server";
import { z } from "zod";

const InviteMemberSchema = z.object({
  emailAddress: z.string().email("Invalid email address"),
  role: z.enum(["org:owner", "org:admin", "org:manager", "org:viewer"]),
});

type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

export const inviteMember = async (input: unknown): Promise<Result<void>> => {
  const { orgId, userId } = await auth();

  if (!(orgId && userId)) {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = InviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Invalid input",
    };
  }

  try {
    const clerk = await clerkClient();
    await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: userId,
      emailAddress: parsed.data.emailAddress,
      role: parsed.data.role,
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send invitation";
    return { ok: false, error: message };
  }
};
