"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantProfile, getTenantNotices, type TenantNotice } from "@/lib/tenant-data";

const TYPE_COLORS: Record<string, string> = {
  maintenance: "bg-blue-100 text-blue-700",
  financial: "bg-yellow-100 text-yellow-700",
  general: "bg-purple-100 text-purple-700",
  urgent: "bg-red-100 text-red-700",
};

export default function TenantNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<TenantNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const profile = await getTenantProfile(user!.email);
      if (profile?.society_id) {
        const n = await getTenantNotices(profile.society_id);
        setNotices(n);
      }
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">📢 Society Notices</h2>

      {notices.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No notices from your society yet.</div>
      ) : (
        notices.map((n) => (
          <div key={n.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
            <div className="flex gap-1.5 mb-2 flex-wrap">
              <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${TYPE_COLORS[n.notice_type] || "bg-gray-100 text-gray-600"}`}>
                {n.notice_type}
              </span>
              {n.notice_type === "financial" && (
                <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-red-100 text-red-700">
                  ⚠️ Important
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-ink mb-1.5">{n.title}</div>
            <div className="text-xs text-ink-muted leading-relaxed">{n.content}</div>
            <div className="text-[10px] text-ink-muted mt-2">
              Posted {new Date(n.created_at).toLocaleDateString("en-IN")} · For: {n.audience}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
