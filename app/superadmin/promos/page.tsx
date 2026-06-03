"use client";

import { useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import toast, { Toaster } from "react-hot-toast";
import { PROMO_LIST, type Promo, type PromoStatus } from "@/lib/promos-data";

const EMPTY_FORM = {
  code: "", type: "percentage" as "percentage" | "fixed",
  value: "", maxUses: "", minPlan: "any", validTill: "", linkedAgent: "",
};

// ── Main Page ─────────────────────────────────────────────────

export default function SuperAdminPromos() {
  const [promos, setPromos] = useState<Promo[]>(PROMO_LIST);
  const [filterStatus, setFilterStatus] = useState<"all" | PromoStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const filtered = promos.filter((p) =>
    filterStatus === "all" ? true : p.status === filterStatus
  );

  const activeCount  = promos.filter((p) => p.status === "active").length;
  const totalSavings = promos.reduce((a, p) => a + p.savings, 0);
  const totalUsed    = promos.reduce((a, p) => a + p.used, 0);
  const agentRevenue = promos.filter((p) => p.createdBy.startsWith("Agent")).reduce((a, p) => a + p.revenue, 0);

  function openCreate() {
    setEditingCode(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setTimeout(() => document.getElementById("promo-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function openEdit(p: Promo) {
    setEditingCode(p.code);
    setForm({
      code: p.code,
      type: p.type,
      value: String(p.value),
      maxUses: String(p.maxUses),
      minPlan: p.minPlan,
      validTill: p.validTill,
      linkedAgent: p.createdBy.startsWith("Agent") ? p.createdBy.replace("Agent: ", "") : "",
    });
    setShowForm(true);
    setTimeout(() => document.getElementById("promo-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingCode(null);
    setForm(EMPTY_FORM);
  }

  function validate() {
    if (!form.code.trim()) { toast.error("Promo code required"); return false; }
    if (!/^[A-Z0-9]+$/.test(form.code.toUpperCase())) { toast.error("Code must contain only letters and numbers"); return false; }
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0) { toast.error("Valid discount value required"); return false; }
    if (form.type === "percentage" && Number(form.value) > 100) { toast.error("Percentage cannot be more than 100"); return false; }
    if (!form.maxUses || isNaN(Number(form.maxUses)) || Number(form.maxUses) <= 0) { toast.error("Valid max uses required"); return false; }
    if (!form.validTill) { toast.error("Valid till date required"); return false; }
    if (new Date(form.validTill) < new Date() && !editingCode) { toast.error("Valid-till date cannot be in the past"); return false; }
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    // Simulate async save (replace with actual API call when DB ready)
    await new Promise((r) => setTimeout(r, 600));

    const code = form.code.trim().toUpperCase();

    if (editingCode) {
      // Update existing
      setPromos((prev) => prev.map((p) =>
        p.code === editingCode
          ? {
              ...p,
              type: form.type,
              value: Number(form.value),
              maxUses: Number(form.maxUses),
              minPlan: form.minPlan,
              validTill: form.validTill,
              createdBy: form.linkedAgent ? `Agent: ${form.linkedAgent}` : p.createdBy,
            }
          : p
      ));
      toast.success(`Promo code ${editingCode} updated!`);
    } else {
      // Check duplicate
      if (promos.some((p) => p.code === code)) {
        toast.error(`Code "${code}" already exists`);
        setSaving(false);
        return;
      }
      const newPromo: Promo = {
        code,
        type: form.type,
        value: Number(form.value),
        maxUses: Number(form.maxUses),
        used: 0,
        minPlan: form.minPlan,
        validTill: form.validTill,
        status: "active",
        savings: 0,
        createdBy: form.linkedAgent ? `Agent: ${form.linkedAgent}` : "Admin",
        revenue: 0,
      };
      setPromos((prev) => [newPromo, ...prev]);
      toast.success(`Promo code ${code} created!`);
    }

    setSaving(false);
    cancelForm();
  }

  function handleDisable(code: string) {
    setPromos((prev) => prev.map((p) => p.code === code ? { ...p, status: "disabled" as PromoStatus } : p));
    toast.success(`${code} disabled`);
  }

  function handleEnable(code: string) {
    setPromos((prev) => prev.map((p) => p.code === code ? { ...p, status: "active" as PromoStatus } : p));
    toast.success(`${code} enabled`);
  }

  return (
    <div>
      <Toaster position="top-center" />

      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        <StatCard icon="🏷️" label="Active Promo Codes" value={String(activeCount)} sub={`${promos.length} total`} accent="text-green-600" />
        <StatCard icon="📊" label="Total Uses" value={String(totalUsed)} sub="Across all codes" accent="text-amber-600" />
        <StatCard icon="💸" label="Discounts Given" value={`₹${(totalSavings / 100000).toFixed(2)}L`} sub="Total savings offered" accent="text-red-500" />
        <StatCard icon="💰" label="Revenue via Agent Codes" value={`₹${(agentRevenue / 1000).toFixed(0)}K`} sub="Agent-linked promos" accent="text-purple-600" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2.5 justify-between items-center mb-4">
        <div className="flex gap-2">
          {(["all", "active", "expired", "disabled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all border ${
                filterStatus === s
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-ink-muted border-border-default hover:bg-warm-50"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[12px] font-bold cursor-pointer hover:bg-amber-600 transition-colors"
        >
          + Create Promo Code
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div id="promo-form" className="bg-white rounded-[14px] p-4 border-2 border-amber-300 mb-4">
          <div className="text-[13px] font-extrabold text-amber-600 mb-3">
            {editingCode ? `Edit: ${editingCode}` : "Create New Promo Code"}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {/* Code */}
            <div>
              <div className="text-[10px] font-bold text-ink-muted mb-1">Code <span className="text-red-400">*</span></div>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                placeholder="e.g., SUMMER30"
                disabled={!!editingCode}
                className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none focus:border-amber-400 font-mono uppercase disabled:opacity-60"
              />
            </div>

            {/* Type */}
            <div>
              <div className="text-[10px] font-bold text-ink-muted mb-1">Type <span className="text-red-400">*</span></div>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percentage" | "fixed" }))}
                className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none focus:border-amber-400"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>

            {/* Value */}
            <div>
              <div className="text-[10px] font-bold text-ink-muted mb-1">
                Discount Value <span className="text-red-400">*</span>
                <span className="font-normal ml-1">{form.type === "percentage" ? "(%)" : "(₹)"}</span>
              </div>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder={form.type === "percentage" ? "e.g., 30" : "e.g., 1000"}
                className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Max Uses */}
            <div>
              <div className="text-[10px] font-bold text-ink-muted mb-1">Max Uses <span className="text-red-400">*</span></div>
              <input
                type="number"
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="e.g., 500"
                className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Min Plan */}
            <div>
              <div className="text-[10px] font-bold text-ink-muted mb-1">Min Plan</div>
              <select
                value={form.minPlan}
                onChange={(e) => setForm((f) => ({ ...f, minPlan: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none focus:border-amber-400"
              >
                <option value="any">Any Plan</option>
                <option value="starter">Starter+</option>
                <option value="professional">Professional+</option>
                <option value="enterprise">Enterprise</option>
                <option value="nri">NRI</option>
              </select>
            </div>

            {/* Valid Till */}
            <div>
              <div className="text-[10px] font-bold text-ink-muted mb-1">Valid Till <span className="text-red-400">*</span></div>
              <input
                type="date"
                value={form.validTill}
                onChange={(e) => setForm((f) => ({ ...f, validTill: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Linked Agent */}
            <div className="col-span-2 sm:col-span-3">
              <div className="text-[10px] font-bold text-ink-muted mb-1">Linked Agent <span className="font-normal">(optional)</span></div>
              <input
                value={form.linkedAgent}
                onChange={(e) => setForm((f) => ({ ...f, linkedAgent: e.target.value }))}
                placeholder="Agent name (optional)"
                className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : editingCode ? "Save Changes" : "Create Code"}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Promo Codes List */}
      <div className="space-y-2.5">
        {filtered.map((p) => {
          const usedPct = Math.round((p.used / p.maxUses) * 100);
          const isNearMax = usedPct >= 90;
          const isDisabled = p.status === "disabled";
          return (
            <div
              key={p.code}
              className={`bg-white rounded-[14px] p-4 border ${
                p.status === "expired" || isDisabled
                  ? "border-border-light opacity-60"
                  : editingCode === p.code
                  ? "border-amber-400 ring-1 ring-amber-300"
                  : "border-border-default"
              }`}
            >
              <div className="flex flex-wrap justify-between gap-3">
                {/* Left */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="px-3 py-2 bg-amber-50 border border-dashed border-amber-300 rounded-xl font-mono font-extrabold text-amber-600 text-[14px] tracking-widest flex-shrink-0">
                    {p.code}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700">
                        {p.type === "percentage" ? `${p.value}% OFF` : `₹${p.value} OFF`}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        p.status === "active" ? "bg-green-100 text-green-700"
                        : p.status === "disabled" ? "bg-orange-100 text-orange-600"
                        : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.status}
                      </span>
                      {p.minPlan !== "any" && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">
                          Min: {p.minPlan}
                        </span>
                      )}
                      {p.createdBy.startsWith("Agent") && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700">
                          🤝 Agent Code
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-ink-muted">
                      Uses: {p.used}/{p.maxUses} • Valid till: {p.validTill} • By: {p.createdBy}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-warm-100 rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className={`h-full rounded-full ${isNearMax ? "bg-red-500" : "bg-amber-400"}`}
                          style={{ width: `${Math.min(usedPct, 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-ink-muted">{usedPct}% used</span>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="text-[13px] font-bold text-red-500">−₹{(p.savings / 1000).toFixed(0)}K saved</div>
                  {p.revenue > 0 && (
                    <div className="text-[12px] font-bold text-green-600">₹{(p.revenue / 1000).toFixed(0)}K revenue</div>
                  )}
                  {p.status !== "expired" && (
                    <div className="flex gap-1.5 mt-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="px-2.5 py-1 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted hover:bg-warm-50 cursor-pointer transition-colors"
                      >
                        Edit
                      </button>
                      {p.status === "active" ? (
                        <button
                          onClick={() => handleDisable(p.code)}
                          className="px-2.5 py-1 rounded-lg border border-red-200 text-[10px] font-semibold text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnable(p.code)}
                          className="px-2.5 py-1 rounded-lg border border-green-200 text-[10px] font-semibold text-green-600 hover:bg-green-50 cursor-pointer transition-colors"
                        >
                          Enable
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-ink-muted text-sm">No promo codes found.</div>
        )}
      </div>
    </div>
  );
}
