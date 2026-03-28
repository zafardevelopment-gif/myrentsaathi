"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getGuardUser, getGuardTodayVisits, markExit, type VMSVisit } from "@/lib/vms-data";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:                 "bg-amber-100 text-amber-700",
    approved:                "bg-green-100 text-green-700",
    rejected:                "bg-red-100 text-red-700",
    admin_override_approved: "bg-blue-100 text-blue-700",
    admin_override_rejected: "bg-red-100 text-red-700",
    exited:                  "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    pending:                 "Pending",
    approved:                "Approved",
    rejected:                "Rejected",
    admin_override_approved: "Admin ✓",
    admin_override_rejected: "Admin ✗",
    exited:                  "Exited",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function GuardLogPage() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [guardId, setGuardId] = useState<string | null>(null);
  const [visits, setVisits] = useState<VMSVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async (sid: string) => {
    const data = await getGuardTodayVisits(sid);
    setVisits(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.email) return;
    getGuardUser(user.email).then((g) => {
      if (g) { setSocietyId(g.society_id); setGuardId(g.id); refresh(g.society_id); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleExit = async (visitId: string) => {
    await markExit(visitId);
    if (societyId) refresh(societyId);
  };

  const stats = {
    total: visits.length,
    approved: visits.filter((v) => v.status === "approved" || v.status === "admin_override_approved").length,
    rejected: visits.filter((v) => v.status === "rejected" || v.status === "admin_override_rejected").length,
    pending: visits.filter((v) => v.status === "pending").length,
    exited: visits.filter((v) => v.status === "exited").length,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold text-ink">Today&apos;s Log</h1>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-ink" },
          { label: "Approved", value: stats.approved, color: "text-green-600" },
          { label: "Rejected", value: stats.rejected, color: "text-red-500" },
          { label: "Exited", value: stats.exited, color: "text-gray-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-border-default rounded-xl p-3 text-center">
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            <p className="text-xs text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {loading && <div className="text-amber-600 font-bold animate-pulse text-sm">Loading…</div>}

      {!loading && visits.length === 0 && (
        <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
          <p className="text-ink-muted text-sm">No visitors recorded today.</p>
        </div>
      )}

      <div className="space-y-2">
        {visits.map((v) => (
          <div
            key={v.id}
            className="bg-white border border-border-default rounded-xl p-4 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-ink">{v.visitor?.name}</p>
                <StatusBadge status={v.status} />
                {v.is_pre_approved && (
                  <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                    Pre-approved
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-muted">
                Flat {v.flat_number}{v.block ? ` · ${v.block}` : ""}
                {v.purpose ? ` · ${v.purpose}` : ""}
              </p>
              <p className="text-xs text-ink-muted">
                In: {new Date(v.entry_time).toLocaleTimeString()}
                {v.exit_time ? ` · Out: ${new Date(v.exit_time).toLocaleTimeString()}` : ""}
              </p>
            </div>
            {(v.status === "approved" || v.status === "admin_override_approved") && !v.exit_time && (
              <button
                onClick={() => handleExit(v.id)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg cursor-pointer flex-shrink-0"
              >
                Mark Exit
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
