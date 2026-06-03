import { NextRequest, NextResponse } from "next/server";
import { resolveBillerScope } from "@/lib/billing/scope";
import { validateBillingReadiness } from "@/lib/billing/readiness";
import type { InvoiceType } from "@/lib/billing/types";

export const runtime = "nodejs";

// GET /api/billing/readiness?userId=&role=&type=rent|maintenance|electricity|charges
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId");
    const role = sp.get("role");
    const type = (sp.get("type") ?? "rent") as InvoiceType;
    if (!userId || !role) return NextResponse.json({ error: "userId and role are required" }, { status: 400 });

    const scope = await resolveBillerScope({ id: userId, role });
    if (!scope) return NextResponse.json({ error: "No billing scope for this user" }, { status: 403 });

    const readiness = await validateBillingReadiness({ scope, invoice_type: type });
    return NextResponse.json(readiness);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/billing/readiness]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
