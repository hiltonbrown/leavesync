import { completeXeroOAuth } from "@repo/xero";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!(code && state)) {
    return NextResponse.json(
      { error: "Missing Xero OAuth callback parameters." },
      { status: 400 }
    );
  }

  const result = await completeXeroOAuth({ code, state });
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.url;
  return NextResponse.redirect(new URL(result.value.redirectTo, appBaseUrl));
}
