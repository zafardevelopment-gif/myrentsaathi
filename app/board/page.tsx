"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { MOCK_TICKETS, MOCK_FLATS, MOCK_USERS, MOCK_POLLS, MOCK_EXPENSES } from "@/lib/mockData";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-green-100 text-green-700",
};

export default function BoardOverview() {
  const myTickets = MOCK_TICKETS.filter((t) => t.assignedTo === "U9");
  const pendingExp = MOCK_EXPENSES.filter((e) => e.approval === "pending");
  const activePolls = MOCK_POLLS.filter((p) => p.status === "active");

  return (
    <div>
      {/* Welcome card */}
      <div className="bg-gradient-to-br from-purple-900 to-purple-700 text-white rounded-[14px] p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-extrabold">SK</div>
          <div>
            <div className="text-xs opacity-60 mb-0.5">Board Member · Secretary</div>
            <div className="text-lg font-extrabold">Suresh Kumar</div>
            <div className="text-xs opacity-60">Green Valley Housing Society</div>
          </div>
        </div>
        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { label: "Open Tickets", value: myTickets.filter((t) => t.status !== "resolved").length, color: "text-red-300" },
            { label: "Pending Approvals", value: pendingExp.length, color: "text-yellow-300" },
            { label: "Active Polls", value: activePolls.length, color: "text-green-300" },
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
      {myTickets.length === 0 && (
        <div className="text-center py-10 text-ink-muted text-sm">No tickets assigned ✨</div>
      )}
      {myTickets.map((tk) => {
        const flat = MOCK_FLATS.find((f) => f.id === tk.flatId);
        const raiser = MOCK_USERS.find((u) => u.id === tk.raisedBy);
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
            <div className="text-[11px] text-ink-muted">{flat?.flatNo} · Raised by {raiser?.name} · {tk.created}</div>
            {tk.status !== "resolved" && (
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer">✓ Mark Resolved</button>
                <button className="px-3 py-1.5 rounded-lg bg-white border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">Update Status</button>
                <button className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-[11px] font-semibold text-green-700 cursor-pointer">📱 Notify</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
