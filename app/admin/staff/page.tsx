"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSocietyId } from "@/lib/admin-data";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import {
  getStaff,
  addStaff,
  updateStaff,
  deactivateStaff,
  getAllDocuments,
  addDocument,
  deleteDocument,
  getSalaryRecords,
  generateMonthlySalaries,
  markSalaryPaid,
  getAttendanceByDate,
  upsertAttendance,
  getMonthlyAttendanceSummary,
  STAFF_ROLES,
  DOC_TYPES,
  type StaffMember,
  type SalaryRecord,
} from "@/lib/staff-data";

// ─── ROLE ICON ────────────────────────────────────────────────

const ROLE_ICONS: Record<string, string> = {
  Guard: "🛡️", Gardener: "🌿", Cleaner: "🧹", Electrician: "⚡",
  Plumber: "🔧", "Lift Operator": "🛗", Watchman: "👁️",
  Cook: "👨‍🍳", Driver: "🚗", Other: "👤",
};

function RoleIcon({ role }: { role: string }) {
  return <span>{ROLE_ICONS[role] ?? "👤"}</span>;
}

// ─── EMPTY STATE ──────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border-default p-10 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-ink-muted text-sm">{text}</p>
    </div>
  );
}

// ─── TYPES ────────────────────────────────────────────────────

type Tab = "staff" | "documents" | "salary" | "attendance";

type DocWithStaff = {
  id: string; staff_id: string; society_id: string; doc_type: string;
  file_name: string; file_url: string; uploaded_by: string | null; created_at: string;
  staff?: { full_name: string; role: string } | null;
};

type AttRow = { staff_id: string; status: string };

// ─── MAIN PAGE ────────────────────────────────────────────────

