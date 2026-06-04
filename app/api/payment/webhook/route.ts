import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { emailInvoicePaymentReceipt, emailPaymentReceivedLandlord } from "@/lib/email";
import { getRazorpayKeys } from "@/lib/platform-config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.myrentsaathi.com";

export const runtime = "nodejs";

// Route: split a captured invoice payment to the payee's linked account.
// Payment Links don't support inline transfers, so we transfer after capture.
async function routeInvoiceTransfer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  invoiceId: string,
  paymentId: string,
  amountPaise: number,
) {
  try {
    const { data: inv } = await supabase
      .from("invoices").select("landlord_id, society_id").eq("id", invoiceId).maybeSingle();
    if (!inv) return;
    const entityType = inv.society_id ? "society" : "landlord";
    const entityId = inv.society_id ?? inv.landlord_id;
    if (!entityId) return;

    const { data: bank } = await supabase
      .from("bank_accounts").select("razorpay_linked_account_id, route_status")
      .eq("entity_type", entityType).eq("entity_id", entityId).maybeSingle();
    const linkedAccountId = bank?.razorpay_linked_account_id;
    if (!linkedAccountId || bank?.route_status === "failed") return;

    const { keyId, keySecret } = await getRazorpayKeys();
    if (!keyId || !keySecret) return;

    // Idempotency: skip if a transfer already exists for this payment.
    const existing = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/transfers`, {
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
    }).then((r) => r.json()).catch(() => null);
    if (existing?.items?.length > 0) return; // already transferred

    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
      body: JSON.stringify({
        transfers: [{ account: linkedAccountId, amount: amountPaise, currency: "INR", notes: { invoice_id: invoiceId }, on_hold: 0 }],
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      console.error("[webhook] invoice route transfer failed:", JSON.stringify(d));
    }
  } catch (e) {
    console.error("[webhook] routeInvoiceTransfer error:", e instanceof Error ? e.message : String(e));
  }
}

// Razorpay sends webhooks — verify with webhook secret (separate from API secret).
// Read DB-first (platform_config), falling back to env — same as all other creds.
async function verifyWebhook(body: string, signature: string): Promise<boolean> {
  const { webhookSecret } = await getRazorpayKeys();
  const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (!secret) {
    // SECURITY: never skip verification in production — an unsigned webhook could
    // mark invoices paid. Only allow the bypass in local development.
    if (process.env.NODE_ENV === "production") {
      console.error("[payment/webhook] webhook secret not set — rejecting in production");
      return false;
    }
    console.warn("[payment/webhook] webhook secret not set — skipping verification (dev only)");
    return true;
  }
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  // Constant-time comparison to avoid timing attacks.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// Recompute an invoice's amount_paid + status from its confirmed payments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recomputeInvoice(supabase: any, invoiceId: string) {
  try {
    const { data: inv } = await supabase.from("invoices").select("total_amount, due_date, status").eq("id", invoiceId).maybeSingle();
    if (!inv || inv.status === "cancelled" || inv.status === "draft") return;
    const { data: pays } = await supabase.from("invoice_payments").select("amount").eq("invoice_id", invoiceId).eq("status", "confirmed");
    const paid = (pays ?? []).reduce((a: number, p: { amount: number }) => a + Number(p.amount || 0), 0);
    const total = Number(inv.total_amount);
    let status = "unpaid";
    if (total > 0 && paid >= total) status = "paid";
    else if (inv.due_date && new Date(inv.due_date) < new Date()) status = "overdue";
    else if (paid > 0) status = "partially_paid";
    await supabase.from("invoices").update({ amount_paid: paid, status, updated_at: new Date().toISOString() }).eq("id", invoiceId);
  } catch { /* best-effort */ }
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

    if (!(await verifyWebhook(rawBody, signature))) {
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

        // Recompute invoice amount_paid + status directly (don't rely on a DB
        // trigger that may be missing in this environment).
        await recomputeInvoice(supabase, invoiceId);

        // Fire-and-forget: send payment confirmation emails
        sendPaymentEmails(supabase, invoiceId, payment.amount / 100, payment.id).catch(() => {});

        // Route: auto-split the captured amount to the landlord/society linked account.
        routeInvoiceTransfer(supabase, invoiceId, payment.id, payment.amount).catch(() => {});
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
