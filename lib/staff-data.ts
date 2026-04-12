/**
 * Staff Management System — Data Layer
 */

import { supabase } from "./supabase";

// ─── TYPES ────────────────────────────────────────────────────

export type StaffMember = {
  id: string;
  society_id: string;
  full_name: string;
  mobile: string;
  role: string;
  address: string | null;
  joining_date: string;
  monthly_salary: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
};

export type StaffDocument = {
  id: string;
  staff_id: string;
  society_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
};

export type SalaryRecord = {
  id: string;
  staff_id: string;
  society_id: string;
  month_year: string;
  amount: number;
  status: string;
  paid_on: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  staff?: { full_name: string; role: string } | null;
};

export type AttendanceRecord = {
  id: string;
  staff_id: string;
  society_id: string;
  date: string;
  status: string;
  marked_by: string | null;
  created_at: string;
};

export const STAFF_ROLES = [
  "Guard", "Gardener", "Cleaner", "Electrician",
  "Plumber", "Lift Operator", "Watchman", "Cook", "Driver", "Other",
];

export const DOC_TYPES = [
  "Aadhaar Card", "PAN Card", "Police Verification", "Photo",
  "Address Proof", "Appointment Letter", "Other",
];

// ─── STAFF CRUD ───────────────────────────────────────────────

export async function getStaff(societyId: string): Promise<StaffMember[]> {
  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("society_id", societyId)
    .order("full_name");
  return (data ?? []) as StaffMember[];
}

