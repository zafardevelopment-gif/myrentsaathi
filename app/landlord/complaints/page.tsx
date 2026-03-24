"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordTickets, type LandlordTicket } from "@/lib/landlord-data";

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

  useEffect(() => {
    if (!user?.email) return;
    getLandlordTickets(user.email)
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">🚫 Property Complaints</h2>

      <div className="flex gap-2.5 flex-wrap mb-5">
        {[
          { label: "Open", key: "open", color: "text-red-600" },
          { label: "In Progress", key: "in_progress", color: "text-yellow-600" },
          { label: "Resolved", key: "resolved", color: "text-green-700" },
        ].map((s) => (
          <div key={s.key} className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[90px] text-center">
            <div className={`text-2xl font-extrabold ${s.color}`}>{counts[s.key as keyof typeof counts]}</div>
            <div className="text-[11px] text-ink-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">No complaints for your properties 🎉</div>
      ) : (
        tickets.map((tk) => {
          const flat = tk.flat as { flat_number: string; block: string | null } | null;
          const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
          return (
            <div key={tk.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
              <div className="flex gap-1.5 flex-wrap mb-2">
                <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${PRIORITY_COLOR[tk.priority] ?? "bg-gray-100 text-gray-600"}`}>
                  {tk.priority.toUpperCase()}
                </span>
                <StatusBadge status={tk.status} />
                {tk.category && (
                  <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-gray-100 text-gray-600">{tk.category}</span>
                )}
              </div>
              <div className="text-sm font-bold text-ink mb-1">{tk.subject}</div>
              <div className="text-[11px] text-ink-muted">
                {flatLabel} · Raised {new Date(tk.created_at).toLocaleDateString("en-IN")}
              </div>
              {tk.status === "in_progress" && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-100 text-[11px] text-yellow-700">
                  Assigned to maintenance team — work in progress
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
