"use client";

import { MOCK_BOARD_MEMBERS, MOCK_USERS } from "@/lib/mockData";

const AUDIT_LOGS = [
  { action: "Payment received", entity: "Flat A-204", user: "Vikram Malhotra", time: "2 hours ago" },
  { action: "Ticket assigned", entity: "TK-2603-001", user: "Society Admin", time: "5 hours ago" },
  { action: "Expense added", entity: "Pipeline repair ₹12K", user: "Suresh Kumar", time: "1 day ago" },
  { action: "Poll created", entity: "EV Charging Station", user: "Society Admin", time: "2 days ago" },
  { action: "Notice published", entity: "Water tank cleaning", user: "Society Admin", time: "2 days ago" },
];

export default function AdminGovernance() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">⚖️ Governance & Board</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Add Member</button>
      </div>

      <h3 className="text-[13px] font-bold text-ink mb-2.5">Board Members</h3>
      {MOCK_BOARD_MEMBERS.map((bm) => {
        const user = MOCK_USERS.find((u) => u.id === bm.userId);
        return (
          <div key={bm.userId} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-base font-extrabold text-brand-500">
                {user?.name[0]}
              </div>
              <div>
                <div className="text-sm font-bold text-ink">{user?.name}</div>
                <div className="text-[11px] text-ink-muted">{user?.email} • {user?.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-purple-100 text-purple-700">{bm.designation}</span>
              <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-blue-100 text-blue-700">{bm.role}</span>
            </div>
          </div>
        );
      })}

      <h3 className="text-[13px] font-bold text-ink mt-5 mb-2.5">Recent Audit Logs</h3>
      {AUDIT_LOGS.map((log, i) => (
        <div key={i} className="flex items-center gap-2.5 py-2 border-b border-gray-100 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
          <span className="text-ink font-semibold">{log.action}</span>
          <span className="text-ink-muted">— {log.entity} by {log.user}</span>
          <span className="text-ink-muted ml-auto">{log.time}</span>
        </div>
      ))}
    </div>
  );
}
