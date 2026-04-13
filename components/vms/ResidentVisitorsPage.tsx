"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getResidentFlatInfo,
  getResidentPendingRequests,
  markRequestViewed,
  respondToRequest,
  getResidentVisitHistory,
  getPreApprovedList,
  addPreApproved,
  removePreApproved,
  lookupVisitorByMobile,
  createVisitor,
  type VMSApprovalRequest,
  type VMSVisit,
  type VMSPreApproved,
} from "@/lib/vms-data";

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
    admin_override_approved: "Admin Approved",
    admin_override_rejected: "Admin Rejected",
    exited:                  "Exited",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ─── COUNTDOWN ────────────────────────────────────────────────

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const tick = () => setSecs(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (secs === 0) return <span className="text-xs text-red-400">Expired</span>;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const color = secs < 60 ? "text-red-500" : "text-amber-600";
  return <span className={`text-xs font-mono font-bold ${color}`}>Expires in {m}:{String(s).padStart(2, "0")}</span>;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────

type Tab = "approvals" | "pre_approved" | "history";

export default function ResidentVisitorsPage() {
  const { user } = useAuth();
  const [flatInfo, setFlatInfo] = useState<{ id: string; flat_number: string; society_id: string; role: string } | null>(null);
  const [tab, setTab] = useState<Tab>("approvals");

  const [pendingRequests, setPendingRequests] = useState<VMSApprovalRequest[]>([]);
  const [history, setHistory] = useState<VMSVisit[]>([]);
  const [preApproved, setPreApproved] = useState<VMSPreApproved[]>([]);
  const [loading, setLoading] = useState(true);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [responding, setResponding] = useState<string | null>(null);

  // Pre-approved add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMobile, setAddMobile] = useState("");
  const [addName, setAddName] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addUntil, setAddUntil] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  const loadAll = useCallback(async (fi: { id: string; flat_number: string; society_id: string }) => {
    const [reqs, hist, pav] = await Promise.all([
      getResidentPendingRequests(fi.id),
      getResidentVisitHistory(fi.society_id, fi.flat_number),
      getPreApprovedList(fi.id),
    ]);
    setPendingRequests(reqs);
    setHistory(hist);
    setPreApproved(pav);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    getResidentFlatInfo(user.email).then((fi) => {
      if (fi) { setFlatInfo(fi); loadAll(fi); }
      else setLoading(false);
    });
  }, [user, loadAll]);

  // Poll pending approvals every 5 seconds
  useEffect(() => {
    if (!flatInfo) return;
    const id = setInterval(async () => {
      const reqs = await getResidentPendingRequests(flatInfo.id);
      setPendingRequests(reqs);
    }, 5000);
    return () => clearInterval(id);
  }, [flatInfo]);

  const handleApprove = async (req: VMSApprovalRequest) => {
    if (!flatInfo) return;
    setResponding(req.id);
    await markRequestViewed(req.id);
    await respondToRequest(req.id, req.visit_id, flatInfo.id, flatInfo.role, true);
    setPendingRequests((p) => p.filter((r) => r.id !== req.id));
    setResponding(null);
  };

  const handleReject = async (req: VMSApprovalRequest) => {
    if (!flatInfo) return;
    setResponding(req.id);
    await markRequestViewed(req.id);
    await respondToRequest(req.id, req.visit_id, flatInfo.id, flatInfo.role, false, rejectReason);
    setPendingRequests((p) => p.filter((r) => r.id !== req.id));
    setRejectingId(null);
    setRejectReason("");
    setResponding(null);
  };

  const handleAddPreApproved = async () => {
    if (!addMobile.trim() || !flatInfo) { setAddError("Mobile number is required."); return; }
    if (addMobile.replace(/\D/g, "").length !== 10) { setAddError("Mobile number must be exactly 10 digits."); return; }
    setAddSubmitting(true);
    setAddError("");

    let visitor = await lookupVisitorByMobile(flatInfo.society_id, addMobile.trim());
    if (!visitor) {
      if (!addName.trim()) { setAddError("Visitor not found. Please enter their name."); setAddSubmitting(false); return; }
      visitor = await createVisitor(flatInfo.society_id, addName.trim(), addMobile.trim());
    }
    if (!visitor) { setAddError("Failed to register visitor."); setAddSubmitting(false); return; }

    const result = await addPreApproved({
      residentId: flatInfo.id,
      societyId: flatInfo.society_id,
      flatNumber: flatInfo.flat_number,
      visitorId: visitor.id,
      label: addLabel.trim() || undefined,
      validUntil: addUntil || undefined,
    });

    if (!result.success) { setAddError(result.error ?? "Failed to add."); setAddSubmitting(false); return; }

    const updated = await getPreApprovedList(flatInfo.id);
    setPreApproved(updated);
    setShowAddForm(false);
    setAddMobile(""); setAddName(""); setAddLabel(""); setAddUntil("");
    setAddSubmitting(false);
  };

  const handleRemovePav = async (id: string) => {
    await removePreApproved(id);
    setPreApproved((p) => p.filter((pav) => pav.id !== id));
  };

  if (loading) {
    return <div className="text-amber-600 font-bold animate-pulse text-sm py-12 text-center">Loading…</div>;
  }

  if (!flatInfo) {
    return (
      <div className="py-12 text-center text-ink-muted text-sm">
        No flat assigned to your account yet.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink">My Visitors</h1>
        <p className="text-sm text-ink-muted mt-0.5">Flat {flatInfo.flat_number}</p>
      </div>

      {/* Approval alert banner */}
      {pendingRequests.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-lg">🔴</span>
          <p className="text-sm font-bold text-red-700">
            {pendingRequests.length} visitor{pendingRequests.length > 1 ? "s" : ""} need{pendingRequests.length === 1 ? "s" : ""} your approval!
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-warm-100 rounded-xl p-1 border border-border-default">
        {(["approvals", "pre_approved", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === t ? "bg-amber-600 text-white shadow" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t === "approvals" ? `Approvals${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}` : t === "pre_approved" ? "Pre-Approved" : "History"}
          </button>
        ))}
      </div>

      {/* ── TAB: APPROVALS ── */}
      {tab === "approvals" && (
        <div className="space-y-4">
          {pendingRequests.length === 0 && (
            <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-ink">No pending approvals</p>
              <p className="text-xs text-ink-muted mt-1">You&apos;re all caught up.</p>
            </div>
          )}
          {pendingRequests.map((req) => {
            const visit = req.visit as VMSVisit & { visitor?: { name: string; mobile: string } } | undefined;
            return (
              <div key={req.id} className="bg-white border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-ink text-lg">{visit?.visitor?.name ?? "Unknown"}</p>
                    <p className="text-xs text-ink-muted font-mono">{visit?.visitor?.mobile}</p>
                  </div>
                  <Countdown expiresAt={req.expires_at} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted bg-warm-50 rounded-xl p-3">
                  <div><span className="font-semibold text-ink block">Purpose</span>{visit?.purpose ?? "Not specified"}</div>
                  <div><span className="font-semibold text-ink block">Flat</span>{visit?.flat_number}</div>
                  <div><span className="font-semibold text-ink block">Time</span>{visit ? new Date(visit.entry_time).toLocaleTimeString() : ""}</div>
                  {visit?.vehicle_number && <div><span className="font-semibold text-ink block">Vehicle</span>{visit.vehicle_number}</div>}
                </div>

                {rejectingId === req.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Reason for rejection (optional)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(req)}
                        disabled={responding === req.id}
                        className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
                      >
                        {responding === req.id ? "Rejecting…" : "Confirm Reject"}
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason(""); }}
                        className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={responding === req.id}
                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl cursor-pointer transition-colors text-sm"
                    >
                      {responding === req.id ? "…" : "✓ Allow"}
                    </button>
                    <button
                      onClick={() => setRejectingId(req.id)}
                      disabled={responding === req.id}
                      className="flex-1 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 font-bold py-3 rounded-xl cursor-pointer transition-colors text-sm"
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: PRE-APPROVED ── */}
      {tab === "pre_approved" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
          >
            + Add Pre-Approved Visitor
          </button>

          {showAddForm && (
            <div className="bg-white border border-amber-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <p className="font-bold text-ink text-sm">Add Pre-Approved Visitor</p>
              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  value={addMobile}
                  onChange={(e) => setAddMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile"
                  maxLength={10}
                  inputMode="numeric"
                  className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              {[
                { label: "Name (if new visitor)", value: addName, onChange: setAddName, placeholder: "e.g. Kamla Bai", type: "text" },
                { label: "Label", value: addLabel, onChange: setAddLabel, placeholder: "e.g. Maid, Driver, Cook", type: "text" },
                { label: "Valid Until (optional)", value: addUntil, onChange: setAddUntil, placeholder: "", type: "date" },
              ].map(({ label, value, onChange, placeholder, type }) => (
                <div key={label}>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">{label}</label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              ))}
              {addError && <p className="text-xs text-red-500">{addError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleAddPreApproved}
                  disabled={addSubmitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
                >
                  {addSubmitting ? "Adding…" : "Add"}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setAddError(""); }}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {preApproved.length === 0 && !showAddForm && (
            <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
              <p className="text-ink-muted text-sm">No pre-approved visitors yet.</p>
              <p className="text-xs text-ink-muted mt-1">Add visitors who can enter without manual approval.</p>
            </div>
          )}

          {preApproved.map((pav) => (
            <div key={pav.id} className="bg-white border border-border-default rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-ink">{pav.visitor?.name}</p>
                  {pav.label && (
                    <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                      {pav.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted font-mono">{pav.visitor?.mobile}</p>
                <p className="text-xs text-ink-muted">
                  {pav.days_allowed ? `${pav.days_allowed.map((d) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(", ")}` : "All days"}
                  {pav.time_from && pav.time_until ? ` · ${pav.time_from.slice(0, 5)}–${pav.time_until.slice(0, 5)}` : " · Anytime"}
                  {pav.valid_until ? ` · Until ${pav.valid_until}` : ""}
                </p>
              </div>
              <button
                onClick={() => handleRemovePav(pav.id)}
                className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer transition-colors flex-shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: HISTORY ── */}
      {tab === "history" && (
        <div className="space-y-2">
          {history.length === 0 && (
            <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
              <p className="text-ink-muted text-sm">No visit history yet.</p>
            </div>
          )}
          {history.map((v) => (
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
                  {v.purpose && <p className="text-xs text-ink-muted">{v.purpose}</p>}
                  <p className="text-xs text-ink-muted">
                    {new Date(v.entry_time).toLocaleDateString()} {new Date(v.entry_time).toLocaleTimeString()}
                    {v.exit_time ? ` → ${new Date(v.exit_time).toLocaleTimeString()}` : ""}
                  </p>
                  {v.rejection_reason && (
                    <p className="text-xs text-red-500 mt-0.5">Reason: {v.rejection_reason}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
