import { NextRequest, NextResponse } from "next/server";
import { submitToIndexNow } from "@/lib/indexnow";
import { INDEXNOW_KEY, KEY_PAGES } from "@/lib/seo/config";

/**
 * POST /api/indexnow
 *   Body: { "urls": ["/blog/new-post", ...], "secret": "<INDEXNOW_KEY>" }
 *   Or:   { "all": true, "secret": "<INDEXNOW_KEY>" }  → submits KEY_PAGES.
 *
 * Protected by the IndexNow key itself as a shared secret so it can't be
 * abused by strangers. Call this after publishing/updating content.
 *
 * GET /api/indexnow?secret=<KEY>&all=1  → convenience for a quick manual ping.
 */
export const runtime = "nodejs";

async function handle(urls: string[]) {
  if (urls.length === 0) {
    return NextResponse.json({ ok: false, error: "No URLs provided" }, { status: 400 });
  }
  const result = await submitToIndexNow(urls);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function POST(req: NextRequest) {
  let body: { urls?: string[]; all?: boolean; secret?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (body.secret !== INDEXNOW_KEY) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const urls = body.all ? KEY_PAGES.map((p) => p.path) : body.urls ?? [];
  return handle(urls);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== INDEXNOW_KEY) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const urls = searchParams.get("all")
    ? KEY_PAGES.map((p) => p.path)
    : (searchParams.get("urls") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return handle(urls);
}
