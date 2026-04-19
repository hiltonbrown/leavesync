import { buildXeroOAuthStartUrl } from "@repo/xero";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clerkOrgId = url.searchParams.get("clerkOrgId");
  const organisationId = url.searchParams.get("organisationId");
  const returnTo = url.searchParams.get("returnTo") ?? undefined;

  if (!(clerkOrgId && organisationId)) {
    return NextResponse.json(
      { error: "Missing Clerk organisation or organisation ID." },
      { status: 400 }
    );
  }

  const result = await buildXeroOAuthStartUrl({
    clerkOrgId,
    organisationId,
    returnTo,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  return NextResponse.redirect(result.value.redirectUrl);
}
