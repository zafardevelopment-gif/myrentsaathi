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

// Best-effort: null out a referencing column (for FKs that use ON ... RESTRICT
// but allow NULL, e.g. flats.current_tenant_id pointing at the user).
async function tryNull(table: string, column: string, value: string) {
  try {
    await supabaseAdmin.from(table).update({ [column]: null }).eq(column, value);
  } catch {
    /* ignore */
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

    // ── Collect ids the user owns ──
    const { data: ownedFlats } = await supabaseAdmin.from("flats").select("id").eq("owner_id", id);
    const flatIds = (ownedFlats ?? []).map((f) => f.id);

    // Tenant rows for this user, PLUS tenant rows living in this user's flats.
    const { data: tenantByUser } = await supabaseAdmin.from("tenants").select("id").eq("user_id", id);
    let tenantIds = (tenantByUser ?? []).map((t) => t.id);
    for (const fid of flatIds) {
      const { data: tf } = await supabaseAdmin.from("tenants").select("id").eq("flat_id", fid);
      tenantIds = tenantIds.concat((tf ?? []).map((t) => t.id));
    }
    tenantIds = [...new Set(tenantIds)];

    // Meter ids for owned flats (meter_readings reference these).
    let meterIds: string[] = [];
    for (const fid of flatIds) {
      const { data: m } = await supabaseAdmin.from("meters").select("id").eq("flat_id", fid);
      meterIds = meterIds.concat((m ?? []).map((x) => x.id));
    }

    // ── Detach FK references that block deletion (nullable RESTRICT cols) ──
    await tryNull("flats", "current_tenant_id", id);
    for (const tid of tenantIds) await tryNull("flats", "current_tenant_id", tid);

    // ── Purge every tenant's dependent rows (payments, invoices, agreements) ──
    for (const tid of tenantIds) {
      await tryDelete("rent_payments", "tenant_id", tid);
      await tryDelete("society_due_payments", "tenant_id", tid);
      await tryDelete("invoices", "tenant_id", tid);
      await tryDelete("agreements", "tenant_id", tid);
    }

    // ── Purge per-flat dependents (meters → readings, charges, parking, etc.) ──
    for (const mid of meterIds) await tryDelete("meter_readings", "meter_id", mid);
    for (const fid of flatIds) {
      await tryDelete("meter_readings", "flat_id", fid);
      await tryDelete("meters", "flat_id", fid);
      await tryDelete("rent_payments", "flat_id", fid);
      await tryDelete("society_due_payments", "flat_id", fid);
      await tryDelete("unit_recurring_charges", "flat_id", fid);
      await tryDelete("rent_hike_history", "flat_id", fid);
      await tryDelete("vehicle_parking_passes", "flat_id", fid);
      await tryDelete("vehicles", "flat_id", fid);
      await tryDelete("tickets", "flat_id", fid);
      await tryDelete("invoices", "flat_id", fid);
      await tryDelete("agreements", "flat_id", fid);
      await tryDelete("tenants", "flat_id", fid);
    }

    // ── User-owned / created records ──
    await tryDelete("agreements", "landlord_id", id);
    await tryDelete("invoices", "recipient_user_id", id);
    await tryDelete("documents", "uploaded_by", id);
    await tryDelete("notices", "created_by", id);
    await tryDelete("tickets", "created_by", id);
    await tryDelete("tickets", "raised_by", id);
    await tryDelete("polls", "created_by", id);
    await tryDelete("notification_queue", "recipient_user_id", id);
    await tryDelete("bank_accounts", "user_id", id);
    await tryDelete("bank_accounts", "entity_id", id);
    await tryDelete("subscriptions", "user_id", id);

    // Tenant records for this user (and any leftover in owned flats)
    await tryDelete("tenants", "user_id", id);

    // Finally the flats themselves
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
