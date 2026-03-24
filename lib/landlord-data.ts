/**
 * Landlord Data Layer
 * All queries scoped to flats owned by the logged-in landlord.
 */

import { supabase } from "./supabase";

// ─── TYPES ────────────────────────────────────────────────────

export type LandlordFlat = {
  id: string;
  flat_number: string;
  block: string | null;
  flat_type: string | null;
  floor_number: number | null;
  area_sqft: number | null;
  status: string;
  monthly_rent: number | null;
  security_deposit: number | null;
  society_id: string;
  current_tenant_id: string | null;
  society?: { name: string; city: string } | null;
  tenant?: { id: string; user?: { full_name: string; phone: string; email: string } | null } | null;
};

export type LandlordRentPayment = {
  id: string;
  amount: number;
  expected_amount: number;
  month_year: string;
  status: string;
  payment_date: string | null;
  payment_method: string | null;
  created_at: string;
  flat?: { flat_number: string; block: string | null } | null;
  tenant?: { user?: { full_name: string } | null } | null;
};

export type LandlordAgreement = {
  id: string;
  tier: string;
  status: string;
  monthly_rent: number;
  security_deposit: number | null;
  start_date: string;
  end_date: string;
  created_at: string;
  flat?: { flat_number: string; block: string | null } | null;
  society?: { name: string; city: string } | null;
  tenant?: { user?: { full_name: string } | null } | null;
};

// ─── RESOLVE LANDLORD USER ID ────────────────────────────────

export async function getLandlordUserId(email: string): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  return data?.id ?? null;
}

// ─── FLATS ───────────────────────────────────────────────────

export async function getLandlordFlats(email: string): Promise<LandlordFlat[]> {
  const userId = await getLandlordUserId(email);
  if (!userId) return [];

  const { data, error } = await supabase
    .from("flats")
    .select(`
      id, flat_number, block, flat_type, floor_number, area_sqft, status,
      monthly_rent, security_deposit, society_id, current_tenant_id,
      society:societies(name, city),
      tenant:tenants!flats_current_tenant_id_fkey(id, user:users(full_name, phone, email))
    `)
    .eq("owner_id", userId)
    .order("flat_number");
  if (error) throw error;
  return (data ?? []) as unknown as LandlordFlat[];
}

// ─── RENT PAYMENTS ───────────────────────────────────────────

export async function getLandlordRentPayments(email: string): Promise<LandlordRentPayment[]> {
  const userId = await getLandlordUserId(email);
  if (!userId) return [];

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from("rent_payments")
    .select(`
      id, amount, expected_amount, month_year, status,
      payment_date, payment_method, created_at,
      flat:flats(flat_number, block),
      tenant:tenants(user:users(full_name))
    `)
    .eq("landlord_id", userId)
    .eq("month_year", currentMonth)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as LandlordRentPayment[];
}

export async function getAllLandlordRentPayments(email: string): Promise<LandlordRentPayment[]> {
  const userId = await getLandlordUserId(email);
  if (!userId) return [];

  const { data, error } = await supabase
    .from("rent_payments")
    .select(`
      id, amount, expected_amount, month_year, status,
      payment_date, payment_method, created_at,
      flat:flats(flat_number, block),
      tenant:tenants(user:users(full_name))
    `)
    .eq("landlord_id", userId)
    .order("month_year", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as LandlordRentPayment[];
}

// ─── AGREEMENTS ───────────────────────────────────────────────

export async function getLandlordAgreements(email: string): Promise<LandlordAgreement[]> {
  const userId = await getLandlordUserId(email);
  if (!userId) return [];

  const { data, error } = await supabase
    .from("agreements")
    .select(`
      id, tier, status, monthly_rent, security_deposit, start_date, end_date, created_at,
      flat:flats(flat_number, block),
      society:societies(name, city),
      tenant:tenants(user:users(full_name))
    `)
    .eq("landlord_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as LandlordAgreement[];
}

// ─── MAINTENANCE PAYMENTS (SOCIETY DUES) ─────────────────────

export type LandlordMaintenancePayment = {
  id: string;
  amount: number;
  expected_amount: number;
  month_year: string;
  status: string;
  payment_date: string | null;
  payment_method: string | null;
  created_at: string;
  flat?: { flat_number: string; block: string | null } | null;
};

export async function getLandlordMaintenancePayments(email: string): Promise<LandlordMaintenancePayment[]> {
  const userId = await getLandlordUserId(email);
  if (!userId) return [];

  // Get flat ids owned by landlord
  const { data: flats } = await supabase.from("flats").select("id").eq("owner_id", userId);
  if (!flats || flats.length === 0) return [];
  const flatIds = flats.map((f) => f.id);

  const { data, error } = await supabase
    .from("maintenance_payments")
    .select(`
      id, amount, expected_amount, month_year, status,
      payment_date, payment_method, created_at,
      flat:flats(flat_number, block)
    `)
    .in("flat_id", flatIds)
    .order("month_year", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as LandlordMaintenancePayment[];
}

// ─── COMPLAINTS / TICKETS ─────────────────────────────────────

export type LandlordTicket = {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  flat?: { flat_number: string; block: string | null } | null;
};

export async function getLandlordTickets(email: string): Promise<LandlordTicket[]> {
  const userId = await getLandlordUserId(email);
  if (!userId) return [];

  const { data: flats } = await supabase.from("flats").select("id").eq("owner_id", userId);
  if (!flats || flats.length === 0) return [];
  const flatIds = flats.map((f) => f.id);

  const { data, error } = await supabase
    .from("tickets")
    .select(`
      id, subject, category, priority, status, created_at,
      flat:flats(flat_number, block)
    `)
    .in("flat_id", flatIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as LandlordTicket[];
}

// ─── OVERVIEW STATS ───────────────────────────────────────────

export async function getLandlordOverviewStats(email: string) {
  const userId = await getLandlordUserId(email);
  if (!userId) return { totalFlats: 0, occupiedFlats: 0, expectedRent: 0, collectedRent: 0, overdueRent: 0 };

  const currentMonth = new Date().toISOString().slice(0, 7);

  const [flatsRes, rentRes] = await Promise.all([
    supabase.from("flats").select("id, status, monthly_rent").eq("owner_id", userId),
    supabase
      .from("rent_payments")
      .select("amount, expected_amount, status")
      .eq("landlord_id", userId)
      .eq("month_year", currentMonth),
  ]);

  const flats = flatsRes.data ?? [];
  const rents = rentRes.data ?? [];

  const totalFlats = flats.length;
  const occupiedFlats = flats.filter((f) => f.status === "occupied").length;
  const expectedRent = rents.reduce((a, r) => a + (r.expected_amount || 0), 0);
  const collectedRent = rents.filter((r) => r.status === "paid").reduce((a, r) => a + (r.amount || 0), 0);
  const overdueRent = rents.filter((r) => r.status === "overdue").reduce((a, r) => a + (r.expected_amount || 0), 0);

  return { totalFlats, occupiedFlats, expectedRent, collectedRent, overdueRent };
}
