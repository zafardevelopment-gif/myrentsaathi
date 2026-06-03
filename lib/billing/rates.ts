/**
 * Charge rate resolution + consumption pricing (§6). Pure pricing fn +
 * a versioned, scope-aware reader for charge_rate_config.
 */

import { supabaseAdmin } from "../supabase-admin";
import { round2 } from "./money";
import type { BillerScope } from "./scope";
import { scopeColumn } from "./scope";

export type Slab = { from: number; to: number | null; rate: number };
export type ChargeRate = {
  rate_type: "flat" | "slab" | "fixed";
  flat_rate: number | null;
  fixed_amount: number | null;
  slabs: Slab[] | null;
};

/** Price `units` of consumption against a rate config (flat or slab). */
export function priceConsumption(rate: ChargeRate, units: number): number {
  if (rate.rate_type === "fixed") return round2(rate.fixed_amount ?? 0);
  if (rate.rate_type === "flat") return round2(units * (rate.flat_rate ?? 0));
  // slab: each slab applies its rate to the units that fall in its band
  let remaining = Math.max(units, 0);
  let amount = 0;
  let prevTo = 0;
  for (const s of (rate.slabs ?? []).slice().sort((a, b) => a.from - b.from)) {
    const upper = s.to ?? Infinity;
    const band = Math.max(Math.min(remaining + prevTo, upper) - Math.max(prevTo, s.from), 0);
    if (band > 0) amount += band * s.rate;
    prevTo = upper;
    if (upper !== Infinity) remaining = Math.max(units - upper, 0);
    if (upper === Infinity) break;
  }
  return round2(amount);
}

/** Resolve the active charge rate for a charge kind on a date (biller → none). */
export async function getActiveChargeRate(
  scope: BillerScope,
  chargeKind: string,
  onDate: string,
): Promise<ChargeRate | null> {
  const { column, value } = scopeColumn(scope);
  const { data } = await supabaseAdmin
    .from("charge_rate_config")
    .select("rate_type, flat_rate, fixed_amount, slabs")
    .eq(column, value)
    .eq("charge_kind", chargeKind)
    .eq("is_active", true)
    .lte("effective_from", onDate)
    .or(`effective_to.is.null,effective_to.gte.${onDate}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ChargeRate) ?? null;
}
