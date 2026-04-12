"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordSocietyId, getLandlordUserId } from "@/lib/landlord-data";
import { supabase } from "@/lib/supabase";

type Doc = {
  id: string;
  title: string;
  category: string | null;
  file_name: string | null;
  file_url: string | null;
  file_size: number | null;
  created_at: string;
};

const SOCIETY_CAT_ICON: Record<string, string> = {
  "Society Rules & Bylaws": "📜",
  "Meeting Minutes": "📝",
  "Financial Reports": "📊",
  "Rental Agreements": "📄",
  "Tenant KYC Documents": "🪪",
  "Insurance & NOC": "🛡️",
  "Notices & Circulars": "📢",
  "Other": "📁",
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LandlordDocuments() {
  const { user } = useAuth();
  const [societyDocs, setSocietyDocs] = useState<Doc[]>([]);
  const [hasSociety, setHasSociety] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const [sid, uid] = await Promise.all([
        getLandlordSocietyId(user!.email),
        getLandlordUserId(user!.email),
      ]);

      if (!sid) { setHasSociety(false); setLoading(false); return; }
      setHasSociety(true);

      const { data } = await supabase
        .from("documents")
        .select("id, title, category, file_name, file_url, file_size, created_at")
        .eq("society_id", sid)
        .neq("uploaded_by", uid ?? "")
        .order("created_at", { ascending: false });

      setSocietyDocs((data ?? []) as Doc[]);
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) {
    return <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  // Group by category
  const byCategory = Object.entries(
    societyDocs.reduce<Record<string, Doc[]>>((acc, doc) => {
      const cat = doc.category ?? "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    }, {})
  );

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📁 Society Documents</h2>
        <p className="text-[11px] text-ink-muted mt-0.5">Documents shared by your society</p>
      </div>

      {!hasSociety ? (
        <div className="text-center py-12 text-ink-muted text-sm">
          <div className="text-3xl mb-2">🏢</div>
          You are not linked to any society yet.
        </div>
      ) : societyDocs.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">
          <div className="text-3xl mb-2">📭</div>
          No society documents uploaded yet.
        </div>
      ) : (
        <div className="space-y-5">
          {byCategory.map(([cat, docs]) => (
            <div key={cat}>
              <div className="text-[13px] font-bold text-ink mb-2">
                {SOCIETY_CAT_ICON[cat] ?? "📁"} {cat}{" "}
                <span className="text-ink-muted font-normal">({docs.length})</span>
              </div>
              <div className="space-y-2">
                {docs.map(doc => (
                  <a
                    key={doc.id}
                    href={doc.file_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-[14px] p-3 border border-border-default flex justify-between items-center hover:bg-warm-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-lg flex-shrink-0">
                        {SOCIETY_CAT_ICON[cat] ?? "📁"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-ink truncate group-hover:text-brand-500">
                          {doc.file_name ?? doc.title}
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          {formatSize(doc.file_size)}{doc.file_size ? " · " : ""}
                          {new Date(doc.created_at).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex-shrink-0 ml-2">
                      ⬇️ View
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
