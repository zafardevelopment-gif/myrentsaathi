"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import SubscriptionSection from "@/components/settings/SubscriptionSection";
import BankAccountForm from "@/components/settings/BankAccountForm";
import GstRatesSection from "@/components/settings/GstRatesSection";
import CompanyProfileSection from "@/components/settings/CompanyProfileSection";

export default function LandlordSettings() {
  const { user } = useAuth();
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  // Deep-link: /landlord/settings?section=bank → open that section and scroll to it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const section = new URLSearchParams(window.location.search).get("section");
    if (!section) return;
    setOpenPanel(section);
    setTimeout(() => document.getElementById(`settings-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  }, []);

  const CARDS = [
    { key: "profile",  label: "My Profile",    desc: `${user?.name ?? "—"} · ${user?.email ?? ""}`, icon: "👤" },
    { key: "bank",     label: "Bank Account",  desc: "Rent is deposited directly into your account via Razorpay Route", icon: "🏦" },
    { key: "whatsapp", label: "WhatsApp Notifications", desc: "Tenant alerts and reminders", icon: "📱" },
  ];

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">⚙️ Account Settings</h2>

      {CARDS.map((card) => (
        <div key={card.key} id={`settings-${card.key}`} className="bg-white rounded-[14px] border border-border-default mb-2 overflow-hidden scroll-mt-20">
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
                  <p className="text-[9px] text-ink-muted mt-2">Contact the super admin to edit your profile.</p>
                </div>
              )}

              {card.key === "bank" && user?.id && (
                <BankAccountForm
                  entityType="landlord"
                  entityId={user.id}
                  userId={user.id}
                  defaultEmail={user.email}
                  defaultPhone={(user as { phone?: string }).phone}
                />
              )}

              {card.key === "whatsapp" && (
                <div className="py-2 text-[11px] text-ink-muted">
                  WhatsApp notifications are configured at the platform level.
                  You don&apos;t need to set up anything — alerts arrive automatically.
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <CompanyProfileSection />
      <GstRatesSection />

      <SubscriptionSection planType="landlord" />
    </div>
  );
}
