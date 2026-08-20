/**
 * Applies rent hikes that were scheduled in advance (e.g. at tenant creation)
 * once their effective_date has arrived, and notifies the tenant.
 */

import { supabaseAdmin } from "../supabase-admin";
import { formatCurrency } from "../utils";
import { sendRentHikeNotice } from "../whatsapp";
import { emailRentHikeNotice } from "../email";

type Frequency = "monthly" | "quarterly" | "half_yearly" | "yearly";

function nextEffectiveDate(from: string, frequency: Frequency): string {
  const d = new Date(from + "T00:00:00Z");
  const monthsToAdd = { monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12 }[frequency];
  d.setUTCMonth(d.getUTCMonth() + monthsToAdd);
  return d.toISOString().slice(0, 10);
}

export async function applyScheduledHikes(today?: string): Promise<{ applied: number; errors: number }> {
  const todayStr = today ?? new Date().toISOString().slice(0, 10);
  let applied = 0;
  let errors = 0;

  const { data: hikes } = await supabaseAdmin
    .from("rent_hike_history")
    .select("id, flat_id, old_rent, new_rent, hike_type, hike_value, effective_date, created_by, recurrence_frequency")
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

      // Recurring hike: spawn the next occurrence off the newly-applied rent.
      if (hike.recurrence_frequency) {
        const frequency = hike.recurrence_frequency as Frequency;
        const nextEffective = nextEffectiveDate(hike.effective_date, frequency);
        const nextNewRent = hike.hike_type === "percentage"
          ? Math.round(hike.new_rent * (1 + Number(hike.hike_value) / 100))
          : Math.round(hike.new_rent + Number(hike.hike_value));
        await supabaseAdmin.from("rent_hike_history").insert({
          flat_id: hike.flat_id,
          old_rent: hike.new_rent,
          new_rent: nextNewRent,
          hike_type: hike.hike_type,
          hike_value: hike.hike_value,
          effective_date: nextEffective,
          created_by: hike.created_by,
          status: "scheduled",
          recurrence_frequency: frequency,
          recurrence_parent_id: hike.id,
        });
      }

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
          .select("phone, email, full_name, notifications_enabled")
          .eq("id", flat.current_tenant_id)
          .maybeSingle();
        const notifyOk = tenantUser?.notifications_enabled !== false;

        if (notifyOk && tenantUser?.phone) {
          await sendRentHikeNotice({
            phone: tenantUser.phone,
            fullName: tenantUser.full_name ?? "Tenant",
            flatNumber: flatLabel,
            currentRent: hike.old_rent,
            newRent: hike.new_rent,
            effectiveFrom: effectiveDateStr,
          }).catch(() => {});
        }
        if (notifyOk && tenantUser?.email) {
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
