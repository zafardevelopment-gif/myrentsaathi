import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export const runtime = "nodejs";

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      amount: number;          // in INR (will be converted to paise)
      flatId?: string;
      tenantId?: string;
      monthYear?: string;      // "YYYY-MM"
      type: "rent" | "maintenance";
      description?: string;
    };

    const { amount, flatId, tenantId, monthYear, type, description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ error: "Payment type is required" }, { status: 400 });
    }

    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert INR to paise
      currency: "INR",
      receipt: `${type}_${flatId ?? tenantId ?? "unknown"}_${monthYear ?? Date.now()}`.slice(0, 40),
      notes: {
        type,
        flatId: flatId ?? "",
        tenantId: tenantId ?? "",
        monthYear: monthYear ?? "",
        description: description ?? "",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payment/create-order] ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
