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

// Razorpay Route: transfer amount to linked fund account after payment capture
async function triggerRouteTransfer({
  paymentId,
  fundAccountId,
  amount,  // in paise
  keyId,
  keySecret,
  notes,
}: {
  paymentId: string;
  fundAccountId: string;
  amount: number;
  keyId: string;
  keySecret: string;
  notes?: Record<string, string>;
}) {
  const base64 = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  // Route transfer via payment transfers API
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/transfers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${base64}`,
    },
    body: JSON.stringify({
      transfers: [
        {
          account: fundAccountId,
          amount,
          currency: "INR",
          notes: notes ?? {},
          linked_account_notes: [],
          on_hold: 0,
        },
      ],
    }),
  });

  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    const errMsg = (data.error as Record<string, string> | undefined)?.description ?? JSON.stringify(data);
    console.error("[payment/verify] Route transfer failed:", errMsg);
    // Non-fatal — payment already verified, just log it
  }
  return data;
}

// Look up fund_account_id for an entity
async function getFundAccountId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  entityType: "society" | "landlord",
  entityId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("bank_accounts")
    .select("razorpay_fund_account_id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();
  return (data?.razorpay_fund_account_id as string | null) ?? null;
}

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
      flatId, expenseId, landlordId, societyId, shareAmount,
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
    const { keyId, keySecret } = await getRazorpayKeys();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    if (type === "rent") {
      if (!tenantId || !monthYear || !amount) {
        return NextResponse.json({ error: "Missing rent payment details" }, { status: 400 });
      }

      if (existingPaymentId) {
        const { error } = await supabase
          .from("rent_payments")
          .update({ status: "paid", payment_date: today, payment_method: "razorpay", payment_id: razorpay_payment_id })
          .eq("id", existingPaymentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("rent_payments")
          .insert({ tenant_id: tenantId, month_year: monthYear, amount, expected_amount: amount, status: "paid", payment_date: today, payment_method: "razorpay", payment_id: razorpay_payment_id });
        if (error) throw error;
      }

      // Route transfer to landlord's linked bank account (fire-and-forget)
      if (landlordId && keyId && keySecret) {
        const fundAccountId = await getFundAccountId(supabase, "landlord", landlordId);
        if (fundAccountId) {
          triggerRouteTransfer({
            paymentId: razorpay_payment_id,
            fundAccountId,
            amount: Math.round(amount * 100), // paise
            keyId,
            keySecret,
            notes: { type: "rent", tenantId, monthYear },
          }).catch(console.error);
        }
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

      // Route transfer to society's linked bank account (fire-and-forget)
      if (societyId && keyId && keySecret) {
        const fundAccountId = await getFundAccountId(supabase, "society", societyId);
        if (fundAccountId) {
          triggerRouteTransfer({
            paymentId: razorpay_payment_id,
            fundAccountId,
            amount: Math.round(shareAmount * 100),
            keyId,
            keySecret,
            notes: { type: "maintenance", expenseId, flatId },
          }).catch(console.error);
        }
      }

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
