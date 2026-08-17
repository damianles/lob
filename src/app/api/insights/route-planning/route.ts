import { NextResponse } from "next/server";

/** Fuel / route-planning Insights is unlinked until we have reliable diesel data. */
export async function POST() {
  return NextResponse.json(
    { error: "Route fuel insights are unavailable. Use /insights/lanes for rate analytics." },
    { status: 410 },
  );
}
