"use client";

const DOC_CATEGORIES = [
  { type: "Society Rules & Bylaws", count: 3, icon: "📜" },
  { type: "Meeting Minutes", count: 8, icon: "📝" },
  { type: "Financial Reports", count: 4, icon: "📊" },
  { type: "Rental Agreements", count: 12, icon: "📄" },
  { type: "Tenant KYC Documents", count: 8, icon: "🪪" },
  { type: "Insurance & NOC", count: 2, icon: "🛡️" },
  { type: "Notices & Circulars", count: 15, icon: "📢" },
];

export default function AdminDocuments() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📁 Document Management</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Upload</button>
      </div>

      {DOC_CATEGORIES.map((d) => (
        <div key={d.type} className="bg-white rounded-[14px] p-4 border border-border-default mb-1.5 flex justify-between items-center cursor-pointer hover:bg-warm-50 transition-colors">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{d.icon}</span>
            <div>
              <div className="text-[13px] font-bold text-ink">{d.type}</div>
              <div className="text-[11px] text-ink-muted">{d.count} documents</div>
            </div>
          </div>
          <span className="text-ink-muted">→</span>
        </div>
      ))}
    </div>
  );
}
