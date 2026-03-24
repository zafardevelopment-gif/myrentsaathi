"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordTickets, type LandlordTicket } from "@/lib/landlord-data";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-green-100 text-green-700",
};

export default function LandlordComplaints() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<LandlordTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");

  async function loadTickets() {
    if (!user?.email) return;
    const t = await getLandlordTickets(user.email).catch(() => []);
    setTickets(t);
  }

  useEffect(() => {
    loadTickets().finally(() => setLoading(false));
  }, [user]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("tickets").update({
      status,
      ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
    }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Marked as ${status.replace("_", " ")}`);
    await loadTickets();
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
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
  };

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div>
      <Toaster position="top-center" />
      <h2 className="text-[15px] font-extrabold text-ink mb-4">🚫 Property Complaints</h2>

      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        {[
          { label: "Open", key: "open", color: "text-red-600" },
          { label: "In Progress", key: "in_progress", color: "text-yellow-600" },
          { label: "Resolved", key: "resolved", color: "text-green-700" },
        ].map(s => (
          <div key={s.key} className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[90px] text-center">
            <div className={`text-2xl font-extrabold ${s.color}`}>{counts[s.key as keyof typeof counts]}</div>
            <div className="text-[11px] text-ink-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "open", "in_progress", "resolved"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border ${filter === f ? "bg-brand-500 text-white border-brand-500" : "bg-white text-ink-muted border-border-default"}`}>
            {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">No complaints {filter !== "all" ? `with status "${filter}"` : "for your properties"} 🎉</div>
      ) : (
        filtered.map(tk => {
          const flat = tk.flat as { flat_number: string; block: string | null } | null;
          const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
          return (
            <div key={tk.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex gap-1.5 flex-wrap">
                  <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${PRIORITY_COLOR[tk.priority] ?? "bg-gray-100 text-gray-600"}`}>
                    {tk.priority.toUpperCase()}
                  </span>
                  <StatusBadge status={tk.status} />
                  {tk.category && (
                    <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-gray-100 text-gray-600">{tk.category}</span>
                  )}
                </div>
                <button onClick={() => handleDelete(tk.id)} className="px-2.5 py-1 rounded-lg border border-red-200 text-[11px] font-semibold text-red-400 cursor-pointer flex-shrink-0">Delete</button>
              </div>
              <div className="text-sm font-bold text-ink mb-1">{tk.subject}</div>
              <div className="text-[11px] text-ink-muted mb-3">{flatLabel} · Raised {new Date(tk.created_at).toLocaleDateString("en-IN")}</div>

              {/* Action buttons */}
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
        })
      )}
    </div>
  );
}
