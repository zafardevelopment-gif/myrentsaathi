"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getBoardMemberProfile,
  getTenantNotices,
  boardCreateNotice,
  type TenantNotice,
} from "@/lib/tenant-data";

const TYPE_COLORS: Record<string, string> = {
  urgent: "border-l-red-500",
  financial: "border-l-yellow-500",
  maintenance: "border-l-blue-500",
  general: "border-l-blue-500",
};

export default function BoardNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<TenantNotice[]>([]);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [boardUserId, setBoardUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", notice_type: "general", audience: "all" });

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const p = await getBoardMemberProfile(user!.email);
      if (p) {
        setSocietyId(p.society_id);
        setBoardUserId(p.user_id);
        const n = await getTenantNotices(p.society_id);
        setNotices(n);
      }
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  async function handleCreate() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content required");
      return;
    }
    if (!societyId || !boardUserId) return;
    setSaving(true);
    try {
      await boardCreateNotice(societyId, boardUserId, form);
      toast.success("Notice published!");
      setShowForm(false);
      setForm({ title: "", content: "", notice_type: "general", audience: "all" });
      const n = await getTenantNotices(societyId);
      setNotices(n);
    } catch {
      toast.error("Failed — check RLS policies");
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📢 Post Notices</h2>
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
        <div className="text-center py-12 text-ink-muted text-sm">No notices yet. Post the first one!</div>
      ) : (
        notices.map((n) => (
          <div
            key={n.id}
            className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 mb-2 ${TYPE_COLORS[n.notice_type?.toLowerCase()] || "border-l-blue-500"}`}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex gap-1.5 mb-1.5 flex-wrap">
                  <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-blue-100 text-blue-700">{n.notice_type}</span>
                  <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-purple-100 text-purple-700">To: {n.audience}</span>
                  {n.notice_type === "financial" && (
                    <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-red-100 text-red-700">🔴 Important</span>
                  )}
                </div>
                <div className="text-sm font-bold text-ink">{n.title}</div>
                <div className="text-xs text-ink-muted mt-1 leading-relaxed">{n.content}</div>
                <div className="text-[11px] text-ink-muted mt-1">{new Date(n.created_at).toLocaleDateString("en-IN")}</div>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer flex-shrink-0">📱 Broadcast</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
