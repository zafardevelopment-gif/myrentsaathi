/**
 * Applies rent hikes that were scheduled in advance (e.g. at tenant creation)
 * once their effective_date has arrived, and notifies the tenant.
 */

import { supabaseAdmin } from "../supabase-admin";
import { formatCurrency } from "../utils";
import { sendRentHikeNotice } from "../whatsapp";
import { emailRentHikeNotice } from "../email";

export async function applyScheduledHikes(today?: string): Promise<{ applied: number; errors: number }> {
  const todayStr = today ?? new Date().toISOString().slice(0, 10);
  let applied = 0;
  let errors = 0;

  const { data: hikes } = await supabaseAdmin
    .from("rent_hike_history")
    .select("id, flat_id, old_rent, new_rent, effective_date, created_by")
    .eq("status", "scheduled")
    .lte("effective_date", todayStr);

  for (const hike of hikes ?? []) {
    try {
      const { data: flat } = await supabaseAdmin
        .from("flats")
        .select("flat_number, block, society_id, current_tenant_id")
        .eq("id", hike.flat_id)
        .maybeSingle();
      if (!flat) continue;

      await supabaseAdmin.from("flats").update({ monthly_rent: hike.new_rent }).eq("id", hike.flat_id);
      await supabaseAdmin.from("rent_hike_history").update({ status: "applied" }).eq("id", hike.id);

      const flatLabel = `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}`;
      const effectiveDateStr = new Date(hike.effective_date).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      });

      await supabaseAdmin.from("notices").insert({
        created_by: hike.created_by,
        ...(flat.society_id ? { society_id: flat.society_id } : {}),
        flat_id: hike.flat_id,
        title: `Rent Hike Notice — Flat ${flatLabel}`,
        content: `Dear Tenant, please note that your monthly rent has increased from ${formatCurrency(hike.old_rent)} to ${formatCurrency(hike.new_rent)} effective ${effectiveDateStr}. Please plan accordingly.`,
        notice_type: "financial",
        target_audience: "tenants",
      });

      if (flat.current_tenant_id) {
        const { data: tenantUser } = await supabaseAdmin
          .from("users")
          .select("phone, email, full_name")
          .eq("id", flat.current_tenant_id)
          .maybeSingle();

        if (tenantUser?.phone) {
          await sendRentHikeNotice({
            phone: tenantUser.phone,
            fullName: tenantUser.full_name ?? "Tenant",
            flatNumber: flatLabel,
            currentRent: hike.old_rent,
            newRent: hike.new_rent,
            effectiveFrom: effectiveDateStr,
          }).catch(() => {});
        }
        if (tenantUser?.email) {
          await emailRentHikeNotice({
            to: tenantUser.email,
            tenantName: tenantUser.full_name ?? "Tenant",
            flatNumber: flatLabel,
            currentRent: hike.old_rent,
            newRent: hike.new_rent,
            effectiveFrom: effectiveDateStr,
          }).catch(() => {});
        }
      }

      applied++;
    } catch {
      errors++;
    }
  }

  return { applied, errors };
}
