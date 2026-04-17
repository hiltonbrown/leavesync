import { currentUser, requireOrg } from "@repo/auth/helpers";
import type { ClerkOrgId } from "@repo/core";
import { markNotificationRead } from "@repo/database/src/queries";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
): Promise<Response> {
  try {
    const { notificationId } = await params;

    // Get authenticated user and organisation
    let clerkOrgId: string;
    try {
      clerkOrgId = await requireOrg();
    } catch {
      return Response.json(
        {
          ok: false,
          error: { code: "unauthorised", message: "Not authenticated" },
        },
        { status: 401 }
      );
    }

    // Get current user
    const user = await currentUser();

    if (!user) {
      return Response.json(
        {
          ok: false,
          error: { code: "unauthorised", message: "User not found" },
        },
        { status: 401 }
      );
    }

    // Mark notification as read
    const result = await markNotificationRead(
      clerkOrgId as ClerkOrgId,
      user.id,
      notificationId
    );

    if (!result.ok) {
      return Response.json(
        { ok: false, error: result.error },
        { status: result.error.code === "not_found" ? 404 : 500 }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return Response.json(
      {
        ok: false,
        error: {
          code: "internal",
          message: "Failed to mark notification as read",
        },
      },
      { status: 500 }
    );
  }
}
