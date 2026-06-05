"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getAdminSociety,
  getAdminSocietyId,
  getSocietyMaintenancePayments,
  type AdminSociety,
  type AdminMaintenancePayment,
} from "@/lib/admin-data";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

type DueReceipt = {
  id: string;
  expense_id: string;
  flat_id: string;
  amount: number;
  paid_amount: number | null;
  expected_amount: number | null;
  receipt_url: string | null;
  receipt_status: string | null;
  month_year: string;
  flat: { flat_number: string; block: string | null } | null;
  expense: { description: string } | null;
};

export default function AdminFinance() {
  const { user } = useAuth();
  const [society, setSociety] = useState<AdminSociety | null>(null);
  const [payments, setPayments] = useState<AdminMaintenancePayment[]>([]);
  const [dueReceipts, setDueReceipts] = useState<DueReceipt[]>([]);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDueReceipts(societyId: string) {
    // Maintenance receipts (offline / partial) awaiting verification, for flats
    // in this admin's society.
    const { data: flats } = await supabase.from("flats").select("id").eq("society_id", societyId);
    const flatIds = (flats ?? []).map((f) => f.id as string);
    if (flatIds.length === 0) { setDueReceipts([]); return; }
    const { data } = await supabase
      .from("society_due_payments")
      .select("id, expense_id, flat_id, amount, paid_amount, expected_amount, receipt_url, receipt_status, month_year, flat:flats(flat_number, block), expense:society_expenses(description)")
      .in("flat_id", flatIds)
      .eq("receipt_status", "pending_verification");
    setDueReceipts((data ?? []) as unknown as DueReceipt[]);
  }

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      try {
        const [soc, societyId] = await Promise.all([
          getAdminSociety(user!.email),
          getAdminSocietyId(user!.email),
        ]);
        setSociety(soc);
        if (societyId) {
          const p = await getSocietyMaintenancePayments(societyId);
          setPayments(p);
          await loadDueReceipts(societyId);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  async function handleVerifyDue(dr: DueReceipt, action: "accepted" | "rejected") {
    setVerifying(dr.id);
    const paid = dr.paid_amount ?? dr.amount ?? 0;
    const expected = dr.expected_amount ?? dr.amount ?? 0;
    const fullyPaid = paid >= expected;
    const updates: Record<string, unknown> =
      action === "accepted"
        ? { receipt_status: "accepted", status: fullyPaid ? "paid" : "pending" }
        : { receipt_status: "rejected" };
    const { error: upErr } = await supabase.from("society_due_payments").update(updates).eq("id", dr.id);
    setVerifying(null);
    if (upErr) { toast.error("Failed to update."); return; }
    toast.success(action === "accepted" ? "Maintenance payment verified!" : "Receipt rejected.");
    const societyId = await getAdminSocietyId(user!.email);
    if (societyId) await loadDueReceipts(societyId);
  }

  const totalCollected = payments.filter((m) => m.status === "paid").reduce((a, m) => a + m.amount, 0);
  const totalExpected = payments.reduce((a, m) => a + m.expected_amount, 0);

  const currentMonthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}
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
      <Toaster position="top-center" />

      {/* Maintenance receipts awaiting verification (offline / partial) */}
      {dueReceipts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-[14px] p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🕐</span>
            <span className="text-sm font-extrabold text-yellow-800">
              {dueReceipts.length} Maintenance Receipt{dueReceipts.length > 1 ? "s" : ""} Awaiting Verification
            </span>
          </div>
          <div className="space-y-2.5">
            {dueReceipts.map((dr) => {
              const paid = dr.paid_amount ?? dr.amount ?? 0;
              const expected = dr.expected_amount ?? dr.amount ?? 0;
              const isPartial = paid < expected;
              const flatLabel = dr.flat ? `Flat ${dr.flat.flat_number}${dr.flat.block ? ` (${dr.flat.block})` : ""}` : "—";
              return (
                <div key={dr.id} className="bg-white rounded-[12px] p-3.5 border border-yellow-200 flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ink">{dr.expense?.description ?? "Maintenance"}</div>
                    <div className="text-[11px] text-ink-muted">{flatLabel} · {dr.month_year}</div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      {isPartial
                        ? <>Partial: <span className="font-bold text-yellow-700">{formatCurrency(paid)}</span> of {formatCurrency(expected)}</>
                        : <>Full amount: <span className="font-bold">{formatCurrency(paid)}</span></>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {dr.receipt_url && (
                      <a href={dr.receipt_url} target="_blank" rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg border border-yellow-300 text-yellow-700 text-[10px] font-bold cursor-pointer whitespace-nowrap">
                        View Receipt ↗
                      </a>
                    )}
                    <div className="flex gap-1.5">
                      <button onClick={() => handleVerifyDue(dr, "accepted")} disabled={verifying === dr.id}
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50">
                        {verifying === dr.id ? "…" : "✓ Accept"}
                      </button>
                      <button onClick={() => handleVerifyDue(dr, "rejected")} disabled={verifying === dr.id}
                        className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50">
                        {verifying === dr.id ? "…" : "✗ Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2.5 flex-wrap mb-5">
        <StatCard icon="💰" label={`Collected (${currentMonthLabel})`} value={formatCurrency(totalCollected)} accent="text-green-700" />
        <StatCard icon="⏳" label="Pending" value={formatCurrency(totalExpected - totalCollected)} accent="text-red-600" />
        <StatCard icon="🏦" label="Net Balance" value={formatCurrency(totalCollected)} accent="text-green-700" />
      </div>

      <h3 className="text-[15px] font-extrabold text-ink mb-3">Maintenance Collection — {currentMonthLabel}</h3>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">
          No maintenance payments for this month. Seed the database first.
        </div>
      ) : (
        payments.map((mp) => {
          const flatLabel = (mp.flat as { flat_number: string; block: string | null } | null);
          const payerName = (mp.payer as { full_name: string } | null)?.full_name ?? "—";
          return (
            <div
              key={mp.id}
              className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 mb-1.5 flex justify-between items-center ${
                mp.status === "paid" ? "border-l-green-500" : mp.status === "overdue" ? "border-l-red-500" : "border-l-yellow-500"
              }`}
            >
              <div>
                <div className="text-[13px] font-bold text-ink">
                  {flatLabel ? `${flatLabel.flat_number}${flatLabel.block ? ` (${flatLabel.block})` : ""}` : "—"} — {payerName}
                </div>
                <div className="text-[11px] text-ink-muted">
                  {formatCurrency(mp.expected_amount)} due
                  {mp.payment_date ? ` • Paid ${mp.payment_date}` : ""}
                  {mp.payment_method ? ` via ${mp.payment_method}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mp.status === "paid" && (
                  <span className="text-[15px] font-extrabold text-green-700">{formatCurrency(mp.amount)}</span>
                )}
                <StatusBadge status={mp.status} />
                {mp.status !== "paid" && (
                  <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer">📱 Remind</button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
