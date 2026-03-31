/**
 * Society Admin Data Layer
 * All queries scoped to the admin's own society.
 * Auth: email from localStorage (mrs_user) → look up user in DB → society_id via society_members.
 */

import { supabase } from "./supabase";

// ─── TYPES ────────────────────────────────────────────────────

export type AdminSociety = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  state: string;
  pincode: string | null;
  registration_number: string | null;
  total_flats: number;
  total_floors: number;
  subscription_plan: string;
  plan: string | null;
  maintenance_amount: number | null;
  is_active: boolean;
  created_at: string;
};

export type AdminFlat = {
  id: string;
  flat_number: string;
  block: string | null;
  flat_type: string | null;
  floor_number: number | null;
  area_sqft: number | null;
  status: string;
  monthly_rent: number | null;
  maintenance_amount: number | null;
  security_deposit: number | null;
  society_id: string;
  owner_id: string | null;
  current_tenant_id: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  tenant_email: string | null;
  owner?: { full_name: string; phone: string; email: string } | null;
  tenant?: { user?: { full_name: string; phone: string; email: string } | null } | null;
};

export type AdminMaintenancePayment = {
  id: string;
  flat_id: string;
  payer_id: string | null;
  amount: number;
  expected_amount: number;
  month_year: string;
  status: string;
  payment_date: string | null;
  payment_method: string | null;
  created_at: string;
  flat?: { flat_number: string; block: string | null } | null;
  payer?: { full_name: string } | null;
};

export type AdminExpense = {
  id: string;
  category: string;
  description: string;
  vendor_name: string | null;
  amount: number;
  expense_date: string;
  approval_status: string;
  approved_by: string | null;
  created_at: string;
};

export type AdminTicket = {
  id: string;
  ticket_number: string | null;
  flat_id: string | null;
  raised_by: string;
  assigned_to: string | null;
  category: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  flat?: { flat_number: string; block: string | null } | null;
  raiser?: { full_name: string } | null;
  assignee?: { full_name: string } | null;
};

export type AdminNotice = {
  id: string;
  title: string;
  content: string;
  notice_type: string;
  audience: string;
  is_active: boolean;
  created_at: string;
  created_by?: { full_name: string } | null;
};

export type AdminDocument = {
  id: string;
  society_id: string;
  category: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
};

// ─── RESOLVE SOCIETY ID ───────────────────────────────────────

/** Get society_id for an admin by their email */
export async function getAdminSocietyId(email: string): Promise<string | null> {
  // Look up user
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (!user) return null;

  // Look up their society membership
  const { data: membership } = await supabase
    .from("society_members")
    .select("society_id")
    .eq("user_id", user.id)
    .in("role", ["admin", "board", "board_member"])
    .single();
  return membership?.society_id ?? null;
}

// ─── SOCIETY ─────────────────────────────────────────────────

export async function getAdminSociety(email: string): Promise<AdminSociety | null> {
  const societyId = await getAdminSocietyId(email);
  if (!societyId) return null;

  const { data, error } = await supabase
    .from("societies")
    .select("*")
    .eq("id", societyId)
    .single();
  if (error) throw error;
  return data as AdminSociety;
}

// ─── FLATS ───────────────────────────────────────────────────

export async function getSocietyFlats(societyId: string): Promise<AdminFlat[]> {
  const { data, error } = await supabase
    .from("flats")
    .select(`
      id, flat_number, block, flat_type, floor_number, area_sqft, status,
      monthly_rent, maintenance_amount, security_deposit, society_id, owner_id, current_tenant_id,
      owner_name, owner_phone, owner_email, tenant_name, tenant_phone, tenant_email,
      owner:users!flats_owner_id_fkey(full_name, phone, email)
    `)
    .eq("society_id", societyId)
    .order("flat_number");
  if (error) throw error;

  // Fetch tenant details separately if needed
  const flats = data ?? [];
  if (flats.length > 0 && flats[0].current_tenant_id) {
    const tenantIds = flats.filter(f => f.current_tenant_id).map(f => f.current_tenant_id);
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, user_id, user:users(full_name, phone, email)")
      .in("id", tenantIds);

    const tenantMap = Object.fromEntries((tenants ?? []).map(t => [t.id, t]));
    return flats.map(f => ({ ...f, tenant: tenantMap[f.current_tenant_id] })) as unknown as AdminFlat[];
  }

  return flats as unknown as AdminFlat[];
}

