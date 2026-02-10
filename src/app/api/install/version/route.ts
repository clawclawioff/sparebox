import { NextResponse } from "next/server";

// =============================================================================
// GET /api/install/version — Current daemon version info
// =============================================================================

export async function GET() {
  return NextResponse.json({
    version: "0.1.0",
    minNodeVersion: "20.0.0",
    releaseDate: "2026-02-10",
    changelog: "https://github.com/clawclawioff/sparebox/blob/master/daemon/CHANGELOG.md",
  }, {
    headers: {
      "Cache-Control": "public, max-age=60",
    },
  });
}
