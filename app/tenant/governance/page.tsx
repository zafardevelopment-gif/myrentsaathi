"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantProfile } from "@/lib/tenant-data";
import { getSocietyMembers, type SocietyMember } from "@/lib/admin-data";

const ROLE_BADGE: Record<string, string> = {
  admin:    "bg-red-100 text-red-700",
  board:    "bg-purple-100 text-purple-700",
  landlord: "bg-green-100 text-green-700",
  tenant:   "bg-blue-100 text-blue-700",
};

function BoardMemberCard({ bm }: { bm: SocietyMember }) {
  const [open, setOpen] = useState(false);
  const u = bm.user as { full_name: string; email: string; phone: string } | null;
  const initials = (u?.full_name ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <div
      className="bg-white rounded-[14px] border border-border-default overflow-hidden cursor-pointer"
      onClick={() => setOpen(o => !o)}
    >
      {/* Summary row */}
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-base font-extrabold text-brand-500 flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="text-sm font-bold text-ink">{u?.full_name ?? "—"}</div>
            <div className="text-[11px] text-ink-muted">{u?.phone}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {bm.designation && (
            <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-purple-100 text-purple-700">
              {bm.designation}
            </span>
          )}
          <span className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold ${ROLE_BADGE[bm.role] ?? "bg-gray-100 text-gray-600"}`}>
            {bm.role}
          </span>
          <span className="text-ink-muted text-xs ml-1">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-border-light bg-warm-50 px-4 py-3 space-y-2">
          <DetailRow label="Full Name"    value={u?.full_name} />
          <DetailRow label="Phone"        value={u?.phone} />
          <DetailRow label="Email"        value={u?.email} />
          <DetailRow label="Designation"  value={bm.designation ?? "—"} />
          <DetailRow label="Role"         value={bm.role} />
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

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-ink-muted font-semibold w-28 flex-shrink-0">{label}</span>
      <span className="text-ink font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

export default function TenantGovernance() {
  const { user } = useAuth();
  const [members, setMembers] = useState<SocietyMember[]>([]);
  const [societyName, setSocietyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const profile = await getTenantProfile(user!.email);
      const sid = profile?.society_id;
      if (!sid) { setLoading(false); return; }

      setSocietyName(profile?.society?.name ?? null);
      const m = await getSocietyMembers(sid);
      setMembers(m);
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  const boardMembers = members.filter(m => m.role === "board" || m.role === "board_member" || m.role === "admin");

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[15px] font-extrabold text-ink">⚖️ Governance & Board</h2>
        {societyName && (
          <p className="text-[11px] text-ink-muted mt-0.5">🏢 {societyName}</p>
        )}
      </div>

      <h3 className="text-[13px] font-bold text-ink mb-2.5">Board Members</h3>
      {boardMembers.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">No board members assigned yet.</div>
      ) : (
        <div className="space-y-2 mb-5">
          {boardMembers.map(bm => <BoardMemberCard key={bm.id} bm={bm} />)}
        </div>
      )}

      <h3 className="text-[13px] font-bold text-ink mt-5 mb-2.5">All Society Members ({members.length})</h3>
      <div className="flex gap-2.5 flex-wrap">
        {["admin", "board", "landlord", "tenant"].map((r) => {
          const count = members.filter(m => m.role === r).length;
          return (
            <div key={r} className="bg-white rounded-xl p-3 border border-border-default flex-1 min-w-[80px] text-center">
              <div className="text-lg font-extrabold text-ink">{count}</div>
              <div className="text-[10px] text-ink-muted capitalize mt-0.5">{r}s</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
