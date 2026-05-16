"use client";

import { useState, useEffect } from "react";
import { getFreeTiralDays, setFreeTrialDays } from "@/lib/subscription";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────

type PlatformConfig = {
  razorpay_key_id: string;
  razorpay_key_secret: string;
  razorpay_webhook_secret: string;
  whatsapp_access_token: string;
  whatsapp_phone_number_id: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
};

const EMPTY_CONFIG: PlatformConfig = {
  razorpay_key_id: "",
  razorpay_key_secret: "",
  razorpay_webhook_secret: "",
  whatsapp_access_token: "",
  whatsapp_phone_number_id: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_password: "",
  smtp_from_email: "",
  smtp_from_name: "MyRentSaathi",
};

// ─── Settings definition ──────────────────────────────────────

const SETTING_GROUPS = [
  {
    group: "Account & Access",
    icon: "👤",
    items: [
      { icon: "🔐", title: "Super Admin Profile",        desc: "Name, email, phone, password change",                        tag: null,       editable: true,  editType: "generic" },
      { icon: "🔑", title: "Security & 2FA",             desc: "Two-factor auth, IP whitelist, session timeout",             tag: "Active",   editable: false, editType: "external" },
      { icon: "🌐", title: "API Keys",                   desc: "Platform API keys for integrations, rate limits",            tag: null,       editable: true,  editType: "generic" },
    ],
  },
  {
    group: "Payments & Billing",
    icon: "💳",
    items: [
      { icon: "🏦", title: "Platform Bank Account",     desc: "Bank details for subscription revenue collection",            tag: null,       editable: true,  editType: "generic" },
      { icon: "💳", title: "Razorpay Master Account",   desc: "Platform Razorpay keys, Route API for agent payouts",        tag: "Connected", editable: true, editType: "razorpay" },
      { icon: "💰", title: "Pricing Configuration",     desc: "Society plans, landlord plans, agreement pricing, markup",    tag: "Editable", editable: true,  editType: "pricing" },
      { icon: "🎁", title: "Free Trial Duration",        desc: "Kitne din ka free trial naye users ko milega (society + landlord)", tag: "Editable", editable: true, editType: "trial" },
      { icon: "📑", title: "Invoice Settings",           desc: "Invoice template, GST number, billing cycle",                tag: null,       editable: true,  editType: "generic" },
    ],
  },
  {
    group: "Agents & Promos",
    icon: "🤝",
    items: [
      { icon: "🤝", title: "Agent Commission Rules",    desc: "Default %, custom per-agent, payout schedule, min threshold", tag: "Editable", editable: true, editType: "commission" },
      { icon: "🏷️", title: "Promo Code Settings",      desc: "Default limits, max discount cap, auto-expiry rules",        tag: "Editable", editable: true,  editType: "generic" },
      { icon: "🔗", title: "Referral Program Settings", desc: "Reward amounts, eligible plans, auto-credit, expiry",        tag: "Editable", editable: true,  editType: "generic" },
    ],
  },
  {
    group: "Messaging & Notifications",
    icon: "📱",
    items: [
      { icon: "📱", title: "WhatsApp Business API",     desc: "Meta Cloud API credentials, webhook URLs, template mgmt",    tag: "Connected", editable: true, editType: "whatsapp" },
      { icon: "📧", title: "Email Configuration",       desc: "SMTP settings, test email, credential delivery",            tag: null,        editable: true,  editType: "smtp" },
      { icon: "🔔", title: "Super Admin Alerts",        desc: "Alert on: new signup, payment failure, support ticket, agent payout", tag: "Editable", editable: true, editType: "generic" },
    ],
  },
  {
    group: "Platform & Content",
    icon: "🌐",
    items: [
      { icon: "🌐", title: "Website Settings",          desc: "MyRentSaathi.com content, SEO, OG images, landing page",    tag: null,       editable: true,  editType: "generic" },
      { icon: "📊", title: "Report Settings",           desc: "Auto-generate weekly/monthly reports, email schedule",       tag: "Editable", editable: true,  editType: "generic" },
      { icon: "📋", title: "Legal & Compliance",        desc: "Terms of service, privacy policy, agreement disclaimers",    tag: null,       editable: true,  editType: "generic" },
      { icon: "🏗️", title: "Feature Flags",            desc: "Enable/disable features per plan or society",               tag: null,       editable: true,  editType: "generic" },
    ],
  },
  {
    group: "Infrastructure",
    icon: "🛠️",
    items: [
      { icon: "🗄️", title: "Database & Backup",       desc: "Supabase dashboard, backup schedule, data export",           tag: null,       editable: false, editType: "external" },
      { icon: "⚡", title: "n8n Automation",            desc: "n8n dashboard link, workflow status, error logs",            tag: "Running",  editable: false, editType: "external" },
      { icon: "📈", title: "Analytics & Monitoring",    desc: "Platform health, error rates, uptime, performance",          tag: null,       editable: false, editType: "external" },
      { icon: "🔄", title: "Maintenance Mode",          desc: "Put platform in maintenance — shows banner to all users",    tag: "Off",      editable: true,  editType: "generic" },
    ],
  },
];

