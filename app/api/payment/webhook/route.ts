import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { emailInvoicePaymentReceipt, emailPaymentReceivedLandlord } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.myrentsaathi.com";

export const runtime = "nodejs";

// Razorpay sends webhooks — verify with webhook secret (separate from API secret)
function verifyWebhook(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[payment/webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping verification");
    return true; // allow without verification if not configured (development only)
  }
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

async function sendPaymentEmails(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  invoiceId: string,
  amountPaid: number,
  paymentId: string,
) {
  try {
    // Fetch invoice with flat and landlord info
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, invoice_number, billing_period, invoice_type, recipient_user_id, landlord_id, society_id, flat_id")
      .eq("id", invoiceId).maybeSingle();
    if (!inv) return;

    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const viewUrl = `${APP_URL}/api/invoices/${invoiceId}/pdf`;
    const dashboardUrl = `${APP_URL}/landlord/billing`;

    // Get tenant info
    let tenantEmail: string | null = null;
    let tenantName = "Tenant";
    if (inv.recipient_user_id) {
      const { data: u } = await supabase.from("users").select("email, full_name").eq("id", inv.recipient_user_id).maybeSingle();
      tenantEmail = u?.email ?? null;
      tenantName = u?.full_name ?? "Tenant";
    }

    // Get flat number
    let flatNumber = "—";
    if (inv.flat_id) {
      const { data: f } = await supabase.from("flats").select("flat_number, block").eq("id", inv.flat_id).maybeSingle();
      if (f) flatNumber = `${f.flat_number}${f.block ? ` (${f.block})` : ""}`;
    }

    // Get landlord info
    let landlordEmail: string | null = null;
    let landlordName = "Landlord";
    const landlordUserId = inv.landlord_id;
    if (landlordUserId) {
      const { data: l } = await supabase.from("users").select("email, full_name").eq("id", landlordUserId).maybeSingle();
      landlordEmail = l?.email ?? null;
      landlordName = l?.full_name ?? "Landlord";
    }

    // Email to tenant — payment receipt
    if (tenantEmail) {
      await emailInvoicePaymentReceipt({
        to: tenantEmail, tenantName, invoiceNumber: inv.invoice_number,
        billingPeriod: inv.billing_period, amountPaid, paymentDate: today,
        paymentId, landlordName, viewUrl,
      });
    }

    // Email to landlord — payment received notification
    if (landlordEmail) {
      await emailPaymentReceivedLandlord({
        to: landlordEmail, landlordName, tenantName, flatNumber,
        invoiceNumber: inv.invoice_number, billingPeriod: inv.billing_period,
        amountPaid, paymentDate: today, paymentId, dashboardUrl,
      });
    }
  } catch {
    // Never block the webhook
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";

    if (!verifyWebhook(rawBody, signature)) {
      console.error("[payment/webhook] Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      payload: {
        payment?: {
          entity: {
            id: string;
            order_id: string;
            amount: number;
            status: string;
            notes: Record<string, string>;
          };
        };
        payment_link?: { entity: { id: string; notes: Record<string, string> } };
      };
    };

    const { event: eventType, payload } = event;
    const payment = payload.payment?.entity;

    if (!payment) {
      return NextResponse.json({ received: true });
    }

    const supabase = getSupabaseAdmin();

    // ── NEW billing model (§27): confirm an invoice payment from link/order notes ──
    const invoiceId = payment.notes?.invoice_id || payload.payment_link?.entity?.notes?.invoice_id;
    if ((eventType === "payment.captured" || eventType === "payment_link.paid") && invoiceId) {
      const linkId = payload.payment_link?.entity?.id ?? null;
      const { data: dupe } = await supabase
        .from("invoice_payments").select("id").eq("reference", payment.id).maybeSingle();
      if (!dupe) {
        await supabase.from("invoice_payments").insert({
          invoice_id: invoiceId, amount: payment.amount / 100,
          method: linkId ? "payment_link" : "razorpay", reference: payment.id,
          razorpay_order_id: payment.order_id ?? null, payment_link_id: linkId, status: "confirmed",
        });
        // DB trigger recomputes invoice amount_paid + status.

        // Fire-and-forget: send payment confirmation emails
        sendPaymentEmails(supabase, invoiceId, payment.amount / 100, payment.id).catch(() => {});
      }
      if (linkId) await supabase.from("invoices").update({ payment_link_status: "paid" }).eq("id", invoiceId);
      return NextResponse.json({ received: true });
    }

    if (eventType === "payment.captured") {
      // Payment succeeded — log it (main update happens in /verify route after client confirms)
      console.log(`[payment/webhook] payment.captured: ${payment.id} order: ${payment.order_id} amount: ${payment.amount / 100}`);

      // If for some reason verify wasn't called (user closed browser), mark as paid here too
      const notes = payment.notes;
      if (notes.type === "rent" && notes.tenantId && notes.monthYear) {
        const today = new Date().toISOString().slice(0, 10);
        const amountInr = Math.round(payment.amount / 100);
        // Only insert if no record yet
        const { data: existing } = await supabase
          .from("rent_payments")
          .select("id")
          .eq("tenant_id", notes.tenantId)
          .eq("month_year", notes.monthYear)
          .eq("status", "paid")
          .maybeSingle();
        if (!existing) {
          await supabase.from("rent_payments").insert({
            tenant_id: notes.tenantId,
            month_year: notes.monthYear,
            amount: amountInr,
            expected_amount: amountInr,
            status: "paid",
            payment_date: today,
            payment_method: "razorpay",
            payment_id: payment.id,
          });
        }
      }
    } else if (eventType === "payment.failed") {
      console.log(`[payment/webhook] payment.failed: ${payment.id} order: ${payment.order_id}`);
      // Could log to a failed_payments table or send alert — no DB action needed for now
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payment/webhook] ERROR:", msg);
    // Always return 200 to Razorpay to prevent retries on our processing errors
    return NextResponse.json({ received: true });
  }
}
