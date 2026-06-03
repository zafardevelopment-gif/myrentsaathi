/**
 * Cron orchestration helpers (§8). Enumerates configured billers and runs a
 * job across all of them. Each biller must have a billing_profiles row to be
 * considered "set up enough to bill".
 */

import { supabaseAdmin } from "../supabase-admin";
import type { BillerScope } from "./scope";

/** Current billing period 'YYYY-MM'. */
export function currentPeriod(d: Date = new Date()): string {
  return d.toISOString().slice(0, 7);
}

/** All billers (society/landlord) that have a billing profile. */
export async function enumerateBillerScopes(): Promise<BillerScope[]> {
  const { data } = await supabaseAdmin
    .from("billing_profiles").select("entity_type, society_id, landlord_id");
  const scopes: BillerScope[] = [];
  for (const p of data ?? []) {
    if (p.entity_type === "society" && p.society_id) scopes.push({ kind: "society", societyId: p.society_id });
    else if (p.entity_type === "landlord" && p.landlord_id) scopes.push({ kind: "landlord", landlordId: p.landlord_id });
  }
  return scopes;
}

/** Verify a cron request carries the shared secret (Vercel injects it). */
export function isAuthorizedCron(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}
