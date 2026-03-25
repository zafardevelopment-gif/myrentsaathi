"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantProfile } from "@/lib/tenant-data";
import { supabase } from "@/lib/supabase";

type Notice = {
  id: string;
  title: string;
  content: string;
  notice_type: string;
  audience: string;
  created_at: string;
  source: "landlord" | "society";
};

const TYPE_COLORS: Record<string, string> = {
  maintenance: "bg-blue-100 text-blue-700",
  financial:   "bg-yellow-100 text-yellow-700",
  general:     "bg-purple-100 text-purple-700",
  urgent:      "bg-red-100 text-red-700",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function TenantNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSearch, setFilterSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSource, setFilterSource] = useState<"" | "landlord" | "society">("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const profile = await getTenantProfile(user!.email);
      const allNotices: Notice[] = [];

      // Society notices visible to tenants
      if (profile?.society_id) {
        const { data: sn } = await supabase
          .from("notices")
          .select("id, title, content, notice_type, target_audience, created_at")
          .eq("society_id", profile.society_id)
          .in("target_audience", ["all", "tenants"])
          .order("id", { ascending: false });
        (sn ?? []).forEach(n => allNotices.push({ ...n, audience: n.target_audience, source: "society" }));
      }

      // Landlord direct notices
      if (profile?.flat_id) {
        const { data: flat } = await supabase
          .from("flats").select("owner_id").eq("id", profile.flat_id).single();
        if (flat?.owner_id) {
          const { data: ln } = await supabase
            .from("notices")
            .select("id, title, content, notice_type, target_audience, created_at")
            .eq("created_by", flat.owner_id)
            .in("target_audience", ["all", "tenants"])
            .order("id", { ascending: false });
          (ln ?? []).forEach(n => allNotices.push({ ...n, audience: n.target_audience, source: "landlord" }));
        }
      }

      // Deduplicate + sort
      const seen = new Set<string>();
      const unique = allNotices.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; });
      unique.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setNotices(unique);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const landlordCount = notices.filter(n => n.source === "landlord").length;
  const societyCount  = notices.filter(n => n.source === "society").length;

  const filtered = notices.filter(n => {
    if (filterSource && n.source !== filterSource) return false;
    if (filterType && n.notice_type !== filterType) return false;
    if (filterSearch && !n.title.toLowerCase().includes(filterSearch.toLowerCase()) &&
        !n.content.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetFilters() {
    setFilterSearch(""); setFilterType(""); setFilterSource(""); setPage(1);
  }

  const hasFilters = filterSearch || filterType || filterSource;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">📢 Notices</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">
            {landlordCount > 0 && `${landlordCount} from landlord`}
            {landlordCount > 0 && societyCount > 0 && " · "}
            {societyCount > 0 && `${societyCount} from society`}
            {notices.length === 0 && "No notices yet"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { label: "From Landlord", key: "landlord" as const, color: "text-green-700", bg: "bg-green-50 border-green-100", count: landlordCount },
          { label: "From Society",  key: "society"  as const, color: "text-blue-700",  bg: "bg-blue-50 border-blue-100",   count: societyCount },
        ].map(s => (
          <button key={s.key} onClick={() => { setFilterSource(filterSource === s.key ? "" : s.key); setPage(1); }}
            className={`rounded-[14px] p-3.5 border flex-1 min-w-[100px] text-center cursor-pointer transition-all ${filterSource === s.key ? s.bg + " ring-2 ring-offset-1 ring-brand-300" : "bg-white border-border-default"}`}>
            <div className={`text-xl font-extrabold ${s.color}`}>{s.count}</div>
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
            placeholder="🔍 Search title or content..."
            value={filterSearch} onChange={e => { setFilterSearch(e.target.value); setPage(1); }}
          />
          <select
            className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-32"
            value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
          >
            <option value="">All Types</option>
            <option value="general">General</option>
            <option value="maintenance">Maintenance</option>
            <option value="financial">Financial</option>
            <option value="urgent">Urgent</option>
          </select>
          <select
            className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-32"
            value={filterSource} onChange={e => { setFilterSource(e.target.value as typeof filterSource); setPage(1); }}
          >
            <option value="">All Sources</option>
            <option value="landlord">Landlord</option>
            <option value="society">Society</option>
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

      {/* List */}
      {paged.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">
          <div className="text-3xl mb-2">📭</div>
          {hasFilters ? "No notices match your filters." : "No notices for you yet."}
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map(n => (
            <div key={n.id}
              className={`bg-white rounded-[14px] p-4 border border-border-default mb-2 border-l-4 ${n.notice_type === "urgent" ? "border-l-red-400" : n.source === "landlord" ? "border-l-green-400" : "border-l-blue-400"}`}>
              <div className="flex gap-1.5 mb-2 flex-wrap">
                <span className={`inline-block px-2.5 py-[3px] rounded-full text-[10px] font-bold border ${TYPE_COLORS[n.notice_type] ?? "bg-gray-100 text-gray-600"} border-transparent`}>
                  {n.notice_type}
                </span>
                <span className={`inline-block px-2.5 py-[3px] rounded-full text-[10px] font-bold ${n.source === "landlord" ? "bg-green-50 text-green-700 border border-green-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                  {n.source === "landlord" ? "🏠 Landlord" : "🏢 Society"}
                </span>
              </div>
              <div className="text-sm font-bold text-ink mb-1.5">{n.title}</div>
              <div className="text-xs text-ink-muted leading-relaxed">{n.content}</div>
              <div className="text-[10px] text-ink-muted mt-2">
                {new Date(n.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
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
