"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSocietyId, getSocietyMembers, getSocietyAuditLogs, type SocietyMember, type AuditLog } from "@/lib/admin-data";
import { addBoardMember } from "@/lib/auth-db";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabase";

type Landlord = {
  user_id: string;
  user: { full_name: string; email: string; phone: string } | null;
};

const ROLE_BADGE_COLOR: Record<string, string> = {
  admin:    "bg-red-100 text-red-700",
  board:    "bg-purple-100 text-purple-700",
  landlord: "bg-green-100 text-green-700",
  tenant:   "bg-blue-100 text-blue-700",
};

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-ink-muted font-semibold w-28 flex-shrink-0">{label}</span>
      <span className="text-ink font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

function BoardMemberCard({ bm }: { bm: SocietyMember }) {
  const [open, setOpen] = useState(false);
  const u = bm.user as { full_name: string; email: string; phone: string } | null;
  const initials = (u?.full_name ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <div
      className="bg-white rounded-[14px] border border-border-default overflow-hidden mb-2 cursor-pointer"
      onClick={() => setOpen(o => !o)}
    >
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-base font-extrabold text-brand-500 flex-shrink-0">
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
          <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${ROLE_BADGE_COLOR[bm.role] ?? "bg-gray-100 text-gray-600"}`}>
            {bm.role}
          </span>
          <span className="text-ink-muted text-xs ml-1">{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div className="border-t border-border-light bg-warm-50 px-4 py-3 space-y-2">
          <DetailRow label="Full Name"   value={u?.full_name} />
          <DetailRow label="Phone"       value={u?.phone} />
          <DetailRow label="Email"       value={u?.email} />
          <DetailRow label="Designation" value={bm.designation ?? "—"} />
          <DetailRow label="Role"        value={bm.role} />
          {bm.joined_at && (
            <DetailRow
              label="Member Since"
              value={new Date(bm.joined_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminGovernance() {
  const { user } = useAuth();
  const [members, setMembers] = useState<SocietyMember[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);

  // Mode: null | "search" | "new"
  const [mode, setMode] = useState<null | "search" | "new">(null);
  const [saving, setSaving] = useState(false);

  // Search landlords
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null);
  const [searchDesignation, setSearchDesignation] = useState("");

  // New member form
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
            setMembers(m);
            setLogs(l);

            // Load landlords for this society
            const { data: ldata } = await supabase
              .from("society_members")
              .select("user_id, user:users(full_name, email, phone)")
              .eq("society_id", sid)
              .eq("role", "landlord");
            setLandlords((ldata ?? []) as unknown as Landlord[]);
          } catch (err) {
            setError((err as Error).message || "Failed to load governance data");
          }
        }
      } catch (err) {
        setError((err as Error).message || "Failed to initialize");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const filteredLandlords = landlords.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.user?.full_name?.toLowerCase().includes(q) ||
      l.user?.email?.toLowerCase().includes(q) ||
      l.user?.phone?.includes(q)
    );
  });

  async function handleAddExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!societyId || !selectedLandlord) return;
    setSaving(true);
    try {
      // Landlord already exists in society_members — update role + designation
      const { error } = await supabase
        .from("society_members")
        .update({ role: "board", designation: searchDesignation || null })
        .eq("society_id", societyId)
        .eq("user_id", selectedLandlord.user_id);
      if (error) throw error;
      toast.success(`${selectedLandlord.user?.full_name} added as board member!`);
      setMode(null);
      setSelectedLandlord(null);
      setSearchQuery("");
      setSearchDesignation("");
      const m = await getSocietyMembers(societyId);
      setMembers(m);
    } catch (err) {
      toast.error((err as Error).message || "Failed to add member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNew(e: React.FormEvent) {
    e.preventDefault();
    if (!societyId) return;
    if (form.phone && form.phone.replace(/\D/g, "").length !== 10) {
      toast.error("Phone must be exactly 10 digits."); return;
    }
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
    setMode(null);
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
        {mode ? (
          <button
            onClick={() => { setMode(null); setSelectedLandlord(null); setSearchQuery(""); }}
            className="px-4 py-2 rounded-xl bg-warm-100 text-ink-muted text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setMode("search")}
              className="px-3 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer"
            >
              🔍 Find Landlord
            </button>
            <button
              onClick={() => setMode("new")}
              className="px-3 py-2 rounded-xl border border-brand-500 text-brand-500 text-xs font-bold cursor-pointer"
            >
              + Add New
            </button>
          </div>
        )}
      </div>

      {/* Mode: Search existing landlord */}
      {mode === "search" && (
        <div className="bg-white rounded-[14px] p-4 border border-brand-200 mb-4 space-y-3">
          <div className="text-sm font-bold text-ink mb-1">Find a Society Landlord</div>
          <input
            className={inputClass}
            placeholder="Search by name, email or phone…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedLandlord(null); }}
            autoFocus
          />

          {searchQuery.length > 0 && !selectedLandlord && (
            <div className="border border-border-default rounded-xl overflow-hidden">
              {filteredLandlords.length === 0 ? (
                <div className="text-center py-4 text-ink-muted text-sm">No landlords found</div>
              ) : (
                filteredLandlords.map((l) => (
                  <button
                    key={l.user_id}
                    type="button"
                    onClick={() => { setSelectedLandlord(l); setSearchQuery(l.user?.full_name ?? ""); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-warm-50 text-left border-b last:border-0 border-border-light cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-extrabold text-green-700">
                      {(l.user?.full_name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">{l.user?.full_name}</div>
                      <div className="text-[11px] text-ink-muted">{l.user?.email} · {l.user?.phone}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedLandlord && (
            <form onSubmit={handleAddExisting} className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-xs font-extrabold text-green-800">
                  {(selectedLandlord.user?.full_name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-bold text-ink">{selectedLandlord.user?.full_name}</div>
                  <div className="text-[11px] text-ink-muted">{selectedLandlord.user?.email} · {selectedLandlord.user?.phone}</div>
                </div>
                <button type="button" onClick={() => { setSelectedLandlord(null); setSearchQuery(""); }}
                  className="ml-auto text-ink-muted hover:text-red-500 cursor-pointer text-lg leading-none">✕</button>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-ink-muted block mb-1">Designation</label>
                <input className={inputClass} placeholder="Secretary / Treasurer / Chairman"
                  value={searchDesignation} onChange={(e) => setSearchDesignation(e.target.value)} />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add as Board Member"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Mode: Add brand new member (external hire) */}
      {mode === "new" && (
        <form onSubmit={handleAddNew} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-4 space-y-3">
          <div className="text-sm font-bold text-ink mb-1">Add New Board Member</div>
          <div className="text-[11px] text-ink-muted bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
            For external hires not already in the society
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-ink-muted block mb-1">Full Name *</label>
              <input required className={inputClass} placeholder="Suresh Kumar"
                value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-ink-muted block mb-1">Phone *</label>
              <input required className={inputClass} placeholder="10-digit mobile" maxLength={10} inputMode="numeric"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} />
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
        boardMembers.map(bm => <BoardMemberCard key={bm.id} bm={bm} />)
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
