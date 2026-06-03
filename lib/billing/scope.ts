/**
 * Billing scope resolution — the ONE place that decides "who is the biller".
 *
 * Every billing table carries society_id and/or landlord_id. A society admin
 * bills under their society; a landlord bills under their own user id. All
 * billing queries go through here so tenant-isolation logic lives in one spot
 * (see design doc §16). When the app moves to real RLS, only this file +
 * the policies change.
 *
 * Design ref: docs/billing-invoice-module-design.md §16, §3, Part III.
 */

import { supabase } from "../supabase";

// ─── TYPES ────────────────────────────────────────────────────

export type BillerScope =
  | { kind: "society"; societyId: string }
  | { kind: "landlord"; landlordId: string };

/** Minimal shape of the logged-in user we need to resolve scope. */
export type ScopeUser = {
  id: string;
  // Accepts BOTH the DB role ('society_admin','board_member') and the
  // MockAuthProvider-mapped app key ('admin','board','landlord').
  role: string;
};

const SOCIETY_ROLES = new Set(["society_admin", "admin", "board_member", "board"]);
const LANDLORD_ROLES = new Set(["landlord"]);

// ─── RESOLUTION ───────────────────────────────────────────────

/**
 * Resolve the billing scope for a logged-in user.
 * - society_admin / board_member → the society they administer (via society_members.role='admin')
 * - landlord                     → themselves (landlord_id = user id)
 * Returns null when no biller scope can be determined (e.g. a tenant).
 */
export async function resolveBillerScope(user: ScopeUser): Promise<BillerScope | null> {
  if (LANDLORD_ROLES.has(user.role)) {
    return { kind: "landlord", landlordId: user.id };
  }

  if (SOCIETY_ROLES.has(user.role)) {
    const { data } = await supabase
      .from("society_members")
      .select("society_id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (data?.society_id) return { kind: "society", societyId: data.society_id };

    // Fallback: any society membership (board member of one society)
    const { data: anyMembership } = await supabase
      .from("society_members")
      .select("society_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (anyMembership?.society_id) return { kind: "society", societyId: anyMembership.society_id };
  }

  return null;
}

// ─── QUERY HELPERS ────────────────────────────────────────────

/** The {column, value} a billing row must match for this scope. */
export function scopeColumn(scope: BillerScope): { column: "society_id" | "landlord_id"; value: string } {
  return scope.kind === "society"
    ? { column: "society_id", value: scope.societyId }
    : { column: "landlord_id", value: scope.landlordId };
}

/** Fields to stamp onto a new billing row so it is owned by this scope. */
export function scopeInsert(scope: BillerScope): { society_id: string | null; landlord_id: string | null } {
  return scope.kind === "society"
    ? { society_id: scope.societyId, landlord_id: null }
    : { society_id: null, landlord_id: scope.landlordId };
}

/**
 * Apply the scope filter to a Supabase query builder.
 * Usage: applyScope(supabase.from("invoices").select("*"), scope)
 */
export function applyScope<T extends { eq(column: string, value: string): T }>(query: T, scope: BillerScope): T {
  const { column, value } = scopeColumn(scope);
  return query.eq(column, value);
}
