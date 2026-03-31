"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantProfile, getTenantTickets, createTenantTicket, type TenantTicket } from "@/lib/tenant-data";
import { supabase } from "@/lib/supabase";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high:   "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low:    "bg-green-100 text-green-700 border-green-200",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function TenantComplaints() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TenantTicket[]>([]);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [flatId, setFlatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: "plumbing", subject: "", description: "", priority: "medium" });

  // Edit state
  const [editTicket, setEditTicket] = useState<TenantTicket | null>(null);
  const [editForm, setEditForm] = useState({ category: "", subject: "", description: "", priority: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Filters
  const [filterSearch, setFilterSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "in_progress" | "resolved">("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function loadTickets() {
    if (!user?.email) return;
    const t = await getTenantTickets(user.email);
    setTickets(t);
  }

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const profile = await getTenantProfile(user!.email);
      setSocietyId(profile?.society_id ?? null);
      setFlatId(profile?.flat_id ?? null);
      await loadTickets();
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  async function handleCreate() {
    if (!form.subject.trim()) { toast.error("Subject required"); return; }
    if (!user?.email) return;
    setSaving(true);
    try {
      await createTenantTicket(user.email, societyId ?? "", flatId, form);
      toast.success("Complaint submitted!");
      setShowForm(false);
      setForm({ category: "plumbing", subject: "", description: "", priority: "medium" });
      await loadTickets();
    } catch {
      toast.error("Failed to submit complaint");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(tk: TenantTicket) {
    setEditTicket(tk);
    setEditForm({ category: tk.category, subject: tk.subject, description: tk.description ?? "", priority: tk.priority });
  }

  async function handleEdit() {
    if (!editTicket) return;
    setEditSaving(true);
    const { error } = await supabase.from("tickets").update({
      subject: editForm.subject,
      description: editForm.description,
      category: editForm.category,
      priority: editForm.priority,
    }).eq("id", editTicket.id);
    setEditSaving(false);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Complaint updated!");
    setEditTicket(null);
    await loadTickets();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this complaint?")) return;
    const { error } = await supabase.from("tickets").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete complaint");
      return;
    }
    toast.success("Complaint deleted.");
    setTickets(prev => prev.filter(t => t.id !== id));
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const counts = {
    open:        tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved:    tickets.filter(t => t.status === "resolved").length,
  };

  const filtered = tickets.filter(tk => {
    if (filterStatus !== "all" && tk.status !== filterStatus) return false;
    if (filterPriority && tk.priority !== filterPriority) return false;
    if (filterSearch && !tk.subject.toLowerCase().includes(filterSearch.toLowerCase()) &&
        !tk.category.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetFilters() {
    setFilterStatus("all"); setFilterSearch(""); setFilterPriority(""); setPage(1);
  }

  const hasFilters = filterStatus !== "all" || filterSearch || filterPriority;

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500";
  const selectClass = "border border-border-default rounded-xl px-3 py-2 text-sm outline-none cursor-pointer";

  return (
    <div>
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">🚫 My Complaints</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">{tickets.length} total complaint{tickets.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {/* New complaint form */}
      {showForm && (
        <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4 space-y-3">
          <div className="text-[13px] font-bold text-ink">New Complaint</div>
          <input className={inputClass} placeholder="Subject (e.g. Water leakage in bathroom)"
            value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          <textarea className={inputClass + " resize-none"} placeholder="Description (optional)" rows={3}
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-2 flex-wrap">
            <select className={selectClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="lift">Lift</option>
              <option value="security">Security</option>
              <option value="cleaning">Cleaning</option>
              <option value="other">Other</option>
            </select>
            <select className={selectClass} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
              {saving ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

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
        <div className="text-center py-10">
          <div className="text-4xl mb-3">🎉</div>
          <div className="text-sm text-ink-muted">
            {hasFilters ? "No complaints match your filters." : "No complaints! Everything is working well."}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map((tk) => (
            <div key={tk.id} className="bg-white rounded-[14px] p-4 border border-border-default">
              <div className="flex justify-between items-start gap-2">
                <div className="flex gap-1.5 flex-wrap mb-2">
                  <span className={`inline-block px-2.5 py-[3px] rounded-full text-[10px] font-bold border ${PRIORITY_COLOR[tk.priority] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {tk.priority.toUpperCase()}
                  </span>
                  <StatusBadge status={tk.status} />
                  {tk.ticket_number && (
                    <span className="inline-block px-2.5 py-[3px] rounded-full text-[10px] font-bold bg-warm-100 text-ink-muted border border-border-default">{tk.ticket_number}</span>
                  )}
                  {tk.category && (
                    <span className="inline-block px-2.5 py-[3px] rounded-full text-[10px] font-bold bg-warm-100 text-ink-muted border border-border-default capitalize">{tk.category}</span>
                  )}
                </div>
                {tk.status === "open" && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(tk)} className="px-2.5 py-1 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">Edit</button>
                    <button onClick={() => handleDelete(tk.id)} className="px-2.5 py-1 rounded-lg border border-red-200 text-[11px] font-semibold text-red-500 cursor-pointer">Delete</button>
                  </div>
                )}
              </div>
              <div className="text-sm font-bold text-ink mb-1">{tk.subject}</div>
              {tk.description && <div className="text-xs text-ink-muted mb-1 leading-relaxed">{tk.description}</div>}
              <div className="text-[11px] text-ink-muted">
                📅 {new Date(tk.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
              {tk.status === "in_progress" && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-100 text-[11px] text-yellow-700">🔧 Assigned — work in progress</div>
              )}
              {tk.status === "resolved" && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-green-50 border border-green-100 text-[11px] text-green-700">✓ Resolved</div>
              )}
            </div>
          ))}
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

      {/* Edit Modal */}
      {editTicket && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setEditTicket(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div className="text-base font-extrabold text-ink">✏️ Edit Complaint</div>
              <button onClick={() => setEditTicket(null)} className="text-ink-muted text-lg cursor-pointer">✕</button>
            </div>
            <input className={inputClass} value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject" />
            <textarea className={inputClass + " resize-none"} rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" />
            <div className="flex gap-2">
              <select className={selectClass} value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="lift">Lift</option>
                <option value="security">Security</option>
                <option value="cleaning">Cleaning</option>
                <option value="other">Other</option>
              </select>
              <select className={selectClass} value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditTicket(null)} className="flex-1 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Cancel</button>
              <button onClick={handleEdit} disabled={editSaving} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
