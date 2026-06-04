import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// Best-effort delete of a row set; ignores "table/column doesn't exist" so one
// missing dependent table never aborts the whole cleanup.
async function tryDelete(table: string, column: string, value: string) {
  try {
    await supabaseAdmin.from(table).delete().eq(column, value);
  } catch {
    /* table/column may not exist in this deployment — ignore */
  }
}

// DELETE /api/superadmin/users/[id] — permanently remove a user + their data.
// Refuses to delete a superadmin. Used for test-account cleanup.
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    const { data: user } = await supabaseAdmin
      .from("users").select("id, role, full_name").eq("id", id).maybeSingle();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.role === "superadmin") {
      return NextResponse.json({ error: "Cannot delete a Super Admin account" }, { status: 403 });
    }

    // ── Collect ids the user owns so we can cascade their data ──
    const { data: ownedFlats } = await supabaseAdmin.from("flats").select("id").eq("owner_id", id);
    const flatIds = (ownedFlats ?? []).map((f) => f.id);

    const { data: tenantRows } = await supabaseAdmin.from("tenants").select("id").eq("user_id", id);
    const tenantIds = (tenantRows ?? []).map((t) => t.id);

    // ── Delete leaf/dependent data first (best-effort) ──
    // Payments & ledger tied to this tenant
    for (const tid of tenantIds) {
      await tryDelete("rent_payments", "tenant_id", tid);
      await tryDelete("society_due_payments", "tenant_id", tid);
    }
    // Invoices addressed to this user (line items/payments cascade via their own FKs)
    await tryDelete("invoice_payments", "razorpay_order_id", id); // no-op guard
    await tryDelete("invoices", "recipient_user_id", id);

    // Things the user created / uploaded (RESTRICT FKs would otherwise block)
    await tryDelete("documents", "uploaded_by", id);
    await tryDelete("notices", "created_by", id);
    await tryDelete("tickets", "created_by", id);
    await tryDelete("tickets", "raised_by", id);
    await tryDelete("polls", "created_by", id);
    await tryDelete("notification_queue", "recipient_user_id", id);
    await tryDelete("bank_accounts", "user_id", id);
    await tryDelete("bank_accounts", "entity_id", id);
    await tryDelete("subscriptions", "user_id", id);

    // Tenant records for this user
    await tryDelete("tenants", "user_id", id);

    // Flats owned by this user (cascades agreements/tenants/invoices via their FKs)
    for (const fid of flatIds) {
      await tryDelete("agreements", "flat_id", fid);
      await tryDelete("invoices", "flat_id", fid);
      await tryDelete("tenants", "flat_id", fid);
    }
    await tryDelete("flats", "owner_id", id);

    // ── Finally, the user ──
    const { error } = await supabaseAdmin.from("users").delete().eq("id", id);
    if (error) {
      return NextResponse.json({
        error: `Could not delete — user still has linked records. ${error.message}`,
      }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[superadmin/users DELETE]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
