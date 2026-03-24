"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getBoardMemberProfile,
  getBoardAssignedTickets,
  getBoardExpenses,
  boardResolveTicket,
  type BoardMemberProfile,
  type BoardTicket,
  type BoardExpense,
} from "@/lib/tenant-data";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-green-100 text-green-700",
};

export default function BoardOverview() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BoardMemberProfile | null>(null);
  const [tickets, setTickets] = useState<BoardTicket[]>([]);
  const [expenses, setExpenses] = useState<BoardExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const p = await getBoardMemberProfile(user!.email);
      setProfile(p);
      if (p) {
        const [t, e] = await Promise.all([
          getBoardAssignedTickets(p.user_id),
          getBoardExpenses(p.society_id),
        ]);
        setTickets(t);
        setExpenses(e);
      }
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  async function handleResolve(id: string) {
    setSaving(id);
    try {
      await boardResolveTicket(id);
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: "resolved" } : t));
      toast.success("Ticket resolved");
    } catch {
      toast.error("Failed — check RLS policies");
    } finally {
      setSaving(null);
    }
  }

  const pendingExp = expenses.filter((e) => e.approval_status === "pending");
  const openTickets = tickets.filter((t) => t.status !== "resolved").length;
  const societyName = (profile?.society as { name: string } | null)?.name ?? "Society";
  const memberName = (profile?.user as { full_name: string } | null)?.full_name ?? user?.name ?? "Board Member";
  const initials = memberName.split(" ").map((n: string) => n[0]).join("").slice(0, 2);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      {/* Welcome card */}
      <div className="bg-gradient-to-br from-purple-900 to-purple-700 text-white rounded-[14px] p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-extrabold">{initials}</div>
          <div>
            <div className="text-xs opacity-60 mb-0.5">Board Member · {profile?.role ?? "Member"}</div>
            <div className="text-lg font-extrabold">{memberName}</div>
            <div className="text-xs opacity-60">{societyName}</div>
          </div>
        </div>
        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { label: "Open Tickets", value: openTickets, color: "text-red-300" },
            { label: "Pending Approvals", value: pendingExp.length, color: "text-yellow-300" },
            { label: "Total Tickets", value: tickets.length, color: "text-green-300" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2.5 flex-1 min-w-[90px]">
              <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] opacity-50 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* My assigned tickets */}
      <h2 className="text-[15px] font-extrabold text-ink mb-3">🎫 My Assigned Tickets</h2>
      {tickets.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">No tickets assigned ✨</div>
      ) : (
        tickets.map((tk) => {
          const flat = (tk.flat as { flat_number: string; block: string | null } | null);
          const raiserName = (tk.raiser as { full_name: string } | null)?.full_name ?? "—";
          return (
            <div key={tk.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
              <div className="flex gap-1.5 flex-wrap mb-2">
                <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${PRIORITY_COLOR[tk.priority] || "bg-gray-100 text-gray-600"}`}>
                  {tk.priority.toUpperCase()}
                </span>
                <StatusBadge status={tk.status} />
                <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-gray-100 text-gray-600">{tk.category}</span>
              </div>
              <div className="text-sm font-bold text-ink mb-1">{tk.subject}</div>
              <div className="text-[11px] text-ink-muted">
                {flat ? `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—"} · Raised by {raiserName} · {new Date(tk.created_at).toLocaleDateString("en-IN")}
              </div>
              {tk.status !== "resolved" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleResolve(tk.id)}
                    disabled={saving === tk.id}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    {saving === tk.id ? "..." : "✓ Mark Resolved"}
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-white border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">Update Status</button>
                  <button className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-[11px] font-semibold text-green-700 cursor-pointer">📱 Notify</button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
