"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import toast from "react-hot-toast";
import { getAllTickets, updateTicketStatus, type Ticket } from "@/lib/superadmin-data";

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high:   "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low:    "bg-gray-100 text-gray-500",
};

const STATUS_STYLE: Record<string, string> = {
  open:        "bg-red-100 text-red-700",
  assigned:    "bg-yellow-100 text-yellow-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved:    "bg-green-100 text-green-700",
  closed:      "bg-gray-100 text-gray-500",
};

const BORDER_PRIORITY: Record<string, string> = {
  urgent: "border-l-red-500",
  high:   "border-l-orange-400",
  medium: "border-l-yellow-400",
  low:    "border-l-gray-300",
};

export default function SuperAdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await getAllTickets();
      setTickets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleResolve(ticket: Ticket) {
    setSaving(ticket.id);
    try {
      await updateTicketStatus(ticket.id, "resolved");
      setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status: "resolved" } : t));
      toast.success("Ticket marked resolved");
      setExpanded(null);
    } catch {
      toast.error("Failed — check RLS policies");
    } finally {
      setSaving(null);
    }
  }

  async function handleAssign(ticket: Ticket, team: string) {
    setSaving(ticket.id);
    try {
      await updateTicketStatus(ticket.id, "assigned");
      setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status: "assigned" } : t));
      toast.success(`Assigned to ${team}`);
    } catch {
      toast.error("Failed — check RLS policies");
    } finally {
      setSaving(null);
    }
  }

  const filtered = tickets.filter((t) => {
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchStatus && matchPriority;
  });

  const open = tickets.filter((t) => t.status === "open").length;
  const inProgress = tickets.filter((t) => ["assigned", "in_progress"].includes(t.status)).length;
  const resolved = tickets.filter((t) => ["resolved", "closed"].includes(t.status)).length;
  const urgent = tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved").length;

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[14px] p-6 text-center">
        <div className="text-red-600 font-bold mb-2">⚠️ {error}</div>
        <button onClick={load} className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[11px] font-bold cursor-pointer">Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        <StatCard icon="🔴" label="Open" value={String(open)} sub={urgent > 0 ? `${urgent} urgent` : undefined} accent="text-red-500" />
        <StatCard icon="🟡" label="In Progress" value={String(inProgress)} accent="text-amber-600" />
        <StatCard icon="✅" label="Resolved" value={String(resolved)} accent="text-green-600" />
        <StatCard icon="📊" label="Total" value={String(tickets.length)} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[14px] p-3 border border-border-default mb-4 flex flex-wrap gap-2 items-center">
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "open", "assigned", "in_progress", "resolved"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all border ${
                filterStatus === s
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-ink-muted border-border-default hover:bg-warm-50"
              }`}
            >
              {s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border-default hidden sm:block" />
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "urgent", "high", "medium", "low"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all border ${
                filterPriority === p
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink-muted border-border-default hover:bg-warm-50"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-ink-muted font-semibold ml-auto">{filtered.length} tickets</div>
      </div>

      {/* Tickets */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-muted text-sm">
            {tickets.length === 0 ? "No tickets in database. Seed the DB first." : "No tickets match your filter."}
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-[14px] border border-l-4 border-border-default ${BORDER_PRIORITY[t.priority] ?? "border-l-gray-300"}`}
            >
              {/* Main row */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {t.ticket_number && (
                        <span className="text-[10px] font-mono font-bold text-ink-muted">{t.ticket_number}</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${PRIORITY_STYLE[t.priority] ?? ""}`}>
                        {t.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${STATUS_STYLE[t.status] ?? ""}`}>
                        {t.status.replace("_", " ")}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">
                        {t.category}
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-ink">{t.subject}</div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      {(t.society as {name:string}|null)?.name ?? "—"} ·{" "}
                      {new Date(t.created_at).toLocaleDateString("en-IN")}
                      {t.description && (
                        <span className="ml-1 italic text-ink-muted"> · {t.description.slice(0, 60)}{t.description.length > 60 ? "…" : ""}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    {t.status === "open" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(t.id); }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors"
                      >
                        Assign
                      </button>
                    )}
                    <span className="text-ink-muted text-[13px] self-center">{expanded === t.id ? "▲" : "▼"}</span>
                  </div>
                </div>
              </div>

              {/* Expanded */}
              {expanded === t.id && (
                <div className="px-4 pb-4 border-t border-border-light">
                  <div className="pt-3 space-y-3">
                    {t.description && (
                      <div className="bg-warm-50 rounded-xl p-3">
                        <div className="text-[10px] font-bold text-ink-muted mb-1">DESCRIPTION</div>
                        <div className="text-[12px] text-ink">{t.description}</div>
                      </div>
                    )}

                    {/* Assign team */}
                    <div>
                      <div className="text-[11px] font-bold text-ink-muted mb-1.5">Assign to team:</div>
                      <div className="flex flex-wrap gap-2">
                        {["Tech Team", "Product Team", "Support Team", "Finance Team"].map((team) => (
                          <button
                            key={team}
                            onClick={() => handleAssign(t, team)}
                            disabled={saving === t.id}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all border border-border-default text-ink-muted hover:bg-warm-50 disabled:opacity-50"
                          >
                            {team}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {t.status !== "resolved" && (
                        <button
                          onClick={() => handleResolve(t)}
                          disabled={saving === t.id}
                          className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-[11px] font-bold cursor-pointer hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {saving === t.id ? "Saving..." : "✅ Mark Resolved"}
                        </button>
                      )}
                      <button className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 transition-colors">
                        💬 Reply to Customer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
