/**
 * Reconcile an invoice payment WITHOUT relying on the webhook.
 *
 * Payment Links only notify us via webhook. If the webhook isn't configured or
 * is delayed, a paid invoice can stay "Due". This endpoint fetches the live
 * payment-link status from Razorpay and, if paid:
 *   1. records the payment in invoice_payments (idempotent),
 *   2. triggers the Route transfer to the landlord/society linked account.
 *
 * Safe to call repeatedly (e.g. when the tenant opens their dashboard).
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getRazorpayKeys } from "@/lib/platform-config";

export const runtime = "nodejs";
export const maxDuration = 30;

async function routeTransfer(invoiceId: string, paymentId: string, amountPaise: number, keyId: string, keySecret: string) {
  try {
    const { data: inv } = await supabaseAdmin.from("invoices").select("landlord_id, society_id").eq("id", invoiceId).maybeSingle();
    if (!inv) return;
    const entityType = inv.society_id ? "society" : "landlord";
    const entityId = inv.society_id ?? inv.landlord_id;
    if (!entityId) return;
    const { data: bank } = await supabaseAdmin.from("bank_accounts")
      .select("razorpay_linked_account_id, route_status").eq("entity_type", entityType).eq("entity_id", entityId).maybeSingle();
    const acc = bank?.razorpay_linked_account_id;
    if (!acc || bank?.route_status === "failed") return;

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    // Skip if a transfer already exists for this payment.
    const existing = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/transfers`, {
      headers: { Authorization: `Basic ${auth}` },
    }).then((r) => r.json()).catch(() => null);
    if (existing?.items?.length > 0) return;

    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ transfers: [{ account: acc, amount: amountPaise, currency: "INR", notes: { invoice_id: invoiceId }, on_hold: 0 }] }),
    });
    if (!res.ok) console.error("[reconcile] transfer failed:", JSON.stringify(await res.json().catch(() => ({}))));
  } catch (e) {
    console.error("[reconcile] transfer error:", e instanceof Error ? e.message : String(e));
  }
}

// GET/POST /api/payment/reconcile?invoice=<id>
async function handle(invoiceId: string | null) {
  if (!invoiceId) return NextResponse.json({ error: "invoice required" }, { status: 400 });

  const { data: inv } = await supabaseAdmin
    .from("invoices").select("id, status, total_amount, amount_paid, payment_link_id").eq("id", invoiceId).maybeSingle();
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (inv.status === "paid") return NextResponse.json({ reconciled: false, status: "paid" });
  if (!inv.payment_link_id) return NextResponse.json({ reconciled: false, reason: "no payment link" });

  const { keyId, keySecret } = await getRazorpayKeys();
  if (!keyId || !keySecret) return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  // Fetch the payment link to see if it's paid + which payment captured it.
  const link = await fetch(`https://api.razorpay.com/v1/payment_links/${inv.payment_link_id}`, {
    headers: { Authorization: `Basic ${auth}` },
  }).then((r) => r.json()).catch(() => null);
  if (!link || link.status !== "paid") {
    return NextResponse.json({ reconciled: false, status: link?.status ?? "unknown" });
  }

  // Find the captured payment id for this link.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payments: any[] = link.payments ?? [];
  const captured = payments.find((p) => p.status === "captured") ?? payments[0];
  const paymentId = captured?.payment_id ?? captured?.id;
  const amountPaise = Number(link.amount_paid ?? link.amount ?? 0);
  if (!paymentId) return NextResponse.json({ reconciled: false, reason: "no captured payment" });

  // Idempotent insert of the payment record (DB trigger recomputes invoice status).
  const { data: dupe } = await supabaseAdmin.from("invoice_payments").select("id").eq("reference", paymentId).maybeSingle();
  if (!dupe) {
    await supabaseAdmin.from("invoice_payments").insert({
      invoice_id: invoiceId, amount: amountPaise / 100,
      method: "payment_link", reference: paymentId, payment_link_id: inv.payment_link_id, status: "confirmed",
    });
  }
  await supabaseAdmin.from("invoices").update({ payment_link_status: "paid" }).eq("id", invoiceId);

  // Route auto-split to the landlord/society linked account.
  await routeTransfer(invoiceId, paymentId, amountPaise, keyId, keySecret);

  return NextResponse.json({ reconciled: true, paymentId });
}

export async function GET(request: NextRequest) {
  try { return await handle(request.nextUrl.searchParams.get("invoice")); }
  catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    return await handle(body.invoice ?? request.nextUrl.searchParams.get("invoice"));
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 }); }
}
