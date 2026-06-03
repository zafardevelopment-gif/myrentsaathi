import { NextRequest, NextResponse } from "next/server";
import { assignUnitCharge } from "@/lib/billing/charge-service";

export const runtime = "nodejs";

// POST /api/billing/unit-charges — assign a recurring charge to a flat
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      flat_id: string; charge_type_id: string; tenant_id?: string | null;
      amount_override?: number | null; start_period: string; end_period?: string | null;
    };
    if (!body.flat_id || !body.charge_type_id || !body.start_period) {
      return NextResponse.json({ error: "flat_id, charge_type_id, start_period required" }, { status: 400 });
    }
    const result = await assignUnitCharge(body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
