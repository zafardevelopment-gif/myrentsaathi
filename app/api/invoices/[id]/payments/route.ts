import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordPayment } from "@/lib/billing/payment-service";
import type { PaymentMethod } from "@/lib/billing/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/invoices/[id]/payments — list payments for an invoice
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { data, error } = await supabaseAdmin
      .from("invoice_payments").select("*").eq("invoice_id", id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ payments: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// POST /api/invoices/[id]/payments — record a full/partial payment
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      amount: number;
      method?: PaymentMethod;
      payment_date?: string;
      reference?: string | null;
      receipt_url?: string | null;
      status?: "confirmed" | "pending_verification";
      recorded_by?: string | null;
    };

    const result = await recordPayment({
      invoice_id: id,
      amount: body.amount,
      method: body.method,
      payment_date: body.payment_date,
      reference: body.reference ?? null,
      receipt_url: body.receipt_url ?? null,
      status: body.status,
      recorded_by: body.recorded_by ?? null,
    });

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/invoices/:id/payments POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
