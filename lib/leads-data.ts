/**
 * Outreach CRM — lead tracking for MyRentSaathi sales.
 * Persisted in Supabase table `leads` (migrations/leads-table.sql).
 * Falls back to an in-memory list if the table doesn't exist yet, so the
 * superadmin/leads page always renders.
 */
import { supabase } from "@/lib/supabase";

export type LeadType = "society" | "landlord" | "other";
export type LeadStatus =
  | "new"
  | "contacted"
  | "replied"
  | "demo"
  | "won"
  | "lost";

export const LEAD_STATUSES: LeadStatus[] = [
  "new", "contacted", "replied", "demo", "won", "lost",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  demo: "Demo booked",
  won: "Won 🎉",
  lost: "Lost",
};

export type Lead = {
  id: string;
  name: string;          // society name or landlord name
  type: LeadType;
  contactPerson: string; // secretary / owner name
  phone: string;
  email: string;
  city: string;
  source: string;        // Justdial, Google Maps, FB group, referral...
  status: LeadStatus;
  notes: string;
  lastContactedAt: string | null; // ISO date
  followUpAt: string | null;      // ISO date
  createdAt: string;
};

type LeadRow = {
  id: string;
  name: string;
  type: LeadType;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  source: string | null;
  status: LeadStatus;
  notes: string | null;
  last_contacted_at: string | null;
  follow_up_at: string | null;
  created_at: string;
};

function rowToLead(r: LeadRow): Lead {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    contactPerson: r.contact_person ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    city: r.city ?? "",
    source: r.source ?? "",
    status: r.status,
    notes: r.notes ?? "",
    lastContactedAt: r.last_contacted_at,
    followUpAt: r.follow_up_at,
    createdAt: r.created_at,
  };
}

export type LeadInput = {
  name: string;
  type: LeadType;
  contactPerson?: string;
  phone?: string;
  email?: string;
  city?: string;
  source?: string;
  status?: LeadStatus;
  notes?: string;
  followUpAt?: string | null;
};

// ── In-memory fallback (used only if the DB table is missing) ────────────────
const memory: Lead[] = [];

function nowIso() {
  return new Date().toISOString();
}

export async function fetchLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as LeadRow[]).map(rowToLead);
  } catch {
    return [...memory].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const payload = {
    name: input.name.trim(),
    type: input.type,
    contact_person: input.contactPerson?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    city: input.city?.trim() || null,
    source: input.source?.trim() || null,
    status: input.status ?? "new",
    notes: input.notes?.trim() || null,
    follow_up_at: input.followUpAt || null,
  };
  try {
    const { data, error } = await supabase
      .from("crm_leads")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return rowToLead(data as LeadRow);
  } catch {
    const lead: Lead = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: payload.name,
      type: payload.type,
      contactPerson: payload.contact_person ?? "",
      phone: payload.phone ?? "",
      email: payload.email ?? "",
      city: payload.city ?? "",
      source: payload.source ?? "",
      status: payload.status,
      notes: payload.notes ?? "",
      lastContactedAt: null,
      followUpAt: payload.follow_up_at,
      createdAt: nowIso(),
    };
    memory.unshift(lead);
    return lead;
  }
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  // Stamp last-contacted when moving out of "new".
  if (status !== "new") patch.last_contacted_at = nowIso();
  try {
    const { error } = await supabase.from("crm_leads").update(patch).eq("id", id);
    if (error) throw error;
  } catch {
    const l = memory.find((x) => x.id === id);
    if (l) {
      l.status = status;
      if (status !== "new") l.lastContactedAt = nowIso();
    }
  }
}

export async function updateLead(
  id: string,
  input: Partial<LeadInput> & { lastContactedAt?: string | null },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.type !== undefined) patch.type = input.type;
  if (input.contactPerson !== undefined) patch.contact_person = input.contactPerson || null;
  if (input.phone !== undefined) patch.phone = input.phone || null;
  if (input.email !== undefined) patch.email = input.email || null;
  if (input.city !== undefined) patch.city = input.city || null;
  if (input.source !== undefined) patch.source = input.source || null;
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes || null;
  if (input.followUpAt !== undefined) patch.follow_up_at = input.followUpAt || null;
  if (input.lastContactedAt !== undefined) patch.last_contacted_at = input.lastContactedAt || null;
  try {
    const { error } = await supabase.from("crm_leads").update(patch).eq("id", id);
    if (error) throw error;
  } catch {
    const l = memory.find((x) => x.id === id);
    if (l) Object.assign(l, input);
  }
}

export async function deleteLead(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (error) throw error;
  } catch {
    const i = memory.findIndex((x) => x.id === id);
    if (i >= 0) memory.splice(i, 1);
  }
}
