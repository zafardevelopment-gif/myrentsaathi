/**
 * Billing dependency check (§35). Returns actionable "missing" items instead
 * of letting a broken invoice be generated. Shares the same EXISTS checks the
 * onboarding engine uses, so "setup complete" and "can bill" never disagree.
 */

import { supabaseAdmin } from "../supabase-admin";
import type { BillerScope } from "./scope";
import type { InvoiceType } from "./types";

export type Missing = { code: string; message: string; href: string };
export type Readiness = { ok: boolean; missing: Missing[] };

function hrefs(scope: BillerScope) {
  const base = scope.kind === "society" ? "/admin" : "/landlord";
  return {
    property: scope.kind === "society" ? "/admin/settings" : "/landlord/properties",
    flats: scope.kind === "society" ? "/admin/flats" : "/landlord/properties",
    tenants: scope.kind === "society" ? "/admin/flats" : "/landlord/tenants",
    agreements: scope.kind === "society" ? "/admin/flats" : "/landlord/agreements",
    bank: `${base}/settings`,
    billing: `${base}/settings`,
    meters: `${base}/settings`,
  };
}

async function count(table: string, col: string, val: string, extra?: (q: ReturnType<typeof buildBase>) => ReturnType<typeof buildBase>): Promise<number> {
  let q = buildBase(table).eq(col, val);
  if (extra) q = extra(q);
  const { count } = await q;
  return count ?? 0;
}

function buildBase(table: string) {
  return supabaseAdmin.from(table).select("id", { count: "exact", head: true });
}

export async function validateBillingReadiness(params: {
  scope: BillerScope;
  invoice_type: InvoiceType;
}): Promise<Readiness> {
  const { scope, invoice_type } = params;
  const h = hrefs(scope);
  const missing: Missing[] = [];

  const scopeCol = scope.kind === "society" ? "society_id" : "owner_id";
  const scopeVal = scope.kind === "society" ? scope.societyId : scope.landlordId;
  const billerCol = scope.kind === "society" ? "society_id" : "landlord_id";

  // Property / units
  const flatCount = await count("flats", scopeCol, scopeVal);
  if (scope.kind === "society") {
    const { data: soc } = await supabaseAdmin.from("societies").select("id").eq("id", scope.societyId).maybeSingle();
    if (!soc) missing.push({ code: "NO_PROPERTY", message: "Society not found. Complete society setup first.", href: h.property });
  } else if (flatCount === 0) {
    missing.push({ code: "NO_PROPERTY", message: "Add a property/flat before billing.", href: h.property });
  }
  if (flatCount === 0) missing.push({ code: "NO_FLAT", message: "No flat found. Add a flat first.", href: h.flats });

  // Billing profile is OPTIONAL — it only adds biller GST/identity to the PDF.
  // Invoices generate fine without it (no GST), so it is NOT a hard blocker.

  // Bank account (payment details on the PDF)
  const bankEntityType = scope.kind === "society" ? "society" : "landlord";
  const bankCount = await count("bank_accounts", "entity_id", scopeVal, (q) => q.eq("entity_type", bankEntityType));
  if (bankCount === 0) missing.push({ code: "NO_BANK", message: "Add a bank account so payment details appear on invoices.", href: h.bank });

  // Type-specific
  if (invoice_type === "rent") {
    const agCount = await count("agreements", billerCol === "society_id" ? "society_id" : "landlord_id", scopeVal, (q) => q.eq("status", "active"));
    if (agCount === 0) missing.push({ code: "NO_AGREEMENT", message: "Cannot generate invoice because no active agreement exists.", href: h.agreements });
  }

  if (invoice_type === "electricity") {
    try {
      const meterCount = await count("meters", "society_id", scope.kind === "society" ? scope.societyId : "", (q) => q.eq("is_active", true));
      if (meterCount === 0) missing.push({ code: "NO_METER", message: "No meter found. Add a meter / enter readings.", href: h.meters });
    } catch {
      // meters table not yet created (Phase 5) — skip silently
    }
  }

  return { ok: missing.length === 0, missing };
}
