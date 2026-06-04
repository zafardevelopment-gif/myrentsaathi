"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type RouteAccount = {
  id: string;
  entity_type: "society" | "landlord";
  entity_name: string;
  account_holder_name: string;
  account_number_masked: string;
  ifsc_code: string;
  contact_email: string | null;
  contact_phone: string | null;
  business_type: string | null;
  razorpay_linked_account_id: string | null;
  razorpay_product_id: string | null;
  route_status: string | null;
  route_error: string | null;
  is_verified: boolean;
  updated_at: string;
};

const STATUS_UI: Record<string, { label: string; cls: string }> = {
  activated: { label: "✓ Activated", cls: "bg-green-100 text-green-700" },
  created: { label: "⏳ Verifying", cls: "bg-blue-100 text-blue-700" },
  needs_clarification: { label: "⚠️ Needs Clarification", cls: "bg-amber-100 text-amber-700" },
  failed: { label: "✗ Failed", cls: "bg-red-100 text-red-600" },
  pending: { label: "• Pending", cls: "bg-gray-100 text-gray-500" },
};

const PAGE_SIZE = 15;

export default function SuperAdminRouteAccounts() {
  const [accounts, setAccounts] = useState<RouteAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/route-accounts").then((r) => r.json());
      if (res.success) setAccounts(res.accounts ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, filterStatus]);

  async function syncOne(acc: RouteAccount) {
    if (!acc.razorpay_linked_account_id) { toast.error("No linked account to sync"); return; }
    setSyncing(acc.id);
    try {
      const res = await fetch(`/api/superadmin/route-accounts/${acc.id}/sync`, { method: "POST" }).then((r) => r.json());
      if (res.success) {
        setAccounts((prev) => prev.map((a) => a.id === acc.id ? { ...a, route_status: res.route_status } : a));
        toast.success(`Status: ${res.route_status}`);
      } else {
        toast.error(res.error ?? "Sync failed");
      }
    } finally {
      setSyncing(null);
    }
  }

  async function syncAll() {
    const withLink = accounts.filter((a) => a.razorpay_linked_account_id);
    if (withLink.length === 0) { toast("No linked accounts to sync", { icon: "ℹ️" }); return; }
    toast.loading(`Syncing ${withLink.length} accounts…`, { id: "syncall" });
    let done = 0;
    for (const a of withLink) {
      try {
        const res = await fetch(`/api/superadmin/route-accounts/${a.id}/sync`, { method: "POST" }).then((r) => r.json());
        if (res.success) setAccounts((prev) => prev.map((x) => x.id === a.id ? { ...x, route_status: res.route_status } : x));
      } catch { /* ignore */ }
      done++;
    }
    toast.success(`Synced ${done} accounts`, { id: "syncall" });
  }

  const counts: Record<string, number> = {};
  for (const a of accounts) counts[a.route_status ?? "pending"] = (counts[a.route_status ?? "pending"] ?? 0) + 1;

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = q === "" ||
      a.entity_name.toLowerCase().includes(q) ||
      (a.razorpay_linked_account_id ?? "").toLowerCase().includes(q) ||
      (a.contact_email ?? "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || (a.route_status ?? "pending") === filterStatus;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[15px] font-extrabold text-ink">🏦 Razorpay Route Accounts</h2>
        <button onClick={syncAll} className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600">
          🔄 Sync All Statuses
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { key: "activated", label: "Activated" },
          { key: "created", label: "Verifying" },
          { key: "needs_clarification", label: "Needs Info" },
          { key: "failed", label: "Failed" },
          { key: "pending", label: "Pending" },
        ].map((s) => (
          <div key={s.key} className="rounded-[14px] border border-border-default bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">{s.label}</div>
            <div className="text-xl font-extrabold mt-1 text-ink">{counts[s.key] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[14px] p-3 border border-border-default flex flex-wrap gap-2.5">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, acc_id, email…"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none focus:border-amber-400" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none">
          <option value="all">All Status</option>
          <option value="activated">Activated</option>
          <option value="created">Verifying</option>
          <option value="needs_clarification">Needs Clarification</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <div className="flex items-center text-[11px] text-ink-muted font-semibold self-center">{filtered.length} of {accounts.length}</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-border-default overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1.3fr_auto] gap-3 px-4 py-2.5 text-[10px] font-bold text-ink-muted uppercase tracking-wider border-b border-border-default bg-warm-50">
          <span>Entity</span><span>Linked Account</span><span>Bank</span><span>Status</span><span>Action</span>
        </div>

        {paged.length === 0 ? (
          <div className="text-center py-12 text-ink-muted text-sm">
            {accounts.length === 0 ? "No bank accounts linked yet." : "No accounts match the filter."}
          </div>
        ) : (
          paged.map((a) => {
            const ui = STATUS_UI[a.route_status ?? "pending"] ?? STATUS_UI.pending;
            return (
              <div key={a.id} className="border-b border-border-light last:border-0 hover:bg-warm-50 transition-colors">
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1.3fr_auto] gap-3 px-4 py-3 items-center">
                  <div>
                    <div className="text-[12px] font-semibold text-ink">{a.entity_name}</div>
                    <div className="text-[10px] text-ink-muted capitalize">{a.entity_type} · {a.business_type ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-ink">{a.razorpay_linked_account_id ?? "—"}</div>
                    <div className="text-[10px] text-ink-muted">{a.contact_email ?? ""}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-ink font-mono">{a.account_number_masked}</div>
                    <div className="text-[10px] text-ink-muted">{a.ifsc_code}</div>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ui.cls}`}>{ui.label}</span>
                    {a.route_error && <div className="text-[9px] text-red-500 mt-0.5 truncate max-w-[160px]" title={a.route_error}>{a.route_error}</div>}
                  </div>
                  <button onClick={() => syncOne(a)} disabled={syncing === a.id || !a.razorpay_linked_account_id}
                    className="px-2.5 py-1 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 disabled:opacity-40">
                    {syncing === a.id ? "…" : "🔄 Sync"}
                  </button>
                </div>

                {/* Mobile */}
                <div className="md:hidden p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-ink">{a.entity_name}</div>
                      <div className="text-[10px] text-ink-muted capitalize">{a.entity_type}</div>
                      <div className="text-[10px] font-mono text-ink-muted mt-0.5">{a.razorpay_linked_account_id ?? "—"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ui.cls}`}>{ui.label}</span>
                      <button onClick={() => syncOne(a)} disabled={syncing === a.id || !a.razorpay_linked_account_id}
                        className="px-2 py-0.5 rounded-lg border border-border-default text-[9px] font-semibold text-ink-muted cursor-pointer disabled:opacity-40">
                        {syncing === a.id ? "…" : "🔄"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border-default flex-wrap">
            <div className="text-[11px] text-ink-muted">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2.5 py-1 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">‹ Prev</button>
              <span className="text-[11px] text-ink-muted px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">Next ›</button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-ink-muted text-center">
        💡 &quot;Sync&quot; fetches the live status from Razorpay. The app shows the status from the last sync/onboarding.
      </p>
    </div>
  );
}
