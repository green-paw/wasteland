import { NextResponse } from "next/server";

// Required for static export builds (e.g. GitHub Pages).
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}