import { requireOrg } from "@repo/auth/helpers";
import { appError, type ClerkOrgId } from "@repo/core";
import { listOrganisationsByClerkOrg } from "@repo/database/src/queries";
import { rotateFeedToken } from "@repo/feeds";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/feeds/[feedId]/rotate-token
 *
 * Rotates the active token for a feed, revocking the previous token.
 *
 * Responses:
 * - 200 OK: { feed: FeedView, token: string }
 * - 404 Not Found: feed not found
 * - 500 Internal Server Error: database error
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> }
) {
  try {
    const clerkOrgId = await requireOrg();
    const { feedId } = await params;

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

    // Rotate the token
    const result = await rotateFeedToken(
      {
        clerkOrgId: clerkOrgId as ClerkOrgId,
        organisationId: organisation.id,
      },
      feedId
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.code === "not_found" ? 404 : 500 }
      );
    }

    return NextResponse.json(result.value, { status: 200 });
  } catch (error) {
    console.error("POST /api/feeds/[feedId]/rotate-token error:", error);
    return NextResponse.json(
      {
        error: appError("internal", "Failed to rotate feed token"),
      },
      { status: 500 }
    );
  }
}
