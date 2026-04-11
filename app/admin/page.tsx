"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { supabase } from "@/lib/supabase";
import {
  getAdminSociety,
  getAdminSocietyId,
  getAdminOverviewStats,
  getSocietyExpenses,
  getSocietyFlats,
  type AdminSociety,
} from "@/lib/admin-data";

export default function AdminOverview() {
  const { user } = useAuth();
  const [society, setSociety] = useState<AdminSociety | null>(null);
  const [stats, setStats] = useState<{
    totalFlats: number; occupiedFlats: number; collected: number;
    expected: number; totalExpenses: number; balance: number;
    openTickets: number; urgentTickets: number;
  } | null>(null);
  const [duesStats, setDuesStats] = useState<{
    totalExpected: number; totalCollected: number; totalRemaining: number;
    collectionPct: number; paidFlats: number; totalFlats: number;
  } | null>(null);
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
          const [s, expenses, flats] = await Promise.all([
            getAdminOverviewStats(societyId),
            getSocietyExpenses(societyId),
            getSocietyFlats(societyId),
          ]);
          setStats(s);

          // Compute society dues collection stats for current month
          const currentMonthStr = new Date().toISOString().slice(0, 7);
          const activeFlats = flats.filter(f => f.status !== "inactive");
          const monthExpenses = expenses.filter(e =>
            e.approval_status === "approved" && (e.is_recurring || e.expense_date.startsWith(currentMonthStr))
          );
          if (monthExpenses.length > 0 && activeFlats.length > 0) {
            const expenseIds = monthExpenses.map(e => e.id);
            const flatIds = activeFlats.map(f => f.id);
            const { data: payments } = await supabase
              .from("society_due_payments")
              .select("expense_id, flat_id, amount")
              .eq("month_year", currentMonthStr)
              .in("expense_id", expenseIds)
              .in("flat_id", flatIds);

            const totalExpected = monthExpenses.reduce((s, e) => s + e.amount, 0);
            const totalCollected = (payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
            const totalRemaining = Math.max(0, totalExpected - totalCollected);
            const collectionPct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

            // A flat is "fully paid" if it has a payment row for every expense this month
            const paidFlats = activeFlats.filter(flat =>
              monthExpenses.every(exp =>
                (payments ?? []).some(p => p.expense_id === exp.id && p.flat_id === flat.id)
              )
            ).length;

            setDuesStats({ totalExpected, totalCollected, totalRemaining, collectionPct, paidFlats, totalFlats: activeFlats.length });
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  if (error || !society) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[14px] p-6 text-center">
        <div className="text-red-600 font-bold mb-1">⚠️ {error ?? "Society not found"}</div>
        <div className="text-xs text-ink-muted">Make sure your account is linked to a society in the database.</div>
      </div>
    );
  }

  const pendingActions = [
    stats && stats.openTickets > 0
      ? { text: `${stats.openTickets} open ticket${stats.openTickets > 1 ? "s" : ""} need attention`, color: "border-l-red-500", action: "View Tickets" }
      : null,
    stats && stats.urgentTickets > 0
      ? { text: `${stats.urgentTickets} URGENT ticket${stats.urgentTickets > 1 ? "s" : ""} unresolved`, color: "border-l-red-500", action: "Assign" }
      : null,
    stats && stats.expected - stats.collected > 0
      ? { text: `${formatCurrency(stats.expected - stats.collected)} maintenance pending this month`, color: "border-l-yellow-500", action: "Send Reminder" }
      : null,
  ].filter(Boolean) as { text: string; color: string; action: string }[];

  return (
    <div>
      {/* Society Card */}
      <div className="bg-gradient-to-br from-brand-900 to-[#3a2a1a] text-white rounded-[14px] p-5 mb-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <div className="text-xl font-extrabold">{society.name}</div>
            <div className="text-xs opacity-70 mt-0.5">
              {society.city}, {society.state}{society.pincode ? ` - ${society.pincode}` : ""}
            </div>
            <div className="text-[11px] opacity-50 mt-0.5">
              {society.registration_number ? `Reg: ${society.registration_number} • ` : ""}
              {society.total_flats} Flats • {society.total_floors} Floors
            </div>
          </div>
          <StatusBadge status="active" label={society.subscription_plan.toUpperCase()} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        <StatCard icon="🏢" label="Total Flats" value={String(stats?.totalFlats ?? 0)} sub={`${stats?.occupiedFlats ?? 0} occupied, ${(stats?.totalFlats ?? 0) - (stats?.occupiedFlats ?? 0)} vacant`} accent="text-green-700" />
        <StatCard icon="💰" label="Maint Collected" value={formatCurrency(stats?.collected ?? 0)} sub={`${formatCurrency((stats?.expected ?? 0) - (stats?.collected ?? 0))} pending`} accent={(stats?.collected ?? 0) >= (stats?.expected ?? 1) ? "text-green-700" : "text-red-600"} />
        <StatCard icon="📋" label="Expenses" value={formatCurrency(stats?.totalExpenses ?? 0)} sub="This month" />
        <StatCard icon="🏦" label="Balance" value={formatCurrency(stats?.balance ?? 0)} accent="text-green-700" />
        <StatCard icon="🚫" label="Open Tickets" value={String(stats?.openTickets ?? 0)} sub={stats?.urgentTickets ? `${stats.urgentTickets} urgent` : undefined} accent="text-red-600" />
      </div>

      {/* Society Dues Collection This Month */}
      {duesStats && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-extrabold text-blue-900">
              💰 Society Dues Collection —{" "}
              {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${duesStats.collectionPct >= 80 ? "bg-green-100 text-green-700" : duesStats.collectionPct >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
              {duesStats.collectionPct}% collected
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-2.5 text-center border border-blue-100">
              <p className="text-sm font-extrabold text-blue-700">{formatCurrency(duesStats.totalExpected)}</p>
              <p className="text-[10px] text-ink-muted">Total Expected</p>
            </div>
            <div className="bg-white rounded-xl p-2.5 text-center border border-green-200">
              <p className="text-sm font-extrabold text-green-600">{formatCurrency(duesStats.totalCollected)}</p>
              <p className="text-[10px] text-ink-muted">Collected</p>
            </div>
            <div className="bg-white rounded-xl p-2.5 text-center border border-red-200">
              <p className="text-sm font-extrabold text-red-500">{formatCurrency(duesStats.totalRemaining)}</p>
              <p className="text-[10px] text-ink-muted">Remaining</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="w-full bg-blue-100 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${duesStats.collectionPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-ink-muted mt-1">
              <span>{duesStats.paidFlats} of {duesStats.totalFlats} flats fully paid</span>
              <span>{duesStats.totalFlats - duesStats.paidFlats} pending</span>
            </div>
          </div>
        </div>
      )}

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[15px] font-extrabold text-ink mb-3">🚨 Pending Actions</h3>
          {pendingActions.map((action, i) => (
            <div key={i} className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 ${action.color} mb-1.5 flex justify-between items-center`}>
              <span className="text-xs text-ink">{action.text}</span>
              <button className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[11px] font-bold cursor-pointer hover:bg-brand-600 transition-colors">
                {action.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {pendingActions.length === 0 && (
        <div className="bg-green-50 rounded-[14px] p-5 border border-green-100 text-center">
          <div className="text-2xl mb-1">✨</div>
          <div className="text-sm font-bold text-green-700">All caught up! No pending actions.</div>
        </div>
      )}
    </div>
  );
}
