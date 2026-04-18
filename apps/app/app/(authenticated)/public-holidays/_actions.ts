"use server";

import { requireRole } from "@repo/auth/helpers";
import { currentUser } from "@repo/auth/server";
import {
  addCustomHoliday,
  deleteCustomHoliday,
  importForJurisdiction,
  restoreHoliday,
  suppressHoliday,
} from "@repo/availability";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";

const ImportHolidaySchema = z.object({
  countryCode: z.string().length(2),
  regionCode: z.string().nullable(),
  year: z.number().int().min(2000).max(2100),
  organisationId: z.string().uuid(),
});

export async function importFromSourceAction(
  input: z.infer<typeof ImportHolidaySchema>
) {
  const parsed = ImportHolidaySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const hasAccess = await requireRole("org:admin");
  if (!hasAccess) {
    return { ok: false as const, error: "Permission denied" };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false as const, error: "You need to sign in again." };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { ok: false as const, error: contextResult.error.message };
  }

  const result = await importForJurisdiction({
    clerkOrgId: contextResult.value.clerkOrgId,
    organisationId: contextResult.value.organisationId,
    countryCode: parsed.data.countryCode,
    regionCode: parsed.data.regionCode,
    year: parsed.data.year,
    userId: user.id,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.message };
  }

  revalidatePath("/public-holidays");
  revalidatePath("/settings/holidays");
  revalidatePath("/calendar");

  return result;
}

const AddCustomHolidaySchema = z.object({
  organisationId: z.string().uuid(),
  jurisdictionId: z.string().uuid().nullable(),
  name: z.string().min(1).max(100),
  date: z.coerce.date(),
  recursAnnually: z.boolean(),
  appliesToAllJurisdictions: z.boolean(),
});

export async function addCustomHolidayAction(
  input: z.infer<typeof AddCustomHolidaySchema>
) {
  const parsed = AddCustomHolidaySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const hasAccess = await requireRole("org:admin");
  if (!hasAccess) {
    return { ok: false as const, error: "Permission denied" };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false as const, error: "You need to sign in again." };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { ok: false as const, error: contextResult.error.message };
  }

  const result = await addCustomHoliday({
    clerkOrgId: contextResult.value.clerkOrgId,
    organisationId: contextResult.value.organisationId,
    jurisdictionId: parsed.data.jurisdictionId,
    name: parsed.data.name,
    date: parsed.data.date,
    recursAnnually: parsed.data.recursAnnually,
    appliesToAllJurisdictions: parsed.data.appliesToAllJurisdictions,
    userId: user.id,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.message };
  }

  revalidatePath("/public-holidays");
  revalidatePath("/settings/holidays");
  revalidatePath("/calendar");

  return result;
}

const HolidayIdSchema = z.object({
  organisationId: z.string().uuid(),
  holidayId: z.string().uuid(),
});

export async function suppressHolidayAction(
  input: z.infer<typeof HolidayIdSchema>
) {
  const parsed = HolidayIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input" };
  }

  const hasAccess = await requireRole("org:admin");
  if (!hasAccess) {
    return { ok: false as const, error: "Permission denied" };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false as const, error: "You need to sign in again." };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { ok: false as const, error: contextResult.error.message };
  }

  const result = await suppressHoliday(
    contextResult.value.clerkOrgId,
    contextResult.value.organisationId,
    parsed.data.holidayId,
    user.id
  );

  if (!result.ok) {
    return { ok: false as const, error: result.error.message };
  }

  revalidatePath("/public-holidays");
  revalidatePath("/settings/holidays");
  revalidatePath("/calendar");

  return result;
}

export async function restoreHolidayAction(
  input: z.infer<typeof HolidayIdSchema>
) {
  const parsed = HolidayIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input" };
  }

  const hasAccess = await requireRole("org:admin");
  if (!hasAccess) {
    return { ok: false as const, error: "Permission denied" };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false as const, error: "You need to sign in again." };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { ok: false as const, error: contextResult.error.message };
  }

  const result = await restoreHoliday(
    contextResult.value.clerkOrgId,
    contextResult.value.organisationId,
    parsed.data.holidayId,
    user.id
  );

  if (!result.ok) {
    return { ok: false as const, error: result.error.message };
  }

  revalidatePath("/public-holidays");
  revalidatePath("/settings/holidays");
  revalidatePath("/calendar");

  return result;
}

export async function deleteCustomHolidayAction(
  input: z.infer<typeof HolidayIdSchema>
) {
  const parsed = HolidayIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input" };
  }

  const hasAccess = await requireRole("org:admin");
  if (!hasAccess) {
    return { ok: false as const, error: "Permission denied" };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { ok: false as const, error: contextResult.error.message };
  }

  const result = await deleteCustomHoliday(
    contextResult.value.clerkOrgId,
    contextResult.value.organisationId,
    parsed.data.holidayId
  );

  if (!result.ok) {
    return { ok: false as const, error: result.error.message };
  }

  revalidatePath("/public-holidays");
  revalidatePath("/settings/holidays");
  revalidatePath("/calendar");

  return result;
}
