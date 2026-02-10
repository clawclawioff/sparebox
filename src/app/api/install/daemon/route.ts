import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// GET /api/install/daemon — Download compiled daemon bundle
// Serves the daemon dist directory as a tarball
// For now, serves the single compiled JS files
// =============================================================================

export async function GET() {
  // In production, we'd serve a pre-built tarball
  // For now, return instructions to clone from git
  const response = {
    message: "Sparebox Daemon",
    version: "0.1.0",
    install: "npm install -g sparebox-daemon",
    manual: "git clone https://github.com/clawclawioff/sparebox && cd sparebox/daemon && npm run build",
    docs: "https://www.sparebox.dev/install",
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
