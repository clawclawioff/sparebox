import { NextResponse } from "next/server";

// =============================================================================
// GET /api/install/daemon — Redirect to the daemon bundle in /public
// =============================================================================

export async function GET() {
  return NextResponse.redirect(
    new URL("/sparebox-daemon.cjs", "https://www.sparebox.dev"),
    { status: 302 }
  );
}
