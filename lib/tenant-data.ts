/**
 * Tenant Data Layer
 * Queries for the logged-in tenant: their flat, rent payments, tickets, notices.
 */

import { supabase } from "./supabase";

// ─── TYPES ────────────────────────────────────────────────────

export type TenantProfile = {
  id: string;
  society_id: string | null;
  flat_id: string | null;
  user: { id: string; full_name: string; email: string; phone: string } | null;
  flat?: {
    flat_number: string;
    block: string | null;
    flat_type: string | null;
    floor_number?: number | null;
    monthly_rent: number | null;
    owner_id: string | null;
    owner?: { full_name: string; phone: string } | null;
  } | null;
  society?: { name: string; city: string } | null;
};

export type TenantRentPayment = {
  id: string;
  amount: number;
  expected_amount: number;
  month_year: string;
  status: string;
  payment_date: string | null;
  payment_method: string | null;
  created_at: string;
};

export type TenantTicket = {
  id: string;
  ticket_number: string | null;
  category: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

export type TenantNotice = {
  id: string;
  title: string;
  content: string;
  notice_type: string;
  audience: string;
  created_at: string;
};

// ─── RESOLVE TENANT ───────────────────────────────────────────

export async function getTenantProfile(email: string): Promise<TenantProfile | null> {
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (!user) return null;

  const { data, error } = await supabase
    .from("tenants")
    .select("id, society_id, flat_id, user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) { console.error("getTenantProfile error:", error); return null; }
  if (!data) { console.warn("getTenantProfile: no tenant for user", user.id); return null; }

  // Fetch flat separately
  let flat = null;
  if (data.flat_id) {
    const { data: flatData } = await supabase
      .from("flats")
      .select("flat_number, block, flat_type, floor_number, monthly_rent, owner_id")
      .eq("id", data.flat_id)
      .single();
    flat = flatData;
    // Fetch owner
    if (flat?.owner_id) {
      const { data: owner } = await supabase
        .from("users")
        .select("full_name, phone")
        .eq("id", flat.owner_id)
        .single();
      if (owner) flat = { ...flat, owner };
    }
  }

  // Fetch society
  let society = null;
  if (data.society_id) {
    const { data: socData } = await supabase
      .from("societies")
      .select("name, city")
      .eq("id", data.society_id)
      .single();
    society = socData;
  }

  const { data: userInfo } = await supabase
    .from("users")
    .select("id, full_name, email, phone")
    .eq("id", user.id)
    .single();

  return {
    id: data.id,
    society_id: data.society_id,
    flat_id: data.flat_id,
    user: userInfo ?? { id: user.id, full_name: email, email, phone: "" },
    flat,
    society,
  } as unknown as TenantProfile;
}

// ─── RENT PAYMENTS ───────────────────────────────────────────

export async function getTenantRentPayments(email: string): Promise<TenantRentPayment[]> {
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (!user) return [];

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!tenant) return [];

  const { data, error } = await supabase
    .from("rent_payments")
    .select("id, amount, expected_amount, month_year, status, payment_date, payment_method, created_at")
    .eq("tenant_id", tenant.id)
    .order("month_year", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TenantRentPayment[];
}

// ─── TICKETS ─────────────────────────────────────────────────

export async function getTenantTickets(email: string): Promise<TenantTicket[]> {
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (!user) return [];

  const { data, error } = await supabase
    .from("tickets")
    .select("id, ticket_number, category, subject, description, priority, status, created_at, resolved_at")
    .eq("raised_by", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TenantTicket[];
}

export async function createTenantTicket(
  email: string,
  societyId: string,
  flatId: string | null,
  ticket: { category: string; subject: string; description: string; priority: string }
) {
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (!user) throw new Error("User not found");

  const { error } = await supabase.from("tickets").insert({
    ...(societyId ? { society_id: societyId } : {}),
    ...(flatId ? { flat_id: flatId } : {}),
    raised_by: user.id,
    ...ticket,
    status: "open",
  });
  if (error) throw error;
}

// ─── AGREEMENT ───────────────────────────────────────────────

export type TenantAgreement = {
  id: string;
  tier: string;
  status: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number | null;
  custom_doc_url?: string | null;
  custom_doc_name?: string | null;
  flat?: { flat_number: string; block: string | null; floor_number?: number | null; flat_type?: string | null; area_sqft?: number | null } | null;
  society?: { name: string; city: string; address?: string | null } | null;
  landlord?: { full_name?: string; phone?: string; email?: string } | null;
  tenant_user?: { full_name: string; phone?: string | null; email?: string | null } | null;
};

export async function getTenantAgreement(email: string): Promise<TenantAgreement | null> {
  const { data: userRow } = await supabase.from("users").select("id, full_name, phone, email").eq("email", email).single();
  if (!userRow) return null;

  const { data: tenant } = await supabase.from("tenants").select("id").eq("user_id", userRow.id).maybeSingle();
  if (!tenant) return null;

  const { data } = await supabase
    .from("agreements")
    .select(`
      id, tier, status, start_date, end_date, monthly_rent, security_deposit, landlord_id, custom_doc_url, custom_doc_name,
      flat:flats(flat_number, block, floor_number, flat_type, area_sqft),
      society:societies(name, city, address)
    `)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;

  // Fetch landlord user info
  const ag = data as unknown as TenantAgreement & { landlord_id?: string };
  let landlord = null;
  if (ag.landlord_id) {
    const { data: ll } = await supabase.from("users").select("full_name, phone, email").eq("id", ag.landlord_id).single();
    landlord = ll ?? null;
  }

  return {
    ...ag,
    landlord,
    tenant_user: { full_name: userRow.full_name, phone: userRow.phone, email: userRow.email },
  } as TenantAgreement;
}

// ─── NOTICES ─────────────────────────────────────────────────

export async function getTenantNotices(societyId: string): Promise<TenantNotice[]> {
  const { data, error } = await supabase
    .from("notices")
    .select("id, title, content, notice_type, target_audience, created_at")
    .eq("society_id", societyId)
    .in("target_audience", ["all", "tenants"])
    .order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(n => ({ ...n, audience: n.target_audience })) as TenantNotice[];
}

// ─── BOARD DATA ───────────────────────────────────────────────

export type BoardMemberProfile = {
  id: string;
  society_id: string;
  user_id: string;
  role: string;
  user?: { full_name: string; email: string } | null;
  society?: { name: string } | null;
};

export async function getBoardMemberProfile(email: string): Promise<BoardMemberProfile | null> {
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (!user) return null;

  const { data } = await supabase
    .from("society_members")
    .select(`
      id, society_id, user_id, role,
      user:users(full_name, email),
      society:societies(name)
    `)
    .eq("user_id", user.id)
    .in("role", ["board", "admin"])
    .single();
  return data as unknown as BoardMemberProfile | null;
}

export type BoardTicket = {
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
  flat?: { flat_number: string; block: string | null } | null;
  raiser?: { full_name: string } | null;
};

export async function getBoardAssignedTickets(userId: string): Promise<BoardTicket[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(`
      id, ticket_number, flat_id, raised_by, assigned_to, category,
      subject, description, priority, status, created_at,
      flat:flats(flat_number, block),
      raiser:users!tickets_raised_by_fkey(full_name)
    `)
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BoardTicket[];
}

export type BoardExpense = {
  id: string;
  category: string;
  description: string;
  vendor_name: string | null;
  amount: number;
  expense_date: string;
  approval_status: string;
};

export async function getBoardExpenses(societyId: string): Promise<BoardExpense[]> {
  const { data, error } = await supabase
    .from("society_expenses")
    .select("id, category, description, vendor_name, amount, expense_date, approval_status")
    .eq("society_id", societyId)
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BoardExpense[];
}

export async function boardApproveExpense(id: string, approverId: string) {
  const { error } = await supabase
    .from("society_expenses")
    .update({ approval_status: "approved", approved_by: approverId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function boardRejectExpense(id: string) {
  const { error } = await supabase
    .from("society_expenses")
    .update({ approval_status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function boardResolveTicket(id: string) {
  const { error } = await supabase
    .from("tickets")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function boardCreateNotice(
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
