"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getAdminSocietyId,
  getSocietyTickets,
  resolveTicket,
  type AdminTicket,
} from "@/lib/admin-data";

export default function AdminTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      try {
        const societyId = await getAdminSocietyId(user!.email);
        if (societyId) {
          const t = await getSocietyTickets(societyId);
          setTickets(t);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  async function handleResolve(id: string) {
    setSaving(id);
    try {
      await resolveTicket(id, "");
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: "resolved" } : t));
      toast.success("Ticket resolved");
    } catch {
      toast.error("Failed — check RLS policies");
    } finally {
      setSaving(null);
    }
  }

  const openCount = tickets.filter((t) => t.status === "open").length;
  const activeCount = tickets.filter((t) => t.status === "in_progress" || t.status === "assigned").length;

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🚫 Complaint Tickets</h2>
        <div className="flex gap-1.5">
          <StatusBadge status="open" label={`${openCount} Open`} />
          <StatusBadge status="in_progress" label={`${activeCount} Active`} />
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No tickets found. Seed the database first.</div>
      ) : (
        tickets.map((tk) => {
          const flat = (tk.flat as { flat_number: string; block: string | null } | null);
          const raiserName = (tk.raiser as { full_name: string } | null)?.full_name ?? "—";
          const assigneeName = (tk.assignee as { full_name: string } | null)?.full_name;
          return (
            <div
              key={tk.id}
              className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 mb-2.5 ${
                tk.priority === "urgent" ? "border-l-red-500" : tk.priority === "high" ? "border-l-yellow-500" : "border-l-green-500"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-1.5 mb-1 flex-wrap">
                    {tk.ticket_number && (
                      <StatusBadge status="pending" label={tk.ticket_number} />
                    )}
                    <StatusBadge
                      status={tk.priority === "urgent" ? "urgent" : tk.priority === "high" ? "overdue" : "active"}
                      label={tk.priority.toUpperCase()}
                    />
                    <StatusBadge status={tk.status} />
                    <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-blue-100 text-blue-700">
                      {tk.category}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-ink">{tk.subject}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {flat ? `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—"} • {raiserName} • {new Date(tk.created_at).toLocaleDateString("en-IN")}
                  </div>
                  {assigneeName && (
                    <div className="text-[11px] text-blue-600 mt-0.5">Assigned: {assigneeName}</div>
                  )}
                </div>
                {tk.status !== "resolved" && (
                  <button
                    onClick={() => handleResolve(tk.id)}
                    disabled={saving === tk.id}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer flex-shrink-0 disabled:opacity-50"
                  >
                    {saving === tk.id ? "..." : "✓ Resolve"}
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
