import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Keys we allow to be read/written via this endpoint
const ALLOWED_KEYS = [
  "razorpay_key_id",
  "razorpay_key_secret",
  "razorpay_webhook_secret",
  "whatsapp_access_token",
  "whatsapp_phone_number_id",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_password",
  "smtp_from_email",
  "smtp_from_name",
];

// Keys that are sensitive — mask them in GET responses
const SENSITIVE_KEYS = [
  "razorpay_key_secret",
  "razorpay_webhook_secret",
  "whatsapp_access_token",
  "smtp_password",
];

function mask(value: string): string {
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("platform_config")
      .select("key, value")
      .in("key", ALLOWED_KEYS);

    if (error) throw error;

    const config: Record<string, string> = {};
    for (const row of data ?? []) {
      config[row.key] = SENSITIVE_KEYS.includes(row.key)
        ? mask(row.value ?? "")
        : (row.value ?? "");
    }

    return NextResponse.json({ success: true, config });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updates: { key: string; value: string }[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      if (typeof value !== "string") continue;
      // Skip masked placeholder values — user didn't change these fields
      if (value.includes("••••")) continue;
      updates.push({ key, value });
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    // Upsert each key
    const { error } = await supabaseAdmin.from("platform_config").upsert(
      updates.map((u) => ({ key: u.key, value: u.value, updated_at: new Date().toISOString() })),
      { onConflict: "key" }
    );

    if (error) throw error;

    return NextResponse.json({ success: true, updated: updates.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
