import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { enumerateBillerScopes, currentPeriod, isAuthorizedCron } from "@/lib/billing/cron-service";
import { generateForPeriod } from "@/lib/billing/invoice-service";
import { generateElectricityForPeriod } from "@/lib/billing/meter-service";
import { generateChargesForPeriod } from "@/lib/billing/charge-service";
import { applyLateFees } from "@/lib/billing/late-fee-service";
import { processReminders } from "@/lib/billing/reminder-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ task: string }> };

// GET /api/cron/[task] — invoked by Vercel Cron. Secured by CRON_SECRET.
export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { task } = await ctx.params;
  const period = currentPeriod();

  try {
    switch (task) {
      case "generate-rent":
      case "generate-maintenance": {
        const invoice_type = task === "generate-rent" ? "rent" : "maintenance";
        const scopes = await enumerateBillerScopes();
        let created = 0, skipped = 0;
        for (const scope of scopes) {
          const r = await generateForPeriod({ scope, invoice_type, billing_period: period, trigger: "cron" });
          created += r.created; skipped += r.skipped;
        }
        return NextResponse.json({ task, period, scopes: scopes.length, created, skipped });
      }
      case "generate-electricity": {
        const scopes = await enumerateBillerScopes();
        let created = 0, skipped = 0;
        for (const scope of scopes) {
          const r = await generateElectricityForPeriod({ scope, billing_period: period, trigger: "cron" });
          created += r.created; skipped += r.skipped;
        }
        return NextResponse.json({ task, period, scopes: scopes.length, created, skipped });
      }
      case "generate-charges": {
        const scopes = await enumerateBillerScopes();
        let created = 0, skipped = 0;
        for (const scope of scopes) {
          const r = await generateChargesForPeriod({ scope, billing_period: period, trigger: "cron" });
          created += r.created; skipped += r.skipped;
        }
        return NextResponse.json({ task, period, scopes: scopes.length, created, skipped });
      }
      case "apply-late-fees": {
        const scopes = await enumerateBillerScopes();
        let applied = 0;
        for (const scope of scopes) applied += (await applyLateFees(scope)).applied;
        return NextResponse.json({ task, applied });
      }
      case "mark-overdue": {
        const { data, error } = await supabaseAdmin.rpc("mark_overdue_invoices");
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ task, updated: data });
      }
      case "process-reminders": {
        const result = await processReminders();
        return NextResponse.json({ task, ...result });
      }
      default:
        return NextResponse.json({ error: `Unknown cron task: ${task}` }, { status: 404 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[cron/${task}]`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
