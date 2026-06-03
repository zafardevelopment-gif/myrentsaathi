/**
 * Setup progress engine (§30). Step completion is DERIVED LIVE from existing
 * data (single source of truth); only skips/dismissals/cached-percent are
 * persisted in onboarding_state. Powers the Setup Progress Card, alerts,
 * the stats "Setup %", and the smart "Continue Setup" button.
 */

import { supabaseAdmin } from "../supabase-admin";
import { resolveBillerScope, type ScopeUser } from "../billing/scope";

export type StepStatus = "not_started" | "in_progress" | "completed";
export type SetupStep = {
  key: string;
  title: string;
  status: StepStatus;
  required: boolean;
  href: string;
  hint?: string;
};
export type SetupProgress = {
  user_type: "landlord" | "society" | "tenant" | null;
  percent: number;
  completed: boolean;
  nextStepHref: string | null;
  steps: SetupStep[];
};

async function countRows(table: string, filters: [string, string][]): Promise<number> {
  let q = supabaseAdmin.from(table).select("id", { count: "exact", head: true });
  for (const [c, v] of filters) q = q.eq(c, v);
  const { count } = await q;
  return count ?? 0;
}

// ─── LANDLORD ─────────────────────────────────────────────────

async function landlordSteps(landlordId: string): Promise<SetupStep[]> {
  const { data: user } = await supabaseAdmin
    .from("users").select("full_name, phone, email").eq("id", landlordId).maybeSingle();
  const profileDone = !!(user?.full_name && user?.phone && user?.email);

  const flatCount = await countRows("flats", [["owner_id", landlordId]]);

  // tenants on owned flats
  const { data: ownedFlats } = await supabaseAdmin.from("flats").select("id, monthly_rent").eq("owner_id", landlordId);
  const flatIds = (ownedFlats ?? []).map((f) => f.id);
  const anyRentConfigured = (ownedFlats ?? []).some((f) => Number(f.monthly_rent) > 0);
  let tenantCount = 0;
  if (flatIds.length) {
    const { count } = await supabaseAdmin
      .from("tenants").select("id", { count: "exact", head: true }).in("flat_id", flatIds);
    tenantCount = count ?? 0;
  }

  const agreementCount = await countRows("agreements", [["landlord_id", landlordId], ["status", "active"]]);
  const bankCount = await countRows("bank_accounts", [["entity_type", "landlord"], ["entity_id", landlordId]]);
  const billingCount = await countRows("billing_profiles", [["landlord_id", landlordId]]);

  return [
    { key: "profile", title: "Profile Information", required: true, href: "/landlord/settings",
      status: profileDone ? "completed" : "in_progress" },
    { key: "property_unit", title: "Add Property / Unit", required: true, href: "/landlord/properties",
      status: flatCount > 0 ? "completed" : "not_started", hint: "Add at least one flat / shop / office" },
    { key: "tenant", title: "Add Tenant", required: true, href: "/landlord/tenants",
      status: tenantCount > 0 ? "completed" : "not_started" },
    { key: "agreement", title: "Create Agreement", required: true, href: "/landlord/agreements",
      status: agreementCount > 0 ? "completed" : "not_started" },
    { key: "bank", title: "Add Bank Account", required: true, href: "/landlord/settings",
      status: bankCount > 0 ? "completed" : "not_started" },
    { key: "billing", title: "Setup Billing", required: true, href: "/landlord/settings",
      status: (billingCount > 0 || anyRentConfigured) ? "completed" : "not_started", hint: "Set monthly rent on your units" },
  ];
}

// ─── SOCIETY ──────────────────────────────────────────────────

async function societySteps(societyId: string): Promise<SetupStep[]> {
  const { data: soc } = await supabaseAdmin
    .from("societies").select("name, address, city, maintenance_amount").eq("id", societyId).maybeSingle();
  // Society info is "done" once name + a location exist (registration_number is optional).
  const societyInfoDone = !!(soc?.name && (soc?.address || soc?.city));
  const maintenanceConfigured = Number(soc?.maintenance_amount ?? 0) > 0;

  const { data: flats } = await supabaseAdmin.from("flats").select("id, block, owner_id").eq("society_id", societyId);
  const flatList = flats ?? [];
  const flatCount = flatList.length;

  const blockCount = await countRows("society_blocks", [["society_id", societyId]]);
  const distinctBlocks = new Set(flatList.map((f) => f.block).filter(Boolean)).size;
  const blocksDone = blockCount > 0 || distinctBlocks > 0;

  const ownerCount = await countRows("society_members", [["society_id", societyId], ["role", "landlord"]]);
  const assignedFlats = flatList.filter((f) => f.owner_id).length;
  const assignStatus: StepStatus =
    flatCount === 0 ? "not_started" : assignedFlats === 0 ? "not_started" : assignedFlats < flatCount ? "in_progress" : "completed";

  const bankCount = await countRows("bank_accounts", [["entity_type", "society"], ["entity_id", societyId]]);
  const billingCount = await countRows("billing_profiles", [["society_id", societyId]]);

  return [
    { key: "society_info", title: "Society Information", required: true, href: "/admin/settings",
      status: societyInfoDone ? "completed" : "in_progress", hint: "Name, address, registration no., GST" },
    { key: "blocks", title: "Add Blocks / Wings", required: false, href: "/admin/flats",
      status: blocksDone ? "completed" : "not_started" },
    { key: "flats", title: "Add Flats", required: true, href: "/admin/flats",
      status: flatCount > 0 ? "completed" : "not_started" },
    { key: "owners", title: "Add Landlords / Owners", required: true, href: "/admin/landlords",
      status: ownerCount > 0 ? "completed" : "not_started" },
    { key: "assign_owners", title: "Assign Owners to Flats", required: true, href: "/admin/flats",
      status: assignStatus, hint: "Set an owner on every flat" },
    { key: "bank", title: "Add Society Bank Account", required: true, href: "/admin/settings",
      status: bankCount > 0 ? "completed" : "not_started" },
    { key: "billing", title: "Setup Maintenance Billing", required: true, href: "/admin/settings",
      status: (billingCount > 0 || maintenanceConfigured) ? "completed" : "not_started", hint: "Set the monthly maintenance amount" },
  ];
}

