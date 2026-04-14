"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordRentPayments, getAllLandlordRentPayments, getLandlordUserId, type LandlordRentPayment } from "@/lib/landlord-data";
import ReceiptModal from "@/components/tenant/ReceiptModal";
import AddPastPaymentModal from "@/components/landlord/AddPastPaymentModal";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function LandlordRent() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<LandlordRentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Filters
  const [filterName, setFilterName] = useState("");
  const [filterFlat, setFilterFlat] = useState("");
  const [filterSociety, setFilterSociety] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Receipt
  const [receiptPayment, setReceiptPayment] = useState<LandlordRentPayment | null>(null);

  // Remind
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [reminding, setReminding] = useState<string | null>(null);

  // Receipt verification
  const [verifying, setVerifying] = useState<string | null>(null);

  // Past payment modal
  const [showPastPayment, setShowPastPayment] = useState(false);

  async function loadData(all: boolean) {
    if (!user?.email) return;
    setLoading(true);
    const data = all
      ? await getAllLandlordRentPayments(user.email).catch(() => [])
      : await getLandlordRentPayments(user.email).catch(() => []);
    setPayments(data);
    setLoading(false);
  }

  useEffect(() => {
    loadData(showAll);
    if (user?.email) getLandlordUserId(user.email).then(setLandlordId);
  }, [user]);

  function toggleView() {
    const next = !showAll;
    setShowAll(next);
    loadData(next);
  }

  async function handleRemind(rp: LandlordRentPayment) {
    if (!landlordId) { toast.error("Could not identify landlord."); return; }
    setReminding(rp.id);

    const tenantUser = (rp.tenant as { user?: { full_name: string } | null } | null)?.user;
    const flat = rp.flat as { flat_number: string; block: string | null; society?: { name: string; city: string; id?: string } | null } | null;
    const tenantName = tenantUser?.full_name ?? "Tenant";
    const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "your flat";
    const monthLabel = new Date(rp.month_year + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" });
    // Get society_id from the flat record directly
    const flatId = rp.flat_id as string | null;
    let societyId: string | null = null;
    if (flatId) {
      const { data: flatRow } = await supabase.from("flats").select("society_id").eq("id", flatId).maybeSingle();
      societyId = flatRow?.society_id ?? null;
    }

    if (!societyId) {
      toast.error("Society not found — notice cannot be sent.");
      setReminding(null);
      return;
    }

    const { error } = await supabase.from("notices").insert({
      society_id: societyId,
      created_by: landlordId,
      title: `Rent Reminder — ${monthLabel}`,
      content: `Dear ${tenantName}, this is a reminder that your rent of ${formatCurrency(rp.expected_amount)} for ${monthLabel} (${flatLabel}) is pending. Please make the payment at the earliest. Thank you.`,
      notice_type: "reminder",
      audience: "tenants",
      is_active: true,
    });

    setReminding(null);
    if (error) { toast.error("Failed to send reminder."); return; }
    toast.success(`Reminder sent to ${tenantName}'s notices!`);
  }

  async function handleVerifyReceipt(rp: LandlordRentPayment, action: "accepted" | "rejected") {
    setVerifying(rp.id);
    const paidAmt = rp.paid_amount && rp.paid_amount > 0 ? rp.paid_amount : rp.expected_amount;
    const isFullyPaid = paidAmt >= rp.expected_amount;
    const updates: Record<string, unknown> = { receipt_status: action };
    if (action === "accepted") {
      updates.status = isFullyPaid ? "paid" : "pending";
      updates.amount = paidAmt;
      if (isFullyPaid) updates.payment_date = new Date().toISOString().slice(0, 10);
      updates.payment_method = "manual";
    }
    const { error } = await supabase.from("rent_payments").update(updates).eq("id", rp.id);
    setVerifying(null);
    if (error) { toast.error("Failed to update payment."); return; }
    toast.success(action === "accepted" ? "Payment verified!" : "Receipt rejected.");
    loadData(showAll);
  }

  const pendingVerifications = payments.filter(r => r.receipt_status === "pending_verification");
  const totalExpected = payments.reduce((a, r) => a + r.expected_amount, 0);
  const totalPaid = payments.filter(r => r.status === "paid").reduce((a, r) => a + r.amount, 0);
  const currentMonthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

  // Filtered payments
  const filtered = payments.filter(rp => {
    const tenantName = (rp.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "";
    const flat = rp.flat as { flat_number: string; block: string | null; society?: { name: string; city: string } | null } | null;
    const flatLabel = flat ? `${flat.flat_number} ${flat.block ?? ""}` : "";
    const societyLabel = flat?.society ? `${flat.society.name} ${flat.society.city}` : "";

    if (filterName && !tenantName.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterFlat && !flatLabel.toLowerCase().includes(filterFlat.toLowerCase())) return false;
    if (filterSociety && !societyLabel.toLowerCase().includes(filterSociety.toLowerCase())) return false;
    if (filterStatus && rp.status !== filterStatus) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetFilters() {
    setFilterName(""); setFilterFlat(""); setFilterSociety(""); setFilterStatus(""); setPage(1);
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500";

  return (
    <div>
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <h2 className="text-[15px] font-extrabold text-ink">
          💰 Rent Collection — {showAll ? "All Time" : currentMonthLabel}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPastPayment(true)}
            className="px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
          >
            + Past Payment
          </button>
          <button onClick={toggleView} className="px-3 py-1.5 rounded-xl border border-border-default text-xs font-bold text-ink-muted cursor-pointer">
            {showAll ? "This Month" : "All Months"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-ink">{formatCurrency(totalExpected)}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Total Expected</div>
        </div>
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-green-700">{formatCurrency(totalPaid)}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Collected</div>
        </div>
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-red-600">{formatCurrency(totalExpected - totalPaid)}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Overdue</div>
        </div>
      </div>

      {/* Pending Verification Section */}
      {pendingVerifications.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-[14px] p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🕐</span>
            <span className="text-sm font-extrabold text-yellow-800">
              {pendingVerifications.length} Receipt{pendingVerifications.length > 1 ? "s" : ""} Awaiting Verification
            </span>
          </div>
          <div className="space-y-2.5">
            {pendingVerifications.map(rp => {
              const tenantName = (rp.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "—";
              const flat = rp.flat as { flat_number: string; block: string | null } | null;
              const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
              const monthLabel = rp.month_year ? new Date(rp.month_year + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" }) : "—";
              const paidAmt = rp.paid_amount && rp.paid_amount > 0 ? rp.paid_amount : rp.expected_amount;
              const isPartial = paidAmt < rp.expected_amount;
              return (
                <div key={rp.id} className="bg-white rounded-[12px] p-3.5 border border-yellow-200">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-ink">{tenantName}</div>
                      <div className="text-[11px] text-ink-muted">{flatLabel} · {monthLabel}</div>
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        {isPartial
                          ? <span>Partial: <span className="font-bold text-yellow-700">{formatCurrency(paidAmt)}</span> of {formatCurrency(rp.expected_amount)}</span>
                          : <span>Full amount: <span className="font-bold">{formatCurrency(paidAmt)}</span></span>
                        }
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {rp.receipt_url && (
                        <a href={rp.receipt_url} target="_blank" rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg border border-yellow-300 text-yellow-700 text-[10px] font-bold cursor-pointer whitespace-nowrap">
                          View Receipt ↗
                        </a>
                      )}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleVerifyReceipt(rp, "accepted")}
                          disabled={verifying === rp.id}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {verifying === rp.id ? "…" : "✓ Accept"}
                        </button>
                        <button
                          onClick={() => handleVerifyReceipt(rp, "rejected")}
                          disabled={verifying === rp.id}
                          className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {verifying === rp.id ? "…" : "✗ Reject"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex gap-2 flex-wrap mb-3">
        <input className={inputClass + " flex-1 min-w-[130px]"} placeholder="🔍 Tenant name..."
          value={filterName} onChange={e => { setFilterName(e.target.value); setPage(1); }} />
        <input className={inputClass + " w-28"} placeholder="Flat no."
          value={filterFlat} onChange={e => { setFilterFlat(e.target.value); setPage(1); }} />
        <input className={inputClass + " w-36"} placeholder="Society / area..."
          value={filterSociety} onChange={e => { setFilterSociety(e.target.value); setPage(1); }} />
        <select className={inputClass + " w-32"} value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
        {(filterName || filterFlat || filterSociety || filterStatus) && (
          <button onClick={resetFilters}
            className="px-3 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold cursor-pointer">Clear</button>
        )}
      </div>

      {/* Count + page size */}
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div className="text-xs text-ink-muted">{filtered.length} of {payments.length} payments</div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-muted">Show</span>
          <select className="border border-border-default rounded-lg px-2 py-1 text-xs text-ink bg-warm-50 focus:outline-none"
            value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-[11px] text-ink-muted">per page</span>
        </div>
      </div>

      {paged.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No rent payments found.</div>
      ) : (
        paged.map(rp => {
          const tenantName = (rp.tenant as { user?: { full_name: string; phone?: string } | null } | null)?.user?.full_name ?? "—";
          const tenantPhone = (rp.tenant as { user?: { full_name: string; phone?: string } | null } | null)?.user?.phone ?? null;
          const flat = rp.flat as { flat_number: string; block: string | null; society?: { name: string; city: string } | null } | null;
          const initials = tenantName !== "—" ? tenantName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "T";
          const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : null;
          const societyLabel = flat?.society ? `${flat.society.name}, ${flat.society.city}` : null;
          const monthLabel = rp.month_year ? new Date(rp.month_year + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" }) : "—";

          return (
            <div key={rp.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
              <div className="flex justify-between items-start gap-3">
                {/* Left: tenant info */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-sm font-extrabold text-brand-500 flex-shrink-0">{initials}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-ink">{tenantName}</div>
                    {tenantPhone && <div className="text-[11px] text-ink-muted">{tenantPhone}</div>}
                    <div className="text-[11px] text-ink-muted mt-0.5 space-y-0.5">
                      {flatLabel && <div>🏠 {flatLabel}{societyLabel ? ` · ${societyLabel}` : ""}</div>}
                      <div>📅 {monthLabel}</div>
                      <div>💰 Expected: {formatCurrency(rp.expected_amount)}/mo</div>
                      {rp.paid_amount && rp.paid_amount > 0 && rp.status !== "paid" && (
                        <div className="text-yellow-600">⚡ Partial: {formatCurrency(rp.paid_amount)} paid · {formatCurrency(rp.expected_amount - rp.paid_amount)} remaining</div>
                      )}
                      {rp.payment_date && <div>✅ Paid on {new Date(rp.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}{rp.payment_method ? ` via ${rp.payment_method.toUpperCase()}` : ""}</div>}
                      {rp.receipt_status === "pending_verification" && <div className="text-yellow-600 font-semibold">🕐 Receipt awaiting verification</div>}
                      {rp.receipt_status === "accepted" && rp.status !== "paid" && <div className="text-green-600 font-semibold">✓ Receipt verified</div>}
                      {rp.receipt_status === "rejected" && <div className="text-red-600 font-semibold">✗ Receipt rejected</div>}
                    </div>
                  </div>
                </div>

                {/* Right: amount + status */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {rp.status === "paid" && (
                    <span className="text-base font-extrabold text-green-700">{formatCurrency(rp.amount)}</span>
                  )}
                  <StatusBadge status={rp.status} />
                  {rp.status !== "paid" && (
                    <button
                      onClick={() => handleRemind(rp)}
                      disabled={reminding === rp.id}
                      className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                    >
                      {reminding === rp.id ? "Sending…" : "Remind"}
                    </button>
                  )}
                  {rp.status === "paid" && (
                    <button onClick={() => setReceiptPayment(rp)}
                      className="px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-600 text-[11px] font-semibold cursor-pointer whitespace-nowrap">
                      🧾 View Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-4 flex-wrap">
          <button onClick={() => setPage(1)} disabled={page === 1} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">«</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">‹ Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, idx, arr) => {
              if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`e-${i}`} className="text-[11px] text-ink-muted px-1">…</span>
              ) : (
                <button key={p} onClick={() => setPage(p as number)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-bold cursor-pointer ${page === p ? "bg-brand-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-50"}`}>{p}</button>
              )
            )}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">Next ›</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">»</button>
        </div>
      )}
      {filtered.length > 0 && (
        <div className="text-center text-[10px] text-ink-muted mt-2">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
        </div>
      )}

      {/* Receipt Modal */}
      {receiptPayment && (() => {
        const flat = receiptPayment.flat as { flat_number: string; block: string | null } | null;
        const tenantName = (receiptPayment.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant";
        return (
          <ReceiptModal
            payment={{
              amount: receiptPayment.amount,
              month_year: receiptPayment.month_year,
              payment_date: receiptPayment.payment_date,
              payment_method: receiptPayment.payment_method,
            }}
            tenant={{ full_name: tenantName }}
            flat={{ flat_number: flat?.flat_number ?? "—", block: flat?.block ?? null }}
            onClose={() => setReceiptPayment(null)}
          />
        );
      })()}

      {/* Past Payment Modal */}
      {showPastPayment && user?.email && (
        <AddPastPaymentModal
          landlordEmail={user.email}
          onClose={() => setShowPastPayment(false)}
          onSuccess={() => { setShowPastPayment(false); loadData(true); setShowAll(true); }}
        />
      )}
    </div>
  );
}
