import { NextRequest, NextResponse } from "next/server";
import { resolveBillerScope } from "@/lib/billing/scope";
import { getBillPrefill } from "@/lib/billing/combined-service";

export const runtime = "nodejs";

// GET /api/billing/bill-prefill?userId=&role=&period=YYYY-MM
// Returns each flat with rent, maintenance default, last electricity reading + the configured rate.
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId"); const role = sp.get("role"); const period = sp.get("period");
    if (!userId || !role || !period) return NextResponse.json({ error: "userId, role, period required" }, { status: 400 });
    const scope = await resolveBillerScope({ id: userId, role });
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });
    return NextResponse.json(await getBillPrefill(scope, period));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
