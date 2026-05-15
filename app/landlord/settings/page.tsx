"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import SubscriptionSection from "@/components/settings/SubscriptionSection";
import BankAccountForm from "@/components/settings/BankAccountForm";

export default function LandlordSettings() {
  const { user } = useAuth();
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const CARDS = [
    { key: "profile",  label: "My Profile",    desc: `${user?.name ?? "—"} · ${user?.email ?? ""}`, icon: "👤" },
    { key: "bank",     label: "Bank Account",  desc: "Rent directly aapke account mein aayega via Razorpay Route", icon: "🏦" },
    { key: "whatsapp", label: "WhatsApp Notifications", desc: "Tenant alerts aur reminders", icon: "📱" },
  ];

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">⚙️ Account Settings</h2>

      {CARDS.map((card) => (
        <div key={card.key} className="bg-white rounded-[14px] border border-border-default mb-2 overflow-hidden">
          <div
            className="p-4 flex items-center gap-3 cursor-pointer hover:bg-warm-50 transition-colors"
            onClick={() => setOpenPanel(openPanel === card.key ? null : card.key)}
          >
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0">
              {card.icon}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-ink">{card.label}</div>
              <div className="text-[11px] text-ink-muted">{card.desc}</div>
            </div>
            <span className="text-ink-muted text-sm">{openPanel === card.key ? "▲" : "▼"}</span>
          </div>

          {openPanel === card.key && (
            <div className="px-4 pb-4 border-t border-border-light pt-3">
              {card.key === "profile" && (
                <div className="space-y-1.5">
                  {[
                    { label: "Name", value: user?.name },
                    { label: "Email", value: user?.email },
                    { label: "Role", value: "Landlord" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-[10px] text-ink-muted">{row.label}</span>
                      <span className="text-[11px] font-semibold text-ink">{row.value ?? "—"}</span>
                    </div>
                  ))}
                  <p className="text-[9px] text-ink-muted mt-2">Profile edit karne ke liye super admin se contact karen.</p>
                </div>
              )}

              {card.key === "bank" && user?.id && (
                <BankAccountForm
                  entityType="landlord"
                  entityId={user.id}
                  userId={user.id}
                />
              )}

              {card.key === "whatsapp" && (
                <div className="py-2 text-[11px] text-ink-muted">
                  WhatsApp notifications platform-level se configure hain.
                  Aapko koi setup nahi karna — alerts automatically milenge.
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <SubscriptionSection planType="landlord" />
    </div>
  );
}
