"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantProfile, getTenantTickets, createTenantTicket, type TenantTicket } from "@/lib/tenant-data";
import { supabase } from "@/lib/supabase";

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

  // Edit state
  const [editTicket, setEditTicket] = useState<TenantTicket | null>(null);
  const [editForm, setEditForm] = useState({ category: "", subject: "", description: "", priority: "" });
  const [editSaving, setEditSaving] = useState(false);

  async function loadTickets() {
    if (!user?.email) return;
    const t = await getTenantTickets(user.email);
    setTickets(t);
  }

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const profile = await getTenantProfile(user!.email);
      setSocietyId(profile?.society_id ?? null);
      setFlatId(profile?.flat_id ?? null);
      await loadTickets();
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  async function handleCreate() {
    if (!form.subject.trim()) { toast.error("Subject required"); return; }
    if (!user?.email) return;
    setSaving(true);
    try {
      await createTenantTicket(user.email, societyId ?? "", flatId, form);
      toast.success("Complaint submitted!");
      setShowForm(false);
      setForm({ category: "plumbing", subject: "", description: "", priority: "medium" });
      await loadTickets();
    } catch {
      toast.error("Failed to submit complaint");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(tk: TenantTicket) {
    setEditTicket(tk);
    setEditForm({ category: tk.category, subject: tk.subject, description: tk.description ?? "", priority: tk.priority });
  }

  async function handleEdit() {
    if (!editTicket) return;
    setEditSaving(true);
    const { error } = await supabase.from("tickets").update({
      subject: editForm.subject,
      description: editForm.description,
      category: editForm.category,
      priority: editForm.priority,
    }).eq("id", editTicket.id);
    setEditSaving(false);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Complaint updated!");
    setEditTicket(null);
    await loadTickets();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this complaint?")) return;
    await supabase.from("tickets").delete().eq("id", id);
    toast.success("Complaint deleted.");
    setTickets(prev => prev.filter(t => t.id !== id));
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500";
  const selectClass = "border border-border-default rounded-xl px-3 py-2 text-sm outline-none cursor-pointer";

  return (
    <div>
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🚫 My Complaints</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4 space-y-3">
          <div className="text-[13px] font-bold text-ink">New Complaint</div>
          <input className={inputClass} placeholder="Subject (e.g. Water leakage in bathroom)"
            value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          <textarea className={inputClass + " resize-none"} placeholder="Description (optional)" rows={3}
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-2 flex-wrap">
            <select className={selectClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="lift">Lift</option>
              <option value="security">Security</option>
              <option value="cleaning">Cleaning</option>
              <option value="other">Other</option>
            </select>
            <select className={selectClass} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
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
            <div className="flex justify-between items-start gap-2">
              <div className="flex gap-1.5 flex-wrap mb-2">
                <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${PRIORITY_COLOR[tk.priority] || "bg-gray-100 text-gray-600"}`}>
                  {tk.priority.toUpperCase()}
                </span>
                <StatusBadge status={tk.status} />
                {tk.ticket_number && (
                  <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-gray-100 text-gray-600">{tk.ticket_number}</span>
                )}
              </div>
              {tk.status === "open" && (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(tk)} className="px-2.5 py-1 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">Edit</button>
                  <button onClick={() => handleDelete(tk.id)} className="px-2.5 py-1 rounded-lg border border-red-200 text-[11px] font-semibold text-red-500 cursor-pointer">Delete</button>
                </div>
              )}
            </div>
            <div className="text-sm font-bold text-ink mb-1">{tk.subject}</div>
            {tk.description && <div className="text-xs text-ink-muted mb-1 leading-relaxed">{tk.description}</div>}
            <div className="text-[11px] text-ink-muted">Raised on {new Date(tk.created_at).toLocaleDateString("en-IN")} · {tk.category}</div>
            {tk.status === "in_progress" && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-100 text-[11px] text-yellow-700">Assigned — work in progress</div>
            )}
            {tk.status === "resolved" && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-green-50 border border-green-100 text-[11px] text-green-700">Resolved ✓</div>
            )}
          </div>
        ))
      )}

      {/* Edit Modal */}
      {editTicket && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setEditTicket(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div className="text-base font-extrabold text-ink">✏️ Edit Complaint</div>
              <button onClick={() => setEditTicket(null)} className="text-ink-muted text-lg cursor-pointer">✕</button>
            </div>
            <input className={inputClass} value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject" />
            <textarea className={inputClass + " resize-none"} rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" />
            <div className="flex gap-2">
              <select className={selectClass} value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="lift">Lift</option>
                <option value="security">Security</option>
                <option value="cleaning">Cleaning</option>
                <option value="other">Other</option>
              </select>
              <select className={selectClass} value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditTicket(null)} className="flex-1 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Cancel</button>
              <button onClick={handleEdit} disabled={editSaving} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
