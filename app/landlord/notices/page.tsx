"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordUserId, getLandlordFlats } from "@/lib/landlord-data";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

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

const AUDIENCE_OPTIONS = [
  { value: "tenants", label: "Tenants Only" },
  { value: "all", label: "Everyone (Tenants + Board)" },
  { value: "landlords", label: "Landlords Only" },
];

export default function LandlordNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", notice_type: "general", audience: "tenants" });

  async function loadData() {
    if (!user?.email) return;
    const lid = await getLandlordUserId(user.email);
    setLandlordId(lid);

    // Get society_id from first flat
    const flats = await getLandlordFlats(user.email).catch(() => []);
    const sid = flats.find(f => f.society_id)?.society_id ?? null;
    setSocietyId(sid);

    // Fetch landlord-created notices (created_by = landlord user id)
    const { data: myNotices } = await supabase
      .from("notices")
      .select("id, title, content, notice_type, audience, created_at")
      .eq("created_by", lid)
      .order("created_at", { ascending: false });

    // Fetch society notices visible to landlords (audience = all or landlords)
    let societyNotices: Notice[] = [];
    if (sid) {
      const { data: sn } = await supabase
        .from("notices")
        .select("id, title, content, notice_type, audience, created_at")
        .eq("society_id", sid)
        .in("audience", ["all", "landlords"])
        .neq("created_by", lid ?? "")
        .order("created_at", { ascending: false });
      societyNotices = (sn ?? []).map(n => ({ ...n, source: "society" as const }));
    }

    const myMapped = (myNotices ?? []).map(n => ({ ...n, source: "landlord" as const }));
    setNotices([...myMapped, ...societyNotices].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!landlordId) return;
    setSaving(true);
    const { error } = await supabase.from("notices").insert({
      created_by: landlordId,
      ...(societyId ? { society_id: societyId } : {}),
      title: form.title,
      content: form.content,
      notice_type: form.notice_type,
      audience: form.audience,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Notice sent!");
    setForm({ title: "", content: "", notice_type: "general", audience: "tenants" });
    setShowForm(false);
    await loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this notice?")) return;
    await supabase.from("notices").delete().eq("id", id);
    toast.success("Notice deleted.");
    setNotices(prev => prev.filter(n => n.id !== id));
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

  return (
    <div>
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📢 Notices</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
          {showForm ? "Cancel" : "+ New Notice"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-5 space-y-3">
          <div className="text-sm font-bold text-ink">Send Notice to Tenants</div>
          <div>
            <label className={labelClass}>Title *</label>
            <input required className={inputClass} placeholder="e.g. Water supply interrupted" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Message *</label>
            <textarea required className={inputClass + " resize-none"} rows={3} placeholder="Write your notice here..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Type</label>
              <select className={inputClass} value={form.notice_type} onChange={e => setForm(f => ({ ...f, notice_type: e.target.value }))}>
                <option value="general">General</option>
                <option value="maintenance">Maintenance</option>
                <option value="financial">Financial</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Send To</label>
              <select className={inputClass} value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>
                {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {saving ? "Sending..." : "Send Notice"}
          </button>
        </form>
      )}

      {notices.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No notices yet. Create one above.</div>
      ) : (
        notices.map(n => (
          <div key={n.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
            <div className="flex justify-between items-start gap-2 mb-2">
              <div className="flex gap-1.5 flex-wrap">
                <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${TYPE_COLORS[n.notice_type] ?? "bg-gray-100 text-gray-600"}`}>
                  {n.notice_type}
                </span>
                <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-warm-100 text-ink-muted">
                  → {n.audience}
                </span>
                {n.source === "society" && (
                  <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-blue-50 text-blue-600">Society</span>
                )}
              </div>
              {n.source === "landlord" && (
                <button onClick={() => handleDelete(n.id)} className="text-[10px] text-red-400 font-semibold cursor-pointer flex-shrink-0">Delete</button>
              )}
            </div>
            <div className="text-sm font-bold text-ink mb-1">{n.title}</div>
            <div className="text-xs text-ink-muted leading-relaxed">{n.content}</div>
            <div className="text-[10px] text-ink-muted mt-2">{new Date(n.created_at).toLocaleDateString("en-IN")}</div>
          </div>
        ))
      )}
    </div>
  );
}
