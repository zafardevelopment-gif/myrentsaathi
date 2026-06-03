import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getInvoiceDetail } from "@/lib/billing/invoice-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/invoices/[id] — header + line items + payments
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const detail = await getInvoiceDetail(id);
    if (!detail) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/invoices/:id GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/invoices/[id] — { action: 'cancel' } (issued invoices are never deleted, §16)
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as { action?: string; notes?: string };

    if (body.action === "cancel") {
      const { error } = await supabaseAdmin
        .from("invoices")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id)
        .neq("status", "paid"); // a fully-paid invoice is cancelled via credit note (Phase 9), not status flip
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (typeof body.notes === "string") {
      const { error } = await supabaseAdmin
        .from("invoices").update({ notes: body.notes, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/invoices/:id PATCH]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
