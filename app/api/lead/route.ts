import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { phone, source } = await req.json();
    if (!phone) return NextResponse.json({ ok: false }, { status: 400 });

    await supabaseAdmin.from("leads").insert({
      phone,
      source: source ?? "unknown",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Fail silently — don't block user
    return NextResponse.json({ ok: false });
  }
}
