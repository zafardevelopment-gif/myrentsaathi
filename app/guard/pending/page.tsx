"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getGuardUser, getGuardPendingVisits, type VMSVisit } from "@/lib/vms-data";

function Countdown({ timeoutAt }: { timeoutAt: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const tick = () => setSecs(Math.max(0, Math.floor((new Date(timeoutAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeoutAt]);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (secs === 0) return <span className="text-xs text-red-500 font-semibold">Timed out — awaiting admin override</span>;
  const color = secs < 60 ? "text-red-500" : "text-amber-600";
  return <span className={`text-xs font-mono font-semibold ${color}`}>⏱ {m}:{String(s).padStart(2, "0")} remaining</span>;
}

export default function GuardPendingPage() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [visits, setVisits] = useState<VMSVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (sid: string) => {
    const data = await getGuardPendingVisits(sid);
    setVisits(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    getGuardUser(user.email).then((g) => {
      if (g) { setSocietyId(g.society_id); refresh(g.society_id); }
    });
  }, [user, refresh]);

  useEffect(() => {
    if (!societyId) return;
    const id = setInterval(() => refresh(societyId), 5000);
    return () => clearInterval(id);
  }, [societyId, refresh]);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">Pending Approvals</h1>
        <span className="text-xs text-ink-muted">Auto-refreshes every 5s</span>
      </div>

      {loading && <div className="text-amber-600 font-bold animate-pulse text-sm">Loading…</div>}

      {!loading && visits.length === 0 && (
        <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-semibold text-ink">No pending approvals</p>
          <p className="text-xs text-ink-muted mt-1">All visitors have been processed.</p>
        </div>
      )}

      {visits.map((v) => (
        <div key={v.id} className="bg-white border border-amber-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-ink">{v.visitor?.name}</p>
              <p className="text-xs text-ink-muted font-mono">{v.visitor?.mobile}</p>
            </div>
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
              Pending
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
            <div><span className="font-semibold text-ink">Flat</span> {v.flat_number}{v.block ? ` · ${v.block}` : ""}</div>
            {v.purpose && <div><span className="font-semibold text-ink">Purpose</span> {v.purpose}</div>}
            <div><span className="font-semibold text-ink">Entered</span> {new Date(v.entry_time).toLocaleTimeString()}</div>
          </div>
          <Countdown timeoutAt={v.timeout_at} />
        </div>
      ))}
    </div>
  );
}
