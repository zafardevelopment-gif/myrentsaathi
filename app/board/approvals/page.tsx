"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import StatusBadge from "@/components/dashboard/StatusBadge";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getBoardMemberProfile,
  getBoardExpenses,
  boardApproveExpense,
  boardRejectExpense,
  type BoardExpense,
} from "@/lib/tenant-data";

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

export default function BoardApprovals() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<BoardExpense[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const p = await getBoardMemberProfile(user!.email);
      if (p) {
        setUserId(p.user_id);
        const e = await getBoardExpenses(p.society_id);
        setExpenses(e);
      }
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  async function handleApprove(id: string) {
    if (!userId) return;
    setSaving(id);
    try {
      await boardApproveExpense(id, userId);
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
      await boardRejectExpense(id);
      setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, approval_status: "rejected" } : e));
      toast.success("Expense rejected");
    } catch {
      toast.error("Failed — check RLS policies");
    } finally {
      setSaving(null);
    }
  }

  const pendingExp = expenses.filter((e) => e.approval_status === "pending");
  const approvedExp = expenses.filter((e) => e.approval_status === "approved");

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📋 Expense Approvals</h2>
      </div>

      {/* Summary */}
      <div className="flex gap-2.5 flex-wrap mb-5">
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-yellow-600">{pendingExp.length}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Pending Review</div>
        </div>
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-green-700">{approvedExp.length}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Approved</div>
        </div>
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-ink">
            {formatCurrency(pendingExp.reduce((a, e) => a + e.amount, 0))}
          </div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Pending Amount</div>
        </div>
      </div>

      {pendingExp.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">All caught up! No pending approvals ✨</div>
      ) : (
        <>
          <h3 className="text-[13px] font-bold text-ink mb-2.5">⏳ Awaiting Approval</h3>
          {pendingExp.map((e) => (
            <div key={e.id} className="bg-white rounded-[14px] p-4 border border-border-default border-l-4 border-l-yellow-500 mb-2">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-xl flex-shrink-0">
                  {CATEGORY_ICON[e.category] || "📋"}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink">{e.description}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {e.vendor_name ?? "—"} · {e.expense_date}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-base font-extrabold text-ink">{formatCurrency(e.amount)}</div>
                  <StatusBadge status="pending" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(e.id)}
                  disabled={saving === e.id}
                  className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleReject(e.id)}
                  disabled={saving === e.id}
                  className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  ✗ Reject
                </button>
                <button className="px-4 py-2 rounded-xl bg-white border border-border-default text-xs font-semibold text-ink-muted cursor-pointer">View Bill</button>
              </div>
            </div>
          ))}
        </>
      )}

      {approvedExp.length > 0 && (
        <>
          <h3 className="text-[13px] font-bold text-ink mt-5 mb-2.5">✅ Recently Approved</h3>
          {approvedExp.map((e) => (
            <div key={e.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-1.5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-xl">{CATEGORY_ICON[e.category] || "📋"}</span>
                <div>
                  <div className="text-sm font-bold text-ink">{e.description}</div>
                  <div className="text-[11px] text-ink-muted">{e.vendor_name ?? "—"} · {e.expense_date}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-extrabold text-ink">{formatCurrency(e.amount)}</span>
                <StatusBadge status="approved" />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
