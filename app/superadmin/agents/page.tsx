"use client";

import { useState } from "react";
import StatCard from "@/components/dashboard/StatCard";

const AGENTS = [
  {
    id: "AG001", name: "Rahul Verma",      city: "Mumbai",    phone: "+91 98765 11111", email: "rahul@agent.com",
    status: "active", totalSales: 45, activeSubs: 38, totalEarnings: 185000,
    pendingCommission: 24500, lastPayout: "15 Mar 2026", payoutAccount: "HDFC ****5678",
    commissionRate: 15, joinDate: "Sep 2025", promoCode: "AGENTRAHUL",
    monthlySales: [8, 9, 7, 6, 8, 7],
  },
  {
    id: "AG002", name: "Sneha Kulkarni",   city: "Pune",      phone: "+91 98765 22222", email: "sneha@agent.com",
    status: "active", totalSales: 38, activeSubs: 35, totalEarnings: 156000,
    pendingCommission: 18200, lastPayout: "15 Mar 2026", payoutAccount: "SBI ****9012",
    commissionRate: 15, joinDate: "Oct 2025", promoCode: "AGENTSNEHA",
    monthlySales: [6, 7, 6, 7, 6, 6],
  },
  {
    id: "AG003", name: "Deepak Joshi",     city: "Delhi",     phone: "+91 98765 33333", email: "deepak@agent.com",
    status: "active", totalSales: 52, activeSubs: 44, totalEarnings: 220000,
    pendingCommission: 31000, lastPayout: "15 Mar 2026", payoutAccount: "ICICI ****3456",
    commissionRate: 18, joinDate: "Aug 2025", promoCode: "AGENTDEEPAK",
    monthlySales: [9, 10, 8, 9, 9, 7],
  },
  {
    id: "AG004", name: "Priya Nair",       city: "Bangalore", phone: "+91 98765 44444", email: "priya@agent.com",
    status: "active", totalSales: 29, activeSubs: 26, totalEarnings: 118000,
    pendingCommission: 14800, lastPayout: "15 Mar 2026", payoutAccount: "Axis ****7890",
    commissionRate: 15, joinDate: "Nov 2025", promoCode: "AGENTPRIYA",
    monthlySales: [4, 5, 5, 5, 5, 5],
  },
  {
    id: "AG005", name: "Mohammed Irfan",   city: "Hyderabad", phone: "+91 98765 55555", email: "irfan@agent.com",
    status: "paused", totalSales: 15, activeSubs: 12, totalEarnings: 62000,
    pendingCommission: 0, lastPayout: "28 Feb 2026", payoutAccount: "Kotak ****1234",
    commissionRate: 12, joinDate: "Dec 2025", promoCode: "AGENTIRFAN",
    monthlySales: [4, 3, 4, 2, 2, 0],
  },
];

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

