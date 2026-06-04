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

// Sync the legacy rent_payments row (landlord Rent page + Overview read from it)
// for a paid RENT invoice. Returns true if a row was updated.
async function syncRentPayment(inv: { invoice_type?: string; flat_id?: string | null; billing_period?: string | null }): Promise<boolean> {
  if (inv.invoice_type !== "rent" || !inv.flat_id || !inv.billing_period) return false;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin.from("rent_payments")
    .update({ status: "paid", payment_date: today, payment_method: "razorpay", updated_at: new Date().toISOString() })
    .eq("flat_id", inv.flat_id).eq("month_year", inv.billing_period).neq("status", "paid")
    .select("id");
  return (data?.length ?? 0) > 0;
}

// GET/POST /api/payment/reconcile?invoice=<id>
async function handle(invoiceId: string | null) {
  if (!invoiceId) return NextResponse.json({ error: "invoice required" }, { status: 400 });

  const { data: inv } = await supabaseAdmin
    .from("invoices").select("id, status, total_amount, amount_paid, payment_link_id, invoice_type, flat_id, billing_period").eq("id", invoiceId).maybeSingle();
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Already paid: still sync the legacy rent_payments row (it may have been
  // missed earlier) so the landlord Rent page / Overview reflect "Paid".
  if (inv.status === "paid") {
    const synced = await syncRentPayment(inv);
    return NextResponse.json({ reconciled: false, status: "paid", rent_synced: synced });
  }
  if (!inv.payment_link_id) return NextResponse.json({ reconciled: false, reason: "no payment link" });

  const { keyId, keySecret } = await getRazorpayKeys();
  if (!keyId || !keySecret) return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  // Fetch the payment link to see if it's paid (standard response includes
  // `status`, `amount_paid` and a `payments` array).
  const link = await fetch(`https://api.razorpay.com/v1/payment_links/${inv.payment_link_id}`, {
    headers: { Authorization: `Basic ${auth}` },
  }).then((r) => r.json()).catch(() => null);

  // Razorpay marks a fully-paid link as "paid"; partial as "partially_paid".
  const linkStatus = link?.status as string | undefined;
  const isPaid = linkStatus === "paid" || Number(link?.amount_paid ?? 0) > 0;
  if (!link || !isPaid) {
    return NextResponse.json({
      reconciled: false,
      debug: {
        payment_link_id: inv.payment_link_id,
        link_status: linkStatus ?? null,
        link_error: link?.error?.description ?? null,
        amount_paid: link?.amount_paid ?? null,
      },
    });
  }

  const amountPaise = Number(link.amount_paid ?? link.amount ?? 0);

  // Mark the invoice paid: insert a confirmed payment row keyed on the payment
  // link id (idempotent). The DB trigger recomputes invoice amount_paid + status.
  // We do NOT need the exact payment id for this — the link being "paid" is enough.
  const linkRef = `plink_${inv.payment_link_id}`;
  const { data: dupe } = await supabaseAdmin.from("invoice_payments").select("id").eq("reference", linkRef).maybeSingle();
  let insertError: string | null = null;
  if (!dupe) {
    const { error } = await supabaseAdmin.from("invoice_payments").insert({
      invoice_id: invoiceId, amount: amountPaise / 100,
      method: "payment_link", reference: linkRef, payment_link_id: inv.payment_link_id, status: "confirmed",
    });
    insertError = error?.message ?? null;
  }

  // Recompute invoice amount_paid + status directly (don't rely on a DB trigger
  // that may be missing). Sum all confirmed payments for this invoice.
  const { data: confirmedPays } = await supabaseAdmin
    .from("invoice_payments").select("amount").eq("invoice_id", invoiceId).eq("status", "confirmed");
  const paidTotal = (confirmedPays ?? []).reduce((a, p) => a + Number(p.amount || 0), 0);
  const total = Number(inv.total_amount);
  let newStatus = "unpaid";
  if (total > 0 && paidTotal >= total) newStatus = "paid";
  else if (paidTotal > 0) newStatus = "partially_paid";
  await supabaseAdmin.from("invoices").update({
    amount_paid: paidTotal,
    status: newStatus,
    payment_link_status: "paid",
    updated_at: new Date().toISOString(),
  }).eq("id", invoiceId);

  // Sync the legacy rent_payments row (landlord Rent page + Overview read from it).
  if (newStatus === "paid") await syncRentPayment(inv);

  // Route auto-split — best effort, only if we can resolve the capturing payment id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payments: any[] = link.payments?.items ?? link.payments ?? [];
  const captured = payments.find((p) => p.status === "captured") ?? payments[0];
  const paymentId = captured?.payment_id ?? captured?.id;
  if (paymentId) await routeTransfer(invoiceId, paymentId, amountPaise, keyId, keySecret);

  // Read back the invoice status so we can confirm the DB trigger fired.
  const { data: after } = await supabaseAdmin.from("invoices").select("status, amount_paid").eq("id", invoiceId).maybeSingle();

  return NextResponse.json({
    reconciled: true,
    paymentId: paymentId ?? null,
    debug: { amountPaise, already_recorded: !!dupe, insertError, invoice_after: after },
  });
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
