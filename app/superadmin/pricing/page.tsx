"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getAllPricingPlans,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  togglePlanActive,
  togglePlanPopular,
  reorderPlan,
  replacePlanFeatures,
  type PricingPlan,
  type PricingPlanInput,
} from "@/lib/pricing-data";
import toast from "react-hot-toast";

// ── helpers ──────────────────────────────────────────────────
function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

const EMPTY_PLAN: PricingPlanInput = {
  plan_type: "society",
  name: "Starter",
  price: 0,
  price_yearly: null,
  duration: "monthly",
  property_limit: null,
  is_popular: false,
  is_active: true,
  sort_order: 1,
  cta_text: "Start Free Trial",
  description: "",
  badge_text: null,
};

const PLAN_NAMES: Record<"society" | "landlord", string[]> = {
  society:  ["Starter", "Professional", "Enterprise"],
  landlord: ["Basic", "Pro", "NRI"],
};

// ── Suggested features per plan type ─────────────────────────
const SUGGESTED_FEATURES: Record<string, string> = {
  "society-starter":
`30 flats management
Maintenance collection
Complaint tickets
WhatsApp reminders (500/mo)
Basic reports
Email support`,
  "society-professional":
`100 flats management
Everything in Starter
Expense management + approval
Parking management
Polls & voting
WhatsApp reminders (2,000/mo)
Document vault
Priority support`,
  "society-enterprise":
`Unlimited flats
Everything in Professional
Multi-wing/tower support
WhatsApp unlimited
Custom reports
Dedicated account manager
API access
On-call support`,
  "landlord-basic":
`3 property management
Rent collection + tracking
Tenant management
WhatsApp reminders
Payment receipts
Basic reports`,
  "landlord-pro":
`10 property management
Everything in Basic
Agreement generator (free drafts)
Tax-ready reports
Multi-society view
Priority support`,
  "landlord-nri":
`Unlimited properties
Everything in Pro
NRI tax reports
Power of Attorney support
Multi-city dashboard
WhatsApp-only management
Dedicated NRI support`,
};

function getSuggestedFeatures(planType: string, planName: string): string {
  const key = `${planType}-${planName.toLowerCase()}`;
  return SUGGESTED_FEATURES[key] ?? "";
}

