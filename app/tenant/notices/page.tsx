"use client";

import { MOCK_NOTICES } from "@/lib/mockData";

const TYPE_COLORS: Record<string, string> = {
  maintenance: "bg-blue-100 text-blue-700",
  financial: "bg-yellow-100 text-yellow-700",
  general: "bg-purple-100 text-purple-700",
  urgent: "bg-red-100 text-red-700",
};

export default function TenantNotices() {
  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">📢 Society Notices</h2>

      {MOCK_NOTICES.map((n) => (
        <div key={n.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
          <div className="flex gap-1.5 mb-2 flex-wrap">
            <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${TYPE_COLORS[n.type] || "bg-gray-100 text-gray-600"}`}>
              {n.type}
            </span>
            {n.type === "financial" && (
              <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-red-100 text-red-700">
                ⚠️ Important
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-ink mb-1.5">{n.title}</div>
          <div className="text-xs text-ink-muted leading-relaxed">{n.content}</div>
          <div className="text-[10px] text-ink-muted mt-2">
            Posted {n.date} · For: {n.audience}
          </div>
        </div>
      ))}
    </div>
  );
}
