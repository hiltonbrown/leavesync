import { renderFeedForToken } from "@repo/feeds";

/**
 * GET /ical/:token.ics
 *
 * Renders and serves a private calendar feed as an ICS file.
 *
 * Responses:
 * - 200 OK: Active feed (ICS body)
 * - 410 Gone: Expired or revoked token
 * - 404 Not Found: Token not found or feed inactive
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Render the feed for this token
  const feedResult = await renderFeedForToken(token);

  if (!feedResult.ok) {
    // Token not found or feed inactive
    return new Response("Not found", { status: 404 });
  }

  const { body, status } = feedResult.value;

  // Handle expired or revoked tokens
  if (status === "expired" || status === "revoked") {
    return new Response("Gone", { status: 410 });
  }

  // Return the active feed
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar;charset=utf-8",
      "Cache-Control": "max-age=3600, must-revalidate",
    },
  });
}
