import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { phone, source } = await req.json();
    if (!phone) return NextResponse.json({ ok: false }, { status: 400 });

    await supabase.from("leads").insert({
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
