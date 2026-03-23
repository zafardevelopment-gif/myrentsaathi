"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { MOCK_NOTICES } from "@/lib/mockData";

const TYPE_COLORS: Record<string, string> = {
  urgent: "border-l-red-500",
  financial: "border-l-yellow-500",
  maintenance: "border-l-blue-500",
  general: "border-l-blue-500",
};

export default function BoardNotices() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📢 Post Notices</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ New Notice</button>
      </div>

      {MOCK_NOTICES.map((n) => (
        <div
          key={n.id}
          className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 mb-2 ${TYPE_COLORS[n.type.toLowerCase()] || "border-l-blue-500"}`}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex gap-1.5 mb-1.5 flex-wrap">
                <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-blue-100 text-blue-700">{n.type}</span>
                <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-purple-100 text-purple-700">To: {n.audience}</span>
                {n.type === "financial" && (
                  <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-red-100 text-red-700">🔴 Important</span>
                )}
              </div>
              <div className="text-sm font-bold text-ink">{n.title}</div>
              <div className="text-xs text-ink-muted mt-1 leading-relaxed">{n.content}</div>
              <div className="text-[11px] text-ink-muted mt-1">{n.date}</div>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer flex-shrink-0">📱 Broadcast</button>
          </div>
        </div>
      ))}
    </div>
  );
}
