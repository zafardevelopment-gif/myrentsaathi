"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { MOCK_TICKETS, MOCK_FLATS, MOCK_USERS } from "@/lib/mockData";

export default function AdminTickets() {
  const openCount = MOCK_TICKETS.filter((t) => t.status === "open").length;
  const activeCount = MOCK_TICKETS.filter((t) => t.status === "in_progress" || t.status === "assigned").length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🚫 Complaint Tickets</h2>
        <div className="flex gap-1.5">
          <StatusBadge status="open" label={`${openCount} Open`} />
          <StatusBadge status="in_progress" label={`${activeCount} Active`} />
        </div>
      </div>

      {MOCK_TICKETS.map((tk) => {
        const flat = MOCK_FLATS.find((f) => f.id === tk.flatId);
        const raiser = MOCK_USERS.find((u) => u.id === tk.raisedBy);
        const assignee = tk.assignedTo ? MOCK_USERS.find((u) => u.id === tk.assignedTo) : null;
        return (
          <div key={tk.id} className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 mb-2.5 ${tk.priority === "urgent" ? "border-l-red-500" : tk.priority === "high" ? "border-l-yellow-500" : "border-l-green-500"}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex gap-1.5 mb-1 flex-wrap">
                  <StatusBadge status="pending" label={tk.id} />
                  <StatusBadge status={tk.priority === "urgent" ? "urgent" : tk.priority === "high" ? "overdue" : "active"} label={tk.priority.toUpperCase()} />
                  <StatusBadge status={tk.status} />
                  <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-blue-100 text-blue-700">{tk.category}</span>
                </div>
                <div className="text-sm font-bold text-ink">{tk.subject}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">{flat?.flatNo} • {raiser?.name} • {tk.created}</div>
                {assignee && <div className="text-[11px] text-blue-600 mt-0.5">Assigned: {assignee.name}</div>}
              </div>
              {tk.status === "open" && (
                <button className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[11px] font-bold cursor-pointer flex-shrink-0">Assign</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
