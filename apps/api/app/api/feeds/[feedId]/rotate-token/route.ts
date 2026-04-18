import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    { error: "Rotate feed tokens from the authenticated app." },
    { status: 405 }
  );
}
