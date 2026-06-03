import { NextRequest, NextResponse } from "next/server";
import { resolveBillerScope, type ScopeUser } from "@/lib/billing/scope";
import { listGstRates, addGstRateVersion } from "@/lib/billing/config-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId"); const role = sp.get("role");
    if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });
    const scope = await resolveBillerScope({ id: userId, role });
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });
    return NextResponse.json({ rates: await listGstRates(scope) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// POST = add a new effective-dated rate version (never edits history, §3.1)
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { user: ScopeUser; applies_to: string; rate_percent: number; effective_from?: string };
    if (!body.user?.id || !body.user?.role) return NextResponse.json({ error: "user {id, role} required" }, { status: 400 });
    if (!body.applies_to || body.rate_percent == null) return NextResponse.json({ error: "applies_to and rate_percent required" }, { status: 400 });
    const scope = await resolveBillerScope(body.user);
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });
    const result = await addGstRateVersion(scope, { ...body, created_by: body.user.id });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
