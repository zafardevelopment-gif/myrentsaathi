/**
 * Pricing Data Layer
 * Server-side Supabase queries for dynamic pricing.
 * Public reads use anon key; admin writes use service-role key.
 */

import { supabase } from "./supabase";
import { supabaseAdmin } from "./supabase-admin";

// ─── TYPES ─────────────────────────────────────────────────

export type PricingPlan = {
  id: string;
  plan_type: "society" | "landlord";
  name: string;
  price: number;
  price_yearly: number | null;
  duration: string;
  property_limit: number | null;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  cta_text: string;
  description: string | null;
  badge_text: string | null;
  created_at: string;
  updated_at: string;
  features?: PricingFeature[];
};

export type PricingFeature = {
  id: string;
  plan_id: string;
  feature_text: string;
  is_highlight: boolean;
  sort_order: number;
};

export type PricingPlanInput = Omit<PricingPlan, "id" | "created_at" | "updated_at" | "features">;
export type PricingFeatureInput = Omit<PricingFeature, "id">;

// ─── PUBLIC READS (anon key) ────────────────────────────────

/**
 * Fetch all active plans for a given type, with features attached.
 * Used by the public Pricing component (homepage).
 */
export async function getActivePricingPlans(
  planType: "society" | "landlord"
): Promise<PricingPlan[]> {
  const { data: plans, error: plansError } = await supabase
    .from("pricing_plans")
    .select("*")
    .eq("plan_type", planType)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (plansError) throw plansError;
  if (!plans || plans.length === 0) return [];

  const planIds = plans.map((p) => p.id);

  const { data: features, error: featuresError } = await supabase
    .from("pricing_features")
    .select("*")
    .in("plan_id", planIds)
    .order("sort_order", { ascending: true });

  if (featuresError) throw featuresError;

  return plans.map((plan) => ({
    ...plan,
    features: (features || []).filter((f) => f.plan_id === plan.id),
  })) as PricingPlan[];
}

// ─── ADMIN READS (anon key — readable by superadmin UI) ───

/**
 * Fetch ALL plans (including inactive) for admin panel.
 */
export async function getAllPricingPlans(): Promise<PricingPlan[]> {
  const { data: plans, error: plansError } = await supabase
    .from("pricing_plans")
    .select("*")
    .order("plan_type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (plansError) throw plansError;
  if (!plans || plans.length === 0) return [];

  const planIds = plans.map((p) => p.id);

  const { data: features, error: featuresError } = await supabase
    .from("pricing_features")
    .select("*")
    .in("plan_id", planIds)
    .order("sort_order", { ascending: true });

  if (featuresError) throw featuresError;

  return plans.map((plan) => ({
    ...plan,
    features: (features || []).filter((f) => f.plan_id === plan.id),
  })) as PricingPlan[];
}

export async function getPricingPlanById(id: string): Promise<PricingPlan | null> {
  const { data: plan, error } = await supabase
    .from("pricing_plans")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!plan) return null;

  const { data: features, error: featuresError } = await supabase
    .from("pricing_features")
    .select("*")
    .eq("plan_id", id)
    .order("sort_order", { ascending: true });

  if (featuresError) throw featuresError;

  return { ...plan, features: features || [] } as PricingPlan;
}

// ─── ADMIN WRITES (service-role key) ───────────────────────

export async function createPricingPlan(input: PricingPlanInput): Promise<PricingPlan> {
  const { data, error } = await supabaseAdmin
    .from("pricing_plans")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as PricingPlan;
}

export async function updatePricingPlan(
  id: string,
  input: Partial<PricingPlanInput>
): Promise<PricingPlan> {
  const { data, error } = await supabaseAdmin
    .from("pricing_plans")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as PricingPlan;
}

export async function deletePricingPlan(id: string): Promise<void> {
  // pricing_features cascade-deletes automatically
  const { error } = await supabaseAdmin
    .from("pricing_plans")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function togglePlanActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from("pricing_plans")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw error;
}

export async function togglePlanPopular(id: string, isPopular: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from("pricing_plans")
    .update({ is_popular: isPopular })
    .eq("id", id);

  if (error) throw error;
}

export async function reorderPlan(id: string, sortOrder: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("pricing_plans")
    .update({ sort_order: sortOrder })
    .eq("id", id);

  if (error) throw error;
}

// ─── FEATURE WRITES ────────────────────────────────────────

export async function addFeatureToPlan(input: PricingFeatureInput): Promise<PricingFeature> {
  const { data, error } = await supabaseAdmin
    .from("pricing_features")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as PricingFeature;
}

export async function updateFeature(
  id: string,
  input: Partial<PricingFeatureInput>
): Promise<PricingFeature> {
  const { data, error } = await supabaseAdmin
    .from("pricing_features")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as PricingFeature;
}

export async function deleteFeature(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("pricing_features")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function replacePlanFeatures(
  planId: string,
  features: { feature_text: string; is_highlight: boolean; sort_order: number }[]
): Promise<void> {
  // Delete existing, re-insert fresh
  const { error: delError } = await supabaseAdmin
    .from("pricing_features")
    .delete()
    .eq("plan_id", planId);

  if (delError) throw delError;

  if (features.length === 0) return;

  const { error: insError } = await supabaseAdmin
    .from("pricing_features")
    .insert(features.map((f) => ({ ...f, plan_id: planId })));

  if (insError) throw insError;
}
