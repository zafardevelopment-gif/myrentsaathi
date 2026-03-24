"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getAdminSocietyId,
  getSocietyExpenses,
  approveExpense,
  rejectExpense,
  type AdminExpense,
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
};

export default function AdminExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<AdminExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function load(email: string) {
    const societyId = await getAdminSocietyId(email);
    if (societyId) {
      const e = await getSocietyExpenses(societyId);
      setExpenses(e);
    }
  }

  useEffect(() => {
    if (!user?.email) return;
    setLoading(true);
    load(user.email)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleApprove(id: string) {
    setSaving(id);
    try {
      await approveExpense(id, user?.email ?? "");
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📋 Society Expenses</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Add Expense</button>
      </div>

      {/* Category Summary */}
      {categorySummary.length > 0 && (
        <div className="flex gap-2.5 flex-wrap mb-5">
          {categorySummary.map((c) => (
            <div key={c.cat} className="bg-white rounded-xl p-3 border border-border-default flex-1 min-w-[120px] text-center">
              <div className="text-lg">{c.icon}</div>
              <div className="text-sm font-extrabold text-ink">{formatCurrency(c.total)}</div>
              <div className="text-[10px] text-ink-muted capitalize">{c.cat.replace(/_/g, " ")}</div>
            </div>
          ))}
        </div>
      )}

      {/* Expense List */}
      {expenses.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No expenses found. Seed the database first.</div>
      ) : (
        expenses.map((e) => (
          <div
            key={e.id}
            className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 mb-2 ${
              e.approval_status === "approved" ? "border-l-green-500" : e.approval_status === "rejected" ? "border-l-red-500" : "border-l-yellow-500"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[13px] font-bold text-ink">{e.description}</div>
                <div className="text-[11px] text-ink-muted">
                  {e.category.replace(/_/g, " ")}{e.vendor_name ? ` • ${e.vendor_name}` : ""} • {e.expense_date}
                </div>
              </div>
              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
