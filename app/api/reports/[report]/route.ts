import { NextRequest, NextResponse } from "next/server";
import { resolveBillerScope } from "@/lib/billing/scope";
import {
  outstandingReport, collectionReport, revenueReport, partyLedger,
  consumptionReport, gstr1, gstr3b,
} from "@/lib/billing/reports-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ report: string }> };

// GET /api/reports/[report]?userId=&role=&period=&recipient=
export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { report } = await ctx.params;
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId"); const role = sp.get("role");
    const period = sp.get("period") ?? undefined;
    if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });
    const scope = await resolveBillerScope({ id: userId, role });
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });

    switch (report) {
      case "outstanding": return NextResponse.json(await outstandingReport(scope));
      case "collection":  return NextResponse.json(await collectionReport(scope, period));
      case "revenue":     return NextResponse.json(await revenueReport(scope));
      case "ledger":      return NextResponse.json(await partyLedger(scope, sp.get("recipient") ?? undefined));
      case "consumption": return NextResponse.json(await consumptionReport(scope, period));
      case "gstr1":
        if (!period) return NextResponse.json({ error: "period required" }, { status: 400 });
        return NextResponse.json(await gstr1(scope, period));
      case "gstr3b":
        if (!period) return NextResponse.json({ error: "period required" }, { status: 400 });
        return NextResponse.json(await gstr3b(scope, period));
      default:
        return NextResponse.json({ error: `Unknown report: ${report}` }, { status: 404 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/reports]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
