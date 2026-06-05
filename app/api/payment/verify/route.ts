import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getRazorpayKeys } from "@/lib/platform-config";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

async function verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const { keySecret } = await getRazorpayKeys();
  if (!keySecret) throw new Error("Razorpay Key Secret not configured");
  const body = `${orderId}|${paymentId}`;
  const expectedSig = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
  return expectedSig === signature;
}

// NOTE: Route auto-split now happens at ORDER creation (inline `transfers` for
// rent/maintenance) and in the webhook (for invoice payment links). The verify
// route only confirms the payment in our DB — no transfer is triggered here.

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      type: "rent" | "maintenance" | "subscription";
      // Rent
      tenantId?: string;
      monthYear?: string;
      amount?: number;
      existingPaymentId?: string;
      // Partial-payment context (gateway can now pay a portion)
      expectedAmount?: number;
      alreadyPaid?: number;
      isPartial?: boolean;
      // For route transfer target
      landlordId?: string;
      societyId?: string;
      // Maintenance
      flatId?: string;
      expenseId?: string;
      shareAmount?: number;
    };

    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      type, tenantId, monthYear, amount, existingPaymentId,
      expectedAmount, alreadyPaid, isPartial,
      flatId, expenseId, landlordId, shareAmount,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
    }

    const isValid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      console.error("[payment/verify] Signature mismatch — possible fraud attempt");
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    if (type === "rent") {
      if (!tenantId || !monthYear || !amount) {
        return NextResponse.json({ error: "Missing rent payment details" }, { status: 400 });
      }

      // Resolve full expected vs cumulative paid so a partial gateway payment
      // leaves status "pending" with paid_amount tracking the carry-over.
      const fullExpected = expectedAmount ?? amount;
      const cumulativePaid = (alreadyPaid ?? 0) + amount;
      const fullyPaid = !isPartial && cumulativePaid >= fullExpected;
      const rentStatus = fullyPaid ? "paid" : "pending";

      if (existingPaymentId) {
        const update: Record<string, unknown> = {
          status: rentStatus,
          // `amount` = the actually-collected value (full or cumulative partial).
          // Must be set here — the old code only touched `status`, which left
          // pre-existing pending rows at amount=0 and showed ₹0 after paying.
          amount: fullyPaid ? fullExpected : cumulativePaid,
          paid_amount: cumulativePaid,
          payment_method: "razorpay",
          payment_id: razorpay_payment_id,
        };
        if (fullyPaid) update.payment_date = today;
        const { error } = await supabase
          .from("rent_payments")
          .update(update)
          .eq("id", existingPaymentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("rent_payments")
          .insert({
            tenant_id: tenantId,
            month_year: monthYear,
            amount: fullyPaid ? fullExpected : amount,
            expected_amount: fullExpected,
            paid_amount: cumulativePaid,
            status: rentStatus,
            payment_date: fullyPaid ? today : null,
            payment_method: "razorpay",
            payment_id: razorpay_payment_id,
          });
        if (error) throw error;
      }

      // Route auto-split handled at order creation (inline transfers).

    } else if (type === "maintenance") {
      if (!flatId || !expenseId || !shareAmount) {
        return NextResponse.json({ error: "Missing maintenance payment details" }, { status: 400 });
      }

      const currentMonthStr = new Date().toISOString().slice(0, 7);
      // shareAmount is the FULL per-flat share for this expense; `amount` is what
      // was actually charged now (may be a partial portion of the share).
      const dueExpected = shareAmount;
      const paidNow = amount ?? shareAmount;

      // Accumulate against any existing partial payment for this expense+flat+month.
      const { data: existingDue } = await supabase
        .from("society_due_payments")
        .select("amount, paid_amount")
        .eq("expense_id", expenseId)
        .eq("flat_id", flatId)
        .eq("month_year", currentMonthStr)
        .maybeSingle();
      const priorPaid = existingDue?.paid_amount ?? existingDue?.amount ?? 0;
      const cumulativePaid = priorPaid + paidNow;
      const dueFullyPaid = !isPartial && cumulativePaid >= dueExpected;

      const { error } = await supabase
        .from("society_due_payments")
        .upsert({
          expense_id: expenseId,
          flat_id: flatId,
          landlord_id: landlordId ?? null,
          amount: cumulativePaid,
          expected_amount: dueExpected,
          paid_amount: cumulativePaid,
          status: dueFullyPaid ? "paid" : "pending",
          month_year: currentMonthStr,
          paid_at: now,
          payment_method: "razorpay",
          payment_id: razorpay_payment_id,
        }, { onConflict: "expense_id,flat_id,month_year" });
      if (error) throw error;

      // Route auto-split handled at order creation (inline transfers).

    } else if (type === "subscription") {
      // Signature verified — plan activation handled client-side
    } else {
      return NextResponse.json({ error: "Unknown payment type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, paymentId: razorpay_payment_id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payment/verify] ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
