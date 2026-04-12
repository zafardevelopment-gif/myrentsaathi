/**
 * Visitor Management System — Data Layer
 * All queries scoped to society_id.
 */

import { supabase } from "./supabase";

// ─── TYPES ────────────────────────────────────────────────────

export type VMSVisitor = {
  id: string;
  society_id: string;
  name: string;
  mobile: string;
  created_at: string;
};

export type VMSVisit = {
  id: string;
  society_id: string;
  visitor_id: string;
  flat_number: string;
  block: string | null;
  purpose: string | null;
  vehicle_number: string | null;
  status: string;
  is_pre_approved: boolean;
  entry_time: string;
  exit_time: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approval_role: string | null;
  rejection_reason: string | null;
  guard_id: string;
  timeout_at: string;
  created_at: string;
  visitor?: VMSVisitor | null;
  guard?: { full_name: string } | null;
  approver?: { full_name: string } | null;
};

export type VMSPreApproved = {
  id: string;
  resident_id: string;
  visitor_id: string;
  society_id: string;
  flat_number: string;
  label: string | null;
  valid_from: string;
  valid_until: string | null;
  days_allowed: number[] | null;
  time_from: string | null;
  time_until: string | null;
  is_active: boolean;
  created_at: string;
  visitor?: VMSVisitor | null;
};

export type VMSApprovalRequest = {
  id: string;
  visit_id: string;
  resident_id: string;
  sent_at: string;
  expires_at: string;
  responded_at: string | null;
  viewed_at: string | null;
  response: string | null;
  visit?: VMSVisit | null;
};

// ─── GUARD: RESOLVE SOCIETY ───────────────────────────────────

export async function getGuardSocietyId(email: string): Promise<string | null> {
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .single();
  if (!user) return null;

  const { data: mem } = await supabase
    .from("society_members")
    .select("society_id")
    .eq("user_id", user.id)
    .eq("role", "guard")
    .single();
  return mem?.society_id ?? null;
}

export async function getGuardUser(email: string): Promise<{ id: string; full_name: string; society_id: string } | null> {
  const { data: user } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("email", email.trim().toLowerCase())
    .single();
  if (!user) return null;

  const { data: mem } = await supabase
    .from("society_members")
    .select("society_id")
    .eq("user_id", user.id)
    .eq("role", "guard")
    .single();
  if (!mem) return null;

  return { id: user.id, full_name: user.full_name, society_id: mem.society_id };
}

// ─── VISITOR LOOKUP ───────────────────────────────────────────

export async function lookupVisitorByMobile(
  societyId: string,
  mobile: string
): Promise<VMSVisitor | null> {
  const { data } = await supabase
    .from("visitors")
    .select("*")
    .eq("society_id", societyId)
    .eq("mobile", mobile.trim())
    .single();
  return data ?? null;
}

export async function createVisitor(
  societyId: string,
  name: string,
  mobile: string
): Promise<VMSVisitor | null> {
  const { data } = await supabase
    .from("visitors")
    .insert({ society_id: societyId, name: name.trim(), mobile: mobile.trim() })
    .select()
    .single();
  return data ?? null;
}

// ─── PRE-APPROVED CHECK ───────────────────────────────────────

export async function checkPreApproved(
  visitorId: string,
  societyId: string,
  flatNumber: string
): Promise<VMSPreApproved | null> {
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);
  const currentDay = now.getDay(); // 0=Sun..6=Sat
  const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

  const { data } = await supabase
    .from("pre_approved_visitors")
    .select("*, visitor:visitor_id(*)")
    .eq("visitor_id", visitorId)
    .eq("society_id", societyId)
    .eq("flat_number", flatNumber)
    .eq("is_active", true)
    .lte("valid_from", todayDate)
    .or(`valid_until.is.null,valid_until.gte.${todayDate}`);

  if (!data || data.length === 0) return null;

  // Apply day + time filters client-side (arrays not easily filtered in PostgREST)
  const match = data.find((pav) => {
    if (pav.days_allowed && !pav.days_allowed.includes(currentDay)) return false;
    if (pav.time_from && pav.time_until) {
      if (currentTime < pav.time_from || currentTime > pav.time_until) return false;
    }
    return true;
  });

  return match ?? null;
}

// ─── CREATE VISIT ─────────────────────────────────────────────

export async function createVisit(params: {
  societyId: string;
  visitorId: string;
  flatNumber: string;
  block?: string;
  purpose?: string;
  vehicleNumber?: string;
  guardId: string;
  isPreApproved?: boolean;
}): Promise<VMSVisit | null> {
  const status = params.isPreApproved ? "approved" : "pending";
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("visits")
    .insert({
      society_id: params.societyId,
      visitor_id: params.visitorId,
      flat_number: params.flatNumber,
      block: params.block ?? null,
      purpose: params.purpose ?? null,
      vehicle_number: params.vehicleNumber ?? null,
      guard_id: params.guardId,
      status,
      is_pre_approved: params.isPreApproved ?? false,
      approved_at: params.isPreApproved ? now : null,
      approval_role: params.isPreApproved ? "tenant" : null,
    })
    .select()
    .single();
  return data ?? null;
}