export async function addStaff(params: {
  societyId: string;
  full_name: string;
  mobile: string;
  role: string;
  address?: string;
  joining_date: string;
  monthly_salary: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const { data, error } = await supabase
    .from("staff")
    .insert({
      society_id: params.societyId,
      full_name: params.full_name.trim(),
      mobile: params.mobile.trim(),
      role: params.role,
      address: params.address?.trim() || null,
      joining_date: params.joining_date,
      monthly_salary: params.monthly_salary,
      notes: params.notes?.trim() || null,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function updateStaff(
  staffId: string,
  updates: Partial<{
    full_name: string;
    mobile: string;
    role: string;
    address: string;
    joining_date: string;
    monthly_salary: number;
    notes: string;
    is_active: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("staff").update(updates).eq("id", staffId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deactivateStaff(staffId: string): Promise<void> {
  await supabase.from("staff").update({ is_active: false }).eq("id", staffId);
}

// ─── DOCUMENTS ────────────────────────────────────────────────

export async function getStaffDocuments(staffId: string): Promise<StaffDocument[]> {
  const { data } = await supabase
    .from("staff_documents")
    .select("*")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false });
  return (data ?? []) as StaffDocument[];
}

export async function getAllDocuments(societyId: string): Promise<(StaffDocument & { staff?: { full_name: string; role: string } })[]> {
  const { data } = await supabase
    .from("staff_documents")
    .select("*, staff:staff_id(full_name, role)")
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });
  return (data ?? []) as (StaffDocument & { staff?: { full_name: string; role: string } })[];
}

export async function addDocument(params: {
  staffId: string;
  societyId: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  uploaded_by?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("staff_documents").insert({
    staff_id: params.staffId,
    society_id: params.societyId,
    doc_type: params.doc_type,
    file_name: params.file_name.trim(),
    file_url: params.file_url.trim(),
    uploaded_by: params.uploaded_by ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteDocument(docId: string): Promise<void> {
  await supabase.from("staff_documents").delete().eq("id", docId);
}

// ─── SALARY ───────────────────────────────────────────────────

export async function getSalaryRecords(societyId: string, monthYear?: string): Promise<SalaryRecord[]> {
  let query = supabase
    .from("salary_records")
    .select("*, staff:staff_id(full_name, role)")
    .eq("society_id", societyId)
    .order("month_year", { ascending: false });

  if (monthYear) query = query.eq("month_year", monthYear);

  const { data } = await query;
  return (data ?? []) as SalaryRecord[];
}

export async function getStaffSalaryHistory(staffId: string): Promise<SalaryRecord[]> {
  const { data } = await supabase
    .from("salary_records")
    .select("*")
    .eq("staff_id", staffId)
    .order("month_year", { ascending: false });
  return (data ?? []) as SalaryRecord[];
}

/**
 * Generate salary records for ALL active staff for a given month.
 * Skips staff that already have a record for that month.
 */
export async function generateMonthlySalaries(societyId: string, monthYear: string): Promise<{ created: number; skipped: number }> {
  const { data: activeStaff } = await supabase
    .from("staff")
    .select("id, monthly_salary")
    .eq("society_id", societyId)
    .eq("is_active", true);

  if (!activeStaff || activeStaff.length === 0) return { created: 0, skipped: 0 };

  // Find which staff already have records for this month
  const staffIds = activeStaff.map((s) => s.id);
  const { data: existing } = await supabase
    .from("salary_records")
    .select("staff_id")
    .eq("society_id", societyId)
    .eq("month_year", monthYear)
    .in("staff_id", staffIds);

  const existingIds = new Set((existing ?? []).map((r) => r.staff_id));

  const toInsert = activeStaff
    .filter((s) => !existingIds.has(s.id))
    .map((s) => ({
      staff_id: s.id,
      society_id: societyId,
      month_year: monthYear,
      amount: s.monthly_salary,
      status: "pending",
    }));

  if (toInsert.length > 0) {
    await supabase.from("salary_records").insert(toInsert);
  }

  return { created: toInsert.length, skipped: existingIds.size };
}

export async function markSalaryPaid(
  recordId: string,
  paymentMethod: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("salary_records")
    .update({
      status: "paid",
      paid_on: new Date().toISOString().slice(0, 10),
      payment_method: paymentMethod,
      notes: notes ?? null,
    })
    .eq("id", recordId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── ATTENDANCE ───────────────────────────────────────────────

export async function getAttendanceByDate(societyId: string, date: string): Promise<AttendanceRecord[]> {
  const { data } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("society_id", societyId)
    .eq("date", date);
  return (data ?? []) as AttendanceRecord[];
}

export async function upsertAttendance(params: {
  staffId: string;
  societyId: string;
  date: string;
  status: string;
  markedBy: string;
}): Promise<void> {
  await supabase.from("attendance_records").upsert(
    {
      staff_id: params.staffId,
      society_id: params.societyId,
      date: params.date,
      status: params.status,
      marked_by: params.markedBy,
    },
    { onConflict: "staff_id,date" }
  );
}

// ─── ADMIN: BULK IMPORT STAFF ─────────────────────────────────

export type BulkStaffRow = {
  full_name: string;
  mobile: string;
  role?: string;
  address?: string;
  joining_date?: string;
  monthly_salary?: string | number;
  notes?: string;
};

export type BulkStaffImportResult = {
  created: number;
  skipped: number;
  errors: string[];
};

export async function bulkImportStaff(
  societyId: string,
  rows: BulkStaffRow[]
): Promise<BulkStaffImportResult> {
  let created = 0, skipped = 0;
  const errors: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const row of rows) {
    const name = row.full_name?.trim();
    const mobile = row.mobile?.trim();
    if (!name || !mobile) { skipped++; continue; }

    // Validate / normalise role
    const role = STAFF_ROLES.includes(row.role?.trim() ?? "") ? (row.role!.trim()) : "Other";

    // Parse salary
    const salary = parseFloat(String(row.monthly_salary ?? "0")) || 0;

    // Parse date — accept YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
    let joiningDate = today;
    const rawDate = row.joining_date?.trim() ?? "";
    if (rawDate) {
      const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const dmyMatch = rawDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (isoMatch) {
        joiningDate = rawDate;
      } else if (dmyMatch) {
        joiningDate = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
      }
    }

    const { error } = await supabase.from("staff").insert({
      society_id: societyId,
      full_name: name,
      mobile,
      role,
      address: row.address?.trim() || null,
      joining_date: joiningDate,
      monthly_salary: salary,
      notes: row.notes?.trim() || null,
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") skipped++; // duplicate
      else errors.push(`${name}: ${error.message}`);
    } else {
      created++;
    }
  }

  return { created, skipped, errors };
}

export async function getMonthlyAttendanceSummary(
  societyId: string,
  monthYear: string
): Promise<Record<string, { present: number; absent: number; half_day: number; leave: number }>> {
  const from = `${monthYear}-01`;
  const [year, month] = monthYear.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${monthYear}-${String(lastDay).padStart(2, "0")}`;

  const { data } = await supabase
    .from("attendance_records")
    .select("staff_id, status")
    .eq("society_id", societyId)
    .gte("date", from)
    .lte("date", to);

  const summary: Record<string, { present: number; absent: number; half_day: number; leave: number }> = {};
  for (const row of data ?? []) {
    if (!summary[row.staff_id]) summary[row.staff_id] = { present: 0, absent: 0, half_day: 0, leave: 0 };
    const key = row.status as keyof (typeof summary)[string];
    if (key in summary[row.staff_id]) summary[row.staff_id][key]++;
  }
  return summary;
}
