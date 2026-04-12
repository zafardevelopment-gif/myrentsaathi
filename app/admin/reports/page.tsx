"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSocietyId } from "@/lib/admin-data";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

// ─── CSV HELPER ───────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]): void {
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(d: string | null): string {
  if (!d) return "";
  return d.slice(0, 10);
}

// ─── TYPES ────────────────────────────────────────────────────

type ReportStatus = "idle" | "loading" | "done" | "error";

type ReportCard = {
  id: string;
  category: string;
  icon: string;
  title: string;
  description: string;
  color: string;
};

const REPORTS: ReportCard[] = [
  // Financial
  { id: "maintenance_all",   category: "Financial", icon: "💰", title: "Maintenance Payments",   description: "All maintenance records — paid, pending, overdue",        color: "blue"   },
  { id: "maintenance_pending", category: "Financial", icon: "⏳", title: "Pending Dues",          description: "Flats with outstanding maintenance dues",                color: "red"    },
  { id: "expenses",          category: "Financial", icon: "📋", title: "Society Expenses",        description: "All expenses by category and vendor",                    color: "orange" },
  { id: "salary",            category: "Financial", icon: "👷", title: "Staff Salary",            description: "Salary records — paid and pending",                     color: "purple" },
  { id: "income_vs_expense", category: "Financial", icon: "📈", title: "Income vs Expense",       description: "Monthly summary of collections vs expenses",            color: "green"  },

  // Members / Residents
  { id: "all_members",       category: "Members",   icon: "👥", title: "All Members",             description: "All residents — landlords, tenants, society members",   color: "blue"   },
  { id: "landlords",         category: "Members",   icon: "🏠", title: "Landlord Directory",      description: "All landlords with flat and contact details",           color: "amber"  },
  { id: "tenants",           category: "Members",   icon: "🏘️", title: "Tenant Directory",       description: "All active tenants with flat and contact details",      color: "teal"   },
  { id: "flats",             category: "Members",   icon: "🏢", title: "Flat Register",           description: "All flats — type, floor, rent, status, occupancy",     color: "indigo" },
  { id: "vacant_flats",      category: "Members",   icon: "🚪", title: "Vacant Flats",            description: "Currently vacant / unoccupied flats",                  color: "red"    },

  // Parking
  { id: "parking_slots",     category: "Parking",   icon: "🅿️", title: "Parking Slots",          description: "All slots — type, level, status, assigned vehicle",    color: "blue"   },
  { id: "parking_vehicles",  category: "Parking",   icon: "🚗", title: "Registered Vehicles",     description: "All vehicles — owner, flat, authorization status",     color: "green"  },

  // Operations
  { id: "notices",           category: "Operations",icon: "📢", title: "Notices",                 description: "All published notices with type and audience",         color: "amber"  },
  { id: "tickets",           category: "Operations",icon: "🚫", title: "Complaints / Tickets",    description: "All support tickets — status, priority, resolution",  color: "red"    },
  { id: "visitors",          category: "Operations",icon: "🚪", title: "Visitor Log",             description: "All visitor entries with date, flat, purpose",         color: "teal"   },
  { id: "staff",             category: "Operations",icon: "👤", title: "Staff Register",          description: "All staff — role, mobile, salary, joining date",       color: "purple" },
  { id: "attendance",        category: "Operations",icon: "📅", title: "Attendance Summary",      description: "Monthly attendance summary for all active staff",      color: "indigo" },

  // Governance
  { id: "polls",             category: "Governance",icon: "🗳️", title: "Polls & Voting",         description: "All polls with options and vote counts",               color: "blue"   },
  { id: "society_members",   category: "Governance",icon: "⚖️", title: "Committee Members",      description: "Board and committee members with designations",         color: "gray"   },
];

const CATEGORIES = ["Financial", "Members", "Parking", "Operations", "Governance"];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",  badge: "bg-blue-100 text-blue-700"   },
  red:    { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",   badge: "bg-red-100 text-red-700"     },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200",badge: "bg-orange-100 text-orange-700"},
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200",badge: "bg-purple-100 text-purple-700"},
  green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200", badge: "bg-green-100 text-green-700" },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200", badge: "bg-amber-100 text-amber-700" },
  teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",  badge: "bg-teal-100 text-teal-700"   },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200",badge: "bg-indigo-100 text-indigo-700"},
  gray:   { bg: "bg-gray-50",   text: "text-gray-700",   border: "border-gray-200",  badge: "bg-gray-100 text-gray-600"   },
};

