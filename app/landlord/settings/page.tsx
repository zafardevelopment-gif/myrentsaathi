"use client";

import { MOCK_USERS } from "@/lib/mockData";

const SETTINGS = [
  { label: "My Profile", desc: "Vikram Malhotra · +91 98765 00001", icon: "👤" },
  { label: "Bank Account", desc: "Linked for rent collection", icon: "🏦" },
  { label: "Razorpay", desc: "Payment gateway connected", icon: "💳" },
  { label: "WhatsApp Notifications", desc: "Alerts & reminders", icon: "📱" },
  { label: "Subscription", desc: "Pro Plan · ₹999/mo", icon: "🔑" },
];

export default function LandlordSettings() {
  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">⚙️ Account Settings</h2>

      {SETTINGS.map((s) => (
        <div
          key={s.label}
          className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex items-center gap-3 cursor-pointer hover:bg-warm-50 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0">
            {s.icon}
          </div>
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
