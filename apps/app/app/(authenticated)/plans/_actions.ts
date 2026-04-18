"use server";

import { auth, currentUser } from "@repo/auth/server";
import {
  archiveRecord,
  createRecord,
  deleteDraftRecord,
  type PlanServiceError,
  restoreRecord,
  updateRecord,
} from "@repo/availability";
import type { Result } from "@repo/core";
import { revalidatePath } from "next/cache";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";
import {
  buildFormDate,
  type PlanRecordActionInput,
  PlanRecordActionSchema,
  type PlanRecordFormInput,
  PlanRecordFormSchema,
  type UpdatePlanRecordFormInput,
  UpdatePlanRecordFormSchema,
} from "./_schemas";

export type PlanActionError =
  | PlanServiceError
  | { code: "not_authorised"; message: string }
  | { code: "not_implemented"; message: string }
  | { code: "validation_error"; message: string };

export type PlanActionResult<T = { id?: string }> = Result<T, PlanActionError>;

export async function createRecordAction(
  input: PlanRecordFormInput
): Promise<PlanActionResult<{ id: string }>> {
  const parsed = PlanRecordFormSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message);
  }

  const context = await resolveActionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }

  const result = await createRecord({
    actingOrgRole: context.value.orgRole,
    allDay: parsed.data.allDay,
    clerkOrgId: context.value.clerkOrgId,
    contactabilityStatus: parsed.data.contactabilityStatus,
    createdByUserId: context.value.userId,
    endsAt: buildFormDate(
      parsed.data.endsAt,
      parsed.data.endTime,
      parsed.data.allDay,
      true
    ),
    notesInternal: parsed.data.notesInternal,
    organisationId: context.value.organisationId,
    personId: parsed.data.personId,
    privacyMode: parsed.data.privacyMode,
    recordType: parsed.data.recordType,
    startsAt: buildFormDate(
      parsed.data.startsAt,
      parsed.data.startTime,
      parsed.data.allDay
    ),
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/plans");
  revalidatePath("/calendar");
  revalidatePath("/");
  return { ok: true, value: { id: result.value.id } };
}

export async function updateRecordAction(
  input: UpdatePlanRecordFormInput
): Promise<PlanActionResult<{ id: string }>> {
  const parsed = UpdatePlanRecordFormSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message);
  }

  const context = await resolveActionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }

  const result = await updateRecord({
    actingOrgRole: context.value.orgRole,
    actingUserId: context.value.userId,
    clerkOrgId: context.value.clerkOrgId,
    organisationId: context.value.organisationId,
    patch: {
      allDay: parsed.data.allDay,
      contactabilityStatus: parsed.data.contactabilityStatus,
      endsAt: buildFormDate(
        parsed.data.endsAt,
        parsed.data.endTime,
        parsed.data.allDay,
        true
      ),
      notesInternal: parsed.data.notesInternal,
      privacyMode: parsed.data.privacyMode,
      recordType: parsed.data.recordType,
      startsAt: buildFormDate(
        parsed.data.startsAt,
        parsed.data.startTime,
        parsed.data.allDay
      ),
    },
    recordId: parsed.data.recordId,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/plans");
  revalidatePath("/calendar");
  return { ok: true, value: { id: result.value.id } };
}

export async function deleteDraftAction(
  input: PlanRecordActionInput
): Promise<PlanActionResult<void>> {
  const parsed = PlanRecordActionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError("Invalid record");
  }

  const context = await resolveActionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }

  const result = await deleteDraftRecord({
    actingOrgRole: context.value.orgRole,
    actingUserId: context.value.userId,
    clerkOrgId: context.value.clerkOrgId,
    organisationId: context.value.organisationId,
    recordId: parsed.data.recordId,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/plans");
  return { ok: true, value: undefined };
}

export async function archiveRecordAction(
  input: PlanRecordActionInput
): Promise<PlanActionResult<void>> {
  const parsed = PlanRecordActionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError("Invalid record");
  }

  const context = await resolveActionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }

  const result = await archiveRecord({
    actingOrgRole: context.value.orgRole,
    actingUserId: context.value.userId,
    clerkOrgId: context.value.clerkOrgId,
    organisationId: context.value.organisationId,
    recordId: parsed.data.recordId,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/plans");
  revalidatePath("/calendar");
  return { ok: true, value: undefined };
}

export async function restoreRecordAction(
  input: PlanRecordActionInput
): Promise<PlanActionResult<void>> {
  const parsed = PlanRecordActionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError("Invalid record");
  }

  const context = await resolveActionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }

  const result = await restoreRecord({
    actingOrgRole: context.value.orgRole,
    actingUserId: context.value.userId,
    clerkOrgId: context.value.clerkOrgId,
    organisationId: context.value.organisationId,
    recordId: parsed.data.recordId,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/plans");
  revalidatePath("/calendar");
  return { ok: true, value: undefined };
}

export async function submitForApprovalAction(
  input: PlanRecordActionInput
): Promise<PlanActionResult<void>> {
  return await stubSubmissionAction(input);
}

export async function withdrawSubmissionAction(
  input: PlanRecordActionInput
): Promise<PlanActionResult<void>> {
  return await stubSubmissionAction(input);
}

export async function retrySubmissionAction(
  input: PlanRecordActionInput
): Promise<PlanActionResult<void>> {
  return await stubSubmissionAction(input);
}

export async function revertToDraftAction(
  input: PlanRecordActionInput
): Promise<PlanActionResult<void>> {
  return await stubSubmissionAction(input);
}

async function stubSubmissionAction(
  input: PlanRecordActionInput
): Promise<PlanActionResult<void>> {
  const parsed = PlanRecordActionSchema.safeParse(input);
  if (!parsed.success) {
    return validationError("Invalid record");
  }

  const context = await resolveActionContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }

  // TODO(slice-04): implement in packages/availability/src/plans/submit-service.ts.
  return {
    ok: false,
    error: {
      code: "not_implemented",
      message: "Submission is being enabled. Check back shortly.",
    },
  };
}

async function resolveActionContext(organisationId: string): Promise<
  PlanActionResult<{
    clerkOrgId: string;
    organisationId: string;
    orgRole: string | null;
    userId: string;
  }>
> {
  const [{ orgRole }, user, context] = await Promise.all([
    auth(),
    currentUser(),
    getActiveOrgContext(organisationId),
  ]);

  if (!(user && canUsePlans(orgRole))) {
    return {
      ok: false,
      error: {
        code: "not_authorised",
        message: "You do not have permission to manage plans",
      },
    };
  }

  if (!context.ok) {
    return {
      ok: false,
      error: {
        code: "not_authorised",
        message: context.error.message,
      },
    };
  }

  return {
    ok: true,
    value: {
      clerkOrgId: context.value.clerkOrgId,
      organisationId: context.value.organisationId,
      orgRole: orgRole ?? null,
      userId: user.id,
    },
  };
}

function canUsePlans(role: string | null | undefined): boolean {
  return (
    role === "org:viewer" ||
    role === "org:manager" ||
    role === "org:admin" ||
    role === "org:owner"
  );
}

function validationError(message?: string): PlanActionResult<never> {
  return {
    ok: false,
    error: {
      code: "validation_error",
      message: message ?? "Invalid plan record",
    },
  };
}
