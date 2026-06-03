import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getInvoiceDetail } from "@/lib/billing/invoice-service";
import { resolveTemplateConfig } from "@/lib/billing/config-service";
import { renderInvoiceHtml } from "@/lib/billing/invoice-render";
import type { BillerScope } from "@/lib/billing/scope";

/** Resolve biller + recipient names AND GSTINs (live) for the header / Bill To. */
async function resolveParties(inv: Record<string, unknown>): Promise<{ billerName: string | null; recipientName: string | null; billerGst: string | null; recipientGst: string | null }> {
  let billerName: string | null = null;
  let billerGst: string | null = null;
  const billerCol = inv.society_id ? "society_id" : "landlord_id";
  const billerVal = (inv.society_id ?? inv.landlord_id) as string | null;
  if (billerVal) {
    const { data: prof } = await supabaseAdmin.from("billing_profiles").select("legal_name, gst_number").eq(billerCol, billerVal).maybeSingle();
    billerGst = prof?.gst_number ?? null;
    billerName = prof?.legal_name ?? null;
    if (!billerName) {
      if (inv.society_id) billerName = (await supabaseAdmin.from("societies").select("name").eq("id", inv.society_id as string).maybeSingle()).data?.name ?? null;
      else if (inv.landlord_id) billerName = (await supabaseAdmin.from("users").select("full_name").eq("id", inv.landlord_id as string).maybeSingle()).data?.full_name ?? null;
    }
  }
  let recipientName: string | null = null;
  let recipientGst: string | null = null;
  if (inv.recipient_user_id) {
    const { data: u } = await supabaseAdmin.from("users").select("full_name").eq("id", inv.recipient_user_id as string).maybeSingle();
    recipientName = u?.full_name ?? null;
    const { data: t } = await supabaseAdmin.from("tenants").select("gst_number").eq("user_id", inv.recipient_user_id as string).limit(1).maybeSingle();
    recipientGst = t?.gst_number ?? null;
  }
  return { billerName, recipientName, billerGst, recipientGst };
}

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
    const parties = await resolveParties(inv);

    // QR encodes the pay URL (tenant scans → opens the payment gateway).
    let qrDataUrl: string | null = null;
    const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);
    if (outstanding > 0 && inv.status !== "cancelled") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      try { qrDataUrl = await QRCode.toDataURL(`${appUrl}/api/payment/redirect?invoice=${inv.id}`, { margin: 1, width: 240 }); } catch { qrDataUrl = null; }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = renderInvoiceHtml(inv as any, detail.lines as any, config, { ...parties, qrDataUrl });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
