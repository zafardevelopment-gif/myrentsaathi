// Promo codes are persisted in Supabase table `promo_codes` (migrations/promo-codes.sql).
// This file holds shared types + validation logic used by both the checkout page
// and the superadmin/promos page.

import { supabase } from "@/lib/supabase";

export type PromoType = "percentage" | "fixed";
export type PromoStatus = "active" | "expired" | "disabled";

export type Promo = {
  code: string;
  type: PromoType;
  value: number;
  maxUses: number;
  used: number;
  minPlan: string;
  validTill: string;
  status: PromoStatus;
  savings: number;
  createdBy: string;
  revenue: number;
};

type PromoRow = {
  code: string;
  type: PromoType;
  value: number;
  max_uses: number;
  used: number;
  min_plan: string;
  valid_till: string;
  status: PromoStatus;
  savings: number;
  created_by: string;
  revenue: number;
};

function rowToPromo(row: PromoRow): Promo {
  return {
    code: row.code,
    type: row.type,
    value: Number(row.value),
    maxUses: row.max_uses,
    used: row.used,
    minPlan: row.min_plan,
    validTill: row.valid_till,
    status: row.status,
    savings: Number(row.savings),
    createdBy: row.created_by,
    revenue: Number(row.revenue),
  };
}

export async function fetchPromos(): Promise<Promo[]> {
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as PromoRow[]).map(rowToPromo);
}

export async function createPromo(input: {
  code: string;
  type: PromoType;
  value: number;
  maxUses: number;
  minPlan: string;
  validTill: string;
  createdBy: string;
}): Promise<Promo> {
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code: input.code,
      type: input.type,
      value: input.value,
      max_uses: input.maxUses,
      min_plan: input.minPlan,
      valid_till: input.validTill,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToPromo(data as PromoRow);
}

export async function updatePromo(
  code: string,
  input: {
    type: PromoType;
    value: number;
    maxUses: number;
    minPlan: string;
    validTill: string;
    createdBy: string;
  }
): Promise<Promo> {
  const { data, error } = await supabase
    .from("promo_codes")
    .update({
      type: input.type,
      value: input.value,
      max_uses: input.maxUses,
      min_plan: input.minPlan,
      valid_till: input.validTill,
      created_by: input.createdBy,
      updated_at: new Date().toISOString(),
    })
    .eq("code", code)
    .select()
    .single();
  if (error) throw error;
  return rowToPromo(data as PromoRow);
}

export async function setPromoStatus(code: string, status: PromoStatus): Promise<void> {
  const { error } = await supabase
    .from("promo_codes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("code", code);
  if (error) throw error;
}

export type PromoResult = { type: "percent" | "flat"; value: number; label: string };

export function validatePromo(
  code: string,
  allPromos: Promo[]
): { valid: true; promo: PromoResult } | { valid: false; error: string } {
  const found = allPromos.find((p) => p.code === code.trim().toUpperCase());
  if (!found) return { valid: false, error: "Invalid promo code." };
  if (found.status === "expired") return { valid: false, error: "Yeh promo code expire ho chuka hai." };
  if (found.status === "disabled") return { valid: false, error: "Yeh promo code abhi active nahi hai." };
  if (new Date() > new Date(found.validTill)) return { valid: false, error: "Yeh promo code expire ho chuka hai." };
  if (found.used >= found.maxUses) return { valid: false, error: "Yeh promo code ki limit khatam ho gayi hai." };
  const type: "percent" | "flat" = found.type === "percentage" ? "percent" : "flat";
  const label = type === "percent" ? `${found.value}% off` : `₹${found.value} flat discount`;
  return { valid: true, promo: { type, value: found.value, label } };
}

export function applyPromo(price: number, promo: PromoResult | null): number {
  if (!promo) return price;
  if (promo.type === "percent") return Math.round(price * (1 - promo.value / 100));
  return Math.max(0, price - promo.value);
}
