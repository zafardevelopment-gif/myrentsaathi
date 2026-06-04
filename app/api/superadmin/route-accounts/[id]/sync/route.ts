import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getRazorpayKeys } from "@/lib/platform-config";

export const runtime = "nodejs";
export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string }> };

// Map Razorpay's live account activation status → our route_status enum.
function mapStatus(rzpStatus: string): string {
  switch (rzpStatus) {
    case "activated": return "activated";
    case "needs_clarification": return "needs_clarification";
    case "under_review":
    case "created": return "created";
    case "suspended":
    case "rejected": return "failed";
    default: return "created";
  }
}

// POST /api/superadmin/route-accounts/[id]/sync — fetch live status from
// Razorpay and update the stored route_status. Fixes app↔Razorpay mismatch.
export async function POST(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { data: bank } = await supabaseAdmin
      .from("bank_accounts").select("id, razorpay_linked_account_id").eq("id", id).maybeSingle();
    if (!bank) return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    if (!bank.razorpay_linked_account_id) {
      return NextResponse.json({ success: false, error: "No linked account to sync" }, { status: 400 });
    }

    const { keyId, keySecret } = await getRazorpayKeys();
    if (!keyId || !keySecret) return NextResponse.json({ success: false, error: "Razorpay not configured" }, { status: 500 });

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch(`https://api.razorpay.com/v2/accounts/${bank.razorpay_linked_account_id}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const msg = (data.error as Record<string, string> | undefined)?.description ?? "Razorpay lookup failed";
      return NextResponse.json({ success: false, error: msg }, { status: 502 });
    }

    const liveStatus = (data.activation_status as string) ?? (data.status as string) ?? "created";
    const mapped = mapStatus(liveStatus);

    await supabaseAdmin.from("bank_accounts").update({
      route_status: mapped,
      is_verified: mapped === "activated" || mapped === "created",
      route_error: mapped === "failed" ? (liveStatus) : null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    return NextResponse.json({ success: true, route_status: mapped, live: liveStatus });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
