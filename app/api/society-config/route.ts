import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_KEYS = [
  "razorpay_key_id",
  "razorpay_key_secret",
  "whatsapp_access_token",
  "whatsapp_phone_number_id",
];

const SENSITIVE_KEYS = ["razorpay_key_secret", "whatsapp_access_token"];

function mask(value: string): string {
  if (!value || value.length <= 8) return value ? "••••••••" : "";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}

export async function GET(req: NextRequest) {
  const societyId = req.nextUrl.searchParams.get("societyId");
  if (!societyId) return NextResponse.json({ success: false, error: "societyId required" }, { status: 400 });

  try {
    const { data } = await supabaseAdmin
      .from("society_config")
      .select("key, value")
      .eq("society_id", societyId)
      .in("key", ALLOWED_KEYS);

    const config: Record<string, string> = {};
    for (const row of data ?? []) {
      config[row.key] = SENSITIVE_KEYS.includes(row.key) ? mask(row.value ?? "") : (row.value ?? "");
    }
    return NextResponse.json({ success: true, config });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string>;
    const { societyId, ...fields } = body;

    if (!societyId) return NextResponse.json({ success: false, error: "societyId required" }, { status: 400 });

    const updates: { society_id: string; key: string; value: string; updated_at: string }[] = [];
    for (const [key, value] of Object.entries(fields)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      if (typeof value !== "string") continue;
      if (value.includes("••••")) continue;
      updates.push({ society_id: societyId, key, value, updated_at: new Date().toISOString() });
    }

    if (updates.length === 0) return NextResponse.json({ success: true, updated: 0 });

    const { error } = await supabaseAdmin
      .from("society_config")
      .upsert(updates, { onConflict: "society_id,key" });

    if (error) throw error;
    return NextResponse.json({ success: true, updated: updates.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