export async function auditLog(
  visitId: string,
  actorId: string | null,
  actorRole: string,
  action: string,
  metadata?: Record<string, unknown>
) {
  await supabase.from("visit_audit_log").insert({
    visit_id: visitId,
    actor_id: actorId,
    actor_role: actorRole,
    action,
    metadata: metadata ?? null,
  });
}

// ─── APPROVAL REQUEST ─────────────────────────────────────────

export async function createApprovalRequest(
  visitId: string,
  residentId: string
): Promise<void> {
  await supabase.from("approval_requests").insert({
    visit_id: visitId,
    resident_id: residentId,
  });
}

/** Find users (tenant/landlord) who live in the given flat */
export async function getResidentsOfFlat(
  societyId: string,
  flatNumber: string
): Promise<{ id: string; full_name: string; role: string }[]> {
  // Get flat by flat_number + society
  const { data: flat } = await supabase
    .from("flats")
    .select("id, current_tenant_id, owner_id")
    .eq("society_id", societyId)
    .eq("flat_number", flatNumber)
    .single();

  if (!flat) return [];

  const ids = [flat.current_tenant_id, flat.owner_id].filter(Boolean) as string[];
  if (ids.length === 0) return [];

  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, role")
    .in("id", ids)
    .eq("is_active", true);

  return users ?? [];
}

// ─── GUARD: PENDING VISITS ────────────────────────────────────

