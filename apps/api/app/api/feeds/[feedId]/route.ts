import { requireOrg } from "@repo/auth/helpers";
import { appError, type ClerkOrgId } from "@repo/core";
import { listOrganisationsByClerkOrg } from "@repo/database/src/queries";
import { setFeedStatus } from "@repo/feeds";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * PATCH /api/feeds/[feedId]
 *
 * Updates the status of a feed (activate/archive).
 *
 * Request body:
 * - status: "active" | "archived" (required)
 *
 * Responses:
 * - 200 OK: { feed: FeedView }
 * - 400 Bad Request: validation error
 * - 404 Not Found: feed not found
 * - 500 Internal Server Error: database error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> }
) {
  try {
    const clerkOrgId = await requireOrg();
    const { feedId } = await params;
    const body = await request.json();

    // Validate status
    const statusSchema = z.object({
      status: z.enum(["active", "archived"]),
    });
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: appError("bad_request", "Invalid status") },
        { status: 400 }
      );
    }

    // Get the organisation
    const orgsResult = await listOrganisationsByClerkOrg(
      clerkOrgId as ClerkOrgId
    );
    if (!orgsResult.ok || orgsResult.value.length === 0) {
      return NextResponse.json(
        { error: appError("not_found", "Organisation not found") },
        { status: 404 }
      );
    }

    const organisation = orgsResult.value[0];

    // Update the feed status
    const result = await setFeedStatus(
      {
        clerkOrgId: clerkOrgId as ClerkOrgId,
        organisationId: organisation.id,
      },
      feedId,
      parsed.data.status
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.code === "not_found" ? 404 : 500 }
      );
    }

    return NextResponse.json(result.value, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/feeds/[feedId] error:", error);
    return NextResponse.json(
      {
        error: appError("internal", "Failed to update feed"),
      },
      { status: 500 }
    );
  }
}
