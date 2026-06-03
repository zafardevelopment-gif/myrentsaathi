import { NextRequest, NextResponse } from "next/server";
import { getInvoiceDetail } from "@/lib/billing/invoice-service";
import { resolveTemplateConfig } from "@/lib/billing/config-service";
import { renderInvoiceHtml } from "@/lib/billing/invoice-render";
import type { BillerScope } from "@/lib/billing/scope";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/invoices/[id]/pdf — branded, print-to-PDF-ready invoice HTML (§9, §25)
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const detail = await getInvoiceDetail(id);
    if (!detail) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const inv = detail.invoice as Record<string, unknown>;
    const scope: BillerScope = inv.society_id
      ? { kind: "society", societyId: inv.society_id as string }
      : { kind: "landlord", landlordId: inv.landlord_id as string };
    const config = await resolveTemplateConfig(scope, inv.invoice_type as string, inv.template_id as string | null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = renderInvoiceHtml(inv as any, detail.lines as any, config);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
