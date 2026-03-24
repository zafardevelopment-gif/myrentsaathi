"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordFlats, getLandlordUserId, type LandlordFlat } from "@/lib/landlord-data";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

type Expense = {
  id: string;
  flat_id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  paid_by: string;
  created_at: string;
};

const CATEGORIES = ["AC Repair", "Painting", "Plumbing", "Electrical", "Other"];
const CATEGORY_ICON: Record<string, string> = {
  "AC Repair": "❄️",
  "Painting": "🎨",
  "Plumbing": "🔧",
  "Electrical": "⚡",
  "Other": "📋",
};
const PAID_BY_LABEL: Record<string, string> = {
  landlord: "Paid by Landlord",
  deducted_from_deposit: "Deducted from Deposit",
};

const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

export default function MaintenanceExpensesPage() {
  const { user } = useAuth();
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterFlatId, setFilterFlatId] = useState("all");

  const [form, setForm] = useState({
    flat_id: "",
    category: "AC Repair",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    paid_by: "landlord",
  });

  async function loadData() {
    if (!user?.email) return;
    const [f, lid] = await Promise.all([
      getLandlordFlats(user.email).catch(() => [] as LandlordFlat[]),
      getLandlordUserId(user.email),
    ]);
    setFlats(f);
    setLandlordId(lid);

    if (f.length > 0) {
      const flatIds = f.map(fl => fl.id);
      const { data } = await supabase
        .from("maintenance_expenses")
        .select("*")
        .in("flat_id", flatIds)
        .order("expense_date", { ascending: false });
      setExpenses(data ?? []);
    }
  }

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [user]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!landlordId) return;
    setSaving(true);
    const { error } = await supabase.from("maintenance_expenses").insert({
      flat_id: form.flat_id,
      landlord_id: landlordId,
      category: form.category,
      description: form.description || null,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      paid_by: form.paid_by,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Expense added!");
    setForm({ flat_id: "", category: "AC Repair", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0], paid_by: "landlord" });
    setShowForm(false);
    await loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("maintenance_expenses").delete().eq("id", id);
    toast.success("Expense deleted.");
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  const flatMap = Object.fromEntries(flats.map(f => [f.id, f]));
  const flatLabel = (id: string) => {
    const f = flatMap[id];
    return f ? `Flat ${f.flat_number}${f.block ? ` (${f.block})` : ""}` : "—";
  };

  const filtered = filterFlatId === "all" ? expenses : expenses.filter(e => e.flat_id === filterFlatId);

  const totalSpent = filtered.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: filtered.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0);

  // Per-flat totals
  const byFlat = flats.map(f => ({
    flat: f,
    total: expenses.filter(e => e.flat_id === f.id).reduce((s, e) => s + e.amount, 0),
  })).filter(b => b.total > 0);

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  return (
    <div>
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🔧 Maintenance Expenses</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
          {showForm ? "Cancel" : "+ Add Expense"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-5 space-y-3">
          <div className="text-sm font-bold text-ink">Add Expense</div>
          <div>
            <label className={labelClass}>Flat *</label>
            <select required className={inputClass} value={form.flat_id} onChange={e => setForm(f => ({ ...f, flat_id: e.target.value }))}>
              <option value="">— Select flat —</option>
              {flats.map(f => <option key={f.id} value={f.id}>{flatLabel(f.id)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category *</label>
              <select className={inputClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICON[c]} {c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Amount (₹) *</label>
              <input required type="number" min="1" className={inputClass} placeholder="e.g. 2500" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <input className={inputClass} placeholder="e.g. AC compressor replacement" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date *</label>
              <input required type="date" className={inputClass} value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Paid By *</label>
              <select className={inputClass} value={form.paid_by} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}>
                <option value="landlord">Landlord</option>
                <option value="deducted_from_deposit">Deducted from Deposit</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {saving ? "Saving..." : "Add Expense"}
          </button>
        </form>
      )}

      {/* Summary */}
      {expenses.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-[14px] p-4 border border-border-default">
              <div className="text-[10px] text-ink-muted uppercase tracking-wide mb-1">Total Spent</div>
              <div className="text-xl font-extrabold text-red-600">{formatCurrency(totalSpent)}</div>
              <div className="text-[10px] text-ink-muted mt-0.5">{filtered.length} expenses</div>
            </div>
            <div className="bg-white rounded-[14px] p-4 border border-border-default">
              <div className="text-[10px] text-ink-muted uppercase tracking-wide mb-2">By Category</div>
              {byCategory.map(c => (
                <div key={c.cat} className="flex justify-between text-xs mb-1">
                  <span>{CATEGORY_ICON[c.cat]} {c.cat}</span>
                  <span className="font-bold">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {byFlat.length > 1 && (
            <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
              <div className="text-[10px] text-ink-muted uppercase tracking-wide mb-2">Per Flat Breakdown</div>
              {byFlat.map(b => (
                <div key={b.flat.id} className="flex justify-between text-xs mb-1.5">
                  <span className="text-ink">{flatLabel(b.flat.id)}</span>
                  <span className="font-bold text-red-600">{formatCurrency(b.total)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Filter */}
      {flats.length > 1 && (
        <div className="mb-3">
          <select className={inputClass} value={filterFlatId} onChange={e => setFilterFlatId(e.target.value)}>
            <option value="all">All Flats</option>
            {flats.map(f => <option key={f.id} value={f.id}>{flatLabel(f.id)}</option>)}
          </select>
        </div>
      )}

      {/* Expense list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No expenses yet. Add one above.</div>
      ) : (
        filtered.map(e => (
          <div key={e.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-start gap-3">
            <div className="flex gap-3 items-start">
              <div className="w-9 h-9 rounded-xl bg-warm-100 flex items-center justify-center text-base flex-shrink-0">
                {CATEGORY_ICON[e.category] ?? "📋"}
              </div>
              <div>
                <div className="text-sm font-bold text-ink">{e.category}</div>
                {e.description && <div className="text-xs text-ink-muted mt-0.5">{e.description}</div>}
                <div className="text-[10px] text-ink-muted mt-1">
                  {flatLabel(e.flat_id)} · {new Date(e.expense_date).toLocaleDateString("en-IN")}
                </div>
                <div className="text-[10px] text-ink-muted mt-0.5">{PAID_BY_LABEL[e.paid_by] ?? e.paid_by}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-extrabold text-red-600">{formatCurrency(e.amount)}</span>
              <button onClick={() => handleDelete(e.id)} className="text-[10px] text-red-400 font-semibold cursor-pointer">Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
