import { NextRequest, NextResponse } from "next/server";
import { resolveBillerScope, type ScopeUser } from "@/lib/billing/scope";
import { getReadingSheet, upsertReading } from "@/lib/billing/meter-service";

export const runtime = "nodejs";

// GET /api/meters/readings?userId=&role=&period=YYYY-MM — reading sheet (prefilled previous)
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId");
    const role = sp.get("role");
    const period = sp.get("period");
    if (!userId || !role || !period) return NextResponse.json({ error: "userId, role, period required" }, { status: 400 });
    const scope = await resolveBillerScope({ id: userId, role });
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });
    return NextResponse.json({ sheet: await getReadingSheet(scope, period) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// POST /api/meters/readings  { meter_id, billing_period, current_reading, is_meter_reset?, reading_by? }
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      meter_id: string; billing_period: string; current_reading: number;
      is_meter_reset?: boolean; reading_by?: string | null;
    };
    if (!body.meter_id || !body.billing_period || body.current_reading == null) {
      return NextResponse.json({ error: "meter_id, billing_period, current_reading required" }, { status: 400 });
    }
    const result = await upsertReading(body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
