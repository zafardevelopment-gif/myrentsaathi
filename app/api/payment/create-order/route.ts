import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getRazorpayKeys } from "@/lib/platform-config";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// Look up an active Route linked account for the payee entity.
async function getLinkedAccountId(entityType: "society" | "landlord", entityId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("bank_accounts")
    .select("razorpay_linked_account_id, route_status")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();
  // Only route to accounts that Razorpay has at least created (not failed/pending).
  if (data?.razorpay_linked_account_id && data.route_status !== "failed") {
    return data.razorpay_linked_account_id as string;
  }
  return null;
}

// Resolve the flat's owner (landlord user id) + society id from tenant or flat.
async function resolvePayee(tenantId?: string, flatId?: string): Promise<{ landlordId: string | null; societyId: string | null }> {
  let resolvedFlatId = flatId ?? null;
  if (!resolvedFlatId && tenantId) {
    const { data: t } = await supabaseAdmin.from("tenants").select("flat_id").eq("id", tenantId).maybeSingle();
    resolvedFlatId = t?.flat_id ?? null;
  }
  if (!resolvedFlatId) return { landlordId: null, societyId: null };
  const { data: flat } = await supabaseAdmin.from("flats").select("owner_id, society_id").eq("id", resolvedFlatId).maybeSingle();
  return { landlordId: flat?.owner_id ?? null, societyId: flat?.society_id ?? null };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      amount: number;
      flatId?: string;
      tenantId?: string;
      monthYear?: string;
      type: "rent" | "maintenance" | "subscription";
      description?: string;
      // Route payee (auto-split target)
      landlordId?: string;
      societyId?: string;
    };

    const { amount, flatId, tenantId, monthYear, type, description, landlordId, societyId } = body;

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
    const amountPaise = Math.round(amount * 100);

    // Resolve Route auto-split target. Subscriptions go to the platform (no transfer).
    let linkedAccountId: string | null = null;
    let payeeLandlordId = landlordId ?? null;
    let payeeSocietyId = societyId ?? null;
    if (type === "rent") {
      if (!payeeLandlordId) {
        const r = await resolvePayee(tenantId, flatId);
        payeeLandlordId = r.landlordId;
      }
      if (payeeLandlordId) linkedAccountId = await getLinkedAccountId("landlord", payeeLandlordId);
    } else if (type === "maintenance") {
      if (!payeeSocietyId) {
        const r = await resolvePayee(tenantId, flatId);
        payeeSocietyId = r.societyId;
      }
      if (payeeSocietyId) linkedAccountId = await getLinkedAccountId("society", payeeSocietyId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderPayload: any = {
      amount: amountPaise,
      currency: "INR",
      receipt: `${type}_${flatId ?? tenantId ?? "unknown"}_${monthYear ?? Date.now()}`.slice(0, 40),
      notes: {
        type,
        flatId: flatId ?? "",
        tenantId: tenantId ?? "",
        monthYear: monthYear ?? "",
        description: description ?? "",
        landlordId: payeeLandlordId ?? "",
        societyId: payeeSocietyId ?? "",
      },
    };

    // Route: auto-split the full amount to the payee's linked account at capture.
    if (linkedAccountId) {
      orderPayload.transfers = [
        {
          account: linkedAccountId,
          amount: amountPaise,
          currency: "INR",
          notes: { type, ...(monthYear ? { monthYear } : {}) },
          on_hold: false,
        },
      ];
    }

    const order = await razorpay.orders.create(orderPayload);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      routed: !!linkedAccountId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payment/create-order] ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
