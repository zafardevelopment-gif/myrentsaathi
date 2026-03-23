"use client";

import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import {
  MOCK_SOCIETIES,
  MOCK_FLATS,
  MOCK_MAINT_PAYMENTS,
  MOCK_EXPENSES,
  MOCK_TICKETS,
} from "@/lib/mockData";

export default function AdminOverview() {
  const society = MOCK_SOCIETIES[0];
  const flats = MOCK_FLATS.filter((f) => f.societyId === "S1");
  const occupied = flats.filter((f) => f.status === "occupied").length;
  const maintPaid = MOCK_MAINT_PAYMENTS.filter((m) => m.status === "paid");
  const totalCollected = maintPaid.reduce((a, m) => a + m.amount, 0);
  const totalExpected = MOCK_MAINT_PAYMENTS.reduce((a, m) => a + m.expected, 0);
  const totalExpenses = MOCK_EXPENSES.filter((e) => e.approval === "approved").reduce((a, e) => a + e.amount, 0);
  const openTickets = MOCK_TICKETS.filter((t) => t.status !== "resolved" && t.status !== "closed").length;

  const pendingActions = [
    { text: `B-301 (Priyanka Desai) maintenance ${formatCurrency(3500)} overdue`, color: "border-l-red-500", action: "Send Reminder" },
    { text: `A-101 (Arun Joshi) maintenance ${formatCurrency(3500)} pending`, color: "border-l-yellow-500", action: "Send Reminder" },
    { text: "Lift B stuck — urgent ticket unassigned", color: "border-l-red-500", action: "Assign" },
    { text: `Pipeline repair ${formatCurrency(12000)} pending approval`, color: "border-l-yellow-500", action: "Approve" },
    { text: "AGM on 5th April — 15 days away", color: "border-l-blue-500", action: "Send Notice" },
  ];

  return (
    <div>
      {/* Society Card */}
      <div className="bg-gradient-to-br from-brand-900 to-[#3a2a1a] text-white rounded-[14px] p-5 mb-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <div className="text-xl font-extrabold">{society.name}</div>
            <div className="text-xs opacity-70 mt-0.5">
              {society.address}, {society.city} - {society.pincode}
            </div>
            <div className="text-[11px] opacity-50 mt-0.5">
              Reg: {society.regNumber} • {society.totalFlats} Flats •{" "}
              {society.totalFloors} Floors
            </div>
          </div>
          <StatusBadge status="active" label={society.plan.toUpperCase()} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-5">
        <StatCard icon="🏢" label="Total Flats" value={String(flats.length)} sub={`${occupied} occupied, ${flats.length - occupied} vacant`} accent="text-green-700" />
        <StatCard icon="💰" label="Maint Collected" value={formatCurrency(totalCollected)} sub={`${formatCurrency(totalExpected - totalCollected)} pending`} accent={totalCollected >= totalExpected ? "text-green-700" : "text-red-600"} />
        <StatCard icon="📋" label="Expenses" value={formatCurrency(totalExpenses)} sub="This month" />
        <StatCard icon="🏦" label="Balance" value={formatCurrency(totalCollected - totalExpenses)} accent="text-green-700" />
        <StatCard icon="🚫" label="Open Tickets" value={String(openTickets)} sub="1 urgent" accent="text-red-600" />
      </div>

      {/* Pending Actions */}
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
    </div>
  );
}
