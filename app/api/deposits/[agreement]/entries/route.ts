import { NextRequest, NextResponse } from "next/server";
import { addDepositEntry } from "@/lib/billing/deposit-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ agreement: string }> };

// POST /api/deposits/[agreement]/entries — deduction / interest / refund / adjustment
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { agreement } = await ctx.params;
    const body = (await request.json()) as {
      entry_type: "collected" | "deduction" | "interest" | "refund" | "adjustment" | "forfeit";
      amount: number; reason?: string; linked_invoice_id?: string | null; created_by?: string | null;
    };
    if (!body.entry_type || body.amount == null) {
      return NextResponse.json({ error: "entry_type and amount required" }, { status: 400 });
    }
    const res = await addDepositEntry({
      agreement_id: agreement, entry_type: body.entry_type, amount: body.amount,
      reason: body.reason ?? null, linked_invoice_id: body.linked_invoice_id ?? null, created_by: body.created_by ?? null,
    });
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json(res, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
