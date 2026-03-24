"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import toast from "react-hot-toast";
import {
  getSocieties,
  updateSocietyPlan,
  updateSocietyStatus,
  type Society,
} from "@/lib/superadmin-data";

const PLAN_BADGE: Record<string, string> = {
  starter:      "bg-blue-100 text-blue-700",
  professional: "bg-amber-100 text-amber-700",
  enterprise:   "bg-purple-100 text-purple-700",
};

const PLANS = ["starter", "professional", "enterprise"];

export default function SuperAdminSocieties() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await getSocieties();
      setSocieties(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = societies.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      (s.state ?? "").toLowerCase().includes(q);
    const matchPlan = filterPlan === "all" || s.subscription_plan === filterPlan;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && s.is_active) ||
      (filterStatus === "inactive" && !s.is_active);
    return matchSearch && matchPlan && matchStatus;
  });

  const active = societies.filter((s) => s.is_active).length;
  const totalFlats = societies.reduce((a, s) => a + s.total_flats, 0);
  const plan_mrr: Record<string, number> = { starter: 2999, professional: 5999, enterprise: 9999 };
  const totalMrr = societies.filter(s => s.is_active).reduce((a, s) => a + (plan_mrr[s.subscription_plan] ?? 0), 0);

  const selectedSoc = societies.find((s) => s.id === selected);

  async function handlePlanSave() {
    if (!selected || !editPlan) return;
    setSaving(true);
    try {
      await updateSocietyPlan(selected, editPlan);
      setSocieties((prev) => prev.map((s) => s.id === selected ? { ...s, subscription_plan: editPlan } : s));
      toast.success("Plan updated");
    } catch {
      toast.error("Failed to update plan — check RLS policies");
    } finally {
      setSaving(false);
    }
  }

  async function handleSuspend(id: string, currentlyActive: boolean) {
    const action = currentlyActive ? "suspend" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} this society?`)) return;
    setSaving(true);
    try {
      await updateSocietyStatus(id, !currentlyActive);
      setSocieties((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !currentlyActive } : s));
      toast.success(`Society ${action}d`);
      setSelected(null);
    } catch {
      toast.error(`Failed — check RLS policies`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[14px] p-6 text-center">
        <div className="text-red-600 font-bold mb-2">⚠️ {error}</div>
        <div className="text-[11px] text-ink-muted">Run <code>supabase-superadmin-policies.sql</code> + seed the DB first.</div>
        <button onClick={load} className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-xl text-[11px] font-bold cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        <StatCard icon="🏢" label="Total Societies" value={String(societies.length)} sub={`${active} active`} accent="text-amber-600" />
        <StatCard icon="💰" label="Society MRR" value={`₹${(totalMrr / 100000).toFixed(2)}L`} sub="From active societies" accent="text-green-600" />
        <StatCard icon="🏠" label="Total Flats" value={totalFlats.toLocaleString()} accent="text-blue-600" />
        <StatCard icon="🆕" label="This Month" value={String(societies.filter(s => new Date(s.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length)} sub="new societies" accent="text-purple-600" />
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-[14px] p-3 border border-border-default mb-4 flex flex-wrap gap-2.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, city, state..."
          className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none focus:border-amber-400"
        />
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none"
        >
          <option value="all">All Plans</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex items-center text-[11px] text-ink-muted font-semibold self-center">{filtered.length} results</div>
      </div>

      {/* Detail Panel */}
      {selectedSoc && (
        <div className="bg-white rounded-[14px] p-4 border-2 border-amber-300 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-[15px] font-extrabold text-ink">{selectedSoc.name}</div>
              <div className="text-[11px] text-ink-muted">{selectedSoc.city}, {selectedSoc.state} · {selectedSoc.total_flats} flats</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-ink-muted hover:text-ink text-xl cursor-pointer leading-none">✕</button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            {[
              { l: "Plan",          v: selectedSoc.subscription_plan },
              { l: "MRR",           v: `₹${(plan_mrr[selectedSoc.subscription_plan] ?? 0).toLocaleString()}/mo` },
              { l: "Total Flats",   v: String(selectedSoc.total_flats) },
              { l: "Maint Amt",     v: `₹${selectedSoc.maintenance_amount?.toLocaleString() ?? "—"}/mo` },
              { l: "Reg Number",    v: selectedSoc.registration_number ?? "—" },
              { l: "Pincode",       v: selectedSoc.pincode ?? "—" },
              { l: "Status",        v: selectedSoc.is_active ? "Active" : "Inactive" },
              { l: "Joined",        v: new Date(selectedSoc.created_at).toLocaleDateString("en-IN") },
            ].map((i) => (
              <div key={i.l} className="bg-warm-50 rounded-xl p-2.5">
                <div className="text-[10px] text-ink-muted font-semibold">{i.l}</div>
                <div className="text-[12px] font-bold text-ink mt-0.5 truncate">{i.v}</div>
              </div>
            ))}
          </div>

          {/* Change Plan */}
          <div className="mb-3">
            <div className="text-[11px] font-bold text-ink-muted mb-1.5">Change Subscription Plan:</div>
            <div className="flex flex-wrap gap-2">
              {PLANS.map((p) => (
                <button
                  key={p}
                  onClick={() => setEditPlan(p)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all border ${
                    (editPlan || selectedSoc.subscription_plan) === p
                      ? "bg-amber-500 text-white border-amber-500"
                      : "border-border-default text-ink-muted hover:bg-warm-50"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
              {editPlan && editPlan !== selectedSoc.subscription_plan && (
                <button
                  onClick={handlePlanSave}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-[11px] font-bold cursor-pointer hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "✓ Save"}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors">
              📧 Email Admin
            </button>
            <button
              onClick={() => handleSuspend(selectedSoc.id, selectedSoc.is_active)}
              disabled={saving}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition-colors disabled:opacity-50 ${
                selectedSoc.is_active
                  ? "border-red-200 text-red-500 hover:bg-red-50"
                  : "border-green-200 text-green-600 hover:bg-green-50"
              }`}
            >
              {selectedSoc.is_active ? "🚫 Suspend" : "✅ Reactivate"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.map((s) => (
          <div
            key={s.id}
            onClick={() => { setSelected(selected === s.id ? null : s.id); setEditPlan(s.subscription_plan); }}
            className={`bg-white rounded-[14px] p-4 border cursor-pointer transition-all hover:border-amber-300 hover:shadow-sm ${
              selected === s.id ? "border-amber-400" : "border-border-default"
            } ${!s.is_active ? "opacity-60" : ""}`}
          >
            <div className="flex flex-wrap justify-between items-start gap-2">
              {/* Left */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-extrabold text-[11px] flex-shrink-0">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="text-[13px] font-bold text-ink">{s.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${PLAN_BADGE[s.subscription_plan] ?? "bg-gray-100 text-gray-600"}`}>
                      {s.subscription_plan.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${s.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {s.is_active ? "active" : "inactive"}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    {s.city}, {s.state} · {s.total_flats} flats · Reg: {s.registration_number ?? "—"}
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="text-[14px] font-extrabold text-amber-600">
                    ₹{(plan_mrr[s.subscription_plan] ?? 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-ink-muted">/month</div>
                </div>
                <div className="text-[11px] text-ink-muted hidden sm:block">
                  {new Date(s.created_at).toLocaleDateString("en-IN")}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-12 text-ink-muted text-sm">
            {societies.length === 0
              ? "No societies in database. Run the seed script first."
              : "No societies match your filter."}
          </div>
        )}
      </div>
    </div>
  );
}
