"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { MOCK_TICKETS, MOCK_FLATS } from "@/lib/mockData";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-green-100 text-green-700",
};

export default function TenantComplaints() {
  const myTickets = MOCK_TICKETS.filter((t) => t.raisedBy === "U5");

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🚫 My Complaints</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ New</button>
      </div>

      {myTickets.length === 0 && (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">🎉</div>
          <div className="text-sm text-ink-muted">No complaints! Everything is working well.</div>
        </div>
      )}

      {myTickets.map((tk, i) => {
        const flat = MOCK_FLATS.find((f) => f.id === tk.flatId);
        return (
          <div key={tk.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
            <div className="flex gap-1.5 flex-wrap mb-2">
              <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${PRIORITY_COLOR[tk.priority] || "bg-gray-100 text-gray-600"}`}>
                {tk.priority.toUpperCase()}
              </span>
              <StatusBadge status={tk.status} />
              <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-gray-100 text-gray-600">{tk.id}</span>
            </div>
            <div className="text-sm font-bold text-ink mb-1">{tk.subject}</div>
            <div className="text-[11px] text-ink-muted">Raised on {tk.created} · {tk.category}</div>
            {tk.status === "in_progress" && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-100 text-[11px] text-yellow-700">
                Assigned to maintenance team — work in progress
              </div>
            )}
            {tk.status === "resolved" && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-green-50 border border-green-100 text-[11px] text-green-700">
                Resolved ✓
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
