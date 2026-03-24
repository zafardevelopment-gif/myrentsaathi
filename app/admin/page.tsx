"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getAdminSociety,
  getAdminSocietyId,
  getAdminOverviewStats,
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
          const s = await getAdminOverviewStats(societyId);
          setStats(s);
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
      <div className="flex gap-2.5 flex-wrap mb-5">
        <StatCard icon="🏢" label="Total Flats" value={String(stats?.totalFlats ?? 0)} sub={`${stats?.occupiedFlats ?? 0} occupied, ${(stats?.totalFlats ?? 0) - (stats?.occupiedFlats ?? 0)} vacant`} accent="text-green-700" />
        <StatCard icon="💰" label="Maint Collected" value={formatCurrency(stats?.collected ?? 0)} sub={`${formatCurrency((stats?.expected ?? 0) - (stats?.collected ?? 0))} pending`} accent={(stats?.collected ?? 0) >= (stats?.expected ?? 1) ? "text-green-700" : "text-red-600"} />
        <StatCard icon="📋" label="Expenses" value={formatCurrency(stats?.totalExpenses ?? 0)} sub="This month" />
        <StatCard icon="🏦" label="Balance" value={formatCurrency(stats?.balance ?? 0)} accent="text-green-700" />
        <StatCard icon="🚫" label="Open Tickets" value={String(stats?.openTickets ?? 0)} sub={stats?.urgentTickets ? `${stats.urgentTickets} urgent` : undefined} accent="text-red-600" />
      </div>

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
