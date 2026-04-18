import { NextResponse } from "next/server";

export function PATCH() {
  return NextResponse.json(
    { error: "Manage feeds from the authenticated app." },
    { status: 405 }
  );
}