// ─── MAINTENANCE PAYMENTS ─────────────────────────────────────

export async function getSocietyMaintenancePayments(societyId: string): Promise<AdminMaintenancePayment[]> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from("maintenance_payments")
    .select(`
      id, flat_id, payer_id, amount, expected_amount, month_year, status,
      payment_date, payment_method, created_at,
      flat:flats(flat_number, block),
      payer:users(full_name)
    `)
    .eq("society_id", societyId)
    .eq("month_year", currentMonth)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminMaintenancePayment[];
}

export async function getAllSocietyMaintenancePayments(societyId: string): Promise<AdminMaintenancePayment[]> {
  const { data, error } = await supabase
    .from("maintenance_payments")
    .select(`
      id, flat_id, payer_id, amount, expected_amount, month_year, status,
      payment_date, payment_method, created_at,
      flat:flats(flat_number, block),
      payer:users(full_name)
    `)
    .eq("society_id", societyId)
    .order("month_year", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminMaintenancePayment[];
}

// ─── EXPENSES ─────────────────────────────────────────────────

export async function getSocietyExpenses(societyId: string): Promise<AdminExpense[]> {
  const { data, error } = await supabase
    .from("society_expenses")
    .select("id, category, description, vendor_name, amount, expense_date, approval_status, approved_by, created_at")
    .eq("society_id", societyId)
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminExpense[];
}

// ─── TICKETS ─────────────────────────────────────────────────

export async function getSocietyTickets(societyId: string): Promise<AdminTicket[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(`
      id, ticket_number, flat_id, raised_by, assigned_to, category, subject,
      description, priority, status, created_at, resolved_at,
      flat:flats(flat_number, block),
      raiser:users!tickets_raised_by_fkey(full_name),
      assignee:users!tickets_assigned_to_fkey(full_name)
    `)
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminTicket[];
}

export async function assignTicket(id: string, assignedTo: string) {
  const { error } = await supabase
    .from("tickets")
    .update({ assigned_to: assignedTo, status: "assigned", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ─── NOTICES ─────────────────────────────────────────────────

export async function getSocietyNotices(societyId: string): Promise<AdminNotice[]> {
  const { data, error } = await supabase
    .from("notices")
    .select(`
      id, title, content, notice_type, audience, is_active, created_at,
      created_by:users(full_name)
    `)
    .eq("society_id", societyId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminNotice[];
}

export async function createNotice(
  societyId: string,
  createdBy: string,
  notice: { title: string; content: string; notice_type: string; audience: string }
) {
  const { error } = await supabase.from("notices").insert({
    society_id: societyId,
    created_by: createdBy,
    ...notice,
    is_active: true,
  });
  if (error) throw error;
}

// ─── SOCIETY MEMBERS (GOVERNANCE) ────────────────────────────

export type SocietyMember = {
  id: string;
  user_id: string;
  society_id: string;
  role: string;
  designation: string | null;
  joined_at: string | null;
  user?: { full_name: string; email: string; phone: string } | null;
};

export async function getSocietyMembers(societyId: string): Promise<SocietyMember[]> {
  try {
    const { data, error } = await supabase
      .from("society_members")
      .select("id, user_id, society_id, role, designation, joined_at, user:users(full_name, email, phone)")
      .eq("society_id", societyId)
      .order("role");
    if (error) {
      console.error("getSocietyMembers error:", error);
      throw error;
    }
    return (data ?? []) as unknown as SocietyMember[];
  } catch (err) {
    console.error("Failed to load society members:", err);
    return [];
  }
}

export async function addSocietyMember(societyId: string, userId: string, role: string, designation?: string) {
  const { error } = await supabase.from("society_members").insert({
    society_id: societyId,
    user_id: userId,
    role,
    designation: designation ?? null,
  });
  if (error) throw error;
}

// ─── PARKING SLOTS ────────────────────────────────────────────

export type ParkingSlot = {
  id: string;
  society_id: string;
  slot_number: string;
  slot_type: string;
  level: string | null;
  status: string;
  flat_id: string | null;
  vehicle_number: string | null;
  vehicle_model: string | null;
  flat?: { flat_number: string; block: string | null } | null;
};

export async function getParkingSlots(societyId: string): Promise<ParkingSlot[]> {
  const { data, error } = await supabase
    .from("parking_slots")
    .select("id, society_id, slot_number, slot_type, level, status, flat_id, vehicle_number, vehicle_model, flat:flats(flat_number, block)")
    .eq("society_id", societyId)
    .order("slot_number");
  if (error) throw error;
  return (data ?? []) as unknown as ParkingSlot[];
}

// ─── POLLS ────────────────────────────────────────────────────

export type Poll = {
  id: string;
  society_id: string;
  title: string;
  description: string | null;
  status: string;
  target_audience: string;   // 'all' | 'board' | 'landlords' | 'tenants' | comma-separated
  ends_at: string | null;
  created_at: string;
  created_by: string | null;
  options?: PollOption[];
  votes?: PollVote[];
};

export type PollOption = {
  id: string;
  poll_id: string;
  option_text: string;
  sort_order: number;
};

export type PollVote = {
  id: string;
  poll_id: string;
  option_id: string;
  voter_id: string;
};

export async function getSocietyPolls(societyId: string): Promise<Poll[]> {
  const { data, error } = await supabase
    .from("polls")
    .select("id, society_id, title, description, status, target_audience, ends_at, created_at, created_by")
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const polls = (data ?? []) as Poll[];
  if (polls.length === 0) return polls;

  // Fetch options + votes for all polls in one go
  const pollIds = polls.map((p) => p.id);
  const [optRes, voteRes] = await Promise.all([
    supabase.from("poll_options").select("*").in("poll_id", pollIds).order("sort_order"),
    supabase.from("poll_votes").select("id, poll_id, option_id, voter_id").in("poll_id", pollIds),
  ]);

  const options = (optRes.data ?? []) as PollOption[];
  const votes = (voteRes.data ?? []) as PollVote[];

  return polls.map((p) => ({
    ...p,
    options: options.filter((o) => o.poll_id === p.id),
    votes: votes.filter((v) => v.poll_id === p.id),
  }));
}

export async function createPoll(
  societyId: string,
  createdBy: string,
  poll: { title: string; description: string; target_audience: string; ends_at: string | null; options: string[] }
) {
  const { data: created, error } = await supabase
    .from("polls")
    .insert({
      society_id: societyId,
      created_by: createdBy,
      title: poll.title,
      description: poll.description || null,
      target_audience: poll.target_audience,
      ends_at: poll.ends_at || null,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw error;

  const optionRows = poll.options
    .filter((o) => o.trim())
    .map((o, i) => ({ poll_id: created.id, option_text: o.trim(), sort_order: i }));
  const { error: optErr } = await supabase.from("poll_options").insert(optionRows);
  if (optErr) throw optErr;
}

export async function closePoll(id: string) {
  const { error } = await supabase
    .from("polls")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function castVote(pollId: string, optionId: string, voterId: string) {
  const { error } = await supabase.from("poll_votes").insert({
    poll_id: pollId,
    option_id: optionId,
    voter_id: voterId,
  });
  if (error) throw error;
}

/** Get polls visible to a specific role in a society */
export async function getPollsForRole(societyId: string, role: string): Promise<Poll[]> {
  const all = await getSocietyPolls(societyId);
  return all.filter((p) => {
    if (p.target_audience === "all") return true;
    const audiences = p.target_audience.split(",").map((a) => a.trim().toLowerCase());
    // Map DB role to audience key
    const roleMap: Record<string, string> = {
      tenant: "tenants",
      landlord: "landlords",
      board: "board",
      admin: "board",
    };
    return audiences.includes(roleMap[role] ?? role);
  });
}

// ─── AUDIT LOGS ───────────────────────────────────────────────

export type AuditLog = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  created_at: string;
  user?: { full_name: string } | null;
};

export async function getSocietyAuditLogs(societyId: string, limit = 20): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, user_id, created_at, user:users(full_name)")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as AuditLog[];
  } catch (err) {
    // If audit_logs table doesn't exist or query fails, return empty array
    console.error("Error loading audit logs:", err);
    return [];
  }
}

// ─── UPDATE SOCIETY ───────────────────────────────────────────

export async function updateSocietyDetails(id: string, updates: Partial<{
  name: string; city: string; address: string; state: string; pincode: string;
  maintenance_amount: number; registration_number: string;
}>) {
  const { error } = await supabase
    .from("societies")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ─── OVERVIEW STATS ───────────────────────────────────────────

export async function getAdminOverviewStats(societyId: string) {
  const [flatsRes, maintRes, expRes, ticketsRes] = await Promise.all([
    supabase.from("flats").select("id, status").eq("society_id", societyId),
    supabase
      .from("maintenance_payments")
      .select("amount, expected_amount, status")
      .eq("society_id", societyId)
      .eq("month_year", new Date().toISOString().slice(0, 7)),
    supabase
      .from("society_expenses")
      .select("amount, approval_status")
      .eq("society_id", societyId),
    supabase.from("tickets").select("id, status, priority").eq("society_id", societyId),
  ]);

  const flats = flatsRes.data ?? [];
  const maint = maintRes.data ?? [];
  const expenses = expRes.data ?? [];
  const tickets = ticketsRes.data ?? [];

  const totalFlats = flats.length;
  const occupiedFlats = flats.filter((f) => f.status === "occupied").length;
  const collected = maint.filter((m) => m.status === "paid").reduce((a, m) => a + (m.amount || 0), 0);
  const expected = maint.reduce((a, m) => a + (m.expected_amount || 0), 0);
  const totalExpenses = expenses
    .filter((e) => e.approval_status === "approved")
    .reduce((a, e) => a + (e.amount || 0), 0);
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "assigned" || t.status === "in_progress").length;
  const urgentTickets = tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved").length;

  return { totalFlats, occupiedFlats, collected, expected, totalExpenses, balance: collected - totalExpenses, openTickets, urgentTickets };
}

// ─── FLATS MANAGEMENT ─────────────────────────────────────────

export async function createFlat(societyId: string, flatData: {
  flat_number: string;
  block?: string | null;
  floor_number?: number | null;
  flat_type?: string | null;
  area_sqft?: number | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_email?: string | null;
  tenant_name?: string | null;
  tenant_phone?: string | null;
  tenant_email?: string | null;
}) {
  const { data, error } = await supabase.from("flats").insert({
    society_id: societyId,
    flat_number: flatData.flat_number,
    block: flatData.block ?? null,
    floor_number: flatData.floor_number ?? null,
    flat_type: flatData.flat_type ?? null,
    area_sqft: flatData.area_sqft ?? null,
    owner_name: flatData.owner_name ?? null,
    owner_phone: flatData.owner_phone ?? null,
    owner_email: flatData.owner_email ?? null,
    tenant_name: flatData.tenant_name ?? null,
    tenant_phone: flatData.tenant_phone ?? null,
    tenant_email: flatData.tenant_email ?? null,
    status: "vacant",
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateFlat(flatId: string, flatData: Partial<{
  flat_number: string;
  block: string | null;
  floor_number: number | null;
  flat_type: string | null;
  area_sqft: number | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  tenant_email: string | null;
}>) {
  const { data, error } = await supabase.from("flats").update(flatData).eq("id", flatId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFlat(flatId: string) {
  const { error } = await supabase.from("flats").delete().eq("id", flatId);
  if (error) throw error;
}

// ─── SUBSCRIPTION LIMITS ─────────────────────────────────────

/** Count of current landlords in society + the plan's limit */
export async function getSocietyLandlordStats(societyId: string): Promise<{ count: number; limit: number }> {
  const [countRes, societyRes] = await Promise.all([
    supabase
      .from("society_members")
      .select("id", { count: "exact", head: true })
      .eq("society_id", societyId)
      .eq("role", "landlord"),
    supabase.from("societies").select("landlord_limit").eq("id", societyId).maybeSingle(),
  ]);
  return { count: countRes.count ?? 0, limit: societyRes.data?.landlord_limit ?? 10 };
}

/** Count of current active tenants for a landlord + the plan's limit */
export async function getLandlordTenantStats(landlordId: string): Promise<{ count: number; limit: number }> {
  const [countRes, userRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("landlord_id", landlordId)
      .eq("status", "active"),
    supabase.from("users").select("tenant_limit").eq("id", landlordId).maybeSingle(),
  ]);
  return { count: countRes.count ?? 0, limit: userRes.data?.tenant_limit ?? 5 };
}

export async function getVacantFlats(societyId: string) {
  const { data, error } = await supabase
    .from("flats")
    .select("*")
    .eq("society_id", societyId)
    .eq("status", "vacant")
    .order("flat_number");
  if (error) throw error;
  return data ?? [];
}

// ─── EXPENSES MANAGEMENT ──────────────────────────────────────

export async function createExpense(societyId: string, expenseData: {
  category: string;
  description?: string;
  vendor_name?: string;
  amount: number;
  expense_date: string;
}) {
  const { data, error } = await supabase.from("society_expenses").insert({
    society_id: societyId,
    category: expenseData.category,
    description: expenseData.description ?? null,
    vendor_name: expenseData.vendor_name ?? null,
    amount: expenseData.amount,
    expense_date: expenseData.expense_date,
    approval_status: "pending",
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateExpense(expenseId: string, expenseData: Partial<{
  category: string;
  description: string;
  vendor_name: string;
  amount: number;
  expense_date: string;
  approval_status: string;
}>) {
  const { data, error } = await supabase.from("society_expenses").update(expenseData).eq("id", expenseId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(expenseId: string) {
  const { error } = await supabase.from("society_expenses").delete().eq("id", expenseId);
  if (error) throw error;
}

export async function approveExpense(expenseId: string) {
  return updateExpense(expenseId, { approval_status: "approved" });
}

export async function rejectExpense(expenseId: string) {
  return updateExpense(expenseId, { approval_status: "rejected" });
}

// ─── PARKING MANAGEMENT ───────────────────────────────────────

export async function createParkingSlot(societyId: string, slotData: {
  slot_number: string;
  slot_type?: string;
  level?: number | null;
}) {
  const { data, error } = await supabase.from("parking_slots").insert({
    society_id: societyId,
    slot_number: slotData.slot_number,
    slot_type: slotData.slot_type ?? "regular",
    level: slotData.level ?? null,
    status: "available",
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateParkingSlot(slotId: string, slotData: Partial<{
  slot_number: string;
  slot_type: string;
  level: number | null;
  status: string;
  flat_id: string | null;
  vehicle_number: string | null;
  vehicle_model: string | null;
}>) {
  const { data, error } = await supabase.from("parking_slots").update(slotData).eq("id", slotId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteParkingSlot(slotId: string) {
  const { error } = await supabase.from("parking_slots").delete().eq("id", slotId);
  if (error) throw error;
}

export async function allocateParkingSlot(slotId: string, flatId: string, vehicleNumber: string, vehicleModel: string) {
  return updateParkingSlot(slotId, {
    status: "occupied",
    flat_id: flatId,
    vehicle_number: vehicleNumber,
    vehicle_model: vehicleModel,
  });
}

export async function deallocateParkingSlot(slotId: string) {
  return updateParkingSlot(slotId, {
    status: "available",
    flat_id: null,
    vehicle_number: null,
    vehicle_model: null,
  });
}

export async function getAvailableParkingSlots(societyId: string) {
  const { data, error } = await supabase
    .from("parking_slots")
    .select("*")
    .eq("society_id", societyId)
    .eq("status", "available")
    .order("level, slot_number");
  if (error) throw error;
  return data ?? [];
}

// ─── DOCUMENTS MANAGEMENT ─────────────────────────────────────

export async function uploadDocument(societyId: string, userId: string, docData: {
  file_name: string;
  file_url: string;
  file_size: number;
  category?: string;
}) {
  const { data, error } = await supabase.from("documents").insert({
    society_id: societyId,
    file_name: docData.file_name,
    file_url: docData.file_url,
    file_size: docData.file_size,
    category: docData.category ?? "other",
    uploaded_by: userId,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getDocumentsByCategory(societyId: string, category: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("society_id", societyId)
    .eq("category", category)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteDocument(docId: string) {
  const { error } = await supabase.from("documents").delete().eq("id", docId);
  if (error) throw error;
}

export async function grantDocumentAccess(docId: string, userId: string, accessType: "view" | "download" = "view") {
  const { data, error } = await supabase.from("document_access").insert({
    document_id: docId,
    user_id: userId,
    access_type: accessType,
  }).select().single();
  if (error && error.code !== "23505") throw error; // Ignore unique constraint error
  return data;
}

export async function revokeDocumentAccess(docId: string, userId: string) {
  const { error } = await supabase.from("document_access").delete().eq("document_id", docId).eq("user_id", userId);
  if (error) throw error;
}

// ─── TICKETS MANAGEMENT ───────────────────────────────────────

export async function createTicket(societyId: string, ticketData: {
  flat_id?: string;
  category: string;
  subject: string;
  description: string;
  priority?: string;
  raised_by: string;
}) {
  const { data, error } = await supabase.from("tickets").insert({
    society_id: societyId,
    flat_id: ticketData.flat_id ?? null,
    category: ticketData.category,
    subject: ticketData.subject,
    description: ticketData.description,
    priority: ticketData.priority ?? "normal",
    raised_by: ticketData.raised_by,
    status: "open",
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateTicket(ticketId: string, ticketData: Partial<{
  status: string;
  priority: string;
  assigned_to: string;
  resolution_notes: string;
}>) {
  const { data, error } = await supabase.from("tickets").update(ticketData).eq("id", ticketId).select().single();
  if (error) throw error;
  return data;
}

export async function resolveTicket(ticketId: string, notes: string) {
  return updateTicket(ticketId, {
    status: "resolved",
    resolution_notes: notes,
  });
}

// ─── GOVERNANCE MANAGEMENT ────────────────────────────────────

export async function removeSocietyMember(memberId: string) {
  const { error } = await supabase.from("society_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function updateMemberRole(memberId: string, newRole: string) {
  const { data, error } = await supabase.from("society_members").update({ role: newRole }).eq("id", memberId).select().single();
  if (error) throw error;
  return data;
}

export async function updateMemberDesignation(memberId: string, newDesignation: string) {
  const { data, error } = await supabase.from("society_members").update({ designation: newDesignation }).eq("id", memberId).select().single();
  if (error) throw error;
  return data;
}

// ─── INTEGRATIONS ─────────────────────────────────────────────

export async function saveSocietyIntegration(societyId: string, provider: string, configJson: Record<string, unknown>) {
  const { data, error } = await supabase.from("society_integrations").upsert({
    society_id: societyId,
    provider,
    config_json: configJson,
    is_active: true,
  }, { onConflict: "society_id,provider" }).select().single();
  if (error) throw error;
  return data;
}

export async function getSocietyIntegration(societyId: string, provider: string) {
  const { data, error } = await supabase
    .from("society_integrations")
    .select("*")
    .eq("society_id", societyId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function removeSocietyIntegration(societyId: string, provider: string) {
  const { error } = await supabase.from("society_integrations").delete().eq("society_id", societyId).eq("provider", provider);
  if (error) throw error;
}
