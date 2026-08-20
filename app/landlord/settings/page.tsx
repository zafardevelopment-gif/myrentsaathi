"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { supabase } from "@/lib/supabase";
import SubscriptionSection from "@/components/settings/SubscriptionSection";
import BankAccountForm from "@/components/settings/BankAccountForm";
import GstRatesSection from "@/components/settings/GstRatesSection";
import CompanyProfileSection from "@/components/settings/CompanyProfileSection";

function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone.trim());
}

export default function LandlordSettings() {
  const { user, updateProfile } = useAuth();
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) setProfileForm({ name: user.name, phone: user.phone ?? "" });
  }, [user]);

  async function handleSaveProfile() {
    if (!user) return;
    const name = profileForm.name.trim();
    if (!name) { toast.error("Name is required."); return; }
    if (profileForm.phone && !isValidPhone(profileForm.phone)) { toast.error("Enter a valid 10-digit mobile number."); return; }

    setSavingProfile(true);
    const { error } = await supabase.from("users").update({
      full_name: name,
      phone: profileForm.phone.trim() || null,
    }).eq("id", user.id);
    setSavingProfile(false);
    if (error) { toast.error("Failed to update profile."); return; }

    updateProfile({ name, phone: profileForm.phone.trim() });
    setEditingProfile(false);
    toast.success("Profile updated.");
  }

  async function handleChangePassword() {
    if (!user || !newPassword.trim()) return;
    if (newPassword.trim().length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setSavingPassword(true);
    const { error } = await supabase.from("users").update({ password: newPassword.trim() }).eq("id", user.id);
    setSavingPassword(false);
    if (error) { toast.error("Failed to update password."); return; }
    setEditingPassword(false);
    setNewPassword("");
    toast.success("Password updated.");
  }

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
                <div className="space-y-3">
                  {editingProfile ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-semibold text-ink-muted block mb-1">Name</label>
                        <input
                          className="w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
                          value={profileForm.name}
                          onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-ink-muted block mb-1">Phone</label>
                        <input
                          className="w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
                          placeholder="10-digit mobile"
                          maxLength={10}
                          inputMode="numeric"
                          value={profileForm.phone}
                          onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] text-ink-muted">Email</span>
                        <span className="text-[11px] font-semibold text-ink">{user?.email}</span>
                      </div>
                      <p className="text-[9px] text-ink-muted">Email is your login ID and can&apos;t be changed here — contact support if you need it updated.</p>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => { setEditingProfile(false); if (user) setProfileForm({ name: user.name, phone: user.phone ?? "" }); }} className="flex-1 py-2 rounded-xl border border-border-default text-xs font-bold text-ink-muted cursor-pointer">Cancel</button>
                        <button onClick={handleSaveProfile} disabled={savingProfile} className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">{savingProfile ? "Saving..." : "Save"}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {[
                        { label: "Name", value: user?.name },
                        { label: "Phone", value: user?.phone },
                        { label: "Email", value: user?.email },
                        { label: "Role", value: "Landlord" },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between">
                          <span className="text-[10px] text-ink-muted">{row.label}</span>
                          <span className="text-[11px] font-semibold text-ink">{row.value ?? "—"}</span>
                        </div>
                      ))}
                      <button onClick={() => setEditingProfile(true)} className="w-full mt-2 py-2 rounded-xl border border-brand-200 text-brand-600 text-[11px] font-bold cursor-pointer hover:bg-brand-50">✎ Edit Profile</button>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border-light">
                    {editingPassword ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-ink-muted block mb-1">New Password</label>
                        <input
                          autoFocus
                          className="w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
                          placeholder="New password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingPassword(false); setNewPassword(""); }} className="flex-1 py-2 rounded-xl border border-border-default text-xs font-bold text-ink-muted cursor-pointer">Cancel</button>
                          <button onClick={handleChangePassword} disabled={savingPassword || !newPassword.trim()} className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">{savingPassword ? "Saving..." : "Save"}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setEditingPassword(true)} className="w-full py-2 rounded-xl border border-border-default text-ink-muted text-[11px] font-bold cursor-pointer hover:bg-warm-50">🔑 Change Password</button>
                    )}
                  </div>
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
      <div id="settings-rates" className="scroll-mt-20">
        <GstRatesSection />
      </div>

      <SubscriptionSection planType="landlord" />
    </div>
  );
}
