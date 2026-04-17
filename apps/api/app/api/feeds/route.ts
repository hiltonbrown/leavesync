import { requireOrg } from "@repo/auth/helpers";
import { appError, type ClerkOrgId } from "@repo/core";
import { listOrganisationsByClerkOrg } from "@repo/database/src/queries";
import { createFeed } from "@repo/feeds";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/feeds
 *
 * Creates a new feed for the authenticated organisation.
 *
 * Request body:
 * - name: string (required, 1-120 chars)
 * - privacyDefault: "named" | "masked" | "private" (optional, defaults to "named")
 * - scopeType: "all_staff" | "team" | "manager" | "location" | "event_type" | "custom" (optional, defaults to "all_staff")
 *
 * Responses:
 * - 201 Created: { feed: FeedView, token: string }
 * - 400 Bad Request: validation error
 * - 500 Internal Server Error: database error
 */
export async function POST(request: NextRequest) {
  try {
    const clerkOrgId = await requireOrg();
    const body = await request.json();

    // Get the organisation to ensure it exists
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

    // Create the feed
    const result = await createFeed(
      {
        clerkOrgId: clerkOrgId as ClerkOrgId,
        organisationId: organisation.id,
      },
      body
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.code === "bad_request" ? 400 : 500 }
      );
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error) {
    console.error("POST /api/feeds error:", error);
    return NextResponse.json(
      {
        error: appError("internal", "Failed to create feed"),
      },
      { status: 500 }
    );
  }
}
