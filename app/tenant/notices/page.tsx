"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantProfile } from "@/lib/tenant-data";
import { supabase } from "@/lib/supabase";

type Notice = {
  id: string;
  title: string;
  content: string;
  notice_type: string;
  audience: string;
  created_at: string;
  source: "landlord" | "society";
};

const TYPE_COLORS: Record<string, string> = {
  maintenance: "bg-blue-100 text-blue-700",
  financial: "bg-yellow-100 text-yellow-700",
  general: "bg-purple-100 text-purple-700",
  urgent: "bg-red-100 text-red-700",
};

export default function TenantNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const profile = await getTenantProfile(user!.email);
      const allNotices: Notice[] = [];

      // Society notices visible to tenants (audience = all or tenants)
      if (profile?.society_id) {
        const { data: sn } = await supabase
          .from("notices")
          .select("id, title, content, notice_type, audience, created_at")
          .eq("society_id", profile.society_id)
          .in("audience", ["all", "tenants"])
          .order("created_at", { ascending: false });
        (sn ?? []).forEach(n => allNotices.push({ ...n, source: "society" }));
      }

      // Landlord direct notices — from flat owner, audience = tenants or all
      if (profile?.flat_id) {
        const { data: flat } = await supabase
          .from("flats").select("owner_id").eq("id", profile.flat_id).single();
        if (flat?.owner_id) {
          const { data: ln } = await supabase
            .from("notices")
            .select("id, title, content, notice_type, audience, created_at")
            .eq("created_by", flat.owner_id)
            .in("audience", ["all", "tenants"])
            .order("created_at", { ascending: false });
          (ln ?? []).forEach(n => allNotices.push({ ...n, source: "landlord" }));
        }
      }

      // Deduplicate by id, sort by date
      const seen = new Set<string>();
      const unique = allNotices.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; });
      unique.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setNotices(unique);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">📢 Notices</h2>

      {notices.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No notices for you yet.</div>
      ) : (
        notices.map(n => (
          <div key={n.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
            <div className="flex gap-1.5 mb-2 flex-wrap">
              <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${TYPE_COLORS[n.notice_type] ?? "bg-gray-100 text-gray-600"}`}>
                {n.notice_type}
              </span>
              <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${n.source === "landlord" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                {n.source === "landlord" ? "🏠 From Landlord" : "🏢 Society"}
              </span>
              {n.notice_type === "urgent" && (
                <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-red-100 text-red-700">⚠️ Urgent</span>
              )}
            </div>
            <div className="text-sm font-bold text-ink mb-1.5">{n.title}</div>
            <div className="text-xs text-ink-muted leading-relaxed">{n.content}</div>
            <div className="text-[10px] text-ink-muted mt-2">
              {new Date(n.created_at).toLocaleDateString("en-IN")}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
