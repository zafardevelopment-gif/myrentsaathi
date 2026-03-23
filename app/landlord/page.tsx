"use client";

import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import {
  MOCK_FLATS,
  MOCK_USERS,
  MOCK_RENT_PAYMENTS,
  MOCK_SOCIETIES,
  MOCK_MAINT_PAYMENTS,
} from "@/lib/mockData";

export default function LandlordOverview() {
  const myFlats = MOCK_FLATS.filter((f) => f.ownerId === "U2");
  const landlord = MOCK_USERS.find((u) => u.id === "U2")!;
  const occupiedFlats = myFlats.filter((f) => f.status === "occupied");
  const totalRentExpected = occupiedFlats.reduce((a, f) => a + f.rent, 0);
  const rentPaid = MOCK_RENT_PAYMENTS.filter((r) => r.status === "paid").reduce((a, r) => a + r.amount, 0);
  const rentOverdue = MOCK_RENT_PAYMENTS.filter((r) => r.status === "overdue").reduce((a, r) => a + r.expected, 0);

  const alerts = [
    { text: "Priya Mehta rent ₹35,000 OVERDUE — Flat A-502", color: "border-l-red-500", action: "Send Reminder", accentBtn: "bg-red-500" },
    { text: "Sunshine Towers Flat 1502 is VACANT — list it", color: "border-l-yellow-500", action: "List Property", accentBtn: "bg-brand-500" },
    { text: "Society maintenance due for B-301 (vacant flat)", color: "border-l-yellow-500", action: "Pay Now", accentBtn: "bg-brand-500" },
  ];

  return (
    <div>
      {/* Welcome card */}
      <div className="bg-gradient-to-br from-green-900 to-green-700 text-white rounded-[14px] p-5 mb-4">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <div className="text-xs opacity-60 mb-1">Welcome back,</div>
            <div className="text-xl font-extrabold">{landlord.name}</div>
            <div className="text-xs opacity-60 mt-0.5">{myFlats.length} Properties · Landlord</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-extrabold flex-shrink-0">
            {landlord.name.split(" ").map((n) => n[0]).join("")}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-5">
        <StatCard icon="🏠" label="Properties" value={String(myFlats.length)} sub={`${occupiedFlats.length} occupied`} />
        <StatCard icon="💰" label="Expected" value={formatCurrency(totalRentExpected)} sub="This month" />
        <StatCard icon="✅" label="Collected" value={formatCurrency(rentPaid)} accent="text-green-700" />
        <StatCard icon="⏰" label="Overdue" value={formatCurrency(rentOverdue)} accent="text-red-600" />
      </div>

      {/* Collection bar */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-ink">March Rent Collection</span>
          <span className="text-sm font-extrabold text-brand-500">
            {totalRentExpected > 0 ? Math.round((rentPaid / totalRentExpected) * 100) : 0}%
          </span>
        </div>
        <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all"
            style={{ width: `${totalRentExpected > 0 ? Math.round((rentPaid / totalRentExpected) * 100) : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[11px] text-ink-muted">
          <span>{formatCurrency(rentPaid)} collected</span>
          <span>{formatCurrency(totalRentExpected)} total</span>
        </div>
      </div>

      {/* Alerts */}
      <h3 className="text-[15px] font-extrabold text-ink mb-3">⚡ Alerts</h3>
      {alerts.map((a, i) => (
        <div key={i} className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 ${a.color} mb-1.5 flex justify-between items-center gap-3`}>
          <span className="text-xs text-ink">{a.text}</span>
          <button className={`px-3 py-1.5 rounded-lg ${a.accentBtn} text-white text-[11px] font-bold cursor-pointer flex-shrink-0`}>
            {a.action}
          </button>
        </div>
      ))}
    </div>
  );
}
