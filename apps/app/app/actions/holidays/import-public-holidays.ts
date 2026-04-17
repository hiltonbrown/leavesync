"use server";

import { currentUser } from "@repo/auth/server";
import type { FeedId } from "@repo/core";
import { importPublicHolidaysForFeed } from "@repo/database/src/queries";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";

const ImportHolidaySchema = z.object({
  counties: z.array(z.string()).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  localName: z.string().min(1),
  name: z.string().min(1),
  types: z.array(z.string()),
});

const ImportPublicHolidaysSchema = z.object({
  classification: z.enum(["non_working", "working"]),
  countryCode: z.string().length(2),
  feedId: z.string().uuid(),
  holidays: z.array(ImportHolidaySchema).min(1),
  organisationId: z.string().uuid(),
  regionCode: z.string().nullable(),
});

export type ImportPublicHolidaysActionResult =
  | {
      ok: true;
      assignedCount: number;
      importedCount: number;
      skippedCount: number;
    }
  | { ok: false; error: string };

export async function importPublicHolidaysAction(
  input: z.infer<typeof ImportPublicHolidaysSchema>
): Promise<ImportPublicHolidaysActionResult> {
  const parsed = ImportPublicHolidaysSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid public holidays",
    };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { ok: false, error: contextResult.error.message };
  }

  const result = await importPublicHolidaysForFeed(
    contextResult.value.clerkOrgId,
    contextResult.value.organisationId,
    {
      classification: parsed.data.classification,
      countryCode: parsed.data.countryCode,
      feedId: parsed.data.feedId as FeedId,
      holidays: parsed.data.holidays,
      regionCode: parsed.data.regionCode,
      userId: user.id,
    }
  );

  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  revalidatePath("/calendar");
  revalidatePath("/feed");
  revalidatePath("/public-holidays");
  revalidatePath("/settings/holidays");

  return {
    ok: true,
    assignedCount: result.value.assignedCount,
    importedCount: result.value.importedCount,
    skippedCount: result.value.skippedCount,
  };
}