// ─── PAGE ─────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [societyName, setSocietyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, ReportStatus>>({});
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQ, setSearchQ] = useState("");

  // Date range filters
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [fromDate, setFromDate] = useState(`${currentMonth}-01`);
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!user?.email) return;
    getAdminSocietyId(user.email).then(async (sid) => {
      if (sid) {
        setSocietyId(sid);
        const { data: s } = await supabase.from("societies").select("name").eq("id", sid).single();
        if (s) setSocietyName(s.name);
      }
      setLoading(false);
    });
  }, [user]);

  const setStatus = useCallback((id: string, s: ReportStatus) => {
    setStatuses((prev) => ({ ...prev, [id]: s }));
  }, []);

  // ── REPORT GENERATORS ─────────────────────────────────────

  const generateReport = useCallback(async (reportId: string) => {
    if (!societyId) return;
    setStatus(reportId, "loading");

    try {
      switch (reportId) {

        // ── MAINTENANCE ALL ──────────────────────────────────
        case "maintenance_all": {
          const { data } = await supabase
            .from("maintenance_payments")
            .select("month_year, amount, expected_amount, status, payment_date, payment_method, flat:flats(flat_number, block), payer:users(full_name)")
            .eq("society_id", societyId)
            .gte("payment_date", fromDate).lte("payment_date", toDate.endsWith("T") ? toDate : toDate + "T23:59:59")
            .order("month_year", { ascending: false });

          // Fetch all without date filter for pending/null payment_date rows too
          const { data: allData } = await supabase
            .from("maintenance_payments")
            .select("month_year, amount, expected_amount, status, payment_date, payment_method, flat:flats(flat_number, block), payer:users(full_name)")
            .eq("society_id", societyId)
            .order("month_year", { ascending: false });

          const rows: string[][] = [["Flat", "Block", "Month", "Resident", "Amount", "Expected", "Status", "Paid On", "Method"]];
          for (const r of (allData ?? [])) {
            const flat = r.flat as unknown as { flat_number: string; block: string | null } | null;
            const payer = r.payer as unknown as { full_name: string } | null;
            rows.push([flat?.flat_number ?? "", flat?.block ?? "", r.month_year, payer?.full_name ?? "", String(r.amount), String(r.expected_amount), r.status, fmtDate(r.payment_date), r.payment_method ?? ""]);
          }
          downloadCSV(`${societyName}_maintenance_all.csv`, rows);
          break;
        }

        // ── PENDING DUES ─────────────────────────────────────
        case "maintenance_pending": {
          const { data } = await supabase
            .from("maintenance_payments")
            .select("month_year, amount, expected_amount, status, payment_date, flat:flats(flat_number, block), payer:users(full_name)")
            .eq("society_id", societyId)
            .in("status", ["pending", "overdue"])
            .order("month_year", { ascending: false });

          const rows: string[][] = [["Flat", "Block", "Month", "Resident", "Due Amount", "Status"]];
          for (const r of (data ?? [])) {
            const flat = r.flat as unknown as { flat_number: string; block: string | null } | null;
            const payer = r.payer as unknown as { full_name: string } | null;
            rows.push([flat?.flat_number ?? "", flat?.block ?? "", r.month_year, payer?.full_name ?? "", String(r.amount), r.status]);
          }
          downloadCSV(`${societyName}_pending_dues.csv`, rows);
          break;
        }

        // ── EXPENSES ─────────────────────────────────────────
        case "expenses": {
          const { data } = await supabase
            .from("society_expenses")
            .select("category, description, vendor_name, amount, expense_date, approval_status, is_recurring, recurrence_type")
            .eq("society_id", societyId)
            .gte("expense_date", fromDate).lte("expense_date", toDate)
            .order("expense_date", { ascending: false });

          const rows: string[][] = [["Date", "Category", "Description", "Vendor", "Amount", "Status", "Recurring"]];
          let total = 0;
          for (const r of (data ?? [])) {
            total += r.amount;
            rows.push([fmtDate(r.expense_date), r.category, r.description, r.vendor_name ?? "", String(r.amount), r.approval_status, r.is_recurring ? (r.recurrence_type ?? "Yes") : "No"]);
          }
          rows.push(["", "", "", "TOTAL", String(total), "", ""]);
          downloadCSV(`${societyName}_expenses.csv`, rows);
          break;
        }

        // ── SALARY ───────────────────────────────────────────
        case "salary": {
          const { data } = await supabase
            .from("salary_records")
            .select("month_year, amount, status, paid_on, payment_method, notes, staff:staff_id(full_name, role)")
            .eq("society_id", societyId)
            .order("month_year", { ascending: false });

          const rows: string[][] = [["Month", "Staff Name", "Role", "Amount", "Status", "Paid On", "Method", "Notes"]];
          for (const r of (data ?? [])) {
            const s = r.staff as unknown as { full_name: string; role: string } | null;
            rows.push([r.month_year, s?.full_name ?? "", s?.role ?? "", String(r.amount), r.status, fmtDate(r.paid_on), r.payment_method ?? "", r.notes ?? ""]);
          }
          downloadCSV(`${societyName}_salary_records.csv`, rows);
          break;
        }

        // ── INCOME VS EXPENSE ─────────────────────────────────
        case "income_vs_expense": {
          const [{ data: payments }, { data: expenses }] = await Promise.all([
            supabase.from("maintenance_payments").select("month_year, amount, status").eq("society_id", societyId).eq("status", "paid"),
            supabase.from("society_expenses").select("expense_date, amount").eq("society_id", societyId),
          ]);

          // Group by month
          const incomeMap: Record<string, number> = {};
          for (const p of payments ?? []) {
            incomeMap[p.month_year] = (incomeMap[p.month_year] ?? 0) + p.amount;
          }
          const expenseMap: Record<string, number> = {};
          for (const e of expenses ?? []) {
            const m = (e.expense_date as string).slice(0, 7);
            expenseMap[m] = (expenseMap[m] ?? 0) + e.amount;
          }
          const allMonths = [...new Set([...Object.keys(incomeMap), ...Object.keys(expenseMap)])].sort().reverse();

          const rows: string[][] = [["Month", "Income (₹)", "Expenses (₹)", "Net (₹)"]];
          for (const m of allMonths) {
            const inc = incomeMap[m] ?? 0;
            const exp = expenseMap[m] ?? 0;
            rows.push([m, String(inc), String(exp), String(inc - exp)]);
          }
          downloadCSV(`${societyName}_income_vs_expense.csv`, rows);
          break;
        }

        // ── ALL MEMBERS ───────────────────────────────────────
        case "all_members": {
          const { data } = await supabase
            .from("society_members")
            .select("role, designation, joined_at, user:users(full_name, email, phone)")
            .eq("society_id", societyId)
            .order("role");

          const rows: string[][] = [["Full Name", "Email", "Phone", "Role", "Designation", "Joined"]];
          for (const m of (data ?? [])) {
            const u = m.user as unknown as { full_name: string; email: string; phone: string } | null;
            rows.push([u?.full_name ?? "", u?.email ?? "", u?.phone ?? "", m.role, m.designation ?? "", fmtDate(m.joined_at)]);
          }
          downloadCSV(`${societyName}_all_members.csv`, rows);
          break;
        }

        // ── LANDLORDS ─────────────────────────────────────────
        case "landlords": {
          const { data } = await supabase
            .from("flats")
            .select("flat_number, block, flat_type, monthly_rent, status, owner:users!flats_owner_id_fkey(full_name, email, phone)")
            .eq("society_id", societyId)
            .not("owner_id", "is", null)
            .order("flat_number");

          const rows: string[][] = [["Flat", "Block", "Type", "Owner Name", "Email", "Phone", "Monthly Rent", "Flat Status"]];
          for (const f of (data ?? [])) {
            const o = f.owner as unknown as { full_name: string; email: string; phone: string } | null;
            rows.push([f.flat_number, f.block ?? "", f.flat_type ?? "", o?.full_name ?? "", o?.email ?? "", o?.phone ?? "", String(f.monthly_rent ?? ""), f.status]);
          }
          downloadCSV(`${societyName}_landlords.csv`, rows);
          break;
        }

        // ── TENANTS ───────────────────────────────────────────
        case "tenants": {
          const { data: flats } = await supabase
            .from("flats")
            .select("flat_number, block, flat_type, monthly_rent, current_tenant_id")
            .eq("society_id", societyId)
            .not("current_tenant_id", "is", null);

          if (!flats || flats.length === 0) {
            downloadCSV(`${societyName}_tenants.csv`, [["No active tenants found"]]);
            break;
          }

          const tenantIds = flats.map((f) => f.current_tenant_id).filter(Boolean) as string[];
          const { data: tenants } = await supabase
            .from("tenants")
            .select("id, lease_start, lease_end, user:users(full_name, email, phone)")
            .in("id", tenantIds);

          const tenantMap = Object.fromEntries((tenants ?? []).map((t) => [t.id, t]));
          const rows: string[][] = [["Flat", "Block", "Type", "Tenant Name", "Email", "Phone", "Monthly Rent", "Lease Start", "Lease End"]];
          for (const f of flats) {
            const t = tenantMap[f.current_tenant_id!];
            const u = t?.user as { full_name: string; email: string; phone: string } | null;
            rows.push([f.flat_number, f.block ?? "", f.flat_type ?? "", u?.full_name ?? "", u?.email ?? "", u?.phone ?? "", String(f.monthly_rent ?? ""), fmtDate(t?.lease_start), fmtDate(t?.lease_end)]);
          }
          downloadCSV(`${societyName}_tenants.csv`, rows);
          break;
        }

        // ── FLAT REGISTER ─────────────────────────────────────
        case "flats": {
          const { data } = await supabase
            .from("flats")
            .select("flat_number, block, flat_type, floor_number, area_sqft, status, monthly_rent, maintenance_amount, security_deposit, owner:users!flats_owner_id_fkey(full_name)")
            .eq("society_id", societyId)
            .order("flat_number");

          const rows: string[][] = [["Flat No.", "Block", "Type", "Floor", "Area (sqft)", "Status", "Monthly Rent", "Maintenance", "Security Deposit", "Owner"]];
          for (const f of (data ?? [])) {
            const o = f.owner as unknown as { full_name: string } | null;
            rows.push([f.flat_number, f.block ?? "", f.flat_type ?? "", String(f.floor_number ?? ""), String(f.area_sqft ?? ""), f.status, String(f.monthly_rent ?? ""), String(f.maintenance_amount ?? ""), String(f.security_deposit ?? ""), o?.full_name ?? ""]);
          }
          downloadCSV(`${societyName}_flat_register.csv`, rows);
          break;
        }

        // ── VACANT FLATS ──────────────────────────────────────
        case "vacant_flats": {
          const { data } = await supabase
            .from("flats")
            .select("flat_number, block, flat_type, floor_number, area_sqft, monthly_rent, owner:users!flats_owner_id_fkey(full_name, phone)")
            .eq("society_id", societyId)
            .in("status", ["vacant", "available"])
            .order("flat_number");

          const rows: string[][] = [["Flat No.", "Block", "Type", "Floor", "Area (sqft)", "Monthly Rent", "Owner", "Owner Phone"]];
          for (const f of (data ?? [])) {
            const o = f.owner as unknown as { full_name: string; phone: string } | null;
            rows.push([f.flat_number, f.block ?? "", f.flat_type ?? "", String(f.floor_number ?? ""), String(f.area_sqft ?? ""), String(f.monthly_rent ?? ""), o?.full_name ?? "", o?.phone ?? ""]);
          }
          downloadCSV(`${societyName}_vacant_flats.csv`, rows);
          break;
        }

        // ── PARKING SLOTS ─────────────────────────────────────
        case "parking_slots": {
          const { data } = await supabase
            .from("parking_slots")
            .select("slot_number, slot_type, level, status, vehicle_number, vehicle_model, flat:flats(flat_number, block)")
            .eq("society_id", societyId)
            .order("slot_number");

          const rows: string[][] = [["Slot", "Type", "Level", "Status", "Vehicle Number", "Vehicle Model", "Flat", "Block"]];
          for (const s of (data ?? [])) {
            const flat = s.flat as unknown as { flat_number: string; block: string | null } | null;
            rows.push([s.slot_number, s.slot_type, s.level ?? "", s.status, s.vehicle_number ?? "", s.vehicle_model ?? "", flat?.flat_number ?? "", flat?.block ?? ""]);
          }
          downloadCSV(`${societyName}_parking_slots.csv`, rows);
          break;
        }

        // ── VEHICLES ─────────────────────────────────────────
        case "parking_vehicles": {
          const { data } = await supabase
            .from("vehicles")
            .select("vehicle_number, vehicle_type, vehicle_model, color, flat_number, status, is_authorized, owner:owner_id(full_name, phone)")
            .eq("society_id", societyId)
            .order("vehicle_number");

          const rows: string[][] = [["Vehicle No.", "Type", "Model", "Color", "Flat", "Owner", "Phone", "Authorized", "Status"]];
          for (const v of (data ?? [])) {
            const o = v.owner as unknown as { full_name: string; phone: string } | null;
            rows.push([v.vehicle_number, v.vehicle_type, v.vehicle_model ?? "", v.color ?? "", v.flat_number ?? "", o?.full_name ?? "", o?.phone ?? "", v.is_authorized ? "Yes" : "No", v.status]);
          }
          downloadCSV(`${societyName}_vehicles.csv`, rows);
          break;
        }

        // ── NOTICES ───────────────────────────────────────────
        case "notices": {
          const { data } = await supabase
            .from("notices")
            .select("title, content, notice_type, audience, is_active, created_at, created_by:users(full_name)")
            .eq("society_id", societyId)
            .order("created_at", { ascending: false });

          const rows: string[][] = [["Date", "Title", "Type", "Audience", "Active", "Created By", "Content"]];
          for (const n of (data ?? [])) {
            const cb = n.created_by as unknown as { full_name: string } | null;
            rows.push([fmtDate(n.created_at), n.title, n.notice_type, n.audience, n.is_active ? "Yes" : "No", cb?.full_name ?? "", n.content]);
          }
          downloadCSV(`${societyName}_notices.csv`, rows);
          break;
        }

        // ── TICKETS ───────────────────────────────────────────
        case "tickets": {
          const { data } = await supabase
            .from("tickets")
            .select("ticket_number, category, subject, priority, status, created_at, resolved_at, flat:flats(flat_number)")
            .eq("society_id", societyId)
            .gte("created_at", fromDate).lte("created_at", toDate + "T23:59:59")
            .order("created_at", { ascending: false });

          const rows: string[][] = [["Ticket#", "Flat", "Category", "Subject", "Priority", "Status", "Raised On", "Resolved On"]];
          for (const t of (data ?? [])) {
            const flat = t.flat as unknown as { flat_number: string } | null;
            rows.push([t.ticket_number ?? "", flat?.flat_number ?? "", t.category, t.subject, t.priority, t.status, fmtDate(t.created_at), fmtDate(t.resolved_at)]);
          }
          downloadCSV(`${societyName}_tickets.csv`, rows);
          break;
        }

        // ── VISITORS ──────────────────────────────────────────
        case "visitors": {
          const { data } = await supabase
            .from("visitor_logs")
            .select("visitor_name, visitor_mobile, purpose, flat_number, check_in_time, check_out_time, approved_by")
            .eq("society_id", societyId)
            .gte("check_in_time", fromDate).lte("check_in_time", toDate + "T23:59:59")
            .order("check_in_time", { ascending: false });

          const rows: string[][] = [["Visitor Name", "Mobile", "Purpose", "Flat", "Check In", "Check Out", "Approved By"]];
          for (const v of (data ?? [])) {
            rows.push([v.visitor_name, v.visitor_mobile ?? "", v.purpose ?? "", v.flat_number ?? "", fmtDate(v.check_in_time), fmtDate(v.check_out_time), v.approved_by ?? ""]);
          }
          downloadCSV(`${societyName}_visitors.csv`, rows);
          break;
        }

        // ── STAFF ─────────────────────────────────────────────
        case "staff": {
          const { data } = await supabase
            .from("staff")
            .select("full_name, mobile, role, monthly_salary, joining_date, address, is_active, notes")
            .eq("society_id", societyId)
            .order("full_name");

          const rows: string[][] = [["Name", "Mobile", "Role", "Monthly Salary", "Joining Date", "Address", "Active", "Notes"]];
          for (const s of (data ?? [])) {
            rows.push([s.full_name, s.mobile, s.role, String(s.monthly_salary), fmtDate(s.joining_date), s.address ?? "", s.is_active ? "Yes" : "No", s.notes ?? ""]);
          }
          downloadCSV(`${societyName}_staff.csv`, rows);
          break;
        }

        // ── ATTENDANCE SUMMARY ────────────────────────────────
        case "attendance": {
          const month = fromDate.slice(0, 7);
          const [year, mon] = month.split("-").map(Number);
          const lastDay = new Date(year, mon, 0).getDate();
          const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

          const [{ data: staffList }, { data: attRecords }] = await Promise.all([
            supabase.from("staff").select("id, full_name, role").eq("society_id", societyId).eq("is_active", true),
            supabase.from("attendance_records").select("staff_id, status").eq("society_id", societyId).gte("date", `${month}-01`).lte("date", monthEnd),
          ]);

          const summary: Record<string, { present: number; absent: number; half_day: number; leave: number; total: number }> = {};
          for (const s of staffList ?? []) {
            summary[s.id] = { present: 0, absent: 0, half_day: 0, leave: 0, total: 0 };
          }
          for (const r of attRecords ?? []) {
            if (!summary[r.staff_id]) continue;
            const key = r.status as keyof (typeof summary)[string];
            if (key in summary[r.staff_id]) { (summary[r.staff_id] as Record<string, number>)[key]++; }
            summary[r.staff_id].total++;
          }

          const rows: string[][] = [["Name", "Role", "Month", "Present", "Absent", "Half Day", "Leave", "Total Marked"]];
          for (const s of staffList ?? []) {
            const sm = summary[s.id];
            rows.push([s.full_name, s.role, month, String(sm.present), String(sm.absent), String(sm.half_day), String(sm.leave), String(sm.total)]);
          }
          downloadCSV(`${societyName}_attendance_${month}.csv`, rows);
          break;
        }

        // ── POLLS ─────────────────────────────────────────────
        case "polls": {
          const { data: polls } = await supabase
            .from("polls")
            .select("id, title, status, target_audience, ends_at, created_at")
            .eq("society_id", societyId)
            .order("created_at", { ascending: false });

          if (!polls || polls.length === 0) {
            downloadCSV(`${societyName}_polls.csv`, [["No polls found"]]);
            break;
          }

          const pollIds = polls.map((p) => p.id);
          const [{ data: options }, { data: votes }] = await Promise.all([
            supabase.from("poll_options").select("id, poll_id, option_text, sort_order").in("poll_id", pollIds),
            supabase.from("poll_votes").select("poll_id, option_id").in("poll_id", pollIds),
          ]);

          // Count votes per option
          const voteCounts: Record<string, number> = {};
          for (const v of votes ?? []) {
            voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1;
          }

          const rows: string[][] = [["Poll Title", "Status", "Audience", "Ends", "Option", "Votes"]];
          for (const poll of polls) {
            const pollOptions = (options ?? []).filter((o) => o.poll_id === poll.id).sort((a, b) => a.sort_order - b.sort_order);
            if (pollOptions.length === 0) {
              rows.push([poll.title, poll.status, poll.target_audience, fmtDate(poll.ends_at), "—", "0"]);
            }
            for (const opt of pollOptions) {
              rows.push([poll.title, poll.status, poll.target_audience, fmtDate(poll.ends_at), opt.option_text, String(voteCounts[opt.id] ?? 0)]);
            }
          }
          downloadCSV(`${societyName}_polls.csv`, rows);
          break;
        }

        // ── COMMITTEE MEMBERS ─────────────────────────────────
        case "society_members": {
          const { data } = await supabase
            .from("society_members")
            .select("role, designation, joined_at, user:users(full_name, email, phone)")
            .eq("society_id", societyId)
            .in("role", ["admin", "board", "board_member", "committee"])
            .order("role");

          const rows: string[][] = [["Name", "Email", "Phone", "Role", "Designation", "Joined"]];
          for (const m of (data ?? [])) {
            const u = m.user as unknown as { full_name: string; email: string; phone: string } | null;
            rows.push([u?.full_name ?? "", u?.email ?? "", u?.phone ?? "", m.role, m.designation ?? "", fmtDate(m.joined_at)]);
          }
          downloadCSV(`${societyName}_committee.csv`, rows);
          break;
        }
      }

      setStatus(reportId, "done");
      setTimeout(() => setStatus(reportId, "idle"), 3000);
    } catch {
      setStatus(reportId, "error");
      setTimeout(() => setStatus(reportId, "idle"), 4000);
    }
  }, [societyId, societyName, fromDate, toDate, setStatus]);

  // ── DOWNLOAD ALL in category ──────────────────────────────
  const downloadAll = useCallback(async (category: string) => {
    const cat = category === "All" ? REPORTS.map((r) => r.id) : REPORTS.filter((r) => r.category === category).map((r) => r.id);
    for (const id of cat) {
      await generateReport(id);
      await new Promise((res) => setTimeout(res, 300)); // small gap between downloads
    }
  }, [generateReport]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const visibleReports = REPORTS.filter((r) => {
    if (activeCategory !== "All" && r.category !== activeCategory) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink">📊 Reports</h1>
        <p className="text-sm text-ink-muted mt-0.5">Download CSV reports for all society data</p>
      </div>

      {/* Date Range */}
      <div className="bg-white border border-border-default rounded-2xl p-4 space-y-3">
        <p className="text-xs font-bold text-ink-muted uppercase tracking-widest">Date Range (for financial & operational reports)</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-ink-muted block mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-border-default rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted block mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-border-default rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="flex gap-2 text-xs flex-wrap">
            {[
              { label: "This Month", from: `${currentMonth}-01`, to: new Date().toISOString().slice(0, 10) },
              { label: "Last 3M",    from: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
              { label: "This Year",  from: `${new Date().getFullYear()}-01-01`, to: new Date().toISOString().slice(0, 10) },
              { label: "All Time",   from: "2020-01-01", to: new Date().toISOString().slice(0, 10) },
            ].map(({ label, from, to }) => (
              <button
                key={label}
                onClick={() => { setFromDate(from); setToDate(to); }}
                className="px-3 py-1.5 border border-border-default rounded-lg bg-warm-100 hover:bg-amber-50 hover:border-amber-300 text-ink-muted hover:text-amber-700 font-semibold transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQ}
        onChange={(e) => setSearchQ(e.target.value)}
        placeholder="Search reports…"
        className="w-full border border-border-default rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeCategory === cat
                ? "bg-amber-500 text-white"
                : "bg-white border border-border-default text-ink-muted hover:text-ink"
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={() => downloadAll(activeCategory)}
          className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 cursor-pointer transition-colors"
        >
          ⬇ Download All{activeCategory !== "All" ? ` (${activeCategory})` : ""}
        </button>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleReports.map((report) => {
          const status = statuses[report.id] ?? "idle";
          const clr = COLOR_MAP[report.color] ?? COLOR_MAP.blue;
          return (
            <div
              key={report.id}
              className={`bg-white border rounded-2xl p-4 flex items-center gap-4 transition-all ${
                status === "loading" ? "opacity-70 border-amber-300" : "border-border-default hover:border-amber-300 hover:shadow-sm"
              }`}
            >
              {/* Icon */}
              <div className={`w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center text-xl ${clr.bg} ${clr.border} border`}>
                {report.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-ink">{report.title}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${clr.badge}`}>
                    {report.category}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{report.description}</p>
              </div>

              {/* Button */}
              <button
                onClick={() => generateReport(report.id)}
                disabled={status === "loading"}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  status === "done"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : status === "error"
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : status === "loading"
                    ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                    : `${clr.bg} ${clr.text} border ${clr.border} hover:opacity-80`
                }`}
              >
                {status === "loading" ? "…" : status === "done" ? "✓ Done" : status === "error" ? "✗ Error" : "⬇ CSV"}
              </button>
            </div>
          );
        })}
      </div>

      {visibleReports.length === 0 && (
        <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-ink-muted text-sm">No reports match &ldquo;{searchQ}&rdquo;</p>
        </div>
      )}

    </div>
  );
}
