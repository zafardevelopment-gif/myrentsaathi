"use client";

const MY_DOCS = [
  { name: "Rental Agreement", type: "PDF", date: "Aug 2025", icon: "📄", size: "1.2 MB" },
  { name: "Aadhaar Card", type: "Image", date: "Aug 2025", icon: "🪪", size: "0.4 MB" },
  { name: "PAN Card", type: "Image", date: "Aug 2025", icon: "🪪", size: "0.3 MB" },
  { name: "Police Verification Certificate", type: "PDF", date: "Sep 2025", icon: "🛡️", size: "0.8 MB" },
];

export default function TenantDocuments() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📁 My Documents</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Upload</button>
      </div>

      {MY_DOCS.map((d, i) => (
        <div key={i} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0">
              {d.icon}
            </div>
            <div>
              <div className="text-sm font-bold text-ink">{d.name}</div>
              <div className="text-[11px] text-ink-muted mt-0.5">{d.type} · {d.size} · Uploaded {d.date}</div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">View</button>
            <button className="px-3 py-1.5 rounded-lg border border-brand-500 text-brand-500 text-[11px] font-semibold cursor-pointer">⬇</button>
          </div>
        </div>
      ))}

      {/* Required docs info */}
      <div className="bg-warm-50 rounded-[14px] p-4 border border-border-default mt-2">
        <div className="text-sm font-bold text-ink mb-2">📋 Required for KYC</div>
        <ul className="text-xs text-ink-muted space-y-1">
          <li>✓ Aadhaar Card (both sides)</li>
          <li>✓ PAN Card</li>
          <li>✓ Rental Agreement (signed)</li>
          <li>✓ Police Verification Certificate</li>
          <li className="text-ink">○ Passport Photo — <span className="text-brand-500 font-semibold">Upload pending</span></li>
        </ul>
      </div>
    </div>
  );
}
