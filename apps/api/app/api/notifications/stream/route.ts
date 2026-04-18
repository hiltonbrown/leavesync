import { currentUser, requireOrg } from "@repo/auth/helpers";
import { database } from "@repo/database";
import { subscribeToNotificationStream } from "@repo/notifications";
import { z } from "zod";

const QuerySchema = z.object({
  organisationId: z.string().uuid(),
});

export async function GET(request: Request): Promise<Response> {
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

  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  );
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: { code: "bad_request", message: "Invalid stream" } },
      { status: 400 }
    );
  }

  const organisation = await database.organisation.findFirst({
    where: {
      clerk_org_id: clerkOrgId,
      id: parsed.data.organisationId,
    },
    select: { id: true },
  });
  if (!organisation) {
    return Response.json(
      {
        ok: false,
        error: { code: "forbidden", message: "Invalid organisation" },
      },
      { status: 403 }
    );
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));
      unsubscribe = subscribeToNotificationStream(
        { organisationId: organisation.id, userId: user.id },
        (event) => {
          controller.enqueue(
            encoder.encode(
              `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`
            )
          );
        }
      );
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 25_000);
    },
    cancel() {
      unsubscribe?.();
      if (keepAlive) {
        clearInterval(keepAlive);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Origin": request.headers.get("origin") ?? "*",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
