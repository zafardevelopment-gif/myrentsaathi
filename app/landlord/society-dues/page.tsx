"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordFlats, getLandlordUserId, type LandlordFlat } from "@/lib/landlord-data";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

type SocietyExpense = {
  id: string;
  category: string;
  description: string;
  vendor_name: string | null;
  amount: number;
  expense_date: string;
  is_recurring: boolean;
  recurrence_type: string | null;
};

// Per-expense payment record
type DuePayment = {
  id: string;
  expense_id: string;
  flat_id: string;
  amount: number;
  paid_at: string;
  month_year: string;
};

const CATEGORY_ICON: Record<string, string> = {
  electricity: "⚡", water: "💧", cleaning: "🧹", security: "🛡️",
  lift_maintenance: "🔧", garden: "🌿", painting: "🎨", plumbing: "🔧",
  electrical_repair: "⚡", pest_control: "🐛", insurance: "📄",
  legal: "⚖️", audit: "📊", festival: "🎉", general: "🏗️",
  maintenance: "🏗️", other: "📋",
};

type SocietyInfo = {
  name: string; city: string;
  total_flats: number | null; expense_split_mode: string | null; payment_due_day: number | null;
};

const currentMonthStr = new Date().toISOString().slice(0, 7);
const currentMonth = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export default function LandlordSocietyDues() {
  const { user } = useAuth();
  const [societyExpenses, setSocietyExpenses] = useState<SocietyExpense[]>([]);
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [society, setSociety] = useState<SocietyInfo | null>(null);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [activeFlatsCount, setActiveFlatsCount] = useState<number>(0);
  const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
  const [loading, setLoading] = useState(true);
  // paying = "flatId:expenseId"
  const [paying, setPaying] = useState<string | null>(null);
  const [tab, setTab] = useState<"dues" | "expenses">("dues");

  async function loadAll(email: string) {
    const [f, lid] = await Promise.all([
      getLandlordFlats(email).catch(() => [] as LandlordFlat[]),
      getLandlordUserId(email),
    ]);
    setFlats(f);
    setLandlordId(lid);

    const sid = f[0]?.society_id;
    if (sid) {
      const [{ data: se }, { data: soc }, { count: activeCount }] = await Promise.all([
        supabase
          .from("society_expenses")
          .select("id, category, description, vendor_name, amount, expense_date, is_recurring, recurrence_type")
          .eq("society_id", sid)
          .eq("approval_status", "approved")
          .order("expense_date", { ascending: false }),
        supabase
          .from("societies")
          .select("name, city, total_flats, expense_split_mode, payment_due_day")
          .eq("id", sid)
          .single(),
        supabase
          .from("flats")
          .select("id", { count: "exact", head: true })
          .eq("society_id", sid),
      ]);
      setSocietyExpenses(se ?? []);
      if (soc) setSociety(soc as SocietyInfo);
      setActiveFlatsCount(activeCount ?? 0);

      // Load per-expense payment records for this landlord's flats
      if (f.length > 0) {
        const flatIds = f.map(fl => fl.id);
        const { data: dp } = await supabase
          .from("society_due_payments")
          .select("id, expense_id, flat_id, amount, paid_at, month_year")
          .in("flat_id", flatIds)
          .eq("month_year", currentMonthStr);
        setDuePayments((dp ?? []) as DuePayment[]);
      }
    }
  }

  useEffect(() => {
    if (!user?.email) return;
    loadAll(user.email).finally(() => setLoading(false));
  }, [user]);

  // Mark one expense as paid for one flat
  async function handlePayExpense(flat: LandlordFlat, expense: SocietyExpense, shareAmount: number) {
    if (!landlordId) return;
    const key = `${flat.id}:${expense.id}`;
    setPaying(key);
    try {
      const { error } = await supabase
        .from("society_due_payments")
        .upsert({
          expense_id: expense.id,
          flat_id: flat.id,
          landlord_id: landlordId,
          amount: shareAmount,
          month_year: currentMonthStr,
          paid_at: new Date().toISOString(),
        }, { onConflict: "expense_id,flat_id,month_year" });

      if (error) throw error;
      toast.success(`Paid: ${expense.description} — Flat ${flat.flat_number} ✓`);
      // Refresh payments
      const flatIds = flats.map(fl => fl.id);
      const { data: dp } = await supabase
        .from("society_due_payments")
        .select("id, expense_id, flat_id, amount, paid_at, month_year")
        .in("flat_id", flatIds)
        .eq("month_year", currentMonthStr);
      setDuePayments((dp ?? []) as DuePayment[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPaying(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  const splitMode = society?.expense_split_mode ?? "total_flats";
  const totalFlatsInSociety = splitMode === "active_flats" || !society?.total_flats
    ? (activeFlatsCount || 1)
    : society.total_flats;

  const currentMonthExpenses = societyExpenses.filter(e =>
    e.is_recurring || e.expense_date.startsWith(currentMonthStr)
  );

  // Per-expense share for each flat
  const expenseShares = currentMonthExpenses.map(e => ({
    expense: e,
    sharePerFlat: Math.round(e.amount / totalFlatsInSociety),
  }));

  const totalPerFlat = expenseShares.reduce((s, x) => s + x.sharePerFlat, 0);
  const landlordTotalDue = totalPerFlat * flats.length;

  // Check if a specific expense is paid for a specific flat
  function isPaid(flatId: string, expenseId: string) {
    return duePayments.some(p => p.flat_id === flatId && p.expense_id === expenseId);
  }

  function getPaidAt(flatId: string, expenseId: string) {
    return duePayments.find(p => p.flat_id === flatId && p.expense_id === expenseId)?.paid_at ?? null;
  }

  // Overall paid amount for a flat
  function flatPaidAmount(flatId: string) {
    return duePayments
      .filter(p => p.flat_id === flatId)
      .reduce((s, p) => s + p.amount, 0);
  }

  function flatFullyPaid(flatId: string) {
    return expenseShares.every(x => isPaid(flatId, x.expense.id));
  }

  // Deadline calc
  const dueDay = society?.payment_due_day;
  const now = new Date();
  let daysLeft: number | null = null;
  let isOverdue = false;
  if (dueDay) {
    const dueDateObj = new Date(now.getFullYear(), now.getMonth(), dueDay);
    daysLeft = Math.ceil((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    isOverdue = daysLeft < 0;
    if (isOverdue) daysLeft = null;
  }

  const totalSocietyExpenses = societyExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <Toaster position="top-center" />
      <h2 className="text-[15px] font-extrabold text-ink mb-1">🏢 Society Dues</h2>
      {society && <p className="text-xs text-ink-muted mb-4">{society.name} · {society.city}</p>}

      {/* Tabs */}
      <div className="flex gap-1 bg-warm-100 rounded-xl p-1 border border-border-default mb-4">
        {([
          { key: "dues", label: "💳 My Dues" },
          { key: "expenses", label: "🏗️ Society Expenses" },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === key ? "bg-brand-500 text-white shadow" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── MY DUES TAB ── */}
      {tab === "dues" && (
        <div>
          {currentMonthExpenses.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-[14px] border border-border-default text-ink-muted text-sm mb-4">
              No dues for {currentMonth} yet.
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-[14px] p-4 border border-border-default">
                  <div className="text-[10px] text-ink-muted uppercase tracking-wide mb-1">Your Share / Flat</div>
                  <div className="text-xl font-extrabold text-brand-600">{formatCurrency(totalPerFlat)}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {currentMonth} · {totalFlatsInSociety} {splitMode === "active_flats" ? "active" : "total"} flats
                  </div>
                </div>
                <div className="bg-white rounded-[14px] p-4 border border-border-default">
                  <div className="text-[10px] text-ink-muted uppercase tracking-wide mb-1">Your Total Due</div>
                  <div className="text-xl font-extrabold text-red-600">{formatCurrency(landlordTotalDue)}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {flats.length} flat{flats.length !== 1 ? "s" : ""} · {currentMonthExpenses.length} expense{currentMonthExpenses.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* Deadline banner */}
              {dueDay && (
                <div className={`rounded-[14px] p-3.5 mb-4 flex items-center gap-3 border ${
                  isOverdue ? "bg-red-50 border-red-200"
                  : daysLeft !== null && daysLeft <= 3 ? "bg-orange-50 border-orange-200"
                  : "bg-blue-50 border-blue-100"
                }`}>
                  <span className="text-xl">{isOverdue ? "🔴" : daysLeft !== null && daysLeft <= 3 ? "🟠" : "📅"}</span>
                  <div className="flex-1">
                    <div className={`text-xs font-bold ${isOverdue ? "text-red-700" : daysLeft !== null && daysLeft <= 3 ? "text-orange-700" : "text-blue-700"}`}>
                      {isOverdue ? `Overdue! Due was ${dueDay}th ${currentMonth}`
                        : daysLeft === 0 ? "Due today!"
                        : `Due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} — ${dueDay}th ${currentMonth}`}
                    </div>
                    <div className="text-[10px] mt-0.5 text-ink-muted">
                      Pay each expense separately for all your flats
                    </div>
                  </div>
                </div>
              )}

              {/* Per flat — per expense breakdown */}
              {flats.map(flat => {
                const flatLabel = `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}`;
                const paidAmt = flatPaidAmount(flat.id);
                const fullyPaid = flatFullyPaid(flat.id);
                return (
                  <div key={flat.id} className={`bg-white rounded-[14px] border mb-3 overflow-hidden border-l-4 ${
                    fullyPaid ? "border-l-green-500 border-border-default" : "border-l-red-400 border-border-default"
                  }`}>
                    {/* Flat header */}
                    <div className="flex justify-between items-center px-4 py-3 bg-warm-50 border-b border-border-default">
                      <div>
                        <div className="text-sm font-extrabold text-ink">{flatLabel}</div>
                        <div className="text-[11px] text-ink-muted">
                          {flat.flat_type ?? "—"}{flat.area_sqft ? ` · ${flat.area_sqft} sq.ft` : ""}
                          {flat.tenant?.user ? ` · Tenant: ${flat.tenant.user.full_name}` : " · Vacant"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-ink">
                          {formatCurrency(paidAmt)}<span className="text-ink-muted font-normal text-xs"> / {formatCurrency(totalPerFlat)}</span>
                        </div>
                        <div className={`text-[10px] font-bold ${fullyPaid ? "text-green-600" : "text-red-500"}`}>
                          {fullyPaid ? "✓ Fully Paid" : `${expenseShares.filter(x => isPaid(flat.id, x.expense.id)).length}/${expenseShares.length} paid`}
                        </div>
                      </div>
                    </div>

                    {/* Per-expense rows */}
                    <div className="divide-y divide-border-default">
                      {expenseShares.map(({ expense, sharePerFlat }) => {
                        const paid = isPaid(flat.id, expense.id);
                        const paidAt = getPaidAt(flat.id, expense.id);
                        const key = `${flat.id}:${expense.id}`;
                        const isPayingThis = paying === key;
                        return (
                          <div key={expense.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-7 h-7 rounded-lg bg-warm-100 flex items-center justify-center text-sm flex-shrink-0">
                              {CATEGORY_ICON[expense.category] ?? "📋"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-ink truncate">
                                {expense.description}
                                {expense.is_recurring && (
                                  <span className="ml-1 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">🔁</span>
                                )}
                              </div>
                              <div className="text-[10px] text-ink-muted">
                                {expense.category.replace(/_/g, " ")} · {formatCurrency(expense.amount)} ÷ {totalFlatsInSociety} = {formatCurrency(sharePerFlat)}/flat
                              </div>
                              {paid && paidAt && (
                                <div className="text-[10px] text-green-600 mt-0.5">
                                  ✓ Paid {new Date(paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm font-extrabold text-ink">{formatCurrency(sharePerFlat)}</span>
                              {paid ? (
                                <span className="px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold">✓ Paid</span>
                              ) : (
                                <button
                                  onClick={() => handlePayExpense(flat, expense, sharePerFlat)}
                                  disabled={isPayingThis}
                                  className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60 transition-colors"
                                >
                                  {isPayingThis ? "…" : "Pay Now"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Flat footer total */}
                    {!fullyPaid && (
                      <div className="px-4 py-2.5 bg-warm-50 border-t border-border-default flex justify-between items-center">
                        <span className="text-[11px] text-ink-muted">
                          {expenseShares.length - expenseShares.filter(x => isPaid(flat.id, x.expense.id)).length} pending · {formatCurrency(totalPerFlat - paidAmt)} remaining
                        </span>
                        <button
                          onClick={async () => {
                            for (const { expense, sharePerFlat } of expenseShares) {
                              if (!isPaid(flat.id, expense.id)) {
                                await handlePayExpense(flat, expense, sharePerFlat);
                              }
                            }
                          }}
                          disabled={paying !== null}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold cursor-pointer disabled:opacity-60 transition-colors"
                        >
                          Pay All Pending
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── SOCIETY EXPENSES TAB ── */}
      {tab === "expenses" && (
        <div>
          <div className="flex gap-2.5 flex-wrap mb-4">
            <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
              <div className="text-xl font-extrabold text-brand-600">{formatCurrency(totalSocietyExpenses)}</div>
              <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Total Approved Expenses</div>
            </div>
            <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
              <div className="text-xl font-extrabold text-blue-600">{societyExpenses.filter(e => e.is_recurring).length}</div>
              <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Recurring</div>
            </div>
          </div>

          {societyExpenses.length === 0 ? (
            <div className="text-center py-10 text-ink-muted text-sm">No approved society expenses yet.</div>
          ) : (
            societyExpenses.map(e => (
              <div key={e.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-start gap-3">
                <div className="flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-xl bg-warm-100 flex items-center justify-center text-base flex-shrink-0">
                    {CATEGORY_ICON[e.category] ?? "📋"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ink">{e.description}</div>
                    <div className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{e.category.replace(/_/g, " ")}{e.vendor_name ? ` · ${e.vendor_name}` : ""} · {e.expense_date}</span>
                      {e.is_recurring && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                          🔁 {e.recurrence_type ?? "recurring"}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-brand-600 font-semibold mt-0.5">
                      Your share: {formatCurrency(Math.round(e.amount / totalFlatsInSociety))}/flat
                    </div>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-brand-600 flex-shrink-0">{formatCurrency(e.amount)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
