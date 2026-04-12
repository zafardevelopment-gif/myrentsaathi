import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET not configured");
  const body = `${orderId}|${paymentId}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expectedSig === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      // Which record to update
      type: "rent" | "maintenance";
      // For rent payments
      tenantId?: string;
      monthYear?: string;
      amount?: number;
      existingPaymentId?: string;
      // For maintenance payments
      flatId?: string;
      expenseId?: string;
      landlordId?: string;
      shareAmount?: number;
    };

    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      type, tenantId, monthYear, amount, existingPaymentId,
      flatId, expenseId, landlordId, shareAmount,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
    }

    // Verify HMAC signature — critical security step
    const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
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

      if (existingPaymentId) {
        const { error } = await supabase
          .from("rent_payments")
          .update({
            status: "paid",
            payment_date: today,
            payment_method: "razorpay",
            payment_id: razorpay_payment_id,
          })
          .eq("id", existingPaymentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("rent_payments")
          .insert({
            tenant_id: tenantId,
            month_year: monthYear,
            amount,
            expected_amount: amount,
            status: "paid",
            payment_date: today,
            payment_method: "razorpay",
            payment_id: razorpay_payment_id,
          });
        if (error) throw error;
      }
    } else if (type === "maintenance") {
      if (!flatId || !expenseId || !shareAmount) {
        return NextResponse.json({ error: "Missing maintenance payment details" }, { status: 400 });
      }

      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const { error } = await supabase
        .from("society_due_payments")
        .upsert({
          expense_id: expenseId,
          flat_id: flatId,
          landlord_id: landlordId ?? null,
          amount: shareAmount,
          month_year: currentMonthStr,
          paid_at: now,
          payment_method: "razorpay",
          payment_id: razorpay_payment_id,
        }, { onConflict: "expense_id,flat_id,month_year" });
      if (error) throw error;
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