export async function getGuardPendingVisits(societyId: string): Promise<VMSVisit[]> {
  const { data } = await supabase
    .from("visits")
    .select("*, visitor:visitor_id(*)")
    .eq("society_id", societyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getGuardTodayVisits(societyId: string): Promise<VMSVisit[]> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("visits")
    .select("*, visitor:visitor_id(*)")
    .eq("society_id", societyId)
    .gte("entry_time", midnight.toISOString())
    .order("entry_time", { ascending: false });
  return data ?? [];
}

export async function markExit(visitId: string): Promise<void> {
  await supabase
    .from("visits")
    .update({ exit_time: new Date().toISOString(), status: "exited" })
    .eq("id", visitId);
}

// ─── RESIDENT: PENDING APPROVAL REQUESTS ──────────────────────

export async function getResidentPendingRequests(
  residentId: string
): Promise<VMSApprovalRequest[]> {
  const { data } = await supabase
    .from("approval_requests")
    .select("*, visit:visit_id(*, visitor:visitor_id(*))")
    .eq("resident_id", residentId)
    .is("response", null)
    .order("sent_at", { ascending: false });
  return data ?? [];
}

export async function markRequestViewed(requestId: string): Promise<void> {
  await supabase
    .from("approval_requests")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", requestId)
    .is("viewed_at", null);
}

export async function respondToRequest(
  requestId: string,
  visitId: string,
  residentId: string,
  residentRole: string,
  approve: boolean,
  reason?: string
): Promise<void> {
  const response = approve ? "approved" : "rejected";
  const now = new Date().toISOString();

  await supabase
    .from("approval_requests")
    .update({ response, responded_at: now })
    .eq("id", requestId);

  await supabase
    .from("visits")
    .update({
      status: response,
      approved_at: approve ? now : null,
      approved_by: residentId,
      approval_role: residentRole,
      rejection_reason: !approve ? (reason ?? null) : null,
    })
    .eq("id", visitId);

  await auditLog(visitId, residentId, residentRole, response, { reason });
}

// ─── RESIDENT: VISIT HISTORY ──────────────────────────────────

export async function getResidentVisitHistory(
  societyId: string,
  flatNumber: string
): Promise<VMSVisit[]> {
  const { data } = await supabase
    .from("visits")
    .select("*, visitor:visitor_id(*), guard:guard_id(full_name), approver:approved_by(full_name)")
    .eq("society_id", societyId)
    .eq("flat_number", flatNumber)
    .order("entry_time", { ascending: false })
    .limit(50);
  return data ?? [];
}

// ─── RESIDENT: PRE-APPROVED LIST ──────────────────────────────

export async function getPreApprovedList(residentId: string): Promise<VMSPreApproved[]> {
  const { data } = await supabase
    .from("pre_approved_visitors")
    .select("*, visitor:visitor_id(*)")
    .eq("resident_id", residentId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function addPreApproved(params: {
  residentId: string;
  societyId: string;
  flatNumber: string;
  visitorId: string;
  label?: string;
  validUntil?: string;
  daysAllowed?: number[];
  timeFrom?: string;
  timeUntil?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("pre_approved_visitors").upsert(
    {
      resident_id: params.residentId,
      visitor_id: params.visitorId,
      society_id: params.societyId,
      flat_number: params.flatNumber,
      label: params.label ?? null,
      valid_until: params.validUntil ?? null,
      days_allowed: params.daysAllowed ?? null,
      time_from: params.timeFrom ?? null,
      time_until: params.timeUntil ?? null,
      is_active: true,
    },
    { onConflict: "resident_id,visitor_id" }
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removePreApproved(id: string): Promise<void> {
  await supabase
    .from("pre_approved_visitors")
    .update({ is_active: false })
    .eq("id", id);
}

// ─── ADMIN: FULL VISIT LOG ────────────────────────────────────

export async function getAdminVisitLog(societyId: string, limit = 100): Promise<VMSVisit[]> {
  const { data } = await supabase
    .from("visits")
    .select("*, visitor:visitor_id(*), guard:guard_id(full_name), approver:approved_by(full_name)")
    .eq("society_id", societyId)
    .order("entry_time", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getAdminPendingOverrides(societyId: string): Promise<VMSVisit[]> {
  const { data } = await supabase
    .from("visits")
    .select("*, visitor:visitor_id(*), guard:guard_id(full_name)")
    .eq("society_id", societyId)
    .eq("status", "pending")
    .lt("timeout_at", new Date().toISOString())
    .order("timeout_at", { ascending: true });
  return data ?? [];
}

export async function adminOverrideVisit(
  visitId: string,
  adminId: string,
  approve: boolean,
  reason?: string
): Promise<void> {
  const status = approve ? "admin_override_approved" : "admin_override_rejected";
  const now = new Date().toISOString();

  await supabase
    .from("visits")
    .update({
      status,
      approved_at: approve ? now : null,
      approved_by: adminId,
      approval_role: "admin",
      rejection_reason: !approve ? (reason ?? null) : null,
    })
    .eq("id", visitId);

  // Mark all pending approval requests for this visit as admin_override
  await supabase
    .from("approval_requests")
    .update({ response: "admin_override", responded_at: now })
    .eq("visit_id", visitId)
    .is("response", null);

  await auditLog(visitId, adminId, "admin", "admin_override", { approve, reason });
}

// ─── ADMIN: GUARDS LIST ───────────────────────────────────────

export async function getSocietyGuards(
  societyId: string
): Promise<{ id: string; full_name: string; email: string; phone: string | null; is_active: boolean }[]> {
  const { data: members } = await supabase
    .from("society_members")
    .select("user_id")
    .eq("society_id", societyId)
    .eq("role", "guard");

  if (!members || members.length === 0) return [];

  const ids = members.map((m) => m.user_id);
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email, phone, is_active")
    .in("id", ids);

  return users ?? [];
}

export async function deactivateGuard(guardId: string): Promise<void> {
  await supabase.from("users").update({ is_active: false }).eq("id", guardId);
}

// ─── GUARD: FLAT RESIDENT LOOKUP ─────────────────────────────

export type FlatResidentInfo = {
  flat_number: string;
  resident_name: string;
  resident_role: "tenant" | "landlord";
  phone: string | null;
};

/** Given a flat number, return the active resident (tenant preferred over landlord) */
export async function getFlatResidentInfo(
  societyId: string,
  flatNumber: string
): Promise<FlatResidentInfo | null> {
  const { data: flat } = await supabase
    .from("flats")
    .select("flat_number, current_tenant_id, owner_id")
    .eq("society_id", societyId)
    .eq("flat_number", flatNumber.trim())
    .single();

  if (!flat) return null;

  // Prefer tenant; fall back to landlord/owner
  const residentId = flat.current_tenant_id ?? flat.owner_id;
  const role: "tenant" | "landlord" = flat.current_tenant_id ? "tenant" : "landlord";

  if (!residentId) return null;

  const { data: user } = await supabase
    .from("users")
    .select("full_name, phone")
    .eq("id", residentId)
    .eq("is_active", true)
    .single();

  if (!user) return null;

  return {
    flat_number: flat.flat_number,
    resident_name: user.full_name,
    resident_role: role,
    phone: user.phone ?? null,
  };
}

// ─── RESIDENT: RESOLVE FLAT INFO ──────────────────────────────

export async function getResidentFlatInfo(
  email: string
): Promise<{ id: string; flat_number: string; society_id: string; role: string } | null> {
  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", email.trim().toLowerCase())
    .single();
  if (!user) return null;

  if (user.role === "tenant") {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("flat_id, society_id, flat:flat_id(flat_number)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();
    if (!tenant) return null;
    const flat = tenant.flat as unknown as { flat_number: string } | null;
    return {
      id: user.id,
      flat_number: flat?.flat_number ?? "",
      society_id: tenant.society_id ?? "",
      role: "tenant",
    };
  }

  // landlord — owns a flat
  const { data: flat } = await supabase
    .from("flats")
    .select("flat_number, society_id")
    .eq("owner_id", user.id)
    .limit(1)
    .single();
  if (!flat) return null;
  return { id: user.id, flat_number: flat.flat_number, society_id: flat.society_id, role: "landlord" };
}
