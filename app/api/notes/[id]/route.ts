import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/notes/[id] — credit/debit note header + items
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { data: note } = await supabaseAdmin.from("adjustment_notes").select("*").eq("id", id).maybeSingle();
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    const { data: items } = await supabaseAdmin.from("adjustment_note_items").select("*").eq("note_id", id).order("sort_order");
    return NextResponse.json({ note, items: items ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
