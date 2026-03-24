"use client";

import StatCard from "@/components/dashboard/StatCard";

const PLANS = [
  { id: "society-starter",       name: "Starter",       segment: "Society",   price: 2999, active: 52,  mrr: 155948,  color: "border-blue-400",   badge: "bg-blue-100 text-blue-700",   features: ["Up to 50 flats", "Basic notices", "Maintenance tracking", "1 admin user"] },
  { id: "society-professional",  name: "Professional",  segment: "Society",   price: 5999, active: 89,  mrr: 533911,  color: "border-amber-400",  badge: "bg-amber-100 text-amber-700", features: ["Up to 200 flats", "WhatsApp alerts", "Voting & polls", "3 admin users", "Document vault", "Reports"] },
  { id: "society-enterprise",    name: "Enterprise",    segment: "Society",   price: 9999, active: 31,  mrr: 309969,  color: "border-purple-400", badge: "bg-purple-100 text-purple-700", features: ["Unlimited flats", "All features", "Priority support", "Custom reports", "API access", "Dedicated AM"] },
  { id: "landlord-basic",        name: "Basic",         segment: "Landlord",  price: 499,  active: 412, mrr: 205588,  color: "border-green-400",  badge: "bg-green-100 text-green-700", features: ["Up to 2 properties", "Rent tracking", "Basic agreements"] },
  { id: "landlord-pro",          name: "Pro",           segment: "Landlord",  price: 999,  active: 489, mrr: 488511,  color: "border-cyan-400",   badge: "bg-cyan-100 text-cyan-700",   features: ["Up to 10 properties", "WhatsApp reminders", "Lawyer agreements", "Reports"] },
  { id: "landlord-nri",          name: "NRI",           segment: "Landlord",  price: 1999, active: 188, mrr: 375812,  color: "border-pink-400",   badge: "bg-pink-100 text-pink-700",   features: ["Unlimited properties", "Legal registration", "NRI-specific features", "Priority support"] },
];

const RECENT_SUBS = [
  { customer: "Ashoka Apartments", segment: "society", plan: "Professional", amount: 5999, date: "22 Mar 2026", agent: "Rahul Verma" },
  { customer: "Vikram Reddy",       segment: "landlord", plan: "Pro",        amount: 999,  date: "22 Mar 2026", agent: null },
  { customer: "Sapphire Heights",   segment: "society", plan: "Starter",    amount: 2999, date: "21 Mar 2026", agent: "Sneha Kulkarni" },
  { customer: "Meena Sharma",       segment: "landlord", plan: "Basic",      amount: 499,  date: "21 Mar 2026", agent: null },
  { customer: "Golden Gate CHS",    segment: "society", plan: "Professional", amount: 5999, date: "20 Mar 2026", agent: "Deepak Joshi" },
  { customer: "Rohit Kapoor",       segment: "landlord", plan: "NRI",         amount: 1999, date: "20 Mar 2026", agent: null },
];

const CHURNED = [
  { customer: "Sunrise Apartments", segment: "society",  plan: "Professional", reason: "Price — switched to competitor", date: "10 Mar 2026", mrr_lost: 5999 },
  { customer: "Geeta Rao",          segment: "landlord", plan: "Pro",          reason: "Property sold",                   date: "5 Mar 2026",  mrr_lost: 999 },
  { customer: "Lotus CHS",          segment: "society",  plan: "Starter",      reason: "No response after trial",         date: "2 Mar 2026",  mrr_lost: 2999 },
];

