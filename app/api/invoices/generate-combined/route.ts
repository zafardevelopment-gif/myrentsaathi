import { NextRequest, NextResponse } from "next/server";
import { resolveBillerScope, type ScopeUser } from "@/lib/billing/scope";
import { generateCombinedForPeriod, type CombinedFlatInput } from "@/lib/billing/combined-service";

export const runtime = "nodejs";

// POST /api/invoices/generate-combined
// body: { user, billing_period, due_day?, elec_rate?, flats: [{ flat_id, rent?, maintenance?, electricity?:{current_reading,last_reading?} }] }
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      user: ScopeUser; billing_period: string; due_day?: number; elec_rate?: number; flats: CombinedFlatInput[];
    };
    if (!body.user?.id || !body.user?.role) return NextResponse.json({ error: "user {id, role} required" }, { status: 400 });
    if (!body.billing_period || !/^\d{4}-\d{2}$/.test(body.billing_period)) return NextResponse.json({ error: "billing_period must be YYYY-MM" }, { status: 400 });
    if (!Array.isArray(body.flats) || body.flats.length === 0) return NextResponse.json({ error: "Select at least one flat to bill" }, { status: 400 });

    const scope = await resolveBillerScope(body.user);
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });

    const result = await generateCombinedForPeriod({
      scope, billing_period: body.billing_period, due_day: body.due_day, elec_rate: body.elec_rate,
      flats: body.flats, created_by: body.user.id, trigger: "manual",
    });

    // Fire-and-forget: send invoice email to each newly created invoice's recipient
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    for (const invoiceId of result.invoiceIds) {
      fetch(`${appUrl}/api/invoices/${invoiceId}/send`, { method: "POST" }).catch(() => {});
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/invoices/generate-combined]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
