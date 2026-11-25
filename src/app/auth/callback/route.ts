import { NextRequest, NextResponse } from "next/server";
import { completeSignIn, localOrigin } from "../../../lib/chatgpt-local";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  let outcome = "connected";
  try {
    await completeSignIn(request);
  } catch {
    outcome = "failed";
  }
  // Never reflect the authorization code, state, tokens, or upstream error text.
  return NextResponse.redirect(`${localOrigin}/?chatgpt=${outcome}`, {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
