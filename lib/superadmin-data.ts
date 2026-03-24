/**
 * SuperAdmin Data Layer
 * All Supabase queries for the superadmin dashboard
 * Uses anon key (reads) — writes require RLS policies to allow anon access
 */

import { supabase } from "./supabase";

// ─── TYPES ────────────────────────────────────────────────────

export type Society = {
  id: string;
  name: string;
  city: string;
  state: string;
  pincode: string | null;
  registration_number: string | null;
  total_flats: number;
  total_floors: number;
  subscription_plan: string;
  maintenance_amount: number;
  is_active: boolean;
  created_at: string;
};

export type User = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
};

export type Ticket = {
  id: string;
  ticket_number: string | null;
  society_id: string;
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
  // joined
  society?: { name: string; city: string } | null;
  raiser?: { full_name: string; role: string } | null;
};

export type RentPayment = {
  id: string;
  amount: number;
  expected_amount: number;
  month_year: string;
  status: string;
  payment_date: string | null;
  payment_method: string | null;
  created_at: string;
  flat?: { flat_number: string; block: string | null } | null;
  landlord?: { full_name: string } | null;
  tenant?: { user?: { full_name: string } | null } | null;
  society?: { name: string; city: string } | null;
};

export type WaLog = {
  id: string;
  recipient_phone: string;
  template_name: string | null;
  message_type: string | null;
  status: string;
  cost: number | null;
  created_at: string;
  society?: { name: string } | null;
};

export type Agreement = {
  id: string;
  tier: string;
  status: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  created_at: string;
  flat?: { flat_number: string; block: string | null } | null;
  society?: { name: string; city: string } | null;
  landlord?: { full_name: string } | null;
};

// ─── SOCIETIES ────────────────────────────────────────────────

export async function getSocieties() {
  const { data, error } = await supabase
    .from("societies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Society[];
}

export async function updateSocietyPlan(id: string, plan: string) {
  const { error } = await supabase
    .from("societies")
    .update({ subscription_plan: plan, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function updateSocietyStatus(id: string, is_active: boolean) {
  const { error } = await supabase
    .from("societies")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ─── USERS ───────────────────────────────────────────────────

export async function getAllUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, phone, role, is_active, created_at, last_login")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as User[];
}

export async function updateUserStatus(id: string, is_active: boolean) {
  const { error } = await supabase
    .from("users")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ─── FLATS ───────────────────────────────────────────────────

export async function getSocietyFlats(societyId?: string) {
  let query = supabase
    .from("flats")
    .select("id, flat_number, block, flat_type, status, monthly_rent, society_id, owner_id, current_tenant_id");
  if (societyId) query = query.eq("society_id", societyId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ─── TICKETS ─────────────────────────────────────────────────

export async function getAllTickets() {
  const { data, error } = await supabase
    .from("tickets")
    .select(`
      id, ticket_number, society_id, flat_id, raised_by, assigned_to,
      category, subject, description, priority, status, created_at, resolved_at,
      society:societies(name, city),
      raiser:users!tickets_raised_by_fkey(full_name, role)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Ticket[];
}

export async function updateTicketStatus(id: string, status: string, assigned_to?: string | null) {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "resolved") updates.resolved_at = new Date().toISOString();
  if (assigned_to !== undefined) updates.assigned_to = assigned_to;
  const { error } = await supabase.from("tickets").update(updates).eq("id", id);
  if (error) throw error;
}

// ─── PAYMENTS ────────────────────────────────────────────────

export async function getRecentRentPayments(limit = 20) {
  const { data, error } = await supabase
    .from("rent_payments")
    .select(`
      id, amount, expected_amount, month_year, status, payment_date, payment_method, created_at,
      flat:flats(flat_number, block),
      landlord:users!rent_payments_landlord_id_fkey(full_name),
      society:societies(name, city)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as RentPayment[];
}

export async function getRevenueStats() {
  // Total paid rent this month
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const { data: thisMonth } = await supabase
    .from("rent_payments")
    .select("amount")
    .eq("status", "paid")
    .eq("month_year", currentMonth);

  // Total paid all time
  const { data: allTime } = await supabase
    .from("rent_payments")
    .select("amount")
    .eq("status", "paid");

  // Maintenance paid this month
  const { data: maintThisMonth } = await supabase
    .from("maintenance_payments")
    .select("amount")
    .eq("status", "paid");

  const rentThisMonth = thisMonth?.reduce((a, p) => a + (p.amount || 0), 0) ?? 0;
  const rentAllTime = allTime?.reduce((a, p) => a + (p.amount || 0), 0) ?? 0;
  const maintTotal = maintThisMonth?.reduce((a, p) => a + (p.amount || 0), 0) ?? 0;

  return { rentThisMonth, rentAllTime, maintTotal };
}

// ─── WHATSAPP ────────────────────────────────────────────────

export async function getWaStats() {
  const { data, error } = await supabase
    .from("whatsapp_logs")
    .select("id, status, cost, message_type, created_at");
  if (error) throw error;
  const logs = data ?? [];
  const totalSent = logs.length;
  const delivered = logs.filter((l) => l.status === "delivered" || l.status === "read").length;
  const read = logs.filter((l) => l.status === "read").length;
  const failed = logs.filter((l) => l.status === "failed").length;
  const totalCost = logs.reduce((a, l) => a + (l.cost ?? 0), 0);
  return { totalSent, delivered, read, failed, totalCost };
}

export async function getWaLogs(limit = 50) {
  const { data, error } = await supabase
    .from("whatsapp_logs")
    .select("id, recipient_phone, template_name, message_type, status, cost, created_at, society:societies(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as WaLog[];
}

// ─── AGREEMENTS ──────────────────────────────────────────────

export async function getAgreements() {
  const { data, error } = await supabase
    .from("agreements")
    .select(`
      id, tier, status, monthly_rent, start_date, end_date, created_at,
      flat:flats(flat_number, block),
      society:societies(name, city),
      landlord:users!agreements_landlord_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Agreement[];
}

// ─── OVERVIEW STATS ──────────────────────────────────────────

export async function getOverviewStats() {
  const [societiesRes, usersRes, flatsRes, ticketsRes] = await Promise.all([
    supabase.from("societies").select("id, is_active, subscription_plan, created_at"),
    supabase.from("users").select("id, role, is_active, created_at"),
    supabase.from("flats").select("id, status"),
    supabase.from("tickets").select("id, status, priority"),
  ]);

  const societies = societiesRes.data ?? [];
  const users = usersRes.data ?? [];
  const flats = flatsRes.data ?? [];
  const tickets = ticketsRes.data ?? [];

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  return {
    totalSocieties: societies.length,
    activeSocieties: societies.filter((s) => s.is_active).length,
    totalLandlords: users.filter((u) => u.role === "landlord").length,
    totalTenants: users.filter((u) => u.role === "tenant").length,
    totalFlats: flats.length,
    occupiedFlats: flats.filter((f) => f.status === "occupied").length,
    openTickets: tickets.filter((t) => t.status === "open").length,
    urgentTickets: tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved").length,
    newSocietiesThisMonth: societies.filter((s) => s.created_at >= thisMonthStart).length,
    newUsersThisMonth: users.filter((u) => u.created_at >= thisMonthStart).length,
    // Plan breakdown
    enterpriseSocieties: societies.filter((s) => s.subscription_plan === "enterprise").length,
    professionalSocieties: societies.filter((s) => s.subscription_plan === "professional").length,
    starterSocieties: societies.filter((s) => s.subscription_plan === "starter").length,
  };
}
