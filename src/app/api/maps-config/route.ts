import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET() {
  // Embed keys are intentionally browser-visible. Restrict this key to the
  // Maps Embed API and our website referrers in Google Cloud before use.
  return NextResponse.json(
    { key: process.env.GOOGLE_MAPS_EMBED_KEY || "" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
