"use client";

import { useState } from "react";
import StatCard from "@/components/dashboard/StatCard";

const PROMO_CODES = [
  { code: "LAUNCH50",    type: "percentage", value: 50,   maxUses: 500,  used: 234, minPlan: "any",          validTill: "2026-04-30", status: "active",  savings: 356000, createdBy: "System",            revenue: 0 },
  { code: "SOCIETY20",   type: "percentage", value: 20,   maxUses: 200,  used: 89,  minPlan: "professional", validTill: "2026-06-30", status: "active",  savings: 120000, createdBy: "Admin",             revenue: 0 },
  { code: "FLAT1000",    type: "fixed",      value: 1000, maxUses: 1000, used: 445, minPlan: "any",          validTill: "2026-12-31", status: "active",  savings: 445000, createdBy: "System",            revenue: 0 },
  { code: "AGENTRAHUL",  type: "percentage", value: 10,   maxUses: 100,  used: 45,  minPlan: "any",          validTill: "2026-12-31", status: "active",  savings: 45000,  createdBy: "Agent: Rahul Verma",revenue: 185000 },
  { code: "AGENTSNEHA",  type: "percentage", value: 10,   maxUses: 100,  used: 28,  minPlan: "any",          validTill: "2026-12-31", status: "active",  savings: 28000,  createdBy: "Agent: Sneha Kulkarni", revenue: 100000 },
  { code: "NRI30",       type: "percentage", value: 30,   maxUses: 100,  used: 28,  minPlan: "nri",          validTill: "2026-09-30", status: "active",  savings: 42000,  createdBy: "Admin",             revenue: 0 },
  { code: "DIWALI25",    type: "percentage", value: 25,   maxUses: 300,  used: 300, minPlan: "any",          validTill: "2025-11-30", status: "expired", savings: 225000, createdBy: "System",            revenue: 0 },
  { code: "SUMMER10",    type: "percentage", value: 10,   maxUses: 400,  used: 145, minPlan: "any",          validTill: "2026-08-31", status: "active",  savings: 65000,  createdBy: "Admin",             revenue: 0 },
];

export default function SuperAdminPromos() {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = PROMO_CODES.filter((p) =>
    filterStatus === "all" ? true : p.status === filterStatus
  );

  const activeCount = PROMO_CODES.filter((p) => p.status === "active").length;
  const totalSavings = PROMO_CODES.reduce((a, p) => a + p.savings, 0);
  const totalUsed = PROMO_CODES.reduce((a, p) => a + p.used, 0);
  const agentRevenue = PROMO_CODES.filter((p) => p.createdBy.startsWith("Agent")).reduce((a, p) => a + p.revenue, 0);

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        <StatCard icon="🏷️" label="Active Promo Codes" value={String(activeCount)} sub={`${PROMO_CODES.length} total`} accent="text-green-600" />
        <StatCard icon="📊" label="Total Uses" value={String(totalUsed)} sub="Across all codes" accent="text-amber-600" />
        <StatCard icon="💸" label="Discounts Given" value={`₹${(totalSavings / 100000).toFixed(2)}L`} sub="Total savings offered" accent="text-red-500" />
        <StatCard icon="💰" label="Revenue via Agent Codes" value={`₹${(agentRevenue / 1000).toFixed(0)}K`} sub="Agent-linked promos" accent="text-purple-600" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2.5 justify-between items-center mb-4">
        <div className="flex gap-2">
          {(["all", "active", "expired"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all border ${
                filterStatus === s
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-ink-muted border-border-default hover:bg-warm-50"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[12px] font-bold cursor-pointer hover:bg-amber-600 transition-colors"
        >
          + Create Promo Code
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-[14px] p-4 border-2 border-amber-300 mb-4">
          <div className="text-[13px] font-extrabold text-amber-600 mb-3">Create New Promo Code</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
            {[
              { l: "Code",            p: "e.g., SUMMER30" },
              { l: "Type",            p: "percentage / fixed" },
              { l: "Discount Value",  p: "30 (%) or 1000 (₹)" },
              { l: "Max Uses",        p: "e.g., 500" },
              { l: "Min Plan",        p: "any / professional / nri" },
              { l: "Valid Till",      p: "2026-12-31" },
              { l: "Linked Agent",    p: "Select agent (optional)" },
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
              Create Code
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Promo Codes List */}
      <div className="space-y-2.5">
        {filtered.map((p) => {
          const usedPct = Math.round((p.used / p.maxUses) * 100);
          const isNearMax = usedPct >= 90;
          return (
            <div key={p.code} className={`bg-white rounded-[14px] p-4 border ${p.status === "expired" ? "border-border-light opacity-60" : "border-border-default"}`}>
              <div className="flex flex-wrap justify-between gap-3">
                {/* Left: Code + badges */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="px-3 py-2 bg-amber-50 border border-dashed border-amber-300 rounded-xl font-mono font-extrabold text-amber-600 text-[14px] tracking-widest flex-shrink-0">
                    {p.code}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700">
                        {p.type === "percentage" ? `${p.value}% OFF` : `₹${p.value} OFF`}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.status}
                      </span>
                      {p.minPlan !== "any" && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">
                          Min: {p.minPlan}
                        </span>
                      )}
                      {p.createdBy.startsWith("Agent") && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700">
                          🤝 Agent Code
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-ink-muted">
                      Uses: {p.used}/{p.maxUses} • Valid till: {p.validTill} • By: {p.createdBy}
                    </div>
                    {/* Progress */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-warm-100 rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className={`h-full rounded-full ${isNearMax ? "bg-red-500" : "bg-amber-400"}`}
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-ink-muted">{usedPct}% used</span>
                    </div>
                  </div>
                </div>

                {/* Right: Stats */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="text-[13px] font-bold text-red-500">−₹{(p.savings / 1000).toFixed(0)}K saved</div>
                  {p.revenue > 0 && (
                    <div className="text-[12px] font-bold text-green-600">₹{(p.revenue / 1000).toFixed(0)}K revenue</div>
                  )}
                  {p.status === "active" && (
                    <div className="flex gap-1.5 mt-1">
                      <button className="px-2.5 py-1 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted hover:bg-warm-50 cursor-pointer transition-colors">
                        Edit
                      </button>
                      <button className="px-2.5 py-1 rounded-lg border border-red-200 text-[10px] font-semibold text-red-500 hover:bg-red-50 cursor-pointer transition-colors">
                        Disable
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-ink-muted text-sm">No promo codes found.</div>
        )}
      </div>
    </div>
  );
}
