import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getRazorpayKeys } from "@/lib/platform-config";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// POST /api/payment/create-link  { invoice_id }
// Creates a Razorpay Payment Link for the invoice's outstanding amount (§27).
export async function POST(request: NextRequest) {
  try {
    const { invoice_id } = (await request.json()) as { invoice_id: string };
    if (!invoice_id) return NextResponse.json({ error: "invoice_id required" }, { status: 400 });

    const { data: inv } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, total_amount, amount_paid, recipient_user_id, status")
      .eq("id", invoice_id).maybeSingle();
    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (inv.status === "cancelled") return NextResponse.json({ error: "Invoice is cancelled" }, { status: 400 });
    const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);
    if (outstanding <= 0) return NextResponse.json({ error: "Nothing outstanding" }, { status: 400 });

    const { keyId, keySecret } = await getRazorpayKeys();
    if (!keyId || !keySecret) return NextResponse.json({ error: "Razorpay keys not configured" }, { status: 500 });

    const { data: user } = inv.recipient_user_id
      ? await supabaseAdmin.from("users").select("full_name, email, phone").eq("id", inv.recipient_user_id).maybeSingle()
      : { data: null };

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const link = await razorpay.paymentLink.create({
      amount: Math.round(outstanding * 100),
      currency: "INR",
      description: `Invoice ${inv.invoice_number}`,
      notes: { invoice_id },
      customer: {
        name: user?.full_name ?? undefined,
        email: user?.email ?? undefined,
        contact: user?.phone ?? undefined,
      },
      notify: { sms: false, email: false },
      reminder_enable: false,
    });

    await supabaseAdmin.from("invoices").update({
      payment_link_id: link.id, payment_link_url: link.short_url, payment_link_status: "created",
    }).eq("id", invoice_id);

    return NextResponse.json({ id: link.id, short_url: link.short_url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payment/create-link]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
