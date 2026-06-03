import { NextRequest, NextResponse } from "next/server";
import { getDepositLedger, seedDepositFromAgreement } from "@/lib/billing/deposit-service";

export const runtime = "nodejs";

// GET /api/deposits?agreement=ID — ledger + current balance
export async function GET(request: NextRequest) {
  try {
    const agreement = request.nextUrl.searchParams.get("agreement");
    if (!agreement) return NextResponse.json({ error: "agreement required" }, { status: 400 });
    return NextResponse.json(await getDepositLedger(agreement));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// POST /api/deposits  { agreement_id, seed?:true } — seed initial collected entry from the agreement
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { agreement_id: string; created_by?: string | null };
    if (!body.agreement_id) return NextResponse.json({ error: "agreement_id required" }, { status: 400 });
    const res = await seedDepositFromAgreement(body.agreement_id, body.created_by ?? null);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
