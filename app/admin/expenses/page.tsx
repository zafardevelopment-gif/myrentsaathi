"use client";

import { useEffect, useState, useCallback } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { supabase } from "@/lib/supabase";
import {
  getAdminSocietyId,
  getSocietyExpenses,
  getSocietyFlats,
  createExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  deleteExpense,
  type AdminExpense,
  type AdminFlat,
} from "@/lib/admin-data";

const CATEGORY_ICON: Record<string, string> = {
  electricity: "⚡",
  water: "💧",
  cleaning: "🧹",
  security: "🛡️",
  lift_maintenance: "🔧",
  garden: "🌿",
  painting: "🎨",
  plumbing: "🔧",
  electrical_repair: "⚡",
  pest_control: "🐛",
  insurance: "📄",
  legal: "⚖️",
  audit: "📊",
  festival: "🎉",
  general: "🏗️",
  other: "📋",
};

const CATEGORIES = [
  "electricity", "water", "cleaning", "security", "lift_maintenance",
  "garden", "painting", "plumbing", "electrical_repair", "pest_control",
  "insurance", "legal", "audit", "festival", "general", "other",
];

type CalcMode = "total" | "per_flat" | "per_sqft";

export default function AdminExpenses() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<AdminExpense[]>([]);
  const [flats, setFlats] = useState<AdminFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  // expenseId -> { paid, pending, paidAmount, pendingAmount }
  const [expensePaymentStats, setExpensePaymentStats] = useState<Record<string, { paid: number; pending: number; paidAmt: number; pendingAmt: number }>>({});
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ category: "", description: "", vendor_name: "", amount: "", expense_date: "", is_recurring: false, recurrence_type: "monthly" as "monthly" | "weekly" });

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: "general",
    description: "",
    vendor_name: "",
    expense_date: new Date().toISOString().slice(0, 10),
    is_recurring: false,
    recurrence_type: "monthly" as "monthly" | "weekly",
  });
  const [calcMode, setCalcMode] = useState<CalcMode>("per_flat");
  const [totalAmount, setTotalAmount] = useState("");
  const [amountPerFlat, setAmountPerFlat] = useState("");
  const [amountPerSqft, setAmountPerSqft] = useState("");

  const activeFlats = flats.filter((f) => f.status !== "inactive");
  const totalSqft = flats.reduce((sum, f) => sum + (f.area_sqft ?? 0), 0);

  // When user changes per-flat or per-sqft input, auto-update total
  function handlePerFlatChange(val: string) {
    setAmountPerFlat(val);
    const count = activeFlats.length || 1;
    const computed = (parseFloat(val) || 0) * count;
    if (computed > 0) setTotalAmount(String(computed));
    else setTotalAmount("");
  }

  function handlePerSqftChange(val: string) {
    setAmountPerSqft(val);
    const computed = (parseFloat(val) || 0) * totalSqft;
    if (computed > 0) setTotalAmount(String(computed));
    else setTotalAmount("");
  }

  // When user manually edits total, back-calculate the unit rate
  function handleTotalChange(val: string) {
    setTotalAmount(val);
    const total = parseFloat(val) || 0;
    if (calcMode === "per_flat") {
      const count = activeFlats.length || 1;
      setAmountPerFlat(total > 0 ? String(+(total / count).toFixed(2)) : "");
    } else if (calcMode === "per_sqft") {
      setAmountPerSqft(total > 0 && totalSqft > 0 ? String(+(total / totalSqft).toFixed(4)) : "");
    }
  }

  function handleCalcModeChange(mode: CalcMode) {
    setCalcMode(mode);
    // Recalculate total based on existing unit inputs when switching
    if (mode === "per_flat") {
      const count = activeFlats.length || 1;
      const computed = (parseFloat(amountPerFlat) || 0) * count;
      if (computed > 0) setTotalAmount(String(computed));
    } else if (mode === "per_sqft") {
      const computed = (parseFloat(amountPerSqft) || 0) * totalSqft;
      if (computed > 0) setTotalAmount(String(computed));
    }
  }

  const computedAmount = parseFloat(totalAmount) || 0;

  const load = useCallback(async (email: string) => {
    const sid = await getAdminSocietyId(email);
    if (sid) {
      setSocietyId(sid);
      const [e, f] = await Promise.all([getSocietyExpenses(sid), getSocietyFlats(sid)]);
      setExpenses(e);
      setFlats(f);
      await loadPaymentStats(e, f);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPaymentStats(expenseList: AdminExpense[], flatList: AdminFlat[]) {
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const approvedIds = expenseList.filter(e => e.approval_status === "approved").map(e => e.id);
    const activeFlatIds = flatList.filter(f => f.status !== "inactive").map(f => f.id);
    if (approvedIds.length === 0 || activeFlatIds.length === 0) return;
    const { data } = await supabase
      .from("society_due_payments")
      .select("expense_id, flat_id, amount")
      .eq("month_year", currentMonthStr)
      .in("expense_id", approvedIds)
      .in("flat_id", activeFlatIds);
    const stats: Record<string, { paid: number; pending: number; paidAmt: number; pendingAmt: number }> = {};
    for (const exp of expenseList.filter(e => e.approval_status === "approved")) {
      const perFlat = Math.round(exp.amount / (activeFlatIds.length || 1));
      const paidForExp = (data ?? []).filter(p => p.expense_id === exp.id);
      const paidCount = paidForExp.length;
      const pendingCount = activeFlatIds.length - paidCount;
      stats[exp.id] = {
        paid: paidCount,
        pending: pendingCount,
        paidAmt: paidCount * perFlat,
        pendingAmt: pendingCount * perFlat,
      };
    }
    setExpensePaymentStats(stats);
  }

  useEffect(() => {
    if (!user?.email) return;
    setLoading(true);
    load(user.email)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, load]);

  async function downloadExpenseExcel(expense: {
    id?: string;
    description: string;
    category: string;
    vendor_name?: string | null;
    expense_date: string;
    amount: number;
    calcMode: CalcMode;
    perFlat?: number;
    perSqft?: number;
  }) {
    const perFlatAmt = expense.calcMode === "per_flat" ? expense.perFlat ?? 0 : 0;
    const perSqftRate = expense.calcMode === "per_sqft" ? expense.perSqft ?? 0 : 0;
    const monthYear = expense.expense_date.slice(0, 7);

    // Fetch per-expense payment status for each flat
    let paidFlatIds = new Set<string>();
    let paidAtMap: Record<string, string> = {};
    if (expense.id && societyId) {
      const { data: dp } = await supabase
        .from("society_due_payments")
        .select("flat_id, paid_at")
        .eq("expense_id", expense.id)
        .eq("month_year", monthYear)
        .in("flat_id", activeFlats.map(f => f.id));
      for (const p of dp ?? []) {
        paidFlatIds.add(p.flat_id);
        paidAtMap[p.flat_id] = p.paid_at;
      }
    }

    const flatRows = activeFlats.map((f) => {
      let flatShare = 0;
      if (expense.calcMode === "per_flat") {
        flatShare = perFlatAmt;
      } else if (expense.calcMode === "per_sqft") {
        flatShare = +(perSqftRate * (f.area_sqft ?? 0)).toFixed(2);
      } else {
        flatShare = +(expense.amount / (activeFlats.length || 1)).toFixed(2);
      }
      const paid = paidFlatIds.has(f.id);
      return [
        f.flat_number,
        f.block ?? "",
        f.owner_name ?? "",
        f.area_sqft ?? "",
        flatShare,
        paid ? "Paid" : "Pending",
        paid && paidAtMap[f.id] ? new Date(paidAtMap[f.id]).toLocaleDateString("en-IN") : "",
        paid ? "Online" : "",
      ];
    });

    const headers = ["Flat No", "Block", "Owner Name", "Area (sqft)", "Amount Due (₹)", "Payment Status", "Paid On", "Payment Method"];
    const paidCount = paidFlatIds.size;
    const pendingCount = activeFlats.length - paidCount;

    const summaryRows = [
      ["SOCIETY EXPENSE REPORT"],
      [],
      ["Expense", expense.description],
      ["Category", expense.category.replace(/_/g, " ")],
      ["Vendor", expense.vendor_name ?? ""],
      ["Date", expense.expense_date],
      ["Total Amount", `₹${expense.amount.toLocaleString("en-IN")}`],
      ["Per Flat Share", `₹${(expense.amount / (activeFlats.length || 1)).toFixed(0)}`],
      ["Calculation Mode", expense.calcMode === "per_flat" ? `₹${perFlatAmt}/flat` : expense.calcMode === "per_sqft" ? `₹${perSqftRate}/sqft` : "Total split equally"],
      ["Month", new Date(monthYear + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })],
      [],
      ["PAYMENT SUMMARY"],
      ["Total Flats", activeFlats.length],
      ["Paid", paidCount],
      ["Pending", pendingCount],
      ["Amount Collected", `₹${(paidCount * (expense.amount / (activeFlats.length || 1))).toFixed(0)}`],
      ["Amount Pending", `₹${(pendingCount * (expense.amount / (activeFlats.length || 1))).toFixed(0)}`],
      [],
      headers,
      ...flatRows,
    ];

    const csv = summaryRows.map(row =>
      Array.isArray(row) && row.length > 0
        ? row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
        : ""
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense_${expense.description.replace(/\s+/g, "_")}_${expense.expense_date}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function downloadMasterPaymentReport() {
    if (!societyId) return;
    const currentMonthStr = new Date().toISOString().slice(0, 7);

    const approvedExpenses = expenses.filter(e => e.approval_status === "approved");
    const monthExpenses = approvedExpenses.filter(e =>
      e.is_recurring || e.expense_date.startsWith(currentMonthStr)
    );
    const totalExpenseAmount = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const perFlatDue = activeFlats.length > 0 ? Math.round(totalExpenseAmount / activeFlats.length) : 0;

    // Fetch per-expense payments for this month
    const expenseIds = monthExpenses.map(e => e.id);
    const flatIds = activeFlats.map(f => f.id);
    const { data: dp } = expenseIds.length > 0
      ? await supabase
          .from("society_due_payments")
          .select("expense_id, flat_id, paid_at")
          .eq("month_year", currentMonthStr)
          .in("expense_id", expenseIds)
          .in("flat_id", flatIds)
      : { data: [] };

    // Build set: "expenseId:flatId" -> paid_at
    const paidSet: Record<string, string> = {};
    for (const p of dp ?? []) paidSet[`${p.expense_id}:${p.flat_id}`] = p.paid_at;

    // Per flat: how many expenses paid
    const flatPaidExpenseCount = (flatId: string) =>
      monthExpenses.filter(e => paidSet[`${e.id}:${flatId}`]).length;
    const flatFullyPaid = (flatId: string) => flatPaidExpenseCount(flatId) === monthExpenses.length;
    const flatPaidAmount = (flatId: string) =>
      monthExpenses.filter(e => paidSet[`${e.id}:${flatId}`]).reduce((s, e) => s + Math.round(e.amount / (activeFlats.length || 1)), 0);

    const fullyPaidCount = activeFlats.filter(f => flatFullyPaid(f.id)).length;
    const partialCount = activeFlats.filter(f => !flatFullyPaid(f.id) && flatPaidExpenseCount(f.id) > 0).length;
    const pendingCount = activeFlats.filter(f => flatPaidExpenseCount(f.id) === 0).length;

    const rows: (string | number)[][] = [
      ["SOCIETY DUES PAYMENT REPORT"],
      [`Month: ${new Date(currentMonthStr + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`],
      [`Total Expenses This Month: ₹${totalExpenseAmount.toLocaleString("en-IN")}`],
      [`Per Flat Due: ₹${perFlatDue.toLocaleString("en-IN")}`],
      [`Total Flats: ${activeFlats.length}`],
      [`Fully Paid: ${fullyPaidCount}`, `Partial: ${partialCount}`, `Pending: ${pendingCount}`],
      [],
      ["EXPENSE BREAKDOWN"],
      ["Description", "Category", "Date", "Total Amount (₹)", "Per Flat (₹)", "Recurring", "Flats Paid", "Flats Pending"],
      ...monthExpenses.map(e => {
        const expPaid = activeFlats.filter(f => paidSet[`${e.id}:${f.id}`]).length;
        return [
          e.description,
          e.category.replace(/_/g, " "),
          e.expense_date,
          e.amount,
          Math.round(e.amount / (activeFlats.length || 1)),
          e.is_recurring ? "Yes" : "No",
          expPaid,
          activeFlats.length - expPaid,
        ];
      }),
      [],
      ["FLAT-WISE PAYMENT STATUS"],
      ["Flat No", "Block", "Owner Name", "Area (sqft)", "Amount Due (₹)", "Amount Paid (₹)", "Status", "Expenses Paid"],
      ...activeFlats.map(f => [
        f.flat_number,
        f.block ?? "",
        f.owner_name ?? "",
        f.area_sqft ?? "",
        perFlatDue,
        flatPaidAmount(f.id),
        flatFullyPaid(f.id) ? "Fully Paid" : flatPaidExpenseCount(f.id) > 0 ? "Partial" : "Pending",
        `${flatPaidExpenseCount(f.id)}/${monthExpenses.length}`,
      ]),
      [],
      ["EXPENSE-WISE DETAIL PER FLAT"],
      ["Flat No", "Block", "Owner", ...monthExpenses.map(e => `${e.description} (₹${Math.round(e.amount / (activeFlats.length || 1))})`)],
      ...activeFlats.map(f => [
        f.flat_number,
        f.block ?? "",
        f.owner_name ?? "",
        ...monthExpenses.map(e => paidSet[`${e.id}:${f.id}`]
          ? `Paid ${new Date(paidSet[`${e.id}:${f.id}`]).toLocaleDateString("en-IN")}`
          : "Pending"
        ),
      ]),
    ];

    const csv = rows.map(row =>
      Array.isArray(row) && row.length > 0
        ? row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
        : ""
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment_status_${currentMonthStr}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function startEdit(e: AdminExpense) {
    setEditingId(e.id);
    setEditForm({
      category: e.category,
      description: e.description,
      vendor_name: e.vendor_name ?? "",
      amount: String(e.amount),
      expense_date: e.expense_date,
      is_recurring: e.is_recurring,
      recurrence_type: (e.recurrence_type as "monthly" | "weekly") ?? "monthly",
    });
  }

  async function handleSaveEdit(id: string) {
    setSaving(id);
    try {
      await updateExpense(id, {
        category: editForm.category,
        description: editForm.description,
        vendor_name: editForm.vendor_name || null,
        amount: parseFloat(editForm.amount) || 0,
        expense_date: editForm.expense_date,
        is_recurring: editForm.is_recurring,
        recurrence_type: editForm.is_recurring ? editForm.recurrence_type : null,
      });
      setExpenses(prev => prev.map(e => e.id === id ? {
        ...e,
        category: editForm.category,
        description: editForm.description,
        vendor_name: editForm.vendor_name || null,
        amount: parseFloat(editForm.amount) || 0,
        expense_date: editForm.expense_date,
        is_recurring: editForm.is_recurring,
        recurrence_type: editForm.is_recurring ? editForm.recurrence_type : null,
      } : e));
      setEditingId(null);
      toast.success("Expense updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(null);
    }
  }

  async function handleRemind(expense: AdminExpense) {
    if (!societyId) return;
    setSaving(`remind-${expense.id}`);
    try {
      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const perFlat = Math.round(expense.amount / (activeFlats.length || 1));
      const stats = expensePaymentStats[expense.id];
      // Get flat_ids that have NOT paid for this expense
      const { data: paidFlats } = await supabase
        .from("society_due_payments")
        .select("flat_id")
        .eq("expense_id", expense.id)
        .eq("month_year", currentMonthStr);
      const paidFlatIds = new Set((paidFlats ?? []).map(p => p.flat_id));
      const unpaidFlats = activeFlats.filter(f => !paidFlatIds.has(f.id));
      if (unpaidFlats.length === 0) { toast.success("All flats have already paid!"); return; }
      // Get owner_id for unpaid flats, then get user IDs
      const { data: flatOwners } = await supabase
        .from("flats")
        .select("id, owner_id")
        .in("id", unpaidFlats.map(f => f.id));
      const ownerIds = [...new Set((flatOwners ?? []).map(f => f.owner_id).filter(Boolean))];
      if (ownerIds.length === 0) { toast("No owners found for unpaid flats."); return; }
      // Create notifications for each owner
      const notifications = ownerIds.map(ownerId => ({
        user_id: ownerId,
        title: "Society Dues Reminder",
        message: `Please pay ₹${perFlat.toLocaleString("en-IN")} for "${expense.description}" (${new Date(currentMonthStr + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}).`,
        type: "dues_reminder",
        is_read: false,
        metadata: JSON.stringify({ expense_id: expense.id, month_year: currentMonthStr, amount: perFlat }),
      }));
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;
      toast.success(`Reminder sent to ${ownerIds.length} landlord${ownerIds.length !== 1 ? "s" : ""}!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reminder");
    } finally {
      setSaving(null);
    }
  }

  async function handleCreate() {
    if (!form.description.trim() || !societyId) {
      toast.error("Description is required."); return;
    }
    if (computedAmount <= 0) {
      toast.error("Amount must be greater than zero."); return;
    }
    setFormSubmitting(true);
    try {
      await createExpense(societyId, {
        category: form.category,
        description: form.description,
        vendor_name: form.vendor_name || undefined,
        amount: computedAmount,
        expense_date: form.expense_date,
        created_by: user!.id,
        is_recurring: form.is_recurring,
        recurrence_type: form.recurrence_type,
      });
      toast.success("Expense created!");

      // Auto-download Excel with flat-wise breakdown
      downloadExpenseExcel({
        description: form.description,
        category: form.category,
        vendor_name: form.vendor_name || null,
        expense_date: form.expense_date,
        amount: computedAmount,
        calcMode,
        perFlat: parseFloat(amountPerFlat) || 0,
        perSqft: parseFloat(amountPerSqft) || 0,
      }).catch(() => {});

      setShowForm(false);
      setForm({ category: "general", description: "", vendor_name: "", expense_date: new Date().toISOString().slice(0, 10), is_recurring: false, recurrence_type: "monthly" });
      setTotalAmount(""); setAmountPerFlat(""); setAmountPerSqft(""); setCalcMode("per_flat");
      const updated = await getSocietyExpenses(societyId);
      setExpenses(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create expense.");
      console.error("createExpense error:", e);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleApprove(id: string) {
    setSaving(id);
    try {
      await approveExpense(id);
      setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, approval_status: "approved" } : e));
      toast.success("Expense approved");
    } catch {
      toast.error("Failed — check RLS policies");
    } finally {
      setSaving(null);
    }
  }

  async function handleReject(id: string) {
    setSaving(id);
    try {
      await rejectExpense(id);
      setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, approval_status: "rejected" } : e));
      toast.success("Expense rejected");
    } catch {
      toast.error("Failed — check RLS policies");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string) {
    setSaving(id);
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setSaving(null);
    }
  }

  // Filter + Pagination state
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // Available months from expenses
  const availableMonths = Array.from(new Set(expenses.map(e => e.expense_date.slice(0, 7)))).sort().reverse();

  // Filtered list
  const filtered = expenses.filter(e => {
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (filterStatus !== "all" && e.approval_status !== filterStatus) return false;
    if (filterMonth !== "all" && !e.expense_date.startsWith(filterMonth)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !e.description?.toLowerCase().includes(q) &&
        !e.vendor_name?.toLowerCase().includes(q) &&
        !e.category.replace(/_/g, " ").toLowerCase().includes(q) &&
        !e.amount.toString().includes(q)
      ) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  const applyFilter = (fn: () => void) => { fn(); setPage(1); };

  // Category totals (from ALL expenses, not filtered)
  const categoryTotals = expenses
    .filter((e) => e.approval_status === "approved")
    .reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);
  const categorySummary = Object.entries(categoryTotals).map(([cat, total]) => ({
    cat, total, icon: CATEGORY_ICON[cat] || "📋",
  }));

  const totalApproved = expenses.filter((e) => e.approval_status === "approved").reduce((s, e) => s + e.amount, 0);
  const totalPending = expenses.filter((e) => e.approval_status === "pending").reduce((s, e) => s + e.amount, 0);

  // Current month collection summary across all approved expenses
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthApproved = expenses.filter(e =>
    e.approval_status === "approved" && (e.is_recurring || e.expense_date.startsWith(currentMonthStr))
  );
  const totalCollected = Object.values(expensePaymentStats).reduce((s, st) => s + st.paidAmt, 0);
  const totalExpected = currentMonthApproved.reduce((s, e) => s + e.amount, 0);
  const totalRemaining = Math.max(0, totalExpected - totalCollected);
  const collectionPct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const totalPaidFlats = currentMonthApproved.length > 0
    ? Math.round(Object.values(expensePaymentStats).reduce((s, st) => s + st.paid, 0) / currentMonthApproved.length)
    : 0;

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[14px] p-6 text-center">
        <div className="text-red-600 font-bold">⚠️ {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-ink">📋 Society Expenses</h2>
          <p className="text-xs text-ink-muted mt-0.5">Track and manage all society expenditure</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer transition-colors"
        >
          + Add Expense
        </button>
      </div>

      {/* Summary stats */}
      {expenses.length > 0 && (
        <div className="space-y-3">
          {/* Expense approval summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-border-default rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-green-600">{formatCurrency(totalApproved)}</p>
              <p className="text-[11px] text-ink-muted">Approved</p>
            </div>
            <div className="bg-white border border-border-default rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-amber-600">{formatCurrency(totalPending)}</p>
              <p className="text-[11px] text-ink-muted">Pending Approval</p>
            </div>
          </div>

          {/* Society dues collection summary for current month */}
          {currentMonthApproved.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-extrabold text-blue-900">
                  💰 Society Dues Collection —{" "}
                  {new Date(currentMonthStr + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${collectionPct >= 80 ? "bg-green-100 text-green-700" : collectionPct >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                  {collectionPct}% collected
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-xl p-2.5 text-center border border-blue-100">
                  <p className="text-sm font-extrabold text-blue-700">{formatCurrency(totalExpected)}</p>
                  <p className="text-[10px] text-ink-muted">Total Expected</p>
                </div>
                <div className="bg-white rounded-xl p-2.5 text-center border border-green-200">
                  <p className="text-sm font-extrabold text-green-600">{formatCurrency(totalCollected)}</p>
                  <p className="text-[10px] text-ink-muted">Collected</p>
                </div>
                <div className="bg-white rounded-xl p-2.5 text-center border border-red-200">
                  <p className="text-sm font-extrabold text-red-500">{formatCurrency(totalRemaining)}</p>
                  <p className="text-[10px] text-ink-muted">Remaining</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="w-full bg-blue-100 rounded-full h-2.5">
                  <div
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${collectionPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-ink-muted mt-1">
                  <span>{totalPaidFlats} flats fully paid</span>
                  <span>{activeFlats.length - totalPaidFlats} flats pending</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Master payment status download */}
      {expenses.filter(e => e.approval_status === "approved").length > 0 && (
        <button
          onClick={() => downloadMasterPaymentReport().catch(() => {})}
          className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold cursor-pointer transition-colors"
        >
          ⬇ Download Full Payment Status Report (All Landlords)
        </button>
      )}

      {/* ── CREATE EXPENSE FORM ── */}
      {showForm && (
        <div className="bg-white border border-amber-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <p className="font-bold text-ink text-sm">New Expense</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_ICON[c]} {c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted block mb-1">Expense Date</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-ink-muted block mb-1">Description *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Annual lift maintenance contract"
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-ink-muted block mb-1">Vendor / Contractor Name</label>
              <input
                type="text"
                value={form.vendor_name}
                onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))}
                placeholder="Optional"
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Recurring toggle */}
            <div className="col-span-2">
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div>
                  <div className="text-xs font-bold text-ink">Recurring Expense</div>
                  <div className="text-[11px] text-ink-muted">Auto-repeat monthly ya weekly</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_recurring: !f.is_recurring }))}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.is_recurring ? "bg-amber-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_recurring ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              {form.is_recurring && (
                <div className="flex gap-2 mt-2">
                  {(["monthly", "weekly"] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, recurrence_type: type }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer border transition-colors ${
                        form.recurrence_type === type
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-ink-muted border-border-default hover:border-amber-400"
                      }`}
                    >
                      {type === "monthly" ? "🔁 Monthly" : "📅 Weekly"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Total Amount — always shown first */}
          <div>
            <label className="text-xs font-semibold text-ink-muted block mb-1">Total Amount (₹) *</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => handleTotalChange(e.target.value)}
              placeholder="e.g. 25000"
              min="0"
              className="w-full border-2 border-amber-400 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Calculation mode */}
          <div>
            <label className="text-xs font-semibold text-ink-muted block mb-2">Auto-Calculate From</label>
            <div className="flex gap-1 bg-warm-100 rounded-xl p-1 border border-border-default mb-3">
              {([
                { key: "per_flat" as CalcMode, label: "Per Flat (Fixed)" },
                { key: "per_sqft" as CalcMode, label: "Per Sq.ft" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleCalcModeChange(key)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    calcMode === key ? "bg-amber-600 text-white shadow" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {calcMode === "per_flat" && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Amount per Flat (₹)</label>
                  <input
                    type="number"
                    value={amountPerFlat}
                    onChange={(e) => handlePerFlatChange(e.target.value)}
                    placeholder="e.g. 500"
                    min="0"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-xs text-ink-muted">
                  <span className="font-semibold text-ink">{activeFlats.length} active flats</span>
                  {amountPerFlat && parseFloat(amountPerFlat) > 0 && (
                    <span> × ₹{amountPerFlat} = <span className="font-bold text-amber-700">{formatCurrency(computedAmount)}</span></span>
                  )}
                </div>
              </div>
            )}

            {calcMode === "per_sqft" && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Rate per Sq.ft (₹)</label>
                  <input
                    type="number"
                    value={amountPerSqft}
                    onChange={(e) => handlePerSqftChange(e.target.value)}
                    placeholder="e.g. 2.5"
                    min="0"
                    step="0.01"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-xs text-ink-muted">
                  {totalSqft > 0 ? (
                    <>
                      <span className="font-semibold text-ink">{totalSqft.toLocaleString()} sq.ft</span>
                      {amountPerSqft && parseFloat(amountPerSqft) > 0 && (
                        <span> × ₹{amountPerSqft} = <span className="font-bold text-amber-700">{formatCurrency(computedAmount)}</span></span>
                      )}
                    </>
                  ) : (
                    <span className="text-amber-700">⚠️ Set area_sqft on flats to use this mode.</span>
                  )}
                </div>

                {amountPerSqft && parseFloat(amountPerSqft) > 0 && flats.some((f) => f.area_sqft) && (
                  <div className="bg-white border border-border-default rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                    <p className="text-xs font-bold text-ink-muted mb-2">Per-flat breakdown:</p>
                    {flats.filter((f) => f.area_sqft).map((f) => (
                      <div key={f.id} className="flex justify-between text-xs">
                        <span className="text-ink-muted">Flat {f.flat_number}{f.block ? ` (${f.block})` : ""}</span>
                        <span className="font-semibold text-ink">{formatCurrency((parseFloat(amountPerSqft) || 0) * (f.area_sqft ?? 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={formSubmitting || computedAmount <= 0}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
            >
              {formSubmitting ? "Creating…" : "Create Expense"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category Summary */}
      {categorySummary.length > 0 && (
        <div className="flex gap-2.5 flex-wrap">
          {categorySummary.map((c) => (
            <div key={c.cat} className="bg-white rounded-xl p-3 border border-border-default flex-1 min-w-[110px] text-center">
              <div className="text-lg">{c.icon}</div>
              <div className="text-sm font-extrabold text-ink">{formatCurrency(c.total)}</div>
              <div className="text-[10px] text-ink-muted capitalize">{c.cat.replace(/_/g, " ")}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {expenses.length > 0 && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => applyFilter(() => setSearch(e.target.value))}
            placeholder="Search by description, vendor, category, amount..."
            className="w-full pl-9 pr-4 py-2.5 border border-border-default rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {search && (
            <button onClick={() => applyFilter(() => setSearch(""))} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer text-xs">✕</button>
          )}
        </div>
      )}

      {/* Filters */}
      {expenses.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterCategory}
            onChange={e => applyFilter(() => setFilterCategory(e.target.value))}
            className="flex-1 min-w-[130px] border border-border-default rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => applyFilter(() => setFilterStatus(e.target.value))}
            className="flex-1 min-w-[120px] border border-border-default rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filterMonth}
            onChange={e => applyFilter(() => setFilterMonth(e.target.value))}
            className="flex-1 min-w-[120px] border border-border-default rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">All Months</option>
            {availableMonths.map(m => <option key={m} value={m}>{new Date(m + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>)}
          </select>
          {(filterCategory !== "all" || filterStatus !== "all" || filterMonth !== "all" || search) && (
            <button
              onClick={() => { setFilterCategory("all"); setFilterStatus("all"); setFilterMonth("all"); setSearch(""); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold cursor-pointer hover:bg-red-100"
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Expense List */}
      {expenses.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No expenses yet. Click + Add Expense to create one.</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-ink-muted text-sm">No expenses match the selected filters.</div>
      ) : (
        <>
        <div className="flex justify-between items-center text-xs text-ink-muted">
          <span>{filtered.length} expense{filtered.length !== 1 ? "s" : ""} found</span>
          <span>Page {page} of {totalPages}</span>
        </div>
        <div className="space-y-2">
          {paginated.map((e) => {
            const stats = expensePaymentStats[e.id];
            const isEditing = editingId === e.id;
            return (
            <div
              key={e.id}
              className={`bg-white rounded-[14px] border border-border-default border-l-4 ${
                e.approval_status === "approved" ? "border-l-green-500" : e.approval_status === "rejected" ? "border-l-red-500" : "border-l-yellow-500"
              }`}
            >
              {/* Main row */}
              <div className="flex justify-between items-start gap-2 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{CATEGORY_ICON[e.category] ?? "📋"}</span>
                    <div className="text-[13px] font-bold text-ink truncate">{e.description}</div>
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{e.category.replace(/_/g, " ")}{e.vendor_name ? ` · ${e.vendor_name}` : ""} · {e.expense_date}</span>
                    {e.is_recurring && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                        🔁 {e.recurrence_type ?? "recurring"}
                      </span>
                    )}
                  </div>
                  {/* Payment progress */}
                  {stats && e.approval_status === "approved" && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-warm-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${activeFlats.length > 0 ? (stats.paid / activeFlats.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-green-700 font-bold whitespace-nowrap">{formatCurrency(stats.paidAmt)} collected</span>
                      <span className="text-[10px] text-red-500 font-bold whitespace-nowrap">{formatCurrency(stats.pendingAmt)} pending</span>
                      <span className="text-[10px] text-ink-muted whitespace-nowrap">{stats.paid}/{activeFlats.length} flats</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  <span className="text-[15px] font-extrabold text-ink">{formatCurrency(e.amount)}</span>
                  <StatusBadge status={e.approval_status} />
                  {e.approval_status === "pending" && (
                    <>
                      <button onClick={() => handleApprove(e.id)} disabled={saving === e.id}
                        className="px-2 py-1 rounded-lg bg-green-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">✓</button>
                      <button onClick={() => handleReject(e.id)} disabled={saving === e.id}
                        className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">✗</button>
                    </>
                  )}
                  <button onClick={() => isEditing ? setEditingId(null) : startEdit(e)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${isEditing ? "bg-gray-200 text-gray-700" : "bg-blue-50 hover:bg-blue-100 text-blue-700"}`}
                    title="Edit expense">✏️</button>
                  {e.approval_status === "approved" && stats && stats.pending > 0 && (
                    <button
                      onClick={() => handleRemind(e)}
                      disabled={saving === `remind-${e.id}`}
                      className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                      title="Send payment reminder to unpaid landlords"
                    >
                      {saving === `remind-${e.id}` ? "…" : "🔔 Remind"}
                    </button>
                  )}
                  <button
                    onClick={() => downloadExpenseExcel({
                      id: e.id, description: e.description, category: e.category,
                      vendor_name: e.vendor_name, expense_date: e.expense_date, amount: e.amount, calcMode: "total",
                    }).catch(() => {})}
                    className="px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold cursor-pointer"
                    title="Download flat-wise Excel with payment status">⬇ Excel</button>
                  <button onClick={() => handleDelete(e.id)} disabled={saving === e.id}
                    className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold cursor-pointer disabled:opacity-50">🗑</button>
                </div>
              </div>

              {/* Inline edit form */}
              {isEditing && (
                <div className="border-t border-border-default bg-blue-50 p-4 space-y-3 rounded-b-[14px]">
                  <div className="text-xs font-bold text-blue-700 mb-2">Edit Expense</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-ink-muted block mb-1">Category</label>
                      <select value={editForm.category} onChange={ev => setEditForm(f => ({ ...f, category: ev.target.value }))}
                        className="w-full border border-border-default rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-ink-muted block mb-1">Date</label>
                      <input type="date" value={editForm.expense_date} onChange={ev => setEditForm(f => ({ ...f, expense_date: ev.target.value }))}
                        className="w-full border border-border-default rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-ink-muted block mb-1">Description</label>
                      <input value={editForm.description} onChange={ev => setEditForm(f => ({ ...f, description: ev.target.value }))}
                        className="w-full border border-border-default rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-ink-muted block mb-1">Vendor</label>
                      <input value={editForm.vendor_name} onChange={ev => setEditForm(f => ({ ...f, vendor_name: ev.target.value }))}
                        className="w-full border border-border-default rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-ink-muted block mb-1">Amount (₹)</label>
                      <input type="number" value={editForm.amount} onChange={ev => setEditForm(f => ({ ...f, amount: ev.target.value }))}
                        className="w-full border border-border-default rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div className="col-span-2 flex items-center gap-3">
                      <label className="text-[10px] font-semibold text-ink-muted">Recurring</label>
                      <button type="button" onClick={() => setEditForm(f => ({ ...f, is_recurring: !f.is_recurring }))}
                        className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${editForm.is_recurring ? "bg-blue-500" : "bg-gray-300"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editForm.is_recurring ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                      {editForm.is_recurring && (
                        <div className="flex gap-1">
                          {(["monthly", "weekly"] as const).map(t => (
                            <button key={t} type="button" onClick={() => setEditForm(f => ({ ...f, recurrence_type: t }))}
                              className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer border ${editForm.recurrence_type === t ? "bg-blue-500 text-white border-blue-500" : "bg-white text-ink-muted border-border-default"}`}>
                              {t === "monthly" ? "Monthly" : "Weekly"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(e.id)} disabled={saving === e.id}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                      {saving === e.id ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-4 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold cursor-pointer">Cancel</button>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-border-default text-xs font-bold text-ink-muted hover:bg-warm-100 disabled:opacity-40 cursor-pointer"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-bold cursor-pointer ${
                  page === p ? "bg-amber-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-100"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-border-default text-xs font-bold text-ink-muted hover:bg-warm-100 disabled:opacity-40 cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
