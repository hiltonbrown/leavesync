"use server";

import { auth, clerkClient } from "@repo/auth/server";
import { z } from "zod";

const UpdateOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(128),
  timezone: z.string().min(1),
  locale: z.string().min(1),
  fiscalYearStart: z.number().int().min(1).max(12),
});

type UpdateOrgInput = z.infer<typeof UpdateOrgSchema>;

type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

export const updateOrg = async (
  input: UpdateOrgInput
): Promise<Result<void>> => {
  const { orgId } = await auth();

  if (!orgId) {
    return { ok: false, error: "No active organisation" };
  }

  const parsed = UpdateOrgSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { name, timezone, locale, fiscalYearStart } = parsed.data;

  try {
    const clerk = await clerkClient();
    await clerk.organizations.updateOrganization(orgId, {
      name,
      publicMetadata: { timezone, locale, fiscalYearStart },
    });
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, error: "Failed to update organisation" };
  }
};
