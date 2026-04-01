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
  cleaning: "🧹",
  lift_maintenance: "🔧",
  security: "🛡️",
  plumbing: "🔧",
  water: "💧",
  painting: "🎨",
  gardening: "🌿",
  maintenance: "🏗️",
  other: "📋",
};

const CATEGORIES = [
  "electricity", "cleaning", "lift_maintenance", "security",
  "plumbing", "water", "painting", "gardening", "maintenance", "other",
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
    category: "maintenance",
    description: "",
    vendor_name: "",
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const [calcMode, setCalcMode] = useState<CalcMode>("total");
  const [totalAmount, setTotalAmount] = useState("");
  const [amountPerFlat, setAmountPerFlat] = useState("");
  const [amountPerSqft, setAmountPerSqft] = useState("");

  // Computed amount
  const computedAmount = (() => {
    if (calcMode === "total") return parseFloat(totalAmount) || 0;
    if (calcMode === "per_flat") {
      const activeFlats = flats.filter((f) => f.status !== "inactive").length || 1;
      return (parseFloat(amountPerFlat) || 0) * activeFlats;
    }
    if (calcMode === "per_sqft") {
      const totalSqft = flats.reduce((sum, f) => sum + (f.area_sqft ?? 0), 0);
      return (parseFloat(amountPerSqft) || 0) * totalSqft;
    }
    return 0;
  })();

  const activeFlats = flats.filter((f) => f.status !== "inactive");
  const totalSqft = flats.reduce((sum, f) => sum + (f.area_sqft ?? 0), 0);

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
      });
      toast.success("Expense created!");
      setShowForm(false);
      setForm({ category: "maintenance", description: "", vendor_name: "", expense_date: new Date().toISOString().slice(0, 10) });
      setTotalAmount(""); setAmountPerFlat(""); setAmountPerSqft("");
      setCalcMode("total");
      const updated = await getSocietyExpenses(societyId);
      setExpenses(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create expense.");
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

  // Category totals
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
          </div>

          {/* Calculation mode */}
          <div>
            <label className="text-xs font-semibold text-ink-muted block mb-2">Amount Calculation</label>
            <div className="flex gap-1 bg-warm-100 rounded-xl p-1 border border-border-default mb-3">
              {([
                { key: "total" as CalcMode, label: "Total Amount" },
                { key: "per_flat" as CalcMode, label: "Per Flat (Fixed)" },
                { key: "per_sqft" as CalcMode, label: "Per Sq.ft" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCalcMode(key)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    calcMode === key ? "bg-amber-600 text-white shadow" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {calcMode === "total" && (
              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">Total Amount (₹) *</label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="e.g. 25000"
                  min="0"
                  className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            )}

            {calcMode === "per_flat" && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Amount per Flat (₹) *</label>
                  <input
                    type="number"
                    value={amountPerFlat}
                    onChange={(e) => setAmountPerFlat(e.target.value)}
                    placeholder="e.g. 500"
                    min="0"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-xs text-ink-muted">
                  <span className="font-semibold text-ink">{activeFlats.length} active flats</span>
                  {amountPerFlat && parseFloat(amountPerFlat) > 0 && (
                    <span> · Total: <span className="font-bold text-amber-700">{formatCurrency(computedAmount)}</span></span>
                  )}
                </div>
              </div>
            )}

            {calcMode === "per_sqft" && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Rate per Sq.ft (₹) *</label>
                  <input
                    type="number"
                    value={amountPerSqft}
                    onChange={(e) => setAmountPerSqft(e.target.value)}
                    placeholder="e.g. 2.5"
                    min="0"
                    step="0.01"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-xs text-ink-muted">
                  <span className="font-semibold text-ink">
                    {totalSqft > 0 ? `${totalSqft.toLocaleString()} sq.ft total` : "No area data for flats"}
                  </span>
                  {amountPerSqft && parseFloat(amountPerSqft) > 0 && totalSqft > 0 && (
                    <span> · Total: <span className="font-bold text-amber-700">{formatCurrency(computedAmount)}</span></span>
                  )}
                  {totalSqft === 0 && (
                    <p className="text-amber-700 mt-1">⚠️ Set area_sqft on flats to use this mode.</p>
                  )}
                </div>

                {/* Per-flat breakdown */}
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

            {/* Final amount preview */}
            {computedAmount > 0 && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-xs text-ink-muted">Total Expense Amount</p>
                <p className="text-xl font-extrabold text-green-700">{formatCurrency(computedAmount)}</p>
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

      {/* Expense List */}
      {expenses.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No expenses yet. Click + Add Expense to create one.</div>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
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
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {e.category.replace(/_/g, " ")}{e.vendor_name ? ` · ${e.vendor_name}` : ""} · {e.expense_date}
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
      )}
    </div>
  );
}
