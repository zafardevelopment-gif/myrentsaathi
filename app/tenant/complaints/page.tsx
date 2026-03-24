"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getTenantProfile,
  getTenantTickets,
  createTenantTicket,
  type TenantTicket,
} from "@/lib/tenant-data";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-green-100 text-green-700",
};

export default function TenantComplaints() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TenantTicket[]>([]);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [flatId, setFlatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: "plumbing", subject: "", description: "", priority: "medium" });

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const profile = await getTenantProfile(user!.email);
      setSocietyId(profile?.society_id ?? null);
      setFlatId(profile?.flat_id ?? null);
      const t = await getTenantTickets(user!.email);
      setTickets(t);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  async function handleCreate() {
    if (!form.subject.trim()) {
      toast.error("Subject required");
      return;
    }
    if (!user?.email || !societyId) return;
    setSaving(true);
    try {
      await createTenantTicket(user.email, societyId, flatId, form);
      toast.success("Complaint submitted!");
      setShowForm(false);
      setForm({ category: "plumbing", subject: "", description: "", priority: "medium" });
      const t = await getTenantTickets(user.email);
      setTickets(t);
    } catch {
      toast.error("Failed — check RLS policies");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🚫 My Complaints</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer"
        >
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4 space-y-3">
          <div className="text-[13px] font-bold text-ink">New Complaint</div>
          <input
            className="w-full border border-border-default rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="Subject (e.g. Water leakage in bathroom)"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          />
          <textarea
            className="w-full border border-border-default rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
            placeholder="Description (optional)"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-2 flex-wrap">
            <select
              className="border border-border-default rounded-xl px-3 py-2 text-sm outline-none cursor-pointer"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="lift">Lift</option>
              <option value="security">Security</option>
              <option value="cleaning">Cleaning</option>
              <option value="other">Other</option>
            </select>
            <select
              className="border border-border-default rounded-xl px-3 py-2 text-sm outline-none cursor-pointer"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {saving ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">🎉</div>
          <div className="text-sm text-ink-muted">No complaints! Everything is working well.</div>
        </div>
      ) : (
        tickets.map((tk) => (
          <div key={tk.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
            <div className="flex gap-1.5 flex-wrap mb-2">
              <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${PRIORITY_COLOR[tk.priority] || "bg-gray-100 text-gray-600"}`}>
                {tk.priority.toUpperCase()}
              </span>
              <StatusBadge status={tk.status} />
              {tk.ticket_number && (
                <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-gray-100 text-gray-600">{tk.ticket_number}</span>
              )}
            </div>
            <div className="text-sm font-bold text-ink mb-1">{tk.subject}</div>
            <div className="text-[11px] text-ink-muted">
              Raised on {new Date(tk.created_at).toLocaleDateString("en-IN")} · {tk.category}
            </div>
            {tk.status === "in_progress" && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-100 text-[11px] text-yellow-700">
                Assigned to maintenance team — work in progress
              </div>
            )}
            {tk.status === "resolved" && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-green-50 border border-green-100 text-[11px] text-green-700">
                Resolved ✓
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
