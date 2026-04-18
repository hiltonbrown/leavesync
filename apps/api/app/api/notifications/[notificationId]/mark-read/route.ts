import { currentUser, requireOrg } from "@repo/auth/helpers";
import { markAsRead } from "@repo/notifications";
import { z } from "zod";

const BodySchema = z.object({
  organisationId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
): Promise<Response> {
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

  const user = await currentUser();
  if (!user) {
    return Response.json(
      { ok: false, error: { code: "unauthorised", message: "User not found" } },
      { status: 401 }
    );
  }

  const [{ notificationId }, body] = await Promise.all([
    params,
    request.json().catch(() => null),
  ]);
  const parsed = BodySchema.extend({
    notificationId: z.string().uuid(),
  }).safeParse({ ...body, notificationId });
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: { code: "bad_request", message: "Invalid notification" },
      },
      { status: 400 }
    );
  }

  const result = await markAsRead({
    clerkOrgId,
    organisationId: parsed.data.organisationId,
    notificationId: parsed.data.notificationId,
    userId: user.id,
  });
  if (!result.ok) {
    const status = result.error.code === "not_recipient" ? 403 : 404;
    return Response.json({ ok: false, error: result.error }, { status });
  }

  return Response.json({ ok: true, value: result.value });
}
