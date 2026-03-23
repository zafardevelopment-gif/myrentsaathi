"use client";

import StatCard from "@/components/dashboard/StatCard";
import { formatCurrency } from "@/lib/utils";
import {
  MOCK_FLATS,
  MOCK_USERS,
  MOCK_SOCIETIES,
  MOCK_NOTICES,
  MOCK_RENT_PAYMENTS,
} from "@/lib/mockData";

export default function TenantHome() {
  const tenant = MOCK_USERS.find((u) => u.id === "U5")!;
  const flat = MOCK_FLATS.find((f) => f.id === "F1")!;
  const society = MOCK_SOCIETIES.find((s) => s.id === flat.societyId)!;
  const landlord = MOCK_USERS.find((u) => u.id === flat.ownerId)!;
  const myPayment = MOCK_RENT_PAYMENTS.find((r) => r.tenantName === "Rajesh Sharma");

  return (
    <div>
      {/* Hero card */}
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 text-white rounded-[14px] p-5 mb-4">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <div className="text-xs opacity-60 mb-1">Welcome home,</div>
            <div className="text-xl font-extrabold">{tenant.name}</div>
            <div className="text-xs opacity-70 mt-0.5">Flat {flat.flatNo} · {society.name}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-extrabold flex-shrink-0">
            RS
          </div>
        </div>
        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { label: "Monthly Rent", value: formatCurrency(flat.rent), color: "text-indigo-200" },
            { label: "Landlord", value: landlord.name, color: "text-white" },
            { label: "Flat Type", value: `${flat.flatNo} (${flat.type})`, color: "text-white" },
          ].map((d) => (
            <div key={d.label} className="bg-white/10 rounded-xl px-3 py-2 flex-1 min-w-[90px]">
              <div className="text-[9px] uppercase tracking-wide opacity-50">{d.label}</div>
              <div className={`text-sm font-extrabold mt-0.5 ${d.color}`}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current month status */}
      {myPayment?.status === "paid" ? (
        <div className="bg-green-50 rounded-[14px] p-4 border border-green-100 mb-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">✅</div>
              <div>
                <div className="text-sm font-extrabold text-green-700">March 2026 Rent — Paid</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {formatCurrency(myPayment.amount)} via {myPayment.method} on {myPayment.date}
                </div>
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer">
              Get Receipt
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 rounded-[14px] p-4 border border-red-100 mb-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">⚠️</div>
              <div>
                <div className="text-sm font-extrabold text-red-700">March 2026 Rent — Overdue</div>
                <div className="text-xs text-ink-muted mt-0.5">{formatCurrency(flat.rent)} due</div>
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold cursor-pointer">
              Pay Now
            </button>
          </div>
        </div>
      )}

      {/* Payment streak */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-ink">🔥 On-time Payment Streak</span>
          <span className="text-sm font-extrabold text-brand-500">4 months</span>
        </div>
        <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: "80%" }} />
        </div>
        <div className="text-[11px] text-ink-muted mt-2">Keep it up! You have a great payment record.</div>
      </div>

      {/* Recent notices */}
      <h3 className="text-[15px] font-extrabold text-ink mb-3">📢 Recent Notices</h3>
      {MOCK_NOTICES.slice(0, 2).map((n) => (
        <div key={n.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-base flex-shrink-0">📢</div>
          <div>
            <div className="text-sm font-bold text-ink">{n.title}</div>
            <div className="text-xs text-ink-muted mt-1 leading-relaxed line-clamp-2">{n.content}</div>
            <div className="text-[10px] text-ink-muted mt-1">{n.date}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
