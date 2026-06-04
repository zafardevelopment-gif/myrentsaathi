import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getRazorpayKeys } from "@/lib/platform-config";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function notice(message: string) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><div style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center">
       <h2 style="color:#1a1a2e">MyRentSaathi</h2><p style="color:#555">${message}</p></div>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

// GET /api/payment/redirect?invoice=<id>
// Creates (or reuses) a Razorpay Payment Link for the invoice's outstanding amount
// and 302-redirects to the hosted gateway. Used by the "Pay Now" / status link on the bill.
export async function GET(request: NextRequest) {
  try {
    const invoiceId = request.nextUrl.searchParams.get("invoice");
    if (!invoiceId) return notice("Missing invoice reference.");

    const { data: inv } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, total_amount, amount_paid, status, recipient_user_id, payment_link_id, payment_link_url, payment_link_status")
      .eq("id", invoiceId).maybeSingle();
    if (!inv) return notice("Invoice not found.");
    if (inv.status === "paid") return notice("This invoice is already paid. ✓");
    if (inv.status === "cancelled") return notice("This invoice has been cancelled.");

    const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);
    if (outstanding <= 0) return notice("Nothing is outstanding on this invoice. ✓");

    const { keyId, keySecret } = await getRazorpayKeys();
    if (!keyId || !keySecret) return notice("Online payment is not configured yet. Please pay offline or contact your landlord.");

    const { data: user } = inv.recipient_user_id
      ? await supabaseAdmin.from("users").select("full_name, email, phone").eq("id", inv.recipient_user_id).maybeSingle()
      : { data: null };

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const link = await razorpay.paymentLink.create({
      amount: Math.round(outstanding * 100),
      currency: "INR",
      description: `Invoice ${inv.invoice_number}`,
      notes: { invoice_id: invoiceId },
      customer: { name: user?.full_name ?? undefined, email: user?.email ?? undefined, contact: user?.phone ?? undefined },
      notify: { sms: false, email: false },
      reminder_enable: false,
    });

    await supabaseAdmin.from("invoices").update({
      payment_link_id: link.id, payment_link_url: link.short_url, payment_link_status: "created",
    }).eq("id", invoiceId);

    return NextResponse.redirect(link.short_url as string);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payment/redirect]", msg);
    return notice("Could not start the payment. Please try again later.");
  }
}
