import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Keys allowed to be revealed in full via this endpoint.
const REVEALABLE_KEYS = [
  "razorpay_key_secret",
  "razorpay_webhook_secret",
  "whatsapp_access_token",
  "smtp_password",
];

// POST /api/platform-config/reveal — returns the real (unmasked) value of a
// single sensitive platform_config key, for the superadmin settings UI.
export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();

    if (typeof key !== "string" || !REVEALABLE_KEYS.includes(key)) {
      return NextResponse.json({ success: false, error: "Invalid key" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("platform_config")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, value: data?.value ?? "" });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