export default function SuperAdminAgents() {
  const [showPayoutModal, setShowPayoutModal] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const totalPending = AGENTS.reduce((a, ag) => a + ag.pendingCommission, 0);
  const totalPaid = AGENTS.reduce((a, ag) => a + ag.totalEarnings, 0);
  const totalSales = AGENTS.reduce((a, ag) => a + ag.totalSales, 0);
  const activeAgents = AGENTS.filter((a) => a.status === "active").length;

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        <StatCard icon="🤝" label="Total Agents" value={String(AGENTS.length)} sub={`${activeAgents} active`} accent="text-green-600" />
        <StatCard icon="💰" label="Total Commission Paid" value={`₹${(totalPaid / 1000).toFixed(0)}K`} sub="All time" accent="text-amber-600" />
        <StatCard icon="⏳" label="Pending Payouts" value={`₹${totalPending.toLocaleString()}`} sub="Due next run" accent="text-red-500" />
        <StatCard icon="📊" label="Total Sales via Agents" value={String(totalSales)} sub={`${AGENTS.reduce((a,ag)=>a+ag.activeSubs,0)} active subs`} accent="text-blue-600" />
      </div>

      {/* Add Agent Button */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-[14px] font-extrabold text-ink">🤝 Sales Agent Management</div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[12px] font-bold cursor-pointer hover:bg-amber-600 transition-colors"
        >
          + Add Agent
        </button>
      </div>

      {/* Add Agent Form */}
      {showAddForm && (
        <div className="bg-white rounded-[14px] p-4 border-2 border-amber-300 mb-4">
          <div className="text-[13px] font-extrabold text-amber-600 mb-3">Add New Agent</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            {[
              { l: "Full Name", p: "Rahul Verma" },
              { l: "City", p: "Mumbai" },
              { l: "Phone", p: "+91 98765 XXXXX" },
              { l: "Email", p: "agent@example.com" },
              { l: "Commission Rate (%)", p: "15" },
              { l: "Bank Account", p: "HDFC ****XXXX" },
            ].map((f) => (
              <div key={f.l}>
                <div className="text-[10px] font-bold text-ink-muted mb-1">{f.l}</div>
                <input
                  placeholder={f.p}
                  className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none focus:border-amber-400"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors">
              Create Agent
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Agents List */}
      <div className="space-y-3 mb-4">
        {AGENTS.map((ag) => (
          <div key={ag.id} className="bg-white rounded-[14px] p-4 border border-border-default">
            {/* Agent Header */}
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-extrabold text-[13px] flex-shrink-0">
                  {ag.name.split(" ").map((w) => w[0]).join("")}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="text-[14px] font-extrabold text-ink">{ag.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ag.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {ag.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700">
                      {ag.commissionRate}% commission
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    {ag.id} • {ag.city} • {ag.phone} • Since {ag.joinDate}
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Promo: <span className="font-mono font-bold text-amber-600">{ag.promoCode}</span> • Bank: {ag.payoutAccount}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                {ag.pendingCommission > 0 && (
                  <button
                    onClick={() => setShowPayoutModal(showPayoutModal === ag.id ? null : ag.id)}
                    className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-[11px] font-bold cursor-pointer hover:bg-green-600 transition-colors"
                  >
                    💸 Pay ₹{ag.pendingCommission.toLocaleString()}
                  </button>
                )}
                <button className="px-3 py-1.5 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors">
                  View Details
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
              {[
                { l: "Total Sales", v: String(ag.totalSales), c: "text-blue-600" },
                { l: "Active Subs", v: String(ag.activeSubs), c: "text-green-600" },
                { l: "Total Earned", v: `₹${(ag.totalEarnings / 1000).toFixed(0)}K`, c: "text-amber-600" },
                { l: "Pending", v: ag.pendingCommission > 0 ? `₹${ag.pendingCommission.toLocaleString()}` : "₹0", c: ag.pendingCommission > 0 ? "text-red-500" : "text-green-600" },
                { l: "Last Payout", v: ag.lastPayout, c: "text-ink-muted" },
              ].map((s) => (
                <div key={s.l} className="bg-warm-50 rounded-xl p-2 text-center">
                  <div className={`text-[13px] font-extrabold ${s.c}`}>{s.v}</div>
                  <div className="text-[9px] text-ink-muted mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Mini Sales Sparkline */}
            <div className="mt-3">
              <div className="text-[10px] font-bold text-ink-muted mb-1.5">Sales per month:</div>
              <div className="flex items-end gap-1 h-8">
                {ag.monthlySales.map((v, i) => {
                  const max = Math.max(...ag.monthlySales, 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded-t"
                        style={{ height: `${(v / max) * 100}%`, background: i === 5 ? "#f59e0b" : "#f59e0b40", minHeight: v > 0 ? 3 : 0 }}
                      />
                      <span className="text-[8px] text-ink-muted">{MONTHS[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payout Confirmation */}
            {showPayoutModal === ag.id && (
              <div className="mt-3 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="text-[13px] font-bold text-green-700 mb-2">💸 Confirm Commission Payout</div>
                <div className="text-[12px] text-ink leading-relaxed">
                  Agent: <strong>{ag.name}</strong> | Amount: <strong>₹{ag.pendingCommission.toLocaleString()}</strong><br />
                  Bank: <strong>{ag.payoutAccount}</strong> | Rate: <strong>{ag.commissionRate}%</strong><br />
                  Method: <strong>Razorpay Route API auto-transfer</strong>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="px-4 py-2 rounded-xl bg-green-500 text-white text-[11px] font-bold cursor-pointer hover:bg-green-600 transition-colors">
                    ✅ Confirm & Send Payment
                  </button>
                  <button
                    onClick={() => setShowPayoutModal(null)}
                    className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <div className="text-[10px] text-ink-muted mt-2">
                  Auto-payout runs on 1st &amp; 15th of each month. This is a manual payout.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* How Commission Works */}
      <div className="bg-blue-50 rounded-[14px] p-4 border border-blue-100">
        <div className="text-[13px] font-bold text-blue-700 mb-2">⚙️ Agent Commission System</div>
        <div className="text-[12px] text-ink-soft leading-relaxed">
          <strong>How it works:</strong> Customer signs up using agent&apos;s promo code → agent gets credited commission (% of first month&apos;s subscription). On 1st and 15th of every month, auto-payout runs → calculates pending amounts → sends via Razorpay Route API to agent&apos;s bank account → marks as paid → sends WhatsApp receipt to agent.
        </div>
      </div>
    </div>
  );
}
