"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getAdminSocietyId,
  getSocietyNotices,
  createNotice,
  type AdminNotice,
} from "@/lib/admin-data";

const TYPE_COLORS: Record<string, string> = {
  urgent: "border-l-red-500",
  financial: "border-l-yellow-500",
  maintenance: "border-l-blue-500",
  general: "border-l-blue-500",
};

export default function AdminNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", notice_type: "general", audience: "all" });

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      try {
        const sid = await getAdminSocietyId(user!.email);
        setSocietyId(sid);
        if (sid) {
          const n = await getSocietyNotices(sid);
          setNotices(n);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  async function handleCreate() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content required");
      return;
    }
    if (!societyId || !user?.email) return;
    setSaving(true);
    try {
      // Fetch user ID from DB using email
      const { supabase } = await import("@/lib/supabase");
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!userData?.id) {
        toast.error("User not found in database");
        return;
      }

      await createNotice(societyId, userData.id, form);
      toast.success("Notice published!");
      setShowForm(false);
      setForm({ title: "", content: "", notice_type: "general", audience: "all" });
      const n = await getSocietyNotices(societyId);
      setNotices(n);
    } catch (err) {
      console.error("Notice creation error:", err);
      toast.error((err as Error).message ?? "Failed — check RLS policies");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[14px] p-6 text-center">
        <div className="text-red-600 font-bold">⚠️ {error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📢 Notices & Broadcasts</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer"
        >
          {showForm ? "Cancel" : "+ New Notice"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4 space-y-3">
          <div className="text-[13px] font-bold text-ink">New Notice</div>
          <input
            className="w-full border border-border-default rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className="w-full border border-border-default rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
            placeholder="Content"
            rows={3}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
          <div className="flex gap-2 flex-wrap">
            <select
              className="border border-border-default rounded-xl px-3 py-2 text-sm outline-none cursor-pointer"
              value={form.notice_type}
              onChange={(e) => setForm((f) => ({ ...f, notice_type: e.target.value }))}
            >
              <option value="general">General</option>
              <option value="urgent">Urgent</option>
              <option value="financial">Financial</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <select
              className="border border-border-default rounded-xl px-3 py-2 text-sm outline-none cursor-pointer"
              value={form.audience}
              onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
            >
              <option value="all">All Members</option>
              <option value="tenants">Tenants Only</option>
              <option value="landlords">Landlords Only</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {saving ? "Publishing..." : "Publish Notice"}
            </button>
          </div>
        </div>
      )}

      {notices.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No notices yet. Create the first one!</div>
      ) : (
        notices.map((n) => (
          <div key={n.id} className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 mb-2 ${TYPE_COLORS[n.notice_type] || "border-l-blue-500"}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex gap-1.5 mb-1">
                  <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-blue-100 text-blue-700">{n.notice_type}</span>
                  <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-purple-100 text-purple-700">To: {n.audience}</span>
                </div>
                <div className="text-sm font-bold text-ink">{n.title}</div>
                <div className="text-xs text-ink-muted mt-1 leading-relaxed">{n.content}</div>
                <div className="text-[11px] text-ink-muted mt-1">{new Date(n.created_at).toLocaleDateString("en-IN")}</div>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer flex-shrink-0">📱 WhatsApp</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