// ─── TENANT ───────────────────────────────────────────────────

async function tenantSteps(userId: string): Promise<SetupStep[]> {
  const { data: user } = await supabaseAdmin
    .from("users").select("full_name, phone, email").eq("id", userId).maybeSingle();
  const profileDone = !!(user?.full_name && user?.phone && user?.email);

  const { count: docCount } = await supabaseAdmin
    .from("documents").select("id", { count: "exact", head: true }).eq("uploaded_by", userId);

  const { data: tenantRow } = await supabaseAdmin
    .from("tenants").select("gst_number").eq("user_id", userId).limit(1).maybeSingle();
  const gstDone = !!tenantRow?.gst_number;

  return [
    { key: "profile", title: "Complete Your Profile", required: true, href: "/tenant/profile",
      status: profileDone ? "completed" : "in_progress", hint: "Name, phone, email" },
    { key: "documents", title: "Upload Documents", required: true, href: "/tenant/documents",
      status: (docCount ?? 0) > 0 ? "completed" : "not_started", hint: "ID proof, agreement copy, etc." },
    { key: "gst", title: "Add GST Number", required: false, href: "/tenant/profile",
      status: gstDone ? "completed" : "not_started", hint: "Only if you need GST invoices" },
  ];
}

// ─── PUBLIC ───────────────────────────────────────────────────

export async function getSetupProgress(user: ScopeUser): Promise<SetupProgress> {
  // Tenants have their own (non-biller) setup flow.
  if (user.role === "tenant") {
    const steps = await tenantSteps(user.id);
    const required = steps.filter((s) => s.required);
    const done = required.filter((s) => s.status === "completed").length;
    const percent = required.length === 0 ? 100 : Math.round((done / required.length) * 100);
    const next = steps.find((s) => s.status !== "completed");
    return { user_type: "tenant", percent, completed: percent === 100, nextStepHref: next?.href ?? null, steps };
  }

  const scope = await resolveBillerScope(user);
  if (!scope) return { user_type: null, percent: 0, completed: false, nextStepHref: null, steps: [] };

  const userType: "landlord" | "society" = scope.kind === "society" ? "society" : "landlord";
  const societyId = scope.kind === "society" ? scope.societyId : null;

  // Persisted UX state (skips/dismissals).
  const { data: state } = await supabaseAdmin
    .from("onboarding_state").select("skipped_steps").eq("user_id", user.id).maybeSingle();
  const skipped = new Set<string>(state?.skipped_steps ?? []);

  const steps = scope.kind === "society"
    ? await societySteps(scope.societyId)
    : await landlordSteps(scope.landlordId);

  const required = steps.filter((s) => s.required && !skipped.has(s.key));
  const doneRequired = required.filter((s) => s.status === "completed").length;
  const percent = required.length === 0 ? 100 : Math.round((doneRequired / required.length) * 100);
  const completed = percent === 100;

  const next = steps.find((s) => s.status !== "completed" && !skipped.has(s.key));
  const nextStepHref = next?.href ?? null;

  // Cache percent + mark completed_at (fast paint; best-effort).
  await supabaseAdmin.from("onboarding_state").upsert(
    {
      user_id: user.id,
      user_type: userType,
      society_id: societyId,
      cached_percent: percent,
      cached_steps: steps,
      last_step: next?.key ?? null,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return { user_type: userType, percent, completed, nextStepHref, steps };
}

/** Update UX state: skip a step or dismiss an alert. */
export async function updateOnboardingState(
  userId: string,
  patch: { skip_step?: string; dismiss_alert?: string; last_step?: string },
): Promise<{ success: boolean; error?: string }> {
  const { data: existing } = await supabaseAdmin
    .from("onboarding_state").select("skipped_steps, dismissed_alerts").eq("user_id", userId).maybeSingle();
  const skipped = new Set<string>(existing?.skipped_steps ?? []);
  const dismissed = new Set<string>(existing?.dismissed_alerts ?? []);
  if (patch.skip_step) skipped.add(patch.skip_step);
  if (patch.dismiss_alert) dismissed.add(patch.dismiss_alert);

  const { error } = await supabaseAdmin.from("onboarding_state").upsert(
    {
      user_id: userId,
      skipped_steps: [...skipped],
      dismissed_alerts: [...dismissed],
      ...(patch.last_step ? { last_step: patch.last_step } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}
