import { NextRequest, NextResponse } from "next/server";
import { resolveBillerScope, type ScopeUser } from "@/lib/billing/scope";
import { generateForPeriod } from "@/lib/billing/invoice-service";
import { generateElectricityForPeriod } from "@/lib/billing/meter-service";
import { generateChargesForPeriod } from "@/lib/billing/charge-service";
import { validateBillingReadiness } from "@/lib/billing/readiness";

export const runtime = "nodejs";

// POST /api/invoices/generate
// body: { user, invoice_type: 'rent'|'maintenance'|'electricity', billing_period: 'YYYY-MM', due_day? }
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      user: ScopeUser;
      invoice_type: "rent" | "maintenance" | "electricity" | "charges";
      billing_period: string;
      due_day?: number;
    };

    if (!body.user?.id || !body.user?.role) {
      return NextResponse.json({ error: "user {id, role} is required" }, { status: 400 });
    }
    if (!body.invoice_type || !["rent", "maintenance", "electricity", "charges"].includes(body.invoice_type)) {
      return NextResponse.json({ error: "invoice_type must be rent | maintenance | electricity | charges" }, { status: 400 });
    }
    if (!body.billing_period || !/^\d{4}-\d{2}$/.test(body.billing_period)) {
      return NextResponse.json({ error: "billing_period must be 'YYYY-MM'" }, { status: 400 });
    }

    const scope = await resolveBillerScope(body.user);
    if (!scope) return NextResponse.json({ error: "No billing scope for this user" }, { status: 403 });

    // Hard gate (§35): refuse to generate if prerequisites are missing.
    const readiness = await validateBillingReadiness({ scope, invoice_type: body.invoice_type });
    if (!readiness.ok) {
      return NextResponse.json({ error: "Billing setup incomplete", missing: readiness.missing }, { status: 422 });
    }

    const common = { scope, billing_period: body.billing_period, due_day: body.due_day, created_by: body.user.id, trigger: "manual" as const };
    const result =
      body.invoice_type === "electricity" ? await generateElectricityForPeriod(common)
      : body.invoice_type === "charges"   ? await generateChargesForPeriod(common)
      : await generateForPeriod({ ...common, invoice_type: body.invoice_type });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/invoices/generate POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
