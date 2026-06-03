import { NextRequest, NextResponse } from "next/server";
import { createNote, cancelInvoiceWithCreditNote } from "@/lib/billing/notes-service";
import type { DraftLineItem } from "@/lib/billing/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/invoices/[id]/notes — issue a credit/debit note (or full-cancel credit note)
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      note_type: "credit" | "debit"; reason?: string; lines?: DraftLineItem[];
      cancel_invoice?: boolean; created_by?: string | null;
    };

    if (body.cancel_invoice) {
      const res = await cancelInvoiceWithCreditNote(id, body.reason ?? "Invoice cancelled", body.created_by ?? null);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json(res, { status: 201 });
    }

    if (!body.note_type || !body.lines?.length) {
      return NextResponse.json({ error: "note_type and lines required" }, { status: 400 });
    }
    const res = await createNote({ invoice_id: id, note_type: body.note_type, reason: body.reason, lines: body.lines, created_by: body.created_by ?? null });
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json(res, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
