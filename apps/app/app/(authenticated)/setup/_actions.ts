"use server";

import { auth } from "@repo/auth/server";
import {
  ensureOrganisationForClerk,
  type OrganisationSettingsInput,
} from "@repo/availability";
import type { Result } from "@repo/core";
import { redirect } from "next/navigation";
import { z } from "zod";

const SetupOrganisationSchema = z.object({
  countryCode: z.enum(["AU", "NZ", "UK"]),
  name: z.string().trim().min(1).max(128),
});

type ActionError =
  | { code: "not_authorised"; message: string }
  | { code: "unknown_error"; message: string }
  | { code: "validation_error"; message: string };

type ActionResult<T> = Result<T, ActionError>;

export async function createOrganisationAction(input: {
  countryCode: string;
  name: string;
}): Promise<ActionResult<never>> {
  const parsed = SetupOrganisationSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message);
  }

  const { orgId, orgRole } = await auth();

  if (!orgId || (orgRole !== "org:admin" && orgRole !== "org:owner")) {
    return notAuthorised();
  }

  // ensureOrganisationForClerk throws on DB failure — redirect must be outside try/catch
  try {
    const payload: OrganisationSettingsInput = {
      clerkOrgId: orgId,
      countryCode: parsed.data.countryCode,
      name: parsed.data.name,
    };
    await ensureOrganisationForClerk(payload);
  } catch {
    return unknownError("Failed to create organisation. Please try again.");
  }

  redirect("/");
}

function notAuthorised(): ActionResult<never> {
  return {
    ok: false,
    error: {
      code: "not_authorised",
      message: "You do not have permission to set up this organisation.",
    },
  };
}

function unknownError(message: string): ActionResult<never> {
  return { ok: false, error: { code: "unknown_error", message } };
}

function validationError(message?: string): ActionResult<never> {
  return {
    ok: false,
    error: {
      code: "validation_error",
      message: message ?? "Invalid input.",
    },
  };
}
