"use client";

import { useEffect, useState, useCallback } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getAdminSocietyId,
  getSocietyExpenses,
  getSocietyFlats,
  createExpense,
  approveExpense,
  rejectExpense,
  deleteExpense,
  type AdminExpense,
  type AdminFlat,
} from "@/lib/admin-data";

const CATEGORY_ICON: Record<string, string> = {
  electricity: "⚡",
  water: "💧",
  cleaning: "🧹",
  security: "🛡️",
  lift_maintenance: "🔧",
  garden: "🌿",
  painting: "🎨",
  plumbing: "🔧",
  electrical_repair: "⚡",
  pest_control: "🐛",
  insurance: "📄",
  legal: "⚖️",
  audit: "📊",
  festival: "🎉",
  general: "🏗️",
  other: "📋",
};

const CATEGORIES = [
  "electricity", "water", "cleaning", "security", "lift_maintenance",
  "garden", "painting", "plumbing", "electrical_repair", "pest_control",
  "insurance", "legal", "audit", "festival", "general", "other",
];

type CalcMode = "total" | "per_flat" | "per_sqft";

export default function AdminExpenses() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<AdminExpense[]>([]);
  const [flats, setFlats] = useState<AdminFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: "general",
    description: "",
    vendor_name: "",
    expense_date: new Date().toISOString().slice(0, 10),
    is_recurring: false,
    recurrence_type: "monthly" as "monthly" | "weekly",
  });
  const [calcMode, setCalcMode] = useState<CalcMode>("per_flat");
  const [totalAmount, setTotalAmount] = useState("");
  const [amountPerFlat, setAmountPerFlat] = useState("");
  const [amountPerSqft, setAmountPerSqft] = useState("");

  const activeFlats = flats.filter((f) => f.status !== "inactive");
  const totalSqft = flats.reduce((sum, f) => sum + (f.area_sqft ?? 0), 0);

  // When user changes per-flat or per-sqft input, auto-update total
  function handlePerFlatChange(val: string) {
    setAmountPerFlat(val);
    const count = activeFlats.length || 1;
    const computed = (parseFloat(val) || 0) * count;
    if (computed > 0) setTotalAmount(String(computed));
    else setTotalAmount("");
  }

  function handlePerSqftChange(val: string) {
    setAmountPerSqft(val);
    const computed = (parseFloat(val) || 0) * totalSqft;
    if (computed > 0) setTotalAmount(String(computed));
    else setTotalAmount("");
  }

  // When user manually edits total, back-calculate the unit rate
  function handleTotalChange(val: string) {
    setTotalAmount(val);
    const total = parseFloat(val) || 0;
    if (calcMode === "per_flat") {
      const count = activeFlats.length || 1;
      setAmountPerFlat(total > 0 ? String(+(total / count).toFixed(2)) : "");
    } else if (calcMode === "per_sqft") {
      setAmountPerSqft(total > 0 && totalSqft > 0 ? String(+(total / totalSqft).toFixed(4)) : "");
    }
  }

  function handleCalcModeChange(mode: CalcMode) {
    setCalcMode(mode);
    // Recalculate total based on existing unit inputs when switching
    if (mode === "per_flat") {
      const count = activeFlats.length || 1;
      const computed = (parseFloat(amountPerFlat) || 0) * count;
      if (computed > 0) setTotalAmount(String(computed));
    } else if (mode === "per_sqft") {
      const computed = (parseFloat(amountPerSqft) || 0) * totalSqft;
      if (computed > 0) setTotalAmount(String(computed));
    }
  }

  const computedAmount = parseFloat(totalAmount) || 0;

  const load = useCallback(async (email: string) => {
    const sid = await getAdminSocietyId(email);
    if (sid) {
      setSocietyId(sid);
      const [e, f] = await Promise.all([getSocietyExpenses(sid), getSocietyFlats(sid)]);
      setExpenses(e);
      setFlats(f);
    }
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    setLoading(true);
    load(user.email)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, load]);

  function downloadExpenseExcel(expense: {
    description: string;
    category: string;
    vendor_name?: string | null;
    expense_date: string;
    amount: number;
    calcMode: CalcMode;
    perFlat?: number;
    perSqft?: number;
  }) {
    const perFlatAmt = expense.calcMode === "per_flat" ? expense.perFlat ?? 0 : 0;
    const perSqftRate = expense.calcMode === "per_sqft" ? expense.perSqft ?? 0 : 0;

    // Build per-flat rows
    const flatRows = activeFlats.map((f) => {
      let flatShare = 0;
      if (expense.calcMode === "per_flat") {
        flatShare = perFlatAmt;
      } else if (expense.calcMode === "per_sqft") {
        flatShare = +(perSqftRate * (f.area_sqft ?? 0)).toFixed(2);
      } else {
        flatShare = +(expense.amount / (activeFlats.length || 1)).toFixed(2);
      }
      return [
        f.flat_number,
        f.block ?? "",
        f.owner_name ?? "",
        f.area_sqft ?? "",
        flatShare,
      ];
    });

    const headers = ["flat_number", "block", "owner_name", "area_sqft", "amount_share"];
    const summaryRows = [
      ["Expense", expense.description],
      ["Category", expense.category.replace(/_/g, " ")],
      ["Vendor", expense.vendor_name ?? ""],
      ["Date", expense.expense_date],
      ["Total Amount", expense.amount],
      ["Calculation", expense.calcMode === "per_flat" ? `₹${perFlatAmt} per flat` : expense.calcMode === "per_sqft" ? `₹${perSqftRate}/sqft` : "Manual total"],
      [],
      headers,
      ...flatRows,
    ];

    const csv = summaryRows.map(row =>
      row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense_${expense.description.replace(/\s+/g, "_")}_${expense.expense_date}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleCreate() {
    if (!form.description.trim() || !societyId) {
      toast.error("Description is required."); return;
    }
    if (computedAmount <= 0) {
      toast.error("Amount must be greater than zero."); return;
    }
    setFormSubmitting(true);
    try {
      await createExpense(societyId, {
        category: form.category,
        description: form.description,
        vendor_name: form.vendor_name || undefined,
        amount: computedAmount,
        expense_date: form.expense_date,
        created_by: user!.id,
        is_recurring: form.is_recurring,
        recurrence_type: form.recurrence_type,
      });
      toast.success("Expense created!");

      // Auto-download Excel with flat-wise breakdown
      downloadExpenseExcel({
        description: form.description,
        category: form.category,
        vendor_name: form.vendor_name || null,
        expense_date: form.expense_date,
        amount: computedAmount,
        calcMode,
        perFlat: parseFloat(amountPerFlat) || 0,
        perSqft: parseFloat(amountPerSqft) || 0,
      });

      setShowForm(false);
      setForm({ category: "general", description: "", vendor_name: "", expense_date: new Date().toISOString().slice(0, 10), is_recurring: false, recurrence_type: "monthly" });
      setTotalAmount(""); setAmountPerFlat(""); setAmountPerSqft(""); setCalcMode("per_flat");
      const updated = await getSocietyExpenses(societyId);
      setExpenses(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create expense.");
      console.error("createExpense error:", e);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleApprove(id: string) {
    setSaving(id);
    try {
      await approveExpense(id);
      setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, approval_status: "approved" } : e));
      toast.success("Expense approved");
    } catch {
      toast.error("Failed — check RLS policies");
    } finally {
      setSaving(null);
    }
  }

  async function handleReject(id: string) {
    setSaving(id);
    try {
      await rejectExpense(id);
      setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, approval_status: "rejected" } : e));
      toast.success("Expense rejected");
    } catch {
      toast.error("Failed — check RLS policies");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string) {
    setSaving(id);
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setSaving(null);
    }
  }

  // Filter + Pagination state
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // Available months from expenses
  const availableMonths = Array.from(new Set(expenses.map(e => e.expense_date.slice(0, 7)))).sort().reverse();

  // Filtered list
  const filtered = expenses.filter(e => {
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (filterStatus !== "all" && e.approval_status !== filterStatus) return false;
    if (filterMonth !== "all" && !e.expense_date.startsWith(filterMonth)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !e.description?.toLowerCase().includes(q) &&
        !e.vendor_name?.toLowerCase().includes(q) &&
        !e.category.replace(/_/g, " ").toLowerCase().includes(q) &&
        !e.amount.toString().includes(q)
      ) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  const applyFilter = (fn: () => void) => { fn(); setPage(1); };

  // Category totals (from ALL expenses, not filtered)
  const categoryTotals = expenses
    .filter((e) => e.approval_status === "approved")
    .reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);
  const categorySummary = Object.entries(categoryTotals).map(([cat, total]) => ({
    cat, total, icon: CATEGORY_ICON[cat] || "📋",
  }));

  const totalApproved = expenses.filter((e) => e.approval_status === "approved").reduce((s, e) => s + e.amount, 0);
  const totalPending = expenses.filter((e) => e.approval_status === "pending").reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[14px] p-6 text-center">
        <div className="text-red-600 font-bold">⚠️ {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-ink">📋 Society Expenses</h2>
          <p className="text-xs text-ink-muted mt-0.5">Track and manage all society expenditure</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer transition-colors"
        >
          + Add Expense
        </button>
      </div>

      {/* Summary stats */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-border-default rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-green-600">{formatCurrency(totalApproved)}</p>
            <p className="text-[11px] text-ink-muted">Approved</p>
          </div>
          <div className="bg-white border border-border-default rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-amber-600">{formatCurrency(totalPending)}</p>
            <p className="text-[11px] text-ink-muted">Pending Approval</p>
          </div>
        </div>
      )}

      {/* ── CREATE EXPENSE FORM ── */}
      {showForm && (
        <div className="bg-white border border-amber-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <p className="font-bold text-ink text-sm">New Expense</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_ICON[c]} {c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted block mb-1">Expense Date</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-ink-muted block mb-1">Description *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Annual lift maintenance contract"
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-ink-muted block mb-1">Vendor / Contractor Name</label>
              <input
                type="text"
                value={form.vendor_name}
                onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))}
                placeholder="Optional"
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Recurring toggle */}
            <div className="col-span-2">
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div>
                  <div className="text-xs font-bold text-ink">Recurring Expense</div>
                  <div className="text-[11px] text-ink-muted">Auto-repeat monthly ya weekly</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_recurring: !f.is_recurring }))}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.is_recurring ? "bg-amber-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_recurring ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              {form.is_recurring && (
                <div className="flex gap-2 mt-2">
                  {(["monthly", "weekly"] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, recurrence_type: type }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer border transition-colors ${
                        form.recurrence_type === type
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-ink-muted border-border-default hover:border-amber-400"
                      }`}
                    >
                      {type === "monthly" ? "🔁 Monthly" : "📅 Weekly"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Total Amount — always shown first */}
          <div>
            <label className="text-xs font-semibold text-ink-muted block mb-1">Total Amount (₹) *</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => handleTotalChange(e.target.value)}
              placeholder="e.g. 25000"
              min="0"
              className="w-full border-2 border-amber-400 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Calculation mode */}
          <div>
            <label className="text-xs font-semibold text-ink-muted block mb-2">Auto-Calculate From</label>
            <div className="flex gap-1 bg-warm-100 rounded-xl p-1 border border-border-default mb-3">
              {([
                { key: "per_flat" as CalcMode, label: "Per Flat (Fixed)" },
                { key: "per_sqft" as CalcMode, label: "Per Sq.ft" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleCalcModeChange(key)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    calcMode === key ? "bg-amber-600 text-white shadow" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {calcMode === "per_flat" && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Amount per Flat (₹)</label>
                  <input
                    type="number"
                    value={amountPerFlat}
                    onChange={(e) => handlePerFlatChange(e.target.value)}
                    placeholder="e.g. 500"
                    min="0"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-xs text-ink-muted">
                  <span className="font-semibold text-ink">{activeFlats.length} active flats</span>
                  {amountPerFlat && parseFloat(amountPerFlat) > 0 && (
                    <span> × ₹{amountPerFlat} = <span className="font-bold text-amber-700">{formatCurrency(computedAmount)}</span></span>
                  )}
                </div>
              </div>
            )}

            {calcMode === "per_sqft" && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Rate per Sq.ft (₹)</label>
                  <input
                    type="number"
                    value={amountPerSqft}
                    onChange={(e) => handlePerSqftChange(e.target.value)}
                    placeholder="e.g. 2.5"
                    min="0"
                    step="0.01"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-xs text-ink-muted">
                  {totalSqft > 0 ? (
                    <>
                      <span className="font-semibold text-ink">{totalSqft.toLocaleString()} sq.ft</span>
                      {amountPerSqft && parseFloat(amountPerSqft) > 0 && (
                        <span> × ₹{amountPerSqft} = <span className="font-bold text-amber-700">{formatCurrency(computedAmount)}</span></span>
                      )}
                    </>
                  ) : (
                    <span className="text-amber-700">⚠️ Set area_sqft on flats to use this mode.</span>
                  )}
                </div>

                {amountPerSqft && parseFloat(amountPerSqft) > 0 && flats.some((f) => f.area_sqft) && (
                  <div className="bg-white border border-border-default rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                    <p className="text-xs font-bold text-ink-muted mb-2">Per-flat breakdown:</p>
                    {flats.filter((f) => f.area_sqft).map((f) => (
                      <div key={f.id} className="flex justify-between text-xs">
                        <span className="text-ink-muted">Flat {f.flat_number}{f.block ? ` (${f.block})` : ""}</span>
                        <span className="font-semibold text-ink">{formatCurrency((parseFloat(amountPerSqft) || 0) * (f.area_sqft ?? 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={formSubmitting || computedAmount <= 0}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
            >
              {formSubmitting ? "Creating…" : "Create Expense"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category Summary */}
      {categorySummary.length > 0 && (
        <div className="flex gap-2.5 flex-wrap">
          {categorySummary.map((c) => (
            <div key={c.cat} className="bg-white rounded-xl p-3 border border-border-default flex-1 min-w-[110px] text-center">
              <div className="text-lg">{c.icon}</div>
              <div className="text-sm font-extrabold text-ink">{formatCurrency(c.total)}</div>
              <div className="text-[10px] text-ink-muted capitalize">{c.cat.replace(/_/g, " ")}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {expenses.length > 0 && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => applyFilter(() => setSearch(e.target.value))}
            placeholder="Search by description, vendor, category, amount..."
            className="w-full pl-9 pr-4 py-2.5 border border-border-default rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {search && (
            <button onClick={() => applyFilter(() => setSearch(""))} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer text-xs">✕</button>
          )}
        </div>
      )}

      {/* Filters */}
      {expenses.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterCategory}
            onChange={e => applyFilter(() => setFilterCategory(e.target.value))}
            className="flex-1 min-w-[130px] border border-border-default rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => applyFilter(() => setFilterStatus(e.target.value))}
            className="flex-1 min-w-[120px] border border-border-default rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filterMonth}
            onChange={e => applyFilter(() => setFilterMonth(e.target.value))}
            className="flex-1 min-w-[120px] border border-border-default rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">All Months</option>
            {availableMonths.map(m => <option key={m} value={m}>{new Date(m + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>)}
          </select>
          {(filterCategory !== "all" || filterStatus !== "all" || filterMonth !== "all" || search) && (
            <button
              onClick={() => { setFilterCategory("all"); setFilterStatus("all"); setFilterMonth("all"); setSearch(""); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold cursor-pointer hover:bg-red-100"
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Expense List */}
      {expenses.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No expenses yet. Click + Add Expense to create one.</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-ink-muted text-sm">No expenses match the selected filters.</div>
      ) : (
        <>
        <div className="flex justify-between items-center text-xs text-ink-muted">
          <span>{filtered.length} expense{filtered.length !== 1 ? "s" : ""} found</span>
          <span>Page {page} of {totalPages}</span>
        </div>
        <div className="space-y-2">
          {paginated.map((e) => (
            <div
              key={e.id}
              className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 ${
                e.approval_status === "approved" ? "border-l-green-500" : e.approval_status === "rejected" ? "border-l-red-500" : "border-l-yellow-500"
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{CATEGORY_ICON[e.category] ?? "📋"}</span>
                    <div className="text-[13px] font-bold text-ink truncate">{e.description}</div>
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{e.category.replace(/_/g, " ")}{e.vendor_name ? ` · ${e.vendor_name}` : ""} · {e.expense_date}</span>
                    {e.is_recurring && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                        🔁 {e.recurrence_type ?? "recurring"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <span className="text-[15px] font-extrabold text-ink">{formatCurrency(e.amount)}</span>
                  <StatusBadge status={e.approval_status} />
                  {e.approval_status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(e.id)}
                        disabled={saving === e.id}
                        className="px-2 py-1 rounded-lg bg-green-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleReject(e.id)}
                        disabled={saving === e.id}
                        className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        ✗
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => downloadExpenseExcel({
                      description: e.description,
                      category: e.category,
                      vendor_name: e.vendor_name,
                      expense_date: e.expense_date,
                      amount: e.amount,
                      calcMode: "total",
                    })}
                    className="px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold cursor-pointer"
                    title="Download flat-wise Excel"
                  >
                    ⬇ Excel
                  </button>
                  <button
                    onClick={() => handleDelete(e.id)}
                    disabled={saving === e.id}
                    className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-border-default text-xs font-bold text-ink-muted hover:bg-warm-100 disabled:opacity-40 cursor-pointer"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-bold cursor-pointer ${
                  page === p ? "bg-amber-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-100"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-border-default text-xs font-bold text-ink-muted hover:bg-warm-100 disabled:opacity-40 cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
