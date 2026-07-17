import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { page, userId, role, userAgent } = await req.json();
    if (!page) return NextResponse.json({ ok: false }, { status: 400 });

    const city = req.headers.get("x-vercel-ip-city");
    const region = req.headers.get("x-vercel-ip-country-region");
    const country = req.headers.get("x-vercel-ip-country");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    await supabaseAdmin.from("page_visits").insert({
      page,
      user_id: userId ?? null,
      role: role ?? "guest",
      user_agent: userAgent ?? null,
      ip_address: ip,
      city: city ? decodeURIComponent(city) : null,
      region: region ? decodeURIComponent(region) : null,
      country: country ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
