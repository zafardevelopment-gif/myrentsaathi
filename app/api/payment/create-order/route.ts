import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getRazorpayKeys } from "@/lib/platform-config";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      amount: number;
      flatId?: string;
      tenantId?: string;
      monthYear?: string;
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

    const { keyId, keySecret } = await getRazorpayKeys();
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay keys not configured. Super Admin settings mein configure karen." },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
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
      keyId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payment/create-order] ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