// ── Plan Form Modal ───────────────────────────────────────────
function PlanFormModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: PricingPlan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!plan;
  const [form, setForm] = useState<PricingPlanInput>(
    plan ? {
      plan_type: plan.plan_type,
      name: plan.name,
      price: plan.price,
      price_yearly: plan.price_yearly,
      duration: plan.duration,
      property_limit: plan.property_limit,
      is_popular: plan.is_popular,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
      cta_text: plan.cta_text,
      description: plan.description ?? "",
      badge_text: plan.badge_text ?? "",
    } : EMPTY_PLAN
  );
  // Features as newline-separated text — pre-fill with existing or suggested
  const [featuresText, setFeaturesText] = useState(() => {
    if (plan?.features?.length) return plan.features.map((f) => f.feature_text).join("\n");
    return getSuggestedFeatures(plan?.plan_type ?? "society", plan?.name ?? "Starter");
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Plan name is required"); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        badge_text: form.badge_text || null,
        description: form.description || null,
      };

      let savedId: string;
      if (isEdit && plan) {
        await updatePricingPlan(plan.id, payload);
        savedId = plan.id;
        toast.success("Plan updated");
      } else {
        const created = await createPricingPlan(payload);
        savedId = created.id;
        toast.success("Plan created");
      }

      // Save features
      const lines = featuresText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      await replacePlanFeatures(
        savedId,
        lines.map((feature_text, i) => ({
          feature_text,
          is_highlight: false,
          sort_order: i + 1,
        }))
      );

      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[20px] w-full max-w-[560px] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border-light flex justify-between items-center">
          <div className="text-lg font-extrabold text-ink">
            {isEdit ? "Edit Plan" : "New Plan"}
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Plan type + name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-ink mb-1">Plan Type</label>
              <select
                value={form.plan_type}
                onChange={(e) => {
                  const newType = e.target.value as "society" | "landlord";
                  const defaultName = PLAN_NAMES[newType][0];
                  setForm({ ...form, plan_type: newType, name: defaultName });
                  const suggested = getSuggestedFeatures(newType, defaultName);
                  if (suggested) setFeaturesText(suggested);
                }}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="society">🏢 Society</option>
                <option value="landlord">👨‍💼 Landlord</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-ink mb-1">Plan Name *</label>
              <select
                value={form.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  setForm({ ...form, name: newName });
                  const suggested = getSuggestedFeatures(form.plan_type, newName);
                  if (suggested) setFeaturesText(suggested);
                }}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {PLAN_NAMES[form.plan_type].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-ink mb-1">Monthly Price (₹)</label>
              <input
                type="number"
                value={form.price}
                min={0}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-ink mb-1">Yearly Price (₹) — optional</label>
              <input
                type="number"
                value={form.price_yearly ?? ""}
                min={0}
                onChange={(e) => setForm({ ...form, price_yearly: e.target.value ? Number(e.target.value) : null })}
                placeholder="Leave blank if same"
                className="w-full border border-border-default rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Property limit + sort order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-ink mb-1">Property Limit (blank = unlimited)</label>
              <input
                type="number"
                value={form.property_limit ?? ""}
                min={1}
                onChange={(e) => setForm({ ...form, property_limit: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g. 100"
                className="w-full border border-border-default rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-ink mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                min={1}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* CTA text */}
          <div>
            <label className="block text-[12px] font-bold text-ink mb-1">CTA Button Text</label>
            <input
              value={form.cta_text}
              onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
              className="w-full border border-border-default rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-bold text-ink mb-1">Description (shown under price)</label>
            <input
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Up to 100 flats"
              className="w-full border border-border-default rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_popular}
                onChange={(e) => setForm({ ...form, is_popular: e.target.checked })}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-[13px] font-semibold text-ink">Most Popular</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-[13px] font-semibold text-ink">Active (visible on website)</span>
            </label>
          </div>

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[12px] font-bold text-ink">
                Features — one per line
              </label>
              <button
                type="button"
                onClick={() => {
                  const suggested = getSuggestedFeatures(form.plan_type, form.name);
                  if (suggested) setFeaturesText(suggested);
                }}
                className="text-[11px] font-bold text-brand-500 hover:text-brand-600 cursor-pointer px-2 py-0.5 rounded-lg bg-brand-50 hover:bg-brand-100 transition-colors"
              >
                ✨ Reset to suggested
              </button>
            </div>
            <textarea
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={7}
              placeholder={"30 flats management\nMaintenance collection\nWhatsApp reminders"}
              className="w-full border border-border-default rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono"
            />
            <div className="text-[11px] text-ink-muted mt-1">
              {featuresText.split("\n").filter(Boolean).length} features
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-border-default text-[13px] font-bold text-ink hover:bg-warm-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-brand-500 text-white text-[13px] font-bold hover:bg-brand-600 cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function SuperAdminPricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"society" | "landlord">("society");
  const [editPlan, setEditPlan] = useState<PricingPlan | null | "new">(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllPricingPlans();
      setPlans(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load pricing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = plans.filter((p) => p.plan_type === tab);

  async function handleDelete(plan: PricingPlan) {
    if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    try {
      await deletePricingPlan(plan.id);
      toast.success("Plan deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleToggleActive(plan: PricingPlan) {
    try {
      await togglePlanActive(plan.id, !plan.is_active);
      toast.success(plan.is_active ? "Plan hidden" : "Plan visible");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleTogglePopular(plan: PricingPlan) {
    try {
      await togglePlanPopular(plan.id, !plan.is_popular);
      toast.success(plan.is_popular ? "Removed popular badge" : "Marked as popular");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleReorder(plan: PricingPlan, dir: "up" | "down") {
    const newOrder = dir === "up"
      ? Math.max(1, plan.sort_order - 1)
      : plan.sort_order + 1;
    try {
      await reorderPlan(plan.id, newOrder);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-ink">💰 Pricing Plans</h1>
          <p className="text-[13px] text-ink-muted mt-1">
            Manage plans shown on the public website. Changes are live immediately.
          </p>
        </div>
        <button
          onClick={() => setEditPlan("new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-[13px] font-bold hover:bg-brand-600 cursor-pointer flex-shrink-0"
        >
          + New Plan
        </button>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 mb-5">
        {[
          { id: "society" as const, label: "🏢 Society Plans" },
          { id: "landlord" as const, label: "👨‍💼 Landlord Plans" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-xl text-[13px] font-bold cursor-pointer transition-all ${
              tab === t.id
                ? "bg-brand-500 text-white"
                : "bg-warm-50 text-ink-muted hover:bg-warm-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Plan Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-warm-100 rounded-[14px] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-warm-50 border border-border-default rounded-[16px] p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="font-bold text-ink mb-1">No plans yet</div>
          <div className="text-[13px] text-ink-muted mb-4">
            Create your first {tab} pricing plan.
          </div>
          <button
            onClick={() => setEditPlan("new")}
            className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-[13px] font-bold cursor-pointer"
          >
            + Create Plan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-[16px] border p-5 ${
                plan.is_popular
                  ? "border-brand-400 ring-1 ring-brand-400"
                  : "border-border-default"
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  {/* Name + badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-extrabold text-ink text-[15px]">{plan.name}</span>
                    {plan.is_popular && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 text-[10px] font-bold">
                        ⭐ MOST POPULAR
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      plan.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {plan.is_active ? "● Active" : "● Hidden"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-warm-100 text-ink-muted text-[10px] font-bold">
                      Order #{plan.sort_order}
                    </span>
                  </div>

                  {/* Price + desc */}
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-[22px] font-black text-ink">
                      {formatINR(plan.price)}<span className="text-[13px] font-normal text-ink-muted">/mo</span>
                    </span>
                    {plan.price_yearly && (
                      <span className="text-[13px] text-ink-muted">
                        {formatINR(plan.price_yearly)}/yr
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <div className="text-[12px] text-ink-muted mb-2">{plan.description}</div>
                  )}

                  {/* Features preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {(plan.features || []).slice(0, 4).map((f) => (
                      <span key={f.id} className="px-2 py-0.5 bg-warm-50 border border-border-light rounded-lg text-[11px] text-ink-muted">
                        ✓ {f.feature_text}
                      </span>
                    ))}
                    {(plan.features?.length ?? 0) > 4 && (
                      <span className="px-2 py-0.5 bg-warm-50 border border-border-light rounded-lg text-[11px] text-ink-muted">
                        +{(plan.features?.length ?? 0) - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setEditPlan(plan)}
                    className="px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 text-[12px] font-bold hover:bg-brand-100 cursor-pointer"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(plan)}
                    className="px-3 py-1.5 rounded-lg bg-warm-50 text-ink text-[12px] font-bold hover:bg-warm-100 cursor-pointer"
                  >
                    {plan.is_active ? "🙈 Hide" : "👁 Show"}
                  </button>
                  <button
                    onClick={() => handleTogglePopular(plan)}
                    className="px-3 py-1.5 rounded-lg bg-warm-50 text-ink text-[12px] font-bold hover:bg-warm-100 cursor-pointer"
                  >
                    {plan.is_popular ? "⭐ Unstar" : "☆ Popular"}
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleReorder(plan, "up")}
                      className="flex-1 py-1.5 rounded-lg bg-warm-50 text-ink-muted text-[12px] font-bold hover:bg-warm-100 cursor-pointer"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleReorder(plan, "down")}
                      className="flex-1 py-1.5 rounded-lg bg-warm-50 text-ink-muted text-[12px] font-bold hover:bg-warm-100 cursor-pointer"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[12px] font-bold hover:bg-red-100 cursor-pointer"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {!loading && (
        <div className="mt-4 p-3 bg-warm-50 rounded-[12px] text-[12px] text-ink-muted flex gap-4">
          <span>Total plans: <strong className="text-ink">{filtered.length}</strong></span>
          <span>Active: <strong className="text-green-600">{filtered.filter(p => p.is_active).length}</strong></span>
          <span>Hidden: <strong className="text-red-500">{filtered.filter(p => !p.is_active).length}</strong></span>
        </div>
      )}

      {/* Form Modal */}
      {editPlan !== null && (
        <PlanFormModal
          plan={editPlan === "new" ? null : editPlan}
          onClose={() => setEditPlan(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
