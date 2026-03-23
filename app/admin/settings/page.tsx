"use client";

import { MOCK_SOCIETIES } from "@/lib/mockData";

const SETTINGS = [
  { label: "Society Profile", desc: "Name, address, registration details", icon: "🏢" },
  { label: "Bank Account", desc: "Bank details for maintenance collection", icon: "🏦" },
  { label: "Razorpay Integration", desc: "Payment gateway for online collection", icon: "💳" },
  { label: "WhatsApp API", desc: "Meta Business API for notifications", icon: "📱" },
  { label: "Maintenance Settings", desc: "Amount, frequency, due date, late fees", icon: "💰" },
  { label: "Subscription Plan", desc: `Current: ${MOCK_SOCIETIES[0].plan.toUpperCase()}`, icon: "🔑" },
];

export default function AdminSettings() {
  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">⚙️ Society Settings</h2>

      {SETTINGS.map((s) => (
        <div key={s.label} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex items-center gap-3 cursor-pointer hover:bg-warm-50 transition-colors">
          <span className="text-[22px]">{s.icon}</span>
          <div className="flex-1">
            <div className="text-sm font-bold text-ink">{s.label}</div>
            <div className="text-[11px] text-ink-muted">{s.desc}</div>
          </div>
          <span className="text-ink-muted">→</span>
        </div>
      ))}
    </div>
  );
}
