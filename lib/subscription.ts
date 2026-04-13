/**
 * Subscription management layer
 * Handles free trial + paid plan activation/checking for society_admin & landlord
 */

import { supabase } from "./supabase";

export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled" | "none";

export interface Subscription {
  id: string;
  user_id: string;
  society_id: string | null;
  plan_type: string;
  plan_name: string;
  plan_price: number;
  status: SubscriptionStatus;
  trial_days: number;
  starts_at: string;
  expires_at: string;
  activated_at: string | null;
  created_at: string;
}

// ── Get free trial days from platform settings ────────────

export async function getFreeTiralDays(): Promise<number> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "free_trial_days")
    .maybeSingle();
  return data ? parseInt(data.value, 10) || 30 : 30;
}

export async function setFreeTrialDays(days: number): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("platform_settings")
    .upsert({ key: "free_trial_days", value: String(days) }, { onConflict: "key" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Get active subscription for a user ───────────────────

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Subscription | null;
}

// ── Check if subscription is currently valid ─────────────
// Returns: 'active' | 'trial' = can use | 'expired' | 'none' = block access

export function isSubscriptionValid(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status === "expired" || sub.status === "cancelled") return false;
  // Check expiry date
  const now = new Date();
  const expires = new Date(sub.expires_at);
  if (now > expires) return false;
  return true;
}

export function getSubscriptionBlockReason(sub: Subscription | null): string {
  if (!sub) return "no_plan";
  const now = new Date();
  const expires = new Date(sub.expires_at);
  if (now > expires || sub.status === "expired") return "expired";
  if (sub.status === "cancelled") return "cancelled";
  return "none";
}

// ── Create free trial subscription after signup ──────────

export async function createFreeTrialSubscription(params: {
  userId: string;
  societyId?: string | null;
  planType: "society" | "landlord";
  planName: string;
  planPrice: number;
  trialDays: number;
}): Promise<{ success: boolean; error?: string; subscription?: Subscription }> {
  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + params.trialDays);

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: params.userId,
      society_id: params.societyId ?? null,
      plan_type: params.planType,
      plan_name: params.planName,
      plan_price: params.planPrice,
      status: "trial",
      trial_days: params.trialDays,
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Failed to create trial." };
  return { success: true, subscription: data as Subscription };
}

// ── Activate a paid plan (extends expiry by 30 days from now) ──

export async function activatePaidPlan(params: {
  userId: string;
  societyId?: string | null;
  planType: "society" | "landlord";
  planName: string;
  planPrice: number;
  durationDays?: number; // default 30
}): Promise<{ success: boolean; error?: string; subscription?: Subscription }> {
  const durationDays = params.durationDays ?? 30;
  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + durationDays);

  // Check if existing subscription exists → update it
  const existing = await getUserSubscription(params.userId);

  if (existing) {
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        plan_name: params.planName,
        plan_price: params.planPrice,
        status: "active",
        starts_at: now.toISOString(),
        expires_at: expires.toISOString(),
        activated_at: now.toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) return { success: false, error: error?.message ?? "Failed to activate plan." };
    return { success: true, subscription: data as Subscription };
  }

  // Create new active subscription
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: params.userId,
      society_id: params.societyId ?? null,
      plan_type: params.planType,
      plan_name: params.planName,
      plan_price: params.planPrice,
      status: "active",
      trial_days: 0,
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
      activated_at: now.toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Failed to create subscription." };
  return { success: true, subscription: data as Subscription };
}

// ── Mark subscription as expired (called by cron or on login check) ──

export async function markSubscriptionExpired(subscriptionId: string): Promise<void> {
  await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("id", subscriptionId);
}

// ── Format days remaining ────────────────────────────────

export function getDaysRemaining(sub: Subscription): number {
  const now = new Date();
  const expires = new Date(sub.expires_at);
  const diff = expires.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
