import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getInvoiceDetail } from "@/lib/billing/invoice-service";
import { resolveTemplateConfig } from "@/lib/billing/config-service";
import { renderInvoiceHtml } from "@/lib/billing/invoice-render";
import type { BillerScope } from "@/lib/billing/scope";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
type Ctx = { params: Promise<{ id: string }> };

// POST /api/invoices/[id]/send — email the invoice (HTML body) to the recipient.
export async function POST(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const detail = await getInvoiceDetail(id);
    if (!detail) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const inv = detail.invoice as Record<string, unknown>;

    const recipientId = inv.recipient_user_id as string | null;
    if (!recipientId) return NextResponse.json({ error: "Invoice has no recipient" }, { status: 400 });
    const { data: user } = await supabaseAdmin.from("users").select("email, full_name").eq("id", recipientId).maybeSingle();
    if (!user?.email) return NextResponse.json({ error: "Recipient has no email" }, { status: 400 });

    const scope: BillerScope = inv.society_id
      ? { kind: "society", societyId: inv.society_id as string }
      : { kind: "landlord", landlordId: inv.landlord_id as string };
    const config = await resolveTemplateConfig(scope, inv.invoice_type as string, inv.template_id as string | null);
    let billerName: string | null = null;
    if (inv.society_id) {
      const { data: s } = await supabaseAdmin.from("societies").select("name").eq("id", inv.society_id as string).maybeSingle();
      billerName = s?.name ?? null;
    } else if (inv.landlord_id) {
      const { data: l } = await supabaseAdmin.from("users").select("full_name").eq("id", inv.landlord_id as string).maybeSingle();
      billerName = l?.full_name ?? null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = renderInvoiceHtml(inv as any, detail.lines as any, config, { billerName, recipientName: user.full_name });

    const res = await fetch(`${APP_URL}/api/email/send`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: user.email, subject: `Invoice ${inv.invoice_number}`, html }),
    });
    if (!res.ok) return NextResponse.json({ error: "Email send failed" }, { status: 502 });
    return NextResponse.json({ success: true, to: user.email });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