export default function AdminStaffPage() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("staff");
  const [loading, setLoading] = useState(true);

  // Data
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [docs, setDocs] = useState<DocWithStaff[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [attendance, setAttendance] = useState<AttRow[]>([]);
  const [attSummary, setAttSummary] = useState<Record<string, { present: number; absent: number; half_day: number; leave: number }>>({});

  // Filters
  const [salaryMonth, setSalaryMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roleFilter, setRoleFilter] = useState("All");
  const [showInactive, setShowInactive] = useState(false);

  // Add staff form
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    full_name: "", mobile: "", role: "Guard", address: "",
    joining_date: new Date().toISOString().slice(0, 10),
    monthly_salary: "", notes: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Edit staff
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof form & { monthly_salary: string }>>({});

  // Doc upload form
  const [showDocForm, setShowDocForm] = useState(false);
  const [docStaffId, setDocStaffId] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docSubmitting, setDocSubmitting] = useState(false);

  // Pay salary
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Generating
  const [generating, setGenerating] = useState(false);

  const loadStaff = useCallback(async (sid: string) => {
    const data = await getStaff(sid);
    setStaff(data);
  }, []);

  const loadSalaries = useCallback(async (sid: string, month: string) => {
    const data = await getSalaryRecords(sid, month);
    setSalaries(data);
  }, []);

  const loadAttendance = useCallback(async (sid: string, date: string) => {
    const rows = await getAttendanceByDate(sid, date);
    setAttendance(rows.map((r) => ({ staff_id: r.staff_id, status: r.status })));
    const month = date.slice(0, 7);
    const summary = await getMonthlyAttendanceSummary(sid, month);
    setAttSummary(summary);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    supabase.from("users").select("id").eq("email", user.email).single().then(({ data: u }) => {
      if (u) setAdminUserId(u.id);
    });
    getAdminSocietyId(user.email).then(async (sid) => {
      if (sid) {
        setSocietyId(sid);
        const [s, d] = await Promise.all([getStaff(sid), getAllDocuments(sid)]);
        setStaff(s);
        setDocs(d as DocWithStaff[]);
        await loadSalaries(sid, salaryMonth);
        await loadAttendance(sid, attDate);
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (societyId) loadSalaries(societyId, salaryMonth);
  }, [societyId, salaryMonth, loadSalaries]);

  useEffect(() => {
    if (societyId) loadAttendance(societyId, attDate);
  }, [societyId, attDate, loadAttendance]);

  // Derived
  const visibleStaff = staff.filter((s) => {
    if (!showInactive && !s.is_active) return false;
    if (roleFilter !== "All" && s.role !== roleFilter) return false;
    return true;
  });

  const stats = {
    total: staff.filter((s) => s.is_active).length,
    roles: [...new Set(staff.filter((s) => s.is_active).map((s) => s.role))].length,
    salaryCost: staff.filter((s) => s.is_active).reduce((a, s) => a + s.monthly_salary, 0),
    pendingSalaries: salaries.filter((r) => r.status === "pending").length,
  };

  // ── HANDLERS ──────────────────────────────────────────────

  const handleAddStaff = async () => {
    if (!form.full_name.trim() || !form.mobile.trim() || !societyId) {
      toast.error("Name and mobile are required."); return;
    }
    setFormSubmitting(true);
    const res = await addStaff({
      societyId,
      full_name: form.full_name, mobile: form.mobile, role: form.role,
      address: form.address, joining_date: form.joining_date,
      monthly_salary: parseFloat(form.monthly_salary) || 0,
      notes: form.notes,
    });
    if (!res.success) { toast.error(res.error ?? "Failed to add staff."); setFormSubmitting(false); return; }
    toast.success("Staff member added!");
    setShowAddForm(false);
    setForm({ full_name: "", mobile: "", role: "Guard", address: "", joining_date: new Date().toISOString().slice(0, 10), monthly_salary: "", notes: "" });
    await loadStaff(societyId);
    setFormSubmitting(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !societyId) return;
    const updates: Parameters<typeof updateStaff>[1] = {
      ...(editForm.full_name && { full_name: editForm.full_name }),
      ...(editForm.mobile && { mobile: editForm.mobile }),
      ...(editForm.role && { role: editForm.role }),
      ...(editForm.address !== undefined && { address: editForm.address }),
      ...(editForm.joining_date && { joining_date: editForm.joining_date }),
      ...(editForm.monthly_salary !== undefined && { monthly_salary: parseFloat(editForm.monthly_salary as string) || 0 }),
      ...(editForm.notes !== undefined && { notes: editForm.notes }),
    };
    const res = await updateStaff(editingId, updates);
    if (!res.success) { toast.error(res.error ?? "Failed to update."); return; }
    toast.success("Staff updated!");
    setEditingId(null);
    await loadStaff(societyId);
  };

  const handleDeactivate = async (id: string) => {
    await deactivateStaff(id);
    toast.success("Staff deactivated.");
    if (societyId) await loadStaff(societyId);
  };

  const handleAddDoc = async () => {
    if (!docStaffId || !docName.trim() || !docUrl.trim() || !societyId) {
      toast.error("All document fields are required."); return;
    }
    setDocSubmitting(true);
    const res = await addDocument({
      staffId: docStaffId, societyId,
      doc_type: docType, file_name: docName, file_url: docUrl,
      uploaded_by: adminUserId ?? undefined,
    });
    if (!res.success) { toast.error(res.error ?? "Failed to add document."); setDocSubmitting(false); return; }
    toast.success("Document added!");
    setShowDocForm(false);
    setDocStaffId(""); setDocName(""); setDocUrl(""); setDocType(DOC_TYPES[0]);
    const updated = await getAllDocuments(societyId);
    setDocs(updated as DocWithStaff[]);
    setDocSubmitting(false);
  };

  const handleDeleteDoc = async (id: string) => {
    await deleteDocument(id);
    toast.success("Document removed.");
    setDocs((d) => d.filter((doc) => doc.id !== id));
  };

  const handleGenerateSalaries = async () => {
    if (!societyId) return;
    setGenerating(true);
    const res = await generateMonthlySalaries(societyId, salaryMonth);
    toast.success(`${res.created} record${res.created !== 1 ? "s" : ""} created, ${res.skipped} already existed.`);
    await loadSalaries(societyId, salaryMonth);
    setGenerating(false);
  };

  const handleMarkPaid = async () => {
    if (!payingId) return;
    setPaySubmitting(true);
    const res = await markSalaryPaid(payingId, payMethod, payNote);
    if (!res.success) { toast.error(res.error ?? "Failed."); setPaySubmitting(false); return; }
    toast.success("Salary marked as paid!");
    setPayingId(null); setPayNote("");
    if (societyId) await loadSalaries(societyId, salaryMonth);
    setPaySubmitting(false);
  };

  const handleAttendance = async (staffId: string, status: string) => {
    if (!societyId || !adminUserId) return;
    await upsertAttendance({ staffId, societyId, date: attDate, status, markedBy: adminUserId });
    setAttendance((prev) => {
      const existing = prev.find((r) => r.staff_id === staffId);
      if (existing) return prev.map((r) => r.staff_id === staffId ? { ...r, status } : r);
      return [...prev, { staff_id: staffId, status }];
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const attMap = Object.fromEntries(attendance.map((r) => [r.staff_id, r.status]));
  const activeStaff = staff.filter((s) => s.is_active);

  // ── RENDER ────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink">👷 Staff Management</h1>
        <p className="text-sm text-ink-muted mt-0.5">Society staff profiles, documents, and salary</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Staff", value: stats.total, color: "text-ink" },
          { label: "Roles", value: stats.roles, color: "text-blue-600" },
          { label: "Monthly Cost", value: formatCurrency(stats.salaryCost), color: "text-amber-600" },
          { label: "Pending Pay", value: stats.pendingSalaries, color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-border-default rounded-xl p-3 text-center">
            <p className={`text-xl font-extrabold ${color}`}>{value}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-warm-100 rounded-xl p-1 border border-border-default">
        {(["staff", "documents", "salary", "attendance"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
              tab === t ? "bg-amber-600 text-white shadow" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t === "attendance" ? "Attend." : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ══ TAB: STAFF ══════════════════════════════════════════ */}
      {tab === "staff" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-border-default rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="All">All Roles</option>
                {STAFF_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-ink-muted cursor-pointer">
                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
                Show inactive
              </label>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-1.5 rounded-xl cursor-pointer transition-colors"
            >
              + Add Staff
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="bg-white border border-amber-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <p className="font-bold text-ink text-sm">Add New Staff Member</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Full Name *", key: "full_name", placeholder: "e.g. Ramesh Kumar" },
                  { label: "Mobile *", key: "mobile", placeholder: "10-digit number" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-ink-muted block mb-1">{label}</label>
                    <input
                      type="text"
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {STAFF_ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={form.monthly_salary}
                    onChange={(e) => setForm((f) => ({ ...f, monthly_salary: e.target.value }))}
                    placeholder="e.g. 12000"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={form.joining_date}
                    onChange={(e) => setForm((f) => ({ ...f, joining_date: e.target.value }))}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Optional"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                  className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddStaff}
                  disabled={formSubmitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
                >
                  {formSubmitting ? "Adding…" : "Add Staff Member"}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {visibleStaff.length === 0 && (
            <EmptyState icon="👷" text="No staff found. Add your first staff member above." />
          )}

          {visibleStaff.map((s) => (
            <div
              key={s.id}
              className={`bg-white border border-border-default rounded-2xl p-4 shadow-sm ${!s.is_active ? "opacity-60" : ""}`}
            >
              {editingId === s.id ? (
                /* ── INLINE EDIT ── */
                <div className="space-y-3">
                  <p className="font-bold text-sm text-ink">Editing: {s.full_name}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Full Name", key: "full_name", defaultVal: s.full_name },
                      { label: "Mobile", key: "mobile", defaultVal: s.mobile },
                    ].map(({ label, key, defaultVal }) => (
                      <div key={key}>
                        <label className="text-xs font-semibold text-ink-muted block mb-1">{label}</label>
                        <input
                          type="text"
                          defaultValue={defaultVal}
                          onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-semibold text-ink-muted block mb-1">Role</label>
                      <select
                        defaultValue={s.role}
                        onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                        className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        {STAFF_ROLES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-muted block mb-1">Salary (₹)</label>
                      <input
                        type="number"
                        defaultValue={s.monthly_salary}
                        onChange={(e) => setEditForm((f) => ({ ...f, monthly_salary: e.target.value }))}
                        className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl cursor-pointer text-sm">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                /* ── STAFF CARD ── */
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">
                    <RoleIcon role={s.role} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-ink">{s.full_name}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{s.role}</span>
                      {!s.is_active && <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <p className="text-xs text-ink-muted">{s.mobile}</p>
                    <div className="flex gap-4 mt-1 text-xs text-ink-muted">
                      <span>Joined: {s.joining_date}</span>
                      <span className="font-semibold text-green-700">{formatCurrency(s.monthly_salary)}/mo</span>
                    </div>
                    {s.address && <p className="text-xs text-ink-muted mt-0.5 truncate">{s.address}</p>}
                  </div>
                  {s.is_active && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(s.id); setEditForm({}); }}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeactivate(s.id)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══ TAB: DOCUMENTS ══════════════════════════════════════ */}
      {tab === "documents" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowDocForm(!showDocForm)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
          >
            + Upload Document
          </button>

          {showDocForm && (
            <div className="bg-white border border-amber-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <p className="font-bold text-ink text-sm">Upload Staff Document</p>
              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">Staff Member *</label>
                <select
                  value={docStaffId}
                  onChange={(e) => setDocStaffId(e.target.value)}
                  className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">— Select staff —</option>
                  {activeStaff.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {DOC_TYPES.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">File Name *</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. aadhaar_ramesh.pdf"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">File URL *</label>
                <input
                  type="url"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://… (Supabase Storage URL)"
                  className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddDoc}
                  disabled={docSubmitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer text-sm"
                >
                  {docSubmitting ? "Saving…" : "Save Document"}
                </button>
                <button onClick={() => setShowDocForm(false)} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer text-sm">Cancel</button>
              </div>
            </div>
          )}

          {docs.length === 0 && <EmptyState icon="📄" text="No documents uploaded yet." />}

          {docs.map((d) => (
            <div key={d.id} className="bg-white border border-border-default rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl flex-shrink-0">📄</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-ink truncate">{d.file_name}</p>
                  <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">{d.doc_type}</span>
                </div>
                {d.staff && <p className="text-xs text-ink-muted">{d.staff.full_name} · {d.staff.role}</p>}
                <p className="text-xs text-ink-muted">{new Date(d.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={d.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-lg"
                >
                  View
                </a>
                <button
                  onClick={() => handleDeleteDoc(d.id)}
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ TAB: SALARY ═════════════════════════════════════════ */}
      {tab === "salary" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-muted">Month:</label>
              <input
                type="month"
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                className="border border-border-default rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <button
              onClick={handleGenerateSalaries}
              disabled={generating}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs px-4 py-1.5 rounded-xl cursor-pointer transition-colors"
            >
              {generating ? "Generating…" : "⚡ Generate for Month"}
            </button>
          </div>

          {/* Summary */}
          {salaries.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total", value: formatCurrency(salaries.reduce((a, r) => a + r.amount, 0)), color: "text-ink" },
                { label: "Paid", value: formatCurrency(salaries.filter((r) => r.status === "paid").reduce((a, r) => a + r.amount, 0)), color: "text-green-600" },
                { label: "Pending", value: formatCurrency(salaries.filter((r) => r.status === "pending").reduce((a, r) => a + r.amount, 0)), color: "text-red-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white border border-border-default rounded-xl p-3 text-center">
                  <p className={`text-lg font-extrabold ${color}`}>{value}</p>
                  <p className="text-[11px] text-ink-muted">{label}</p>
                </div>
              ))}
            </div>
          )}

          {salaries.length === 0 && (
            <EmptyState icon="💰" text={`No salary records for ${salaryMonth}. Click "Generate for Month" to create them.`} />
          )}

          {/* Pay modal */}
          {payingId && (
            <div className="bg-white border border-green-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <p className="font-bold text-ink text-sm">Mark Salary Paid</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Notes</label>
                  <input
                    type="text"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="Optional"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMarkPaid}
                  disabled={paySubmitting}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer text-sm"
                >
                  {paySubmitting ? "Saving…" : "Confirm Payment"}
                </button>
                <button onClick={() => { setPayingId(null); setPayNote(""); }} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer text-sm">Cancel</button>
              </div>
            </div>
          )}

          {salaries.map((r) => {
            const staffInfo = r.staff as { full_name: string; role: string } | null;
            return (
              <div
                key={r.id}
                className={`bg-white border border-border-default rounded-xl p-4 border-l-4 ${
                  r.status === "paid" ? "border-l-green-400" : "border-l-amber-400"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-ink">{staffInfo?.full_name ?? "—"}</p>
                      {staffInfo?.role && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{staffInfo.role}</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {r.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {r.month_year}
                      {r.paid_on ? ` · Paid on ${r.paid_on}` : ""}
                      {r.payment_method ? ` via ${r.payment_method}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-extrabold text-ink">{formatCurrency(r.amount)}</span>
                    {r.status === "pending" && (
                      <button
                        onClick={() => { setPayingId(r.id); setPayNote(""); }}
                        className="text-xs bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Pay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ TAB: ATTENDANCE ═════════════════════════════════════ */}
      {tab === "attendance" && (
        <div className="space-y-4">
          {/* Date picker */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-ink-muted">Date:</label>
            <input
              type="date"
              value={attDate}
              onChange={(e) => setAttDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="border border-border-default rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Summary row */}
          {activeStaff.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {(["present", "absent", "half_day", "leave"] as const).map((s) => {
                const count = attendance.filter((r) => r.status === s).length;
                const colors: Record<string, string> = {
                  present: "text-green-600 bg-green-50",
                  absent: "text-red-500 bg-red-50",
                  half_day: "text-amber-600 bg-amber-50",
                  leave: "text-blue-600 bg-blue-50",
                };
                const labels: Record<string, string> = { present: "Present", absent: "Absent", half_day: "Half Day", leave: "Leave" };
                return (
                  <div key={s} className={`rounded-xl p-2 text-center border border-border-default ${colors[s]}`}>
                    <p className="text-xl font-extrabold">{count}</p>
                    <p className="text-[10px] font-semibold">{labels[s]}</p>
                  </div>
                );
              })}
            </div>
          )}

          {activeStaff.length === 0 && (
            <EmptyState icon="📅" text="No active staff to mark attendance for." />
          )}

          {activeStaff.map((s) => {
            const current = attMap[s.id] ?? null;
            const monthSummary = attSummary[s.id];
            return (
              <div key={s.id} className="bg-white border border-border-default rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <RoleIcon role={s.role} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-ink">{s.full_name}</p>
                    <p className="text-xs text-ink-muted">{s.role}</p>
                    {monthSummary && (
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        This month: {monthSummary.present}P · {monthSummary.absent}A · {monthSummary.half_day}H · {monthSummary.leave}L
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {([
                      { value: "present", label: "P", active: "bg-green-500 text-white", inactive: "bg-green-50 text-green-700 hover:bg-green-100" },
                      { value: "absent", label: "A", active: "bg-red-500 text-white", inactive: "bg-red-50 text-red-600 hover:bg-red-100" },
                      { value: "half_day", label: "H", active: "bg-amber-500 text-white", inactive: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
                      { value: "leave", label: "L", active: "bg-blue-500 text-white", inactive: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
                    ]).map(({ value, label, active, inactive }) => (
                      <button
                        key={value}
                        onClick={() => handleAttendance(s.id, value)}
                        className={`w-8 h-8 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
                          current === value ? active : inactive
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
