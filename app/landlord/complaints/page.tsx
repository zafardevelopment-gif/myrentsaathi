"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordTickets, type LandlordTicket } from "@/lib/landlord-data";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high:   "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low:    "bg-green-100 text-green-700 border-green-200",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function LandlordComplaints() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<LandlordTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterFlat, setFilterFlat] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function loadTickets() {
    if (!user?.email) return;
    const t = await getLandlordTickets(user.email).catch(() => []);
    setTickets(t);
  }

  useEffect(() => { loadTickets().finally(() => setLoading(false)); }, [user]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("tickets").update({
      status,
      ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
    }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Marked as ${status.replace("_", " ")}`);
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this complaint?")) return;
    await supabase.from("tickets").delete().eq("id", id);
    toast.success("Complaint deleted.");
    setTickets(prev => prev.filter(t => t.id !== id));
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const counts = {
    open:        tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved:    tickets.filter(t => t.status === "resolved").length,
  };

  // Filter logic
  const filtered = tickets.filter(tk => {
    const flat = tk.flat as { flat_number: string; block: string | null } | null;
    const flatLabel = flat ? `${flat.flat_number} ${flat.block ?? ""}` : "";
    if (filterStatus !== "all" && tk.status !== filterStatus) return false;
    if (filterPriority && tk.priority !== filterPriority) return false;
    if (filterFlat && !flatLabel.toLowerCase().includes(filterFlat.toLowerCase())) return false;
    if (filterSearch && !tk.subject.toLowerCase().includes(filterSearch.toLowerCase()) &&
        !tk.category.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetFilters() {
    setFilterStatus("all"); setFilterSearch(""); setFilterPriority(""); setFilterFlat(""); setPage(1);
  }

  const hasFilters = filterStatus !== "all" || filterSearch || filterPriority || filterFlat;

  return (
    <div>
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">🚫 Property Complaints</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">{tickets.length} total complaint{tickets.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { label: "Open",        key: "open",        color: "text-red-600",    bg: "bg-red-50 border-red-100" },
          { label: "In Progress", key: "in_progress", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-100" },
          { label: "Resolved",    key: "resolved",    color: "text-green-700",  bg: "bg-green-50 border-green-100" },
        ].map(s => (
          <button key={s.key} onClick={() => { setFilterStatus(s.key as typeof filterStatus); setPage(1); }}
            className={`rounded-[14px] p-3.5 border flex-1 min-w-[90px] text-center cursor-pointer transition-all ${filterStatus === s.key ? s.bg + " ring-2 ring-offset-1 ring-brand-300" : "bg-white border-border-default"}`}>
            <div className={`text-xl font-extrabold ${s.color}`}>{counts[s.key as keyof typeof counts]}</div>
            <div className="text-[11px] text-ink-muted mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-[14px] border border-border-default p-3.5 mb-4">
        <div className="text-[9px] font-bold text-ink-muted uppercase tracking-widest mb-2.5">Filters</div>
        <div className="flex gap-2 flex-wrap">
          <input
            className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 flex-1 min-w-[140px]"
            placeholder="🔍 Search subject or category..."
            value={filterSearch} onChange={e => { setFilterSearch(e.target.value); setPage(1); }}
          />
          <input
            className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-28"
            placeholder="Flat no."
            value={filterFlat} onChange={e => { setFilterFlat(e.target.value); setPage(1); }}
          />
          <select
            className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-28"
            value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1); }}
          >
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-32"
            value={filterStatus} onChange={e => { setFilterStatus(e.target.value as typeof filterStatus); setPage(1); }}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          {hasFilters && (
            <button onClick={resetFilters}
              className="px-3 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold cursor-pointer">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Count + page size */}
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div className="text-xs text-ink-muted">{filtered.length} of {tickets.length} complaints</div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-muted">Show</span>
          <select className="border border-border-default rounded-lg px-2 py-1 text-xs text-ink bg-warm-50 focus:outline-none"
            value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-[11px] text-ink-muted">per page</span>
        </div>
      </div>

      {/* List */}
      {paged.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">
          <div className="text-3xl mb-2">🎉</div>
          {hasFilters ? "No complaints match your filters." : "No complaints for your properties."}
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map(tk => {
            const flat = tk.flat as { flat_number: string; block: string | null } | null;
            const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
            return (
              <div key={tk.id} className="bg-white rounded-[14px] p-4 border border-border-default">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className={`inline-block px-2.5 py-[3px] rounded-full text-[10px] font-bold border ${PRIORITY_COLOR[tk.priority] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {tk.priority.toUpperCase()}
                    </span>
                    <StatusBadge status={tk.status} />
                    {tk.category && (
                      <span className="inline-block px-2.5 py-[3px] rounded-full text-[10px] font-bold bg-warm-100 text-ink-muted border border-border-default capitalize">{tk.category}</span>
                    )}
                  </div>
                  <button onClick={() => handleDelete(tk.id)} className="px-2.5 py-1 rounded-lg border border-red-200 text-[11px] font-semibold text-red-400 cursor-pointer flex-shrink-0">Delete</button>
                </div>
                <div className="text-sm font-bold text-ink mb-1">{tk.subject}</div>
                <div className="text-[11px] text-ink-muted mb-3">
                  🏠 {flatLabel} · 📅 {new Date(tk.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {tk.status === "open" && (
                    <button onClick={() => updateStatus(tk.id, "in_progress")}
                      className="px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-[11px] font-semibold cursor-pointer">
                      Mark In Progress
                    </button>
                  )}
                  {(tk.status === "open" || tk.status === "in_progress") && (
                    <button onClick={() => updateStatus(tk.id, "resolved")}
                      className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold cursor-pointer">
                      Mark Resolved ✓
                    </button>
                  )}
                  {tk.status === "resolved" && (
                    <button onClick={() => updateStatus(tk.id, "open")}
                      className="px-3 py-1.5 rounded-lg bg-warm-100 border border-border-default text-ink-muted text-[11px] font-semibold cursor-pointer">
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
              acc.push(p); return acc;
            }, [])
            .map((p, i) => p === "..." ? (
              <span key={`e-${i}`} className="text-[11px] text-ink-muted px-1">…</span>
            ) : (
              <button key={p} onClick={() => setPage(p as number)}
                className={`w-7 h-7 rounded-lg text-[11px] font-bold cursor-pointer ${page === p ? "bg-brand-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-50"}`}>{p}</button>
            ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">Next ›</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">»</button>
        </div>
      )}
      {filtered.length > 0 && (
        <div className="text-center text-[10px] text-ink-muted mt-2">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
        </div>
      )}
    </div>
  );
}
