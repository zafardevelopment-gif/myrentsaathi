"use client";

import { useState } from "react";

const SETTING_GROUPS = [
  {
    group: "Account & Access",
    icon: "👤",
    items: [
      { icon: "🔐", title: "Super Admin Profile",        desc: "Name, email, phone, password change",                        tag: null,       editable: true },
      { icon: "🔑", title: "Security & 2FA",             desc: "Two-factor auth, IP whitelist, session timeout",             tag: "Active",   editable: false },
      { icon: "🌐", title: "API Keys",                   desc: "Platform API keys for integrations, rate limits",            tag: null,       editable: false },
    ],
  },
  {
    group: "Payments & Billing",
    icon: "💳",
    items: [
      { icon: "🏦", title: "Platform Bank Account",     desc: "Bank details for subscription revenue collection",            tag: null,       editable: true },
      { icon: "💳", title: "Razorpay Master Account",   desc: "Platform Razorpay keys, Route API for agent payouts",        tag: "Connected", editable: false },
      { icon: "💰", title: "Pricing Configuration",     desc: "Society plans, landlord plans, agreement pricing, markup",    tag: "Editable", editable: true },
      { icon: "📑", title: "Invoice Settings",           desc: "Invoice template, GST number, billing cycle",                tag: null,       editable: true },
    ],
  },
  {
    group: "Agents & Promos",
    icon: "🤝",
    items: [
      { icon: "🤝", title: "Agent Commission Rules",    desc: "Default %, custom per-agent, payout schedule, min threshold", tag: "Editable", editable: true },
      { icon: "🏷️", title: "Promo Code Settings",      desc: "Default limits, max discount cap, auto-expiry rules",        tag: "Editable", editable: true },
      { icon: "🔗", title: "Referral Program Settings", desc: "Reward amounts, eligible plans, auto-credit, expiry",        tag: "Editable", editable: true },
    ],
  },
  {
    group: "Messaging & Notifications",
    icon: "📱",
    items: [
      { icon: "📱", title: "WhatsApp Business API",     desc: "Meta Cloud API credentials, webhook URLs, template mgmt",    tag: "Connected", editable: false },
      { icon: "📧", title: "Email Configuration",       desc: "SMTP settings, templates (welcome, receipt, notification)",  tag: null,        editable: true },
      { icon: "🔔", title: "Super Admin Alerts",        desc: "Alert on: new signup, payment failure, support ticket, agent payout", tag: "Editable", editable: true },
    ],
  },
  {
    group: "Platform & Content",
    icon: "🌐",
    items: [
      { icon: "🌐", title: "Website Settings",          desc: "MyRentSaathi.com content, SEO, OG images, landing page",    tag: null,       editable: true },
      { icon: "📊", title: "Report Settings",           desc: "Auto-generate weekly/monthly reports, email schedule",       tag: "Editable", editable: true },
      { icon: "📋", title: "Legal & Compliance",        desc: "Terms of service, privacy policy, agreement disclaimers",    tag: null,       editable: true },
      { icon: "🏗️", title: "Feature Flags",            desc: "Enable/disable features per plan or society",               tag: null,       editable: true },
    ],
  },
  {
    group: "Infrastructure",
    icon: "🛠️",
    items: [
      { icon: "🗄️", title: "Database & Backup",       desc: "Supabase dashboard, backup schedule, data export",           tag: null,       editable: false },
      { icon: "⚡", title: "n8n Automation",            desc: "n8n dashboard link, workflow status, error logs",            tag: "Running",  editable: false },
      { icon: "📈", title: "Analytics & Monitoring",    desc: "Platform health, error rates, uptime, performance",          tag: null,       editable: false },
      { icon: "🔄", title: "Maintenance Mode",          desc: "Put platform in maintenance — shows banner to all users",    tag: "Off",      editable: true },
    ],
  },
];

export default function SuperAdminSettings() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  return (
    <div>
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
              onClick={() => setActiveGroup(activeGroup === grp.group ? null : grp.group)}
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
                      onClick={() => setEditingItem(editingItem === `${grp.group}-${item.title}` ? null : `${grp.group}-${item.title}`)}
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
                            {item.tag}
                          </span>
                        )}
                        <span className="text-ink-muted text-sm">›</span>
                      </div>
                    </div>

                    {/* Inline edit panel */}
                    {editingItem === `${grp.group}-${item.title}` && item.editable && (
                      <div className="mx-4 mb-3 p-4 bg-warm-50 rounded-xl border border-border-default">
                        <div className="text-[12px] font-bold text-ink mb-3">
                          Edit: {item.title}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          {item.title === "Pricing Configuration" ? (
                            <>
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
                            </>
                          ) : item.title === "Agent Commission Rules" ? (
                            <>
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
                            </>
                          ) : (
                            <div className="col-span-2">
                              <div className="text-[10px] font-bold text-ink-muted mb-1">Configuration</div>
                              <textarea
                                rows={3}
                                placeholder="Enter configuration..."
                                className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400 resize-none"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors">
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* View-only panel for non-editable */}
                    {editingItem === `${grp.group}-${item.title}` && !item.editable && (
                      <div className="mx-4 mb-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="text-[12px] font-bold text-blue-700 mb-1">🔗 External Configuration</div>
                        <div className="text-[11px] text-ink-soft">
                          This setting is managed via an external dashboard or requires backend access. Contact your developer to modify this configuration.
                        </div>
                        <button
                          onClick={() => setEditingItem(null)}
                          className="mt-2 px-3 py-1.5 rounded-xl border border-blue-200 text-[10px] font-semibold text-blue-600 cursor-pointer hover:bg-blue-100 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    )}
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
