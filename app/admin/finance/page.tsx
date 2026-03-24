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

export default function AdminFinance() {
  const { user } = useAuth();
  const [society, setSociety] = useState<AdminSociety | null>(null);
  const [payments, setPayments] = useState<AdminMaintenancePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

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
