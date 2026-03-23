"use client";

import StatCard from "@/components/dashboard/StatCard";
import { formatCurrency } from "@/lib/utils";
import { MOCK_FLATS, MOCK_RENT_PAYMENTS, MOCK_MAINT_PAYMENTS } from "@/lib/mockData";

export default function LandlordReports() {
  const myFlats = MOCK_FLATS.filter((f) => f.ownerId === "U2");
  const occupiedFlats = myFlats.filter((f) => f.status === "occupied");
  const totalRent = occupiedFlats.reduce((a, f) => a + f.rent, 0);
  const maintPaid = MOCK_MAINT_PAYMENTS.filter((m) => m.payerId === "U2" && m.status === "paid").reduce((a, m) => a + m.amount, 0);
  const netIncome = totalRent - maintPaid;

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">📊 Financial Reports</h2>

      <div className="flex gap-2.5 flex-wrap mb-5">
        <StatCard icon="💰" label="Monthly Rent Income" value={formatCurrency(totalRent)} />
        <StatCard icon="🏢" label="Maintenance Paid" value={formatCurrency(maintPaid)} accent="text-yellow-600" />
        <StatCard icon="📈" label="Net Income" value={formatCurrency(netIncome)} accent="text-green-700" />
      </div>

      {/* Property-wise income */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
        <div className="text-sm font-extrabold text-ink mb-4">Property-wise Income — March 2026</div>
        {occupiedFlats.map((flat) => {
          const rp = MOCK_RENT_PAYMENTS.find((r) => r.flatNo === flat.flatNo);
          const isPaid = rp?.status === "paid";
          return (
            <div key={flat.id} className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-semibold text-ink">{flat.flatNo} — {flat.type}</span>
                <span className={`text-sm font-extrabold ${isPaid ? "text-green-700" : "text-red-600"}`}>
                  {isPaid ? formatCurrency(rp?.amount || 0) : "Overdue"}
                </span>
              </div>
              <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isPaid ? "bg-green-500" : "bg-red-400"}`}
                  style={{ width: isPaid ? "100%" : "0%" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Yearly overview */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
        <div className="text-sm font-extrabold text-ink mb-3">FY 2025–26 Summary</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Rent Collected (YTD)", value: formatCurrency(totalRent * 8) },
            { label: "Maintenance Expenses (YTD)", value: formatCurrency(maintPaid * 8) },
            { label: "Vacancy Loss", value: formatCurrency(22000 * 3) },
            { label: "Net Profit (YTD)", value: formatCurrency((totalRent - maintPaid) * 8), highlight: true },
          ].map((d) => (
            <div key={d.label} className="bg-warm-50 rounded-xl p-3">
              <div className="text-[10px] text-ink-muted">{d.label}</div>
              <div className={`text-sm font-extrabold mt-1 ${d.highlight ? "text-brand-500" : "text-ink"}`}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 py-2.5 rounded-xl border border-brand-500 text-brand-500 text-xs font-bold cursor-pointer">⬇ Download PDF</button>
        <button className="flex-1 py-2.5 rounded-xl border border-border-default text-ink-muted text-xs font-bold cursor-pointer">🧾 Tax Summary</button>
      </div>
    </div>
  );
}
