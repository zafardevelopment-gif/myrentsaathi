"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSocietyId, getSocietyMembers, getSocietyAuditLogs, type SocietyMember, type AuditLog } from "@/lib/admin-data";
import { addBoardMember } from "@/lib/auth-db";
import toast, { Toaster } from "react-hot-toast";

const ROLE_BADGE: Record<string, string> = {
  admin:    "bg-red-100 text-red-700",
  board:    "bg-purple-100 text-purple-700",
  landlord: "bg-green-100 text-green-700",
  tenant:   "bg-blue-100 text-blue-700",
};

export default function AdminGovernance() {
  const { user } = useAuth();
  const [members, setMembers] = useState<SocietyMember[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);

  // Add board member form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", designation: "" });

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      try {
        const sid = await getAdminSocietyId(user!.email);
        setSocietyId(sid);
        if (sid) {
          try {
            const [m, l] = await Promise.all([
              getSocietyMembers(sid),
              getSocietyAuditLogs(sid, 15),
            ]);
            console.log("Members loaded:", m);
            setMembers(m);
            setLogs(l);
          } catch (err) {
            console.error("Failed to load members:", err);
            setError((err as Error).message || "Failed to load governance data");
          }
        }
      } catch (err) {
        console.error("Init error:", err);
        setError((err as Error).message || "Failed to initialize");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!societyId) return;
    setSaving(true);
    const result = await addBoardMember({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      designation: form.designation,
      society_id: societyId,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to add member.");
      return;
    }
    toast.success(`Board member added! Auto password: ${form.full_name.split(" ")[0]}@123`);
    setForm({ full_name: "", email: "", phone: "", designation: "" });
    setShowForm(false);
    // Refresh members
    const m = await getSocietyMembers(societyId);
    setMembers(m);
  }

  const boardMembers = members.filter((m) => m.role === "board" || m.role === "board_member" || m.role === "admin");

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}
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

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";

  return (
    <div>
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">⚖️ Governance & Board</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer"
        >
          {showForm ? "Cancel" : "+ Add Member"}
        </button>
      </div>

      {/* Add Board Member Form */}
      {showForm && (
        <form onSubmit={handleAddMember} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-4 space-y-3">
          <div className="text-sm font-bold text-ink mb-1">Add Board Member</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-ink-muted block mb-1">Full Name *</label>
              <input required className={inputClass} placeholder="Suresh Kumar"
                value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-ink-muted block mb-1">Phone *</label>
              <input required className={inputClass} placeholder="+91 98765 11111"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-ink-muted block mb-1">Email *</label>
            <input required type="email" className={inputClass} placeholder="suresh@society.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-ink-muted block mb-1">Designation</label>
            <input className={inputClass} placeholder="Secretary / Treasurer / Chairman"
              value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-[11px] text-yellow-700">
            Auto password will be: <strong>{form.full_name ? form.full_name.split(" ")[0] + "@123" : "FirstName@123"}</strong> — share with member
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add Board Member"}
          </button>
        </form>
      )}

      {/* Board / Admin Members */}
      <h3 className="text-[13px] font-bold text-ink mb-2.5">Board Members</h3>
      {boardMembers.length === 0 ? (
        <div className="text-center py-8 text-ink-muted text-sm mb-4">No board members found.</div>
      ) : (
        boardMembers.map((bm) => {
          const u = bm.user as { full_name: string; email: string; phone: string } | null;
          const initials = (u?.full_name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2);
          return (
            <div key={bm.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-base font-extrabold text-brand-500">
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-ink">{u?.full_name ?? "—"}</div>
                  <div className="text-[11px] text-ink-muted">{u?.email} · {u?.phone}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {bm.designation && (
                  <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-purple-100 text-purple-700">{bm.designation}</span>
                )}
                <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${ROLE_BADGE[bm.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {bm.role}
                </span>
              </div>
            </div>
          );
        })
      )}

      {/* Member counts */}
      <h3 className="text-[13px] font-bold text-ink mt-5 mb-2.5">All Society Members ({members.length})</h3>
      <div className="flex gap-2.5 flex-wrap mb-4">
        {["admin", "board", "landlord", "tenant"].map((r) => {
          const count = members.filter((m) => m.role === r).length;
          return (
            <div key={r} className="bg-white rounded-xl p-3 border border-border-default flex-1 min-w-[80px] text-center">
              <div className="text-lg font-extrabold text-ink">{count}</div>
              <div className="text-[10px] text-ink-muted capitalize mt-0.5">{r}s</div>
            </div>
          );
        })}
      </div>

      {/* Audit Logs */}
      <h3 className="text-[13px] font-bold text-ink mt-5 mb-2.5">Recent Audit Logs</h3>
      {logs.length === 0 ? (
        <div className="text-center py-6 text-ink-muted text-sm">No audit logs yet.</div>
      ) : (
        <div className="bg-white rounded-[14px] border border-border-default divide-y divide-border-light overflow-hidden">
          {logs.map((log) => {
            const performerName = (log.user as { full_name: string } | null)?.full_name ?? "System";
            return (
              <div key={log.id} className="flex items-center gap-2.5 px-4 py-2.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                <span className="text-ink font-semibold">{log.action}</span>
                {log.entity_type && <span className="text-ink-muted">— {log.entity_type}</span>}
                <span className="text-ink-muted">by {performerName}</span>
                <span className="text-ink-muted ml-auto whitespace-nowrap">
                  {new Date(log.created_at).toLocaleDateString("en-IN")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
