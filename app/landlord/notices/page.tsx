"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordUserId, getLandlordFlats } from "@/lib/landlord-data";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

type Notice = {
  id: string;
  title: string;
  content: string;
  notice_type: string;
  target_audience: string;
  created_at: string;
  source: "landlord" | "society";
};

const TYPE_COLORS: Record<string, string> = {
  maintenance: "bg-blue-100 text-blue-700 border-blue-200",
  financial:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  general:     "bg-purple-100 text-purple-700 border-purple-200",
  urgent:      "bg-red-100 text-red-700 border-red-200",
};

const AUDIENCE_OPTIONS = [
  { value: "tenants",   label: "Tenants Only" },
  { value: "all",       label: "Everyone" },
  { value: "landlords", label: "Landlords Only" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function LandlordNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", notice_type: "general", target_audience: "tenants" });

  // Filters
  const [filterSearch, setFilterSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterAudience, setFilterAudience] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function loadData() {
    if (!user?.email) return;
    const lid = await getLandlordUserId(user.email);
    setLandlordId(lid);
    const flats = await getLandlordFlats(user.email).catch(() => []);
    const sid = flats.find(f => f.society_id)?.society_id ?? null;
    setSocietyId(sid);

    const { data: myNotices } = await supabase
      .from("notices")
      .select("id, title, content, notice_type, target_audience, created_at")
      .eq("created_by", lid)
      .order("id", { ascending: false });

    let societyNotices: Notice[] = [];
    if (sid) {
      const { data: sn } = await supabase
        .from("notices")
        .select("id, title, content, notice_type, target_audience, created_at")
        .eq("society_id", sid)
        .in("target_audience", ["all", "landlords"])
        .neq("created_by", lid ?? "")
        .order("id", { ascending: false });
      societyNotices = (sn ?? []).map(n => ({ ...n, source: "society" as const }));
    }

    const myMapped = (myNotices ?? []).map(n => ({ ...n, source: "landlord" as const }));
    setNotices([...myMapped, ...societyNotices].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!landlordId) return;
    setSaving(true);
    const { error } = await supabase.from("notices").insert({
      created_by: landlordId,
      ...(societyId ? { society_id: societyId } : {}),
      title: form.title,
      content: form.content,
      notice_type: form.notice_type,
      target_audience: form.target_audience,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Notice sent!");
    setForm({ title: "", content: "", notice_type: "general", target_audience: "tenants" });
    setShowForm(false);
    await loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this notice?")) return;
    await supabase.from("notices").delete().eq("id", id);
    toast.success("Notice deleted.");
    setNotices(prev => prev.filter(n => n.id !== id));
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted uppercase tracking-wide block mb-1";

  // Filter logic
  const filtered = notices.filter(n => {
    if (filterSearch && !n.title.toLowerCase().includes(filterSearch.toLowerCase()) &&
        !n.content.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    if (filterType && n.notice_type !== filterType) return false;
    if (filterSource && n.source !== filterSource) return false;
    if (filterAudience && n.target_audience !== filterAudience) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = filterSearch || filterType || filterSource || filterAudience;

  const myCount = notices.filter(n => n.source === "landlord").length;
  const societyCount = notices.filter(n => n.source === "society").length;

  return (
    <div>
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">📢 Notices</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">{myCount} sent · {societyCount} from society</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
          {showForm ? "✕ Cancel" : "+ New Notice"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-[16px] p-5 border border-brand-200 mb-5 space-y-3 shadow-sm">
          <div className="text-sm font-extrabold text-ink flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center">📢</span>
            Send Notice
          </div>
          <div>
            <label className={labelClass}>Title *</label>
            <input required className={inputClass} placeholder="e.g. Water supply interrupted tomorrow" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Message *</label>
            <textarea required className={inputClass + " resize-none"} rows={3} placeholder="Write your notice here..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Type</label>
              <select className={inputClass} value={form.notice_type} onChange={e => setForm(f => ({ ...f, notice_type: e.target.value }))}>
                <option value="general">General</option>
                <option value="maintenance">Maintenance</option>
                <option value="financial">Financial</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Send To</label>
              <select className={inputClass} value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}>
                {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {saving ? "Sending..." : "✓ Send Notice"}
          </button>
        </form>
      )}

      {/* Filter bar */}
      {notices.length > 0 && (
        <div className="bg-white rounded-[14px] border border-border-default p-3.5 mb-4">
          <div className="text-[9px] font-bold text-ink-muted uppercase tracking-widest mb-2.5">Filters</div>
          <div className="flex gap-2 flex-wrap">
            <input
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 flex-1 min-w-[160px]"
              placeholder="🔍 Search title or content..."
              value={filterSearch} onChange={e => { setFilterSearch(e.target.value); setPage(1); }}
            />
            <select className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-32"
              value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="general">General</option>
              <option value="maintenance">Maintenance</option>
              <option value="financial">Financial</option>
              <option value="urgent">Urgent</option>
            </select>
            <select className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-32"
              value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1); }}>
              <option value="">All Sources</option>
              <option value="landlord">My Notices</option>
              <option value="society">Society</option>
            </select>
            <select className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-32"
              value={filterAudience} onChange={e => { setFilterAudience(e.target.value); setPage(1); }}>
              <option value="">All Audience</option>
              <option value="tenants">Tenants</option>
              <option value="all">Everyone</option>
              <option value="landlords">Landlords</option>
            </select>
            {hasFilters && (
              <button onClick={() => { setFilterSearch(""); setFilterType(""); setFilterSource(""); setFilterAudience(""); setPage(1); }}
                className="px-3 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold cursor-pointer">Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Count + page size */}
      {notices.length > 0 && (
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <div className="text-xs text-ink-muted">{filtered.length} of {notices.length} notices</div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-muted">Show</span>
            <select className="border border-border-default rounded-lg px-2 py-1 text-xs text-ink bg-warm-50 focus:outline-none"
              value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-[11px] text-ink-muted">per page</span>
          </div>
        </div>
      )}

      {/* List */}
      {notices.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">
          <div className="text-3xl mb-2">📭</div>
          No notices yet. Create one above.
        </div>
      ) : paged.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">No notices match your filters.</div>
      ) : (
        <div className="space-y-2">
          {paged.map(n => (
            <div key={n.id} className={`bg-white rounded-[14px] p-4 border-l-4 border border-border-default ${n.notice_type === "urgent" ? "border-l-red-400" : n.source === "society" ? "border-l-blue-400" : "border-l-brand-300"}`}>
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex gap-1.5 flex-wrap">
                  <span className={`inline-block px-2.5 py-[3px] rounded-full text-[10px] font-bold border capitalize ${TYPE_COLORS[n.notice_type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {n.notice_type}
                  </span>
                  <span className={`inline-block px-2.5 py-[3px] rounded-full text-[10px] font-bold border ${n.source === "society" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                    {n.source === "society" ? "🏢 Society" : "🏠 My Notice"}
                  </span>
                  <span className="inline-block px-2.5 py-[3px] rounded-full text-[10px] font-bold bg-warm-100 text-ink-muted border border-border-default">
                    → {n.target_audience}
                  </span>
                </div>
                {n.source === "landlord" && (
                  <button onClick={() => handleDelete(n.id)} className="text-[10px] text-red-400 font-semibold cursor-pointer flex-shrink-0 hover:text-red-600">Delete</button>
                )}
              </div>
              <div className="text-sm font-bold text-ink mb-1">{n.title}</div>
              <div className="text-xs text-ink-muted leading-relaxed">{n.content}</div>
              <div className="text-[10px] text-ink-muted mt-2">
                📅 {new Date(n.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
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
    </div>
  );
}