export default function SuperAdminSubscriptions() {
  const totalMrr = PLANS.reduce((a, p) => a + p.mrr, 0);
  const totalActive = PLANS.reduce((a, p) => a + p.active, 0);
  const societyMrr = PLANS.filter((p) => p.segment === "Society").reduce((a, p) => a + p.mrr, 0);
  const landlordMrr = PLANS.filter((p) => p.segment === "Landlord").reduce((a, p) => a + p.mrr, 0);

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        <StatCard icon="📋" label="Total Active Subs" value={String(totalActive)} sub="+168 this month" accent="text-green-600" />
        <StatCard icon="💰" label="Total MRR" value={`₹${(totalMrr / 100000).toFixed(2)}L`} sub="+12.5% MoM" accent="text-green-600" />
        <StatCard icon="🏢" label="Society MRR" value={`₹${(societyMrr / 100000).toFixed(2)}L`} sub={`${PLANS.filter(p=>p.segment==="Society").reduce((a,p)=>a+p.active,0)} societies`} accent="text-amber-600" />
        <StatCard icon="👤" label="Landlord MRR" value={`₹${(landlordMrr / 100000).toFixed(2)}L`} sub={`${PLANS.filter(p=>p.segment==="Landlord").reduce((a,p)=>a+p.active,0)} landlords`} accent="text-green-600" />
      </div>

      {/* Plans Grid */}
      <div className="mb-5">
        <div className="text-[14px] font-extrabold text-ink mb-3">📋 Plan Overview</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`bg-white rounded-[14px] p-4 border-2 ${plan.color}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-extrabold text-ink">{plan.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${plan.badge}`}>{plan.segment}</span>
                  </div>
                  <div className="text-[20px] font-extrabold text-ink mt-1">
                    ₹{plan.price.toLocaleString()}<span className="text-[11px] font-normal text-ink-muted">/mo</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-extrabold text-ink">{plan.active}</div>
                  <div className="text-[10px] text-ink-muted">subscribers</div>
                </div>
              </div>

              <div className="text-[12px] font-bold text-green-600 mb-2">
                MRR: ₹{(plan.mrr / 1000).toFixed(0)}K
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-current rounded-full"
                  style={{ width: `${Math.min((plan.active / 500) * 100, 100)}%`, color: plan.color.replace("border-", "").replace("-400", "-500") }}
                />
              </div>

              <div className="space-y-1">
                {plan.features.slice(0, 3).map((f) => (
                  <div key={f} className="text-[10px] text-ink-muted flex items-center gap-1.5">
                    <span className="text-green-500">✓</span> {f}
                  </div>
                ))}
                {plan.features.length > 3 && (
                  <div className="text-[10px] text-ink-muted">+{plan.features.length - 3} more features</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two columns: Recent + Churned */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Subscriptions */}
        <div className="bg-white rounded-[14px] p-4 border border-border-default">
          <div className="text-[13px] font-extrabold text-ink mb-3">🆕 Recent Subscriptions</div>
          <div className="space-y-0">
            {RECENT_SUBS.map((s, i) => (
              <div key={i} className="flex justify-between items-start py-2.5 border-b border-border-light last:border-0 gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-ink truncate">{s.customer}</div>
                  <div className="text-[10px] text-ink-muted mt-0.5">
                    {s.plan} • {s.date}
                    {s.agent && <span className="text-purple-600"> • via {s.agent}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <div className="text-[13px] font-bold text-green-600">₹{s.amount.toLocaleString()}</div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${s.segment === "society" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                    {s.segment}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Churned */}
        <div className="bg-white rounded-[14px] p-4 border border-border-default">
          <div className="text-[13px] font-extrabold text-ink mb-3">⚠️ Recent Churn</div>
          <div className="bg-red-50 rounded-xl p-3 mb-3 border border-red-100">
            <div className="text-[11px] font-bold text-red-600">
              MRR Lost This Month: ₹{CHURNED.reduce((a, c) => a + c.mrr_lost, 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-ink-muted mt-0.5">{CHURNED.length} customers churned</div>
          </div>
          <div className="space-y-0">
            {CHURNED.map((c, i) => (
              <div key={i} className="py-2.5 border-b border-border-light last:border-0">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-ink">{c.customer}</div>
                    <div className="text-[10px] text-ink-muted mt-0.5">{c.plan} • {c.date}</div>
                  </div>
                  <div className="text-[12px] font-bold text-red-500 flex-shrink-0">−₹{c.mrr_lost.toLocaleString()}</div>
                </div>
                <div className="text-[10px] text-ink-muted mt-1 italic">&quot;{c.reason}&quot;</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
