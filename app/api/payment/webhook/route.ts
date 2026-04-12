import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

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
      };
    };

    const { event: eventType, payload } = event;
    const payment = payload.payment?.entity;

    if (!payment) {
      return NextResponse.json({ received: true });
    }

    const supabase = getSupabaseAdmin();

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