// ─── Field Input ──────────────────────────────────────────────

function SecretField({
  label, name, value, onChange, placeholder, hint,
}: {
  label: string; name: string; value: string;
  onChange: (v: string) => void; placeholder?: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isMasked = value.includes("••••");

  return (
    <div>
      <div className="text-[10px] font-bold text-ink-muted mb-1">{label}</div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-16 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400 font-mono"
        />
        {!isMasked && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-blue-500 hover:text-blue-700"
          >
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {hint && <p className="text-[9px] text-ink-muted mt-1">{hint}</p>}
      {isMasked && (
        <p className="text-[9px] text-amber-600 mt-1">
          Existing value saved. New value type karo to replace karen.
        </p>
      )}
    </div>
  );
}

function PlainField({
  label, name, value, onChange, placeholder, hint,
}: {
  label: string; name: string; value: string;
  onChange: (v: string) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold text-ink-muted mb-1">{label}</div>
      <input
        type="text"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400 font-mono"
      />
      {hint && <p className="text-[9px] text-ink-muted mt-1">{hint}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function SuperAdminSettings() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // Free Trial
  const [freeTrialDays, setFreeTrialDaysState] = useState<number>(30);
  const [freeTrialInput, setFreeTrialInput] = useState<string>("30");
  const [savingTrial, setSavingTrial] = useState(false);

  // WhatsApp test
  const [testPhone, setTestPhone] = useState("");
  const [testingWa, setTestingWa] = useState(false);

  // SMTP test
  const [testEmail, setTestEmail] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);

  // Platform config (Razorpay + WhatsApp + SMTP)
  const [config, setConfig] = useState<PlatformConfig>(EMPTY_CONFIG);
  const [razorpayDraft, setRazorpayDraft] = useState<PlatformConfig>(EMPTY_CONFIG);
  const [whatsappDraft, setWhatsappDraft] = useState<PlatformConfig>(EMPTY_CONFIG);
  const [smtpDraft, setSmtpDraft] = useState<PlatformConfig>(EMPTY_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    getFreeTiralDays().then((days) => {
      setFreeTrialDaysState(days);
      setFreeTrialInput(String(days));
    });

    fetch("/api/platform-config")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const c: PlatformConfig = { ...EMPTY_CONFIG, ...res.config };
          setConfig(c);
          setRazorpayDraft(c);
          setWhatsappDraft(c);
          setSmtpDraft(c);
          setConfigLoaded(true);
        }
      })
      .catch(() => setConfigLoaded(true));
  }, []);

  async function handleSaveFreeTrial() {
    const days = parseInt(freeTrialInput, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error("Valid range: 1–365 days");
      return;
    }
    setSavingTrial(true);
    const result = await setFreeTrialDays(days);
    setSavingTrial(false);
    if (!result.success) { toast.error(result.error ?? "Save failed."); return; }
    setFreeTrialDaysState(days);
    toast.success(`Free trial duration set to ${days} days.`);
    setEditingItem(null);
  }

  async function handleSaveConfig(fields: Partial<PlatformConfig>) {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/platform-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Save failed");
      // Refresh masked values from server
      const refreshed = await fetch("/api/platform-config").then((r) => r.json());
      if (refreshed.success) {
        const c: PlatformConfig = { ...EMPTY_CONFIG, ...refreshed.config };
        setConfig(c);
        setRazorpayDraft(c);
        setWhatsappDraft(c);
        setSmtpDraft(c);
      }
      toast.success("Configuration saved successfully!");
      setEditingItem(null);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSavingConfig(false);
    }
  }

  function renderEditPanel(grp: string, item: (typeof SETTING_GROUPS)[0]["items"][0]) {
    const key = `${grp}-${item.title}`;
    if (editingItem !== key) return null;

    // ── Non-editable / external ──
    if (!item.editable) {
      return (
        <div className="mx-4 mb-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="text-[12px] font-bold text-blue-700 mb-1">🔗 External Configuration</div>
          <div className="text-[11px] text-ink-soft">
            This setting is managed via an external dashboard or requires backend access. Contact your developer to modify this configuration.
          </div>
          <button onClick={() => setEditingItem(null)} className="mt-2 px-3 py-1.5 rounded-xl border border-blue-200 text-[10px] font-semibold text-blue-600 cursor-pointer hover:bg-blue-100 transition-colors">
            Close
          </button>
        </div>
      );
    }

    // ── Razorpay ──
    if (item.editType === "razorpay") {
      return (
        <div className="mx-4 mb-3 p-4 bg-warm-50 rounded-xl border border-border-default">
          <div className="text-[12px] font-bold text-ink mb-1">Edit: Razorpay Master Account</div>
          <p className="text-[10px] text-ink-muted mb-3">
            Razorpay Dashboard → Settings → API Keys se keys copy karen.
            Test keys <code className="bg-gray-100 px-1 rounded">rzp_test_</code> se shuru hoti hain, live keys <code className="bg-gray-100 px-1 rounded">rzp_live_</code> se.
          </p>
          {!configLoaded ? (
            <div className="text-[11px] text-ink-muted py-4 text-center">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 mb-3">
              <PlainField
                label="Key ID (Public)"
                name="razorpay_key_id"
                value={razorpayDraft.razorpay_key_id}
                onChange={(v) => setRazorpayDraft((d) => ({ ...d, razorpay_key_id: v }))}
                placeholder="rzp_test_xxxxxxxxxxxx"
                hint="Frontend mein use hoti hai — safe to expose"
              />
              <SecretField
                label="Key Secret"
                name="razorpay_key_secret"
                value={razorpayDraft.razorpay_key_secret}
                onChange={(v) => setRazorpayDraft((d) => ({ ...d, razorpay_key_secret: v }))}
                placeholder="Enter Razorpay Key Secret"
                hint="Backend only — kabhi frontend pe expose mat karo"
              />
              <SecretField
                label="Webhook Secret"
                name="razorpay_webhook_secret"
                value={razorpayDraft.razorpay_webhook_secret}
                onChange={(v) => setRazorpayDraft((d) => ({ ...d, razorpay_webhook_secret: v }))}
                placeholder="Enter Webhook Secret (optional)"
                hint="Razorpay Dashboard → Webhooks → Secret"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              disabled={savingConfig || !configLoaded}
              onClick={() => handleSaveConfig({
                razorpay_key_id: razorpayDraft.razorpay_key_id,
                razorpay_key_secret: razorpayDraft.razorpay_key_secret,
                razorpay_webhook_secret: razorpayDraft.razorpay_webhook_secret,
              })}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors disabled:opacity-60"
            >
              {savingConfig ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => { setEditingItem(null); setRazorpayDraft(config); }} className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors">
              Cancel
            </button>
          </div>
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-[9px] text-amber-700 font-semibold">
              ⚠️ Live keys use karne se pehle ensure karen ki Razorpay account fully verified hai.
              Server restart required nahi — changes turant apply ho jaate hain.
            </p>
          </div>
        </div>
      );
    }

    // ── WhatsApp ──
    if (item.editType === "whatsapp") {
      return (
        <div className="mx-4 mb-3 p-4 bg-warm-50 rounded-xl border border-border-default">
          <div className="text-[12px] font-bold text-ink mb-1">Edit: WhatsApp Business API</div>
          <p className="text-[10px] text-ink-muted mb-3">
            Meta Business Manager → WhatsApp → API Setup se credentials copy karen.
          </p>
          {!configLoaded ? (
            <div className="text-[11px] text-ink-muted py-4 text-center">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 mb-3">
              <SecretField
                label="Access Token (Permanent)"
                name="whatsapp_access_token"
                value={whatsappDraft.whatsapp_access_token}
                onChange={(v) => setWhatsappDraft((d) => ({ ...d, whatsapp_access_token: v }))}
                placeholder="EAAxxxxxxxxxxxxxxxxx"
                hint="Meta Business Manager → System Users → Generate Token"
              />
              <PlainField
                label="Phone Number ID"
                name="whatsapp_phone_number_id"
                value={whatsappDraft.whatsapp_phone_number_id}
                onChange={(v) => setWhatsappDraft((d) => ({ ...d, whatsapp_phone_number_id: v }))}
                placeholder="61587827332804"
                hint="API Setup page pe milega — numeric ID hai"
              />
            </div>
          )}

          {/* Webhook info box */}
          <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="text-[10px] font-bold text-blue-700 mb-1">Webhook URL (Read-only)</div>
            <code className="text-[10px] text-blue-600 break-all">
              {typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/api/whatsapp/webhook
            </code>
            <p className="text-[9px] text-blue-500 mt-1">
              Yeh URL Meta Dashboard mein Webhook field mein paste karen.
            </p>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              disabled={savingConfig || !configLoaded}
              onClick={() => handleSaveConfig({
                whatsapp_access_token: whatsappDraft.whatsapp_access_token,
                whatsapp_phone_number_id: whatsappDraft.whatsapp_phone_number_id,
              })}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors disabled:opacity-60"
            >
              {savingConfig ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => { setEditingItem(null); setWhatsappDraft(config); }} className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors">
              Cancel
            </button>
          </div>

          {/* WhatsApp Test */}
          <div className="border-t border-border-default pt-3">
            <div className="text-[10px] font-bold text-ink-muted mb-2">Test WhatsApp Connection</div>
            <div className="flex gap-2">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="919876543210 (with country code)"
                className="flex-1 px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-green-400 font-mono"
              />
              <button
                disabled={testingWa || !testPhone.trim()}
                onClick={async () => {
                  setTestingWa(true);
                  try {
                    const res = await fetch("/api/whatsapp/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        to: testPhone.trim().startsWith("+") ? testPhone.trim() : `+${testPhone.trim()}`,
                        template: "hello_world",
                        params: [],
                        language: "en_US",
                      }),
                    });
                    const data = await res.json() as { success?: boolean; error?: unknown; reason?: string };
                    if (data.success) {
                      toast.success("✅ WhatsApp test message sent! Check your phone.");
                    } else {
                      const errMsg = data.reason ?? JSON.stringify(data.error ?? "Unknown error");
                      toast.error(`WhatsApp error: ${errMsg}`);
                      console.error("[WA Test]", data);
                    }
                  } catch (err) {
                    toast.error(`Network error: ${String(err)}`);
                  } finally {
                    setTestingWa(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-green-600 text-white text-[11px] font-bold cursor-pointer hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {testingWa ? "Sending..." : "Send Test"}
              </button>
            </div>
            <p className="text-[9px] text-ink-muted mt-1">
              Save karne ke baad test karen. Phone number format: 919876543210 (country code + number, no +)
            </p>
          </div>
        </div>
      );
    }

    // ── Free Trial ──
    if (item.editType === "trial") {
      return (
        <div className="mx-4 mb-3 p-4 bg-warm-50 rounded-xl border border-border-default">
          <div className="text-[12px] font-bold text-ink mb-3">Edit: {item.title}</div>
          <div className="col-span-2 mb-3">
            <div className="text-[10px] font-bold text-ink-muted mb-1">Free Trial Duration (days)</div>
            <div className="flex items-center gap-3">
              <input
                type="number" min="1" max="365" value={freeTrialInput}
                onChange={(e) => setFreeTrialInput(e.target.value)}
                className="w-32 px-3 py-2 rounded-xl border border-border-default text-[13px] font-bold text-ink bg-white focus:outline-none focus:border-amber-400"
              />
              <span className="text-[12px] text-ink-muted">days</span>
            </div>
            <p className="text-[10px] text-ink-muted mt-2">
              Currently: <strong>{freeTrialDays} din</strong> ka free trial naye users ko milta hai.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveFreeTrial} disabled={savingTrial} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors disabled:opacity-60">
              {savingTrial ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    // ── Pricing ──
    if (item.editType === "pricing") {
      return (
        <div className="mx-4 mb-3 p-4 bg-warm-50 rounded-xl border border-border-default">
          <div className="text-[12px] font-bold text-ink mb-3">Edit: {item.title}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {[
              { l: "Society Starter (₹/mo)", v: "2999" },
              { l: "Society Professional (₹/mo)", v: "5999" },
              { l: "Society Enterprise (₹/mo)", v: "9999" },
              { l: "Landlord Basic (₹/mo)", v: "499" },
              { l: "Landlord Pro (₹/mo)", v: "999" },
              { l: "Landlord NRI (₹/mo)", v: "1999" },
              { l: "WhatsApp Markup (%)", v: "55" },
            ].map((f) => (
              <div key={f.l}>
                <div className="text-[10px] font-bold text-ink-muted mb-1">{f.l}</div>
                <input defaultValue={f.v} className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors">Save Changes</button>
            <button onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors">Cancel</button>
          </div>
        </div>
      );
    }

    // ── Commission ──
    if (item.editType === "commission") {
      return (
        <div className="mx-4 mb-3 p-4 bg-warm-50 rounded-xl border border-border-default">
          <div className="text-[12px] font-bold text-ink mb-3">Edit: {item.title}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {[
              { l: "Default Commission Rate (%)", v: "15" },
              { l: "Max Commission Rate (%)", v: "25" },
              { l: "Min Payout Threshold (₹)", v: "500" },
              { l: "Payout Day 1 (date)", v: "1" },
              { l: "Payout Day 2 (date)", v: "15" },
            ].map((f) => (
              <div key={f.l}>
                <div className="text-[10px] font-bold text-ink-muted mb-1">{f.l}</div>
                <input defaultValue={f.v} className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors">Save Changes</button>
            <button onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors">Cancel</button>
          </div>
        </div>
      );
    }

    // ── SMTP ──
    if (item.editType === "smtp") {
      return (
        <div className="mx-4 mb-3 p-4 bg-warm-50 rounded-xl border border-border-default">
          <div className="text-[12px] font-bold text-ink mb-1">Edit: Email Configuration (SMTP)</div>
          <p className="text-[10px] text-ink-muted mb-3">
            Gmail ke liye: App Password use karen (2FA on hone par). Port 587 (TLS) ya 465 (SSL).
          </p>
          {!configLoaded ? (
            <div className="text-[11px] text-ink-muted py-4 text-center">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 mb-3">
              <PlainField
                label="SMTP Host"
                name="smtp_host"
                value={smtpDraft.smtp_host}
                onChange={(v) => setSmtpDraft((d) => ({ ...d, smtp_host: v }))}
                placeholder="smtp.gmail.com"
                hint="Gmail: smtp.gmail.com · Outlook: smtp.office365.com · Custom: aapka SMTP server"
              />
              <PlainField
                label="SMTP Port"
                name="smtp_port"
                value={smtpDraft.smtp_port}
                onChange={(v) => setSmtpDraft((d) => ({ ...d, smtp_port: v }))}
                placeholder="587"
                hint="587 (TLS/STARTTLS) ya 465 (SSL) — recommended: 587"
              />
              <PlainField
                label="SMTP Username / Email"
                name="smtp_user"
                value={smtpDraft.smtp_user}
                onChange={(v) => setSmtpDraft((d) => ({ ...d, smtp_user: v }))}
                placeholder="noreply@myrentsaathi.com"
                hint="Woh email address jo login karta hai SMTP server par"
              />
              <SecretField
                label="SMTP Password / App Password"
                name="smtp_password"
                value={smtpDraft.smtp_password}
                onChange={(v) => setSmtpDraft((d) => ({ ...d, smtp_password: v }))}
                placeholder="Gmail App Password ya SMTP password"
                hint="Gmail: Google Account → Security → App Passwords se generate karen"
              />
              <PlainField
                label="From Email (optional)"
                name="smtp_from_email"
                value={smtpDraft.smtp_from_email}
                onChange={(v) => setSmtpDraft((d) => ({ ...d, smtp_from_email: v }))}
                placeholder="noreply@myrentsaathi.com"
                hint="Agar blank hai to SMTP username use hoga"
              />
              <PlainField
                label="From Name"
                name="smtp_from_name"
                value={smtpDraft.smtp_from_name}
                onChange={(v) => setSmtpDraft((d) => ({ ...d, smtp_from_name: v }))}
                placeholder="MyRentSaathi"
                hint="Email mein sender ka naam dikhai dega"
              />
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button
              disabled={savingConfig || !configLoaded}
              onClick={() => handleSaveConfig({
                smtp_host: smtpDraft.smtp_host,
                smtp_port: smtpDraft.smtp_port,
                smtp_user: smtpDraft.smtp_user,
                smtp_password: smtpDraft.smtp_password,
                smtp_from_email: smtpDraft.smtp_from_email,
                smtp_from_name: smtpDraft.smtp_from_name,
              })}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors disabled:opacity-60"
            >
              {savingConfig ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => { setEditingItem(null); setSmtpDraft(config); }}
              className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Test Email */}
          <div className="border-t border-border-default pt-3">
            <div className="text-[10px] font-bold text-ink-muted mb-2">Test Email Connection</div>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1 px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400"
              />
              <button
                disabled={testingEmail || !testEmail.trim()}
                onClick={async () => {
                  setTestingEmail(true);
                  try {
                    const res = await fetch("/api/email/test", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ to: testEmail.trim() }),
                    });
                    const data = await res.json() as { success?: boolean; error?: string };
                    if (data.success) {
                      toast.success("✅ Test email sent! Inbox check karen.");
                    } else {
                      toast.error(`Email error: ${data.error ?? "Unknown"}`);
                    }
                  } catch (err) {
                    toast.error(`Network error: ${String(err)}`);
                  } finally {
                    setTestingEmail(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[11px] font-bold cursor-pointer hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {testingEmail ? "Sending..." : "Send Test"}
              </button>
            </div>
            <p className="text-[9px] text-ink-muted mt-1">
              Pehle Save karo, phir test karen. Gmail App Password required hai agar 2FA on hai.
            </p>
          </div>
        </div>
      );
    }

    // ── Generic ──
    return (
      <div className="mx-4 mb-3 p-4 bg-warm-50 rounded-xl border border-border-default">
        <div className="text-[12px] font-bold text-ink mb-3">Edit: {item.title}</div>
        <div className="mb-3">
          <div className="text-[10px] font-bold text-ink-muted mb-1">Configuration</div>
          <textarea rows={3} placeholder="Enter configuration..." className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400 resize-none" />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors">Save Changes</button>
          <button onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-center" />
      {/* Header */}
      <div className="bg-gradient-to-r from-ink to-ink-soft rounded-[14px] p-4 mb-4 border border-border-default">
        <div className="text-[16px] font-extrabold text-white mb-1">⚙️ Platform Settings</div>
        <div className="text-[12px] text-gray-400">
          Manage all platform configuration — pricing, integrations, agents, and infrastructure.
        </div>
      </div>

      {/* Settings Groups */}
      <div className="space-y-4">
        {SETTING_GROUPS.map((grp) => (
          <div key={grp.group} className="bg-white rounded-[14px] border border-border-default overflow-hidden">
            {/* Group Header */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-warm-50 cursor-pointer transition-colors border-b border-border-light"
              onClick={() => { setActiveGroup(activeGroup === grp.group ? null : grp.group); setEditingItem(null); }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{grp.icon}</span>
                <span className="text-[13px] font-extrabold text-ink">{grp.group}</span>
                <span className="text-[10px] text-ink-muted">({grp.items.length} settings)</span>
              </div>
              <span className="text-ink-muted text-[13px]">{activeGroup === grp.group ? "▲" : "▼"}</span>
            </button>

            {/* Group Items */}
            {(activeGroup === grp.group || activeGroup === null) && (
              <div>
                {grp.items.map((item, i) => (
                  <div key={item.title}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-warm-50 transition-colors ${i < grp.items.length - 1 ? "border-b border-border-light" : ""}`}
                      onClick={(e) => { e.stopPropagation(); setEditingItem(editingItem === `${grp.group}-${item.title}` ? null : `${grp.group}-${item.title}`); }}
                    >
                      <span className="text-xl flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-ink">{item.title}</div>
                        <div className="text-[11px] text-ink-muted mt-0.5">{item.desc}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.tag && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            item.tag === "Connected" || item.tag === "Active" || item.tag === "Running"
                              ? "bg-green-100 text-green-700"
                              : item.tag === "Off"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {item.title === "Free Trial Duration" ? `${freeTrialDays} days` : item.tag}
                          </span>
                        )}
                        <span className="text-ink-muted text-sm">›</span>
                      </div>
                    </div>

                    {renderEditPanel(grp.group, item)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Platform Version Footer */}
      <div className="mt-6 text-center text-[11px] text-ink-muted">
        MyRentSaathi Platform v1.4.2 • Build 2026.03.22 •
        <span className="text-green-600 font-semibold"> All systems operational ✓</span>
      </div>
    </div>
  );
}
