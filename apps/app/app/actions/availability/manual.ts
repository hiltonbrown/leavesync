"use server";

import { auth, currentUser } from "@repo/auth/server";
import {
  archiveManualAvailability,
  createManualAvailability,
  updateManualAvailability,
} from "@repo/availability";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";

const ManualAvailabilityActionSchema = z.object({
  allDay: z.boolean().default(true),
  contactability: z.enum(["contactable", "limited", "unavailable"]),
  endsAt: z.string().min(1),
  includeInFeed: z.boolean().default(true),
  notesInternal: z.string().optional(),
  organisationId: z.string().uuid(),
  personId: z.string().uuid(),
  preferredContactMethod: z.string().optional(),
  privacyMode: z.enum(["named", "masked", "private"]),
  recordType: z.enum(["leave", "wfh", "travel", "training", "client_site"]),
  startsAt: z.string().min(1),
  title: z.string().min(1).max(200),
  workingLocation: z.string().optional(),
});

const RecordActionSchema = z.object({
  organisationId: z.string().uuid(),
  recordId: z.string().uuid(),
});

export type ManualAvailabilityActionInput = z.infer<
  typeof ManualAvailabilityActionSchema
>;

export type AvailabilityActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function createManualAvailabilityAction(
  input: ManualAvailabilityActionInput
): Promise<AvailabilityActionResult> {
  const parsed = ManualAvailabilityActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid availability record",
      ok: false,
    };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { error: contextResult.error.message, ok: false };
  }

  const authResult = await auth();
  if (authResult.orgId !== contextResult.value.clerkOrgId) {
    return { error: "Not authenticated", ok: false };
  }

  const user = await currentUser();
  if (!user) {
    return { error: "Not authenticated", ok: false };
  }

  const result = await createManualAvailability(
    contextResult.value,
    toServiceInput(parsed.data),
    { orgRole: authResult.orgRole, userId: user.id }
  );

  if (!result.ok) {
    return { error: result.error.message, ok: false };
  }

  revalidateAvailabilityPaths();
  return { id: result.value.id, ok: true };
}

export async function updateManualAvailabilityAction(
  recordId: string,
  input: ManualAvailabilityActionInput
): Promise<AvailabilityActionResult> {
  const recordParsed = z.string().uuid().safeParse(recordId);
  if (!recordParsed.success) {
    return { error: "Invalid availability record", ok: false };
  }

  const parsed = ManualAvailabilityActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid availability record",
      ok: false,
    };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { error: contextResult.error.message, ok: false };
  }

  const authResult = await auth();
  if (authResult.orgId !== contextResult.value.clerkOrgId) {
    return { error: "Not authenticated", ok: false };
  }

  const user = await currentUser();
  if (!user) {
    return { error: "Not authenticated", ok: false };
  }

  const result = await updateManualAvailability(
    contextResult.value,
    recordParsed.data,
    toServiceInput(parsed.data),
    { orgRole: authResult.orgRole, userId: user.id }
  );

  if (!result.ok) {
    return { error: result.error.message, ok: false };
  }

  revalidateAvailabilityPaths();
  return { id: result.value.id, ok: true };
}

export async function archiveManualAvailabilityAction(
  input: z.infer<typeof RecordActionSchema>
): Promise<AvailabilityActionResult> {
  const parsed = RecordActionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid availability record", ok: false };
  }

  const contextResult = await getActiveOrgContext(parsed.data.organisationId);
  if (!contextResult.ok) {
    return { error: contextResult.error.message, ok: false };
  }

  const authResult = await auth();
  if (authResult.orgId !== contextResult.value.clerkOrgId) {
    return { error: "Not authenticated", ok: false };
  }

  const user = await currentUser();
  if (!user) {
    return { error: "Not authenticated", ok: false };
  }

  const result = await archiveManualAvailability(
    contextResult.value,
    parsed.data.recordId,
    { orgRole: authResult.orgRole, userId: user.id }
  );

  if (!result.ok) {
    return { error: result.error.message, ok: false };
  }

  revalidateAvailabilityPaths();
  return { ok: true };
}

function toServiceInput(input: ManualAvailabilityActionInput) {
  return {
    ...input,
    endsAt: new Date(input.endsAt),
    notesInternal: emptyToUndefined(input.notesInternal),
    preferredContactMethod: emptyToUndefined(input.preferredContactMethod),
    startsAt: new Date(input.startsAt),
    workingLocation: emptyToUndefined(input.workingLocation),
  };
}

function emptyToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function revalidateAvailabilityPaths(): void {
  for (const path of ["/", "/plans", "/availability", "/calendar", "/people"]) {
    revalidatePath(path);
  }
}
