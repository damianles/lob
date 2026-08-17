import { NextResponse } from "next/server";

/** Fuel Insights is unlinked until we have reliable diesel data. */
export async function GET() {
  return NextResponse.json(
    { error: "Fuel Insights is unavailable. Use /insights/lanes for rate analytics." },
    { status: 410 },
  );
}
