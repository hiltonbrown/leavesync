import { cachedEtagForToken, renderFeedForToken } from "@repo/feeds";

const weakEtagPrefixPattern = /^W\//;

function etagMatches(
  ifNoneMatchHeader: string,
  expectedQuotedEtag: string
): boolean {
  return ifNoneMatchHeader
    .split(",")
    .map((candidate) => candidate.trim().replace(weakEtagPrefixPattern, ""))
    .includes(expectedQuotedEtag);
}

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
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: tokenParam } = await params;
  const token = tokenParam.endsWith(".ics")
    ? tokenParam.slice(0, -".ics".length)
    : tokenParam;

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch) {
    const cachedEtag = await cachedEtagForToken(token);
    if (cachedEtag && etagMatches(ifNoneMatch, `"${cachedEtag}"`)) {
      return new Response(null, {
        headers: {
          "Cache-Control": "max-age=3600, must-revalidate",
          ETag: `"${cachedEtag}"`,
        },
        status: 304,
      });
    }
  }

  // Render the feed for this token
  const feedResult = await renderFeedForToken(token);

  if (!feedResult.ok) {
    // Token not found or feed inactive
    return new Response("Not found", { status: 404 });
  }

  const { body, etag, status } = feedResult.value;

  // Handle expired or revoked tokens
  if (status === "expired" || status === "revoked") {
    return new Response("Gone", { status: 410 });
  }

  const quotedEtag = `"${etag}"`;
  if (ifNoneMatch && etagMatches(ifNoneMatch, quotedEtag)) {
    return new Response(null, {
      headers: {
        "Cache-Control": "max-age=3600, must-revalidate",
        ETag: quotedEtag,
      },
      status: 304,
    });
  }

  // Return the active feed
  return new Response(body, {
    headers: {
      "Cache-Control": "max-age=3600, must-revalidate",
      "Content-Type": "text/calendar;charset=utf-8",
      ETag: quotedEtag,
    },
    status: 200,
  });
}
