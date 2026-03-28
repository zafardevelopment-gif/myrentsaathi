"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getAdminVisitLog,
  getAdminPendingOverrides,
  adminOverrideVisit,
  getSocietyGuards,
  deactivateGuard,
  type VMSVisit,
} from "@/lib/vms-data";
import { addGuard } from "@/lib/auth-db";
import { getAdminSocietyId } from "@/lib/admin-data";

// ─── STATUS BADGE ─────────────────────────────────────────────

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

type Tab = "overrides" | "log" | "guards";

type Guard = { id: string; full_name: string; email: string; phone: string | null; is_active: boolean };

export default function AdminVisitorsPage() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overrides");

  const [overrides, setOverrides] = useState<VMSVisit[]>([]);
  const [log, setLog] = useState<VMSVisit[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);

  const [overridingId, setOverridingId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideSubmitting, setOverrideSubmitting] = useState<string | null>(null);

  // Add guard form
  const [showAddGuard, setShowAddGuard] = useState(false);
  const [gName, setGName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gSubmitting, setGSubmitting] = useState(false);
  const [gSuccess, setGSuccess] = useState("");
  const [gError, setGError] = useState("");

  const loadData = useCallback(async (sid: string) => {
    const [ov, lg, gd] = await Promise.all([
      getAdminPendingOverrides(sid),
      getAdminVisitLog(sid),
      getSocietyGuards(sid),
    ]);
    setOverrides(ov);
    setLog(lg);
    setGuards(gd);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    // Get admin's user id + society id
    import("@/lib/supabase").then(({ supabase }) => {
      supabase
        .from("users")
        .select("id")
        .eq("email", user.email.trim().toLowerCase())
        .single()
        .then(({ data: u }) => {
          if (u) setAdminId(u.id);
        });
    });
    getAdminSocietyId(user.email).then((sid) => {
      if (sid) { setSocietyId(sid); loadData(sid); }
      else setLoading(false);
    });
  }, [user, loadData]);

  // Poll overrides every 10s
  useEffect(() => {
    if (!societyId) return;
    const id = setInterval(async () => {
      const ov = await getAdminPendingOverrides(societyId);
      setOverrides(ov);
    }, 10000);
    return () => clearInterval(id);
  }, [societyId]);

  const handleOverride = async (visitId: string, approve: boolean) => {
    if (!adminId || !societyId) return;
    setOverrideSubmitting(visitId);
    await adminOverrideVisit(visitId, adminId, approve, overrideReason);
    setOverrides((o) => o.filter((v) => v.id !== visitId));
    setOverridingId(null);
    setOverrideReason("");
    setOverrideSubmitting(null);
    // Refresh log
    const updated = await getAdminVisitLog(societyId);
    setLog(updated);
  };

  const handleDeactivateGuard = async (guardId: string) => {
    await deactivateGuard(guardId);
    setGuards((g) => g.map((gu) => gu.id === guardId ? { ...gu, is_active: false } : gu));
  };

  const handleAddGuard = async () => {
    if (!gName.trim() || !gEmail.trim() || !societyId) { setGError("Name and email are required."); return; }
    setGSubmitting(true);
    setGError(""); setGSuccess("");
    const result = await addGuard({ full_name: gName, email: gEmail, phone: gPhone, society_id: societyId });
    if (!result.success) { setGError(result.error ?? "Failed to add guard."); setGSubmitting(false); return; }
    setGSuccess(`Guard added! Login password: ${result.password}`);
    setGName(""); setGEmail(""); setGPhone("");
    setGSubmitting(false);
    setShowAddGuard(false);
    const updated = await getSocietyGuards(societyId);
    setGuards(updated);
  };

  if (loading) {
    return <div className="text-amber-600 font-bold animate-pulse text-sm py-12 text-center">Loading…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Visitor Management</h1>
        <p className="text-sm text-ink-muted mt-0.5">Gate access control &amp; logs</p>
      </div>

      {/* Override alert */}
      {overrides.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <p className="text-sm font-bold text-red-700">
            {overrides.length} visit{overrides.length > 1 ? "s" : ""} awaiting admin override!
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-warm-100 rounded-xl p-1 border border-border-default">
        {(["overrides", "log", "guards"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === t ? "bg-amber-600 text-white shadow" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t === "overrides" ? `Override${overrides.length > 0 ? ` (${overrides.length})` : ""}` : t === "log" ? "Full Log" : "Guards"}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERRIDES ── */}
      {tab === "overrides" && (
        <div className="space-y-4">
          {overrides.length === 0 && (
            <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-ink">No pending overrides</p>
              <p className="text-xs text-ink-muted mt-1">All timed-out visits have been resolved.</p>
            </div>
          )}
          {overrides.map((v) => (
            <div key={v.id} className="bg-white border border-amber-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-ink">{v.visitor?.name}</p>
                  <p className="text-xs text-ink-muted font-mono">{v.visitor?.mobile}</p>
                </div>
                <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                  Timed Out
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted bg-warm-50 rounded-xl p-3">
                <div><span className="font-semibold text-ink block">Flat</span>{v.flat_number}{v.block ? ` · ${v.block}` : ""}</div>
                {v.purpose && <div><span className="font-semibold text-ink block">Purpose</span>{v.purpose}</div>}
                <div><span className="font-semibold text-ink block">Arrived</span>{new Date(v.entry_time).toLocaleTimeString()}</div>
                <div><span className="font-semibold text-ink block">Guard</span>{v.guard?.full_name ?? "—"}</div>
              </div>

              {overridingId === v.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOverride(v.id, true)}
                      disabled={overrideSubmitting === v.id}
                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer"
                    >
                      {overrideSubmitting === v.id ? "…" : "✓ Approve"}
                    </button>
                    <button
                      onClick={() => handleOverride(v.id, false)}
                      disabled={overrideSubmitting === v.id}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer"
                    >
                      {overrideSubmitting === v.id ? "…" : "✗ Reject"}
                    </button>
                    <button
                      onClick={() => { setOverridingId(null); setOverrideReason(""); }}
                      className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setOverridingId(v.id)}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
                >
                  Override Decision
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: FULL LOG ── */}
      {tab === "log" && (
        <div className="space-y-2">
          {log.length === 0 && (
            <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
              <p className="text-ink-muted text-sm">No visits recorded yet.</p>
            </div>
          )}
          {log.map((v) => (
            <div key={v.id} className="bg-white border border-border-default rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
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
                  <p className="text-xs text-ink-muted font-mono">{v.visitor?.mobile}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    <span className="text-xs text-ink-muted">Flat {v.flat_number}{v.block ? ` · ${v.block}` : ""}</span>
                    {v.purpose && <span className="text-xs text-ink-muted">{v.purpose}</span>}
                    <span className="text-xs text-ink-muted">Guard: {v.guard?.full_name ?? "—"}</span>
                    {v.approver && <span className="text-xs text-ink-muted">By: {v.approver.full_name}</span>}
                  </div>
                  <p className="text-xs text-ink-muted">
                    {new Date(v.entry_time).toLocaleDateString()} {new Date(v.entry_time).toLocaleTimeString()}
                    {v.exit_time ? ` → ${new Date(v.exit_time).toLocaleTimeString()}` : ""}
                  </p>
                  {v.rejection_reason && <p className="text-xs text-red-500">Reason: {v.rejection_reason}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: GUARDS ── */}
      {tab === "guards" && (
        <div className="space-y-4">
          {gSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm font-semibold text-green-700">
              ✅ {gSuccess}
            </div>
          )}

          <button
            onClick={() => { setShowAddGuard(!showAddGuard); setGError(""); setGSuccess(""); }}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
          >
            + Add Guard
          </button>

          {showAddGuard && (
            <div className="bg-white border border-amber-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <p className="font-bold text-ink text-sm">Add New Guard</p>
              {[
                { label: "Full Name *", value: gName, onChange: setGName, placeholder: "Guard's name" },
                { label: "Email *", value: gEmail, onChange: setGEmail, placeholder: "guard@example.com" },
                { label: "Phone", value: gPhone, onChange: setGPhone, placeholder: "Mobile number" },
              ].map(({ label, value, onChange, placeholder }) => (
                <div key={label}>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">{label}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              ))}
              <p className="text-xs text-ink-muted">
                Auto-generated password: <span className="font-mono font-semibold">{gName ? gName.split(" ")[0] + "@guard" : "FirstName@guard"}</span>
              </p>
              {gError && <p className="text-xs text-red-500">{gError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleAddGuard}
                  disabled={gSubmitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
                >
                  {gSubmitting ? "Adding…" : "Add Guard"}
                </button>
                <button
                  onClick={() => { setShowAddGuard(false); setGError(""); }}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {guards.length === 0 && !showAddGuard && (
            <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
              <p className="text-ink-muted text-sm">No guards added yet.</p>
            </div>
          )}

          {guards.map((g) => (
            <div key={g.id} className="bg-white border border-border-default rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-ink">{g.full_name}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${g.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {g.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-ink-muted">{g.email}</p>
                {g.phone && <p className="text-xs text-ink-muted">{g.phone}</p>}
              </div>
              {g.is_active && (
                <button
                  onClick={() => handleDeactivateGuard(g.id)}
                  className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer transition-colors flex-shrink-0"
                >
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
