import { NextRequest, NextResponse } from "next/server";
import { resolveBillerScope, type ScopeUser } from "@/lib/billing/scope";
import { listMeters, createMeter } from "@/lib/billing/meter-service";

export const runtime = "nodejs";

// GET /api/meters?userId=&role=
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId");
    const role = sp.get("role");
    if (!userId || !role) return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    const scope = await resolveBillerScope({ id: userId, role });
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });
    return NextResponse.json({ meters: await listMeters(scope) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// POST /api/meters  { user, flat_id?, scope?, meter_number?, meter_type?, unit_label?, initial_reading? }
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      user: ScopeUser; flat_id?: string | null; scope?: "unit" | "common";
      meter_number?: string; meter_type?: string; unit_label?: string; initial_reading?: number;
    };
    if (!body.user?.id || !body.user?.role) return NextResponse.json({ error: "user {id, role} required" }, { status: 400 });
    const scope = await resolveBillerScope(body.user);
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });
    const result = await createMeter(scope, body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
