"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { MOCK_TICKETS, MOCK_FLATS } from "@/lib/mockData";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-green-100 text-green-700",
};

export default function LandlordComplaints() {
  // Show tickets for landlord's flats (F1, F2, F5)
  const myFlatIds = ["F1", "F2", "F5"];
  const myTickets = MOCK_TICKETS.filter((t) => myFlatIds.includes(t.flatId));

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">🚫 Property Complaints</h2>

      {/* Status summary */}
      <div className="flex gap-2.5 flex-wrap mb-5">
        {[
          { label: "Open", status: "open", color: "text-red-600" },
          { label: "In Progress", status: "in_progress", color: "text-yellow-600" },
          { label: "Resolved", status: "resolved", color: "text-green-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[90px] text-center">
            <div className={`text-2xl font-extrabold ${s.color}`}>
              {myTickets.filter((t) => t.status === s.status).length}
            </div>
            <div className="text-[11px] text-ink-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {myTickets.length === 0 && (
        <div className="text-center py-10 text-ink-muted text-sm">No complaints for your properties 🎉</div>
      )}

      {myTickets.map((tk) => {
        const flat = MOCK_FLATS.find((f) => f.id === tk.flatId);
        return (
          <div key={tk.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
            <div className="flex gap-1.5 flex-wrap mb-2">
              <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${PRIORITY_COLOR[tk.priority] || "bg-gray-100 text-gray-600"}`}>
                {tk.priority.toUpperCase()}
              </span>
              <StatusBadge status={tk.status} />
              <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-gray-100 text-gray-600">{tk.category}</span>
              <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-gray-100 text-gray-500">{tk.id}</span>
            </div>
            <div className="text-sm font-bold text-ink mb-1">{tk.subject}</div>
            <div className="text-[11px] text-ink-muted">Flat {flat?.flatNo} · Raised {tk.created}</div>
            {tk.status === "in_progress" && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-100 text-[11px] text-yellow-700">
                Assigned to maintenance team — work in progress
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
