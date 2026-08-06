import { auth, currentUser, requireOrg } from "@repo/auth/helpers";
import {
  archiveManualAvailability,
  updateManualAvailability,
} from "@repo/availability";
import type {
  AvailabilityRecordId,
  ClerkOrgId,
  OrganisationId,
} from "@repo/core";
import { getAvailabilityRecordById } from "@repo/database/src/queries/availability-records";
import { getOrganisationById } from "@repo/database/src/queries/organisations";
import { log } from "@repo/observability/log";
import { z } from "zod";

const UpdateAvailabilitySchema = z.object({
  allDay: z.boolean().optional(),
  contactability: z.enum(["contactable", "limited", "unavailable"]).optional(),
  endsAt: z.string().datetime().optional(),
  notesInternal: z.string().optional().nullable(),
  preferredContactMethod: z.string().optional().nullable(),
  recordType: z
    .enum(["leave", "wfh", "travel", "training", "client_site"])
    .optional(),
  startsAt: z.string().datetime().optional(),
  title: z.string().optional().nullable(),
  workingLocation: z.string().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ recordId: string }> }
): Promise<Response> {
  try {
    const { recordId } = await params;

    // Get authenticated user and organisation
    let clerkOrgId: string;
    try {
      clerkOrgId = await requireOrg();
    } catch {
      return Response.json(
        {
          error: { code: "unauthorised", message: "Not authenticated" },
          ok: false,
        },
        { status: 401 }
      );
    }

    // Get current user
    const user = await currentUser();

    if (!user) {
      return Response.json(
        {
          error: { code: "unauthorised", message: "User not found" },
          ok: false,
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const organisationId = body.organisationId as string | undefined;

    if (!organisationId) {
      return Response.json(
        {
          error: { code: "invalid", message: "organisationId is required" },
          ok: false,
        },
        { status: 400 }
      );
    }

    // Validate organisation exists
    const orgResult = await getOrganisationById(
      clerkOrgId as ClerkOrgId,
      organisationId as OrganisationId
    );

    if (!orgResult.ok) {
      return Response.json(
        { error: orgResult.error, ok: false },
        { status: orgResult.error.code === "not_found" ? 404 : 500 }
      );
    }

    // Get record to verify it's editable
    const recordResult = await getAvailabilityRecordById(
      clerkOrgId as ClerkOrgId,
      organisationId as OrganisationId,
      recordId as AvailabilityRecordId
    );

    if (!recordResult.ok) {
      return Response.json(
        { error: recordResult.error, ok: false },
        { status: recordResult.error.code === "not_found" ? 404 : 500 }
      );
    }

    const record = recordResult.value;

    // Check if record is Xero-sourced (read-only)
    if (record.sourceType !== "manual") {
      return Response.json(
        {
          error: {
            code: "forbidden",
            message: "Xero-sourced records cannot be edited",
          },
          ok: false,
        },
        { status: 403 }
      );
    }

    const parseResult = UpdateAvailabilitySchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        {
          error: {
            code: "invalid",
            details: parseResult.error.issues,
            message: "Invalid request body",
          },
          ok: false,
        },
        { status: 400 }
      );
    }

    const { data } = parseResult;
    const authResult = await auth();

    // Call availability service to update record
    const updateResult = await updateManualAvailability(
      {
        clerkOrgId: clerkOrgId as ClerkOrgId,
        organisationId: organisationId as OrganisationId,
      },
      recordId as AvailabilityRecordId,
      {
        allDay: data.allDay,
        contactability: data.contactability,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        notesInternal: data.notesInternal,
        preferredContactMethod: data.preferredContactMethod,
        recordType: data.recordType,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        title: data.title,
        workingLocation: data.workingLocation,
      },
      { orgRole: authResult.orgRole, userId: user.id }
    );

    if (!updateResult.ok) {
      return Response.json(
        { error: updateResult.error, ok: false },
        {
          status: updateResult.error.code === "not_authorised" ? 403 : 500,
        }
      );
    }

    return Response.json({ ok: true, value: updateResult.value });
  } catch (error) {
    log.error("Error updating availability record", { error });
    return Response.json(
      {
        error: {
          code: "internal",
          message: "Failed to update availability record",
        },
        ok: false,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ recordId: string }> }
): Promise<Response> {
  try {
    const { recordId } = await params;

    // Get authenticated user and organisation
    let clerkOrgId: string;
    try {
      clerkOrgId = await requireOrg();
    } catch {
      return Response.json(
        {
          error: { code: "unauthorised", message: "Not authenticated" },
          ok: false,
        },
        { status: 401 }
      );
    }

    // Get current user
    const user = await currentUser();

    if (!user) {
      return Response.json(
        {
          error: { code: "unauthorised", message: "User not found" },
          ok: false,
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const organisationId = body.organisationId as string | undefined;

    if (!organisationId) {
      return Response.json(
        {
          error: { code: "invalid", message: "organisationId is required" },
          ok: false,
        },
        { status: 400 }
      );
    }

    // Validate organisation exists
    const orgResult = await getOrganisationById(
      clerkOrgId as ClerkOrgId,
      organisationId as OrganisationId
    );

    if (!orgResult.ok) {
      return Response.json(
        { error: orgResult.error, ok: false },
        { status: orgResult.error.code === "not_found" ? 404 : 500 }
      );
    }

    // Get record to verify it exists and is editable
    const recordResult = await getAvailabilityRecordById(
      clerkOrgId as ClerkOrgId,
      organisationId as OrganisationId,
      recordId as AvailabilityRecordId
    );

    if (!recordResult.ok) {
      return Response.json(
        { error: recordResult.error, ok: false },
        { status: recordResult.error.code === "not_found" ? 404 : 500 }
      );
    }

    const record = recordResult.value;
    const authResult = await auth();

    // Check if record is Xero-sourced (read-only)
    if (record.sourceType !== "manual") {
      return Response.json(
        {
          error: {
            code: "forbidden",
            message: "Xero-sourced records cannot be deleted",
          },
          ok: false,
        },
        { status: 403 }
      );
    }

    // Call availability service to archive record (soft delete)
    const deleteResult = await archiveManualAvailability(
      {
        clerkOrgId: clerkOrgId as ClerkOrgId,
        organisationId: organisationId as OrganisationId,
      },
      recordId as AvailabilityRecordId,
      { orgRole: authResult.orgRole, userId: user.id }
    );

    if (!deleteResult.ok) {
      return Response.json(
        { error: deleteResult.error, ok: false },
        {
          status: deleteResult.error.code === "not_authorised" ? 403 : 500,
        }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    log.error("Error deleting availability record", { error });
    return Response.json(
      {
        error: {
          code: "internal",
          message: "Failed to delete availability record",
        },
        ok: false,
      },
      { status: 500 }
    );
  }
}
