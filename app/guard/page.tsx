"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getGuardUser,
  lookupVisitorByMobile,
  createVisitor,
  checkPreApproved,
  createVisit,
  createApprovalRequest,
  getResidentsOfFlat,
  getGuardPendingVisits,
  markExit,
  auditLog,
  type VMSVisit,
  type VMSVisitor,
} from "@/lib/vms-data";

// ─── STATUS BADGE ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:                   "bg-amber-100 text-amber-700",
    approved:                  "bg-green-100 text-green-700",
    rejected:                  "bg-red-100 text-red-700",
    admin_override_approved:   "bg-blue-100 text-blue-700",
    admin_override_rejected:   "bg-red-100 text-red-700",
    exited:                    "bg-gray-100 text-gray-600",
  };
  const labels: Record<string, string> = {
    pending:                 "Waiting",
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

// ─── COUNTDOWN ───────────────────────────────────────────────

function Countdown({ timeoutAt }: { timeoutAt: string }) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(timeoutAt).getTime() - Date.now()) / 1000));
      setSecs(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeoutAt]);

  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const color = secs < 60 ? "text-red-500" : "text-amber-600";

  if (secs === 0) return <span className="text-xs text-gray-400">Timed out</span>;
  return (
    <span className={`text-xs font-mono font-semibold ${color}`}>
      ⏱ {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────

type Step = "search" | "new_form" | "select_flat" | "pending" | "approved" | "rejected";

export default function GuardGatePage() {
  const { user } = useAuth();

  const [guardInfo, setGuardInfo] = useState<{ id: string; full_name: string; society_id: string } | null>(null);
  const [pendingVisits, setPendingVisits] = useState<VMSVisit[]>([]);

  // Search state
  const [mobile, setMobile] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundVisitor, setFoundVisitor] = useState<VMSVisitor | null>(null);
  const [step, setStep] = useState<Step>("search");

  // New visitor form
  const [newName, setNewName] = useState("");
  const [newPurpose, setNewPurpose] = useState("");
  const [newFlat, setNewFlat] = useState("");
  const [newBlock, setNewBlock] = useState("");
  const [newVehicle, setNewVehicle] = useState("");

  // Returning visitor flat selection
  const [selectedFlat, setSelectedFlat] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedPurpose, setSelectedPurpose] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [lastVisit, setLastVisit] = useState<VMSVisit | null>(null);
  const [error, setError] = useState("");

  // Load guard info + pending visits
  useEffect(() => {
    if (!user?.email) return;
    getGuardUser(user.email).then((g) => {
      if (g) {
        setGuardInfo(g);
        refreshPending(g.society_id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Poll pending visits every 5 seconds
  useEffect(() => {
    if (!guardInfo) return;
    const id = setInterval(() => refreshPending(guardInfo.society_id), 5000);
    return () => clearInterval(id);
  }, [guardInfo]);

  const refreshPending = useCallback(async (societyId: string) => {
    const visits = await getGuardPendingVisits(societyId);
    setPendingVisits(visits);
  }, []);

  const reset = () => {
    setMobile("");
    setNewName(""); setNewPurpose(""); setNewFlat(""); setNewBlock(""); setNewVehicle("");
    setSelectedFlat(""); setSelectedBlock(""); setSelectedPurpose("");
    setFoundVisitor(null);
    setStep("search");
    setError("");
    setLastVisit(null);
  };

  const handleSearch = async () => {
    if (!mobile.trim() || !guardInfo) return;
    setSearching(true);
    setError("");
    const visitor = await lookupVisitorByMobile(guardInfo.society_id, mobile.trim());
    setSearching(false);
    if (visitor) {
      setFoundVisitor(visitor);
      setStep("select_flat");
    } else {
      setStep("new_form");
    }
  };

  const submitNewVisitor = async () => {
    if (!newName.trim() || !newFlat.trim() || !guardInfo) {
      setError("Name and flat number are required.");
      return;
    }
    setSubmitting(true);
    setError("");

    // Create or get visitor
    const visitor = await createVisitor(guardInfo.society_id, newName, mobile);
    if (!visitor) { setError("Failed to register visitor."); setSubmitting(false); return; }

    await sendVisit(visitor, newFlat.trim(), newBlock.trim(), newPurpose.trim(), newVehicle.trim());
    setSubmitting(false);
  };

  const submitReturningVisitor = async () => {
    if (!selectedFlat.trim() || !foundVisitor || !guardInfo) {
      setError("Please enter the flat number.");
      return;
    }
    setSubmitting(true);
    setError("");
    await sendVisit(foundVisitor, selectedFlat.trim(), selectedBlock.trim(), selectedPurpose.trim(), "");
    setSubmitting(false);
  };

  const sendVisit = async (
    visitor: VMSVisitor,
    flat: string,
    block: string,
    purpose: string,
    vehicle: string
  ) => {
    if (!guardInfo) return;

    // Check pre-approval
    const pav = await checkPreApproved(visitor.id, guardInfo.society_id, flat);

    const visit = await createVisit({
      societyId: guardInfo.society_id,
      visitorId: visitor.id,
      flatNumber: flat,
      block: block || undefined,
      purpose: purpose || undefined,
      vehicleNumber: vehicle || undefined,
      guardId: guardInfo.id,
      isPreApproved: !!pav,
    });

    if (!visit) { setError("Failed to create visit entry."); return; }

    await auditLog(visit.id, guardInfo.id, "guard", "created", { pre_approved: !!pav });

    if (pav) {
      setLastVisit({ ...visit, visitor });
      setStep("approved");
      if (guardInfo) refreshPending(guardInfo.society_id);
      return;
    }

    // Send approval requests to all residents of that flat
    const residents = await getResidentsOfFlat(guardInfo.society_id, flat);
    for (const r of residents) {
      await createApprovalRequest(visit.id, r.id);
    }

    setLastVisit({ ...visit, visitor });
    setStep("pending");
    if (guardInfo) refreshPending(guardInfo.society_id);
  };

  const handleMarkExit = async (visitId: string) => {
    await markExit(visitId);
    if (guardInfo) refreshPending(guardInfo.society_id);
  };

  if (!guardInfo) {
    return (
      <div className="flex items-center justify-center py-24 text-amber-600 font-bold animate-pulse">
        Loading guard profile…
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Gate Entry</h1>
        <p className="text-sm text-ink-muted mt-0.5">Guard: {guardInfo.full_name}</p>
      </div>

      {/* ── STEP: SEARCH ── */}
      {step === "search" && (
        <div className="bg-white rounded-2xl border border-border-default p-6 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-ink">Enter visitor&apos;s mobile number</p>
          <input
            type="tel"
            placeholder="10-digit mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            maxLength={10}
            className="w-full border border-border-default rounded-xl px-4 py-3 text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={handleSearch}
            disabled={searching || mobile.trim().length < 5}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer"
          >
            {searching ? "Searching…" : "Search Visitor"}
          </button>
        </div>
      )}

      {/* ── STEP: NEW VISITOR FORM ── */}
      {step === "new_form" && (
        <div className="bg-white rounded-2xl border border-border-default p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-ink">New Visitor</p>
            <button onClick={reset} className="text-xs text-ink-muted underline cursor-pointer">← Back</button>
          </div>
          <p className="text-xs text-ink-muted">Mobile: <span className="font-mono font-semibold text-ink">{mobile}</span></p>

          {[
            { label: "Full Name *", value: newName, onChange: setNewName, placeholder: "Visitor name" },
            { label: "Purpose", value: newPurpose, onChange: setNewPurpose, placeholder: "e.g. Delivery, Guest, Repair" },
            { label: "Flat Number *", value: newFlat, onChange: setNewFlat, placeholder: "e.g. 4B" },
            { label: "Block / Tower", value: newBlock, onChange: setNewBlock, placeholder: "e.g. A, Tower 2" },
            { label: "Vehicle Number", value: newVehicle, onChange: setNewVehicle, placeholder: "Optional" },
          ].map(({ label, value, onChange, placeholder }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">{label}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-border-default rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          ))}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={submitNewVisitor}
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer"
          >
            {submitting ? "Sending…" : "Send Approval Request"}
          </button>
        </div>
      )}

      {/* ── STEP: RETURNING VISITOR — SELECT FLAT ── */}
      {step === "select_flat" && foundVisitor && (
        <div className="bg-white rounded-2xl border border-border-default p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-ink">Returning Visitor</p>
            <button onClick={reset} className="text-xs text-ink-muted underline cursor-pointer">← Back</button>
          </div>

          <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3">
            <span className="text-2xl">👤</span>
            <div>
              <p className="font-bold text-ink">{foundVisitor.name}</p>
              <p className="text-xs text-ink-muted font-mono">{foundVisitor.mobile}</p>
            </div>
          </div>

          {[
            { label: "Flat Number *", value: selectedFlat, onChange: setSelectedFlat, placeholder: "e.g. 4B" },
            { label: "Block / Tower", value: selectedBlock, onChange: setSelectedBlock, placeholder: "Optional" },
            { label: "Purpose", value: selectedPurpose, onChange: setSelectedPurpose, placeholder: "e.g. Guest, Delivery" },
          ].map(({ label, value, onChange, placeholder }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">{label}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-border-default rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          ))}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={submitReturningVisitor}
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer"
          >
            {submitting ? "Checking…" : "Send Approval Request"}
          </button>
        </div>
      )}

      {/* ── STEP: PENDING APPROVAL ── */}
      {step === "pending" && lastVisit && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3 text-center">
          <div className="text-4xl">⏳</div>
          <p className="font-extrabold text-amber-700 text-lg">Awaiting Approval</p>
          <p className="text-sm text-ink">{lastVisit.visitor?.name} → Flat {lastVisit.flat_number}</p>
          <Countdown timeoutAt={lastVisit.timeout_at} />
          <p className="text-xs text-ink-muted">Approval request sent to resident. Waiting for response…</p>
          <button
            onClick={reset}
            className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl cursor-pointer"
          >
            New Entry
          </button>
        </div>
      )}

      {/* ── STEP: AUTO APPROVED (pre-approved) ── */}
      {step === "approved" && lastVisit && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-3 text-center">
          <div className="text-4xl">✅</div>
          <p className="font-extrabold text-green-700 text-lg">Entry Approved!</p>
          <p className="text-sm text-ink">{lastVisit.visitor?.name} → Flat {lastVisit.flat_number}</p>
          <p className="text-xs text-green-600 font-semibold">Pre-approved visitor — auto entry granted</p>
          <button
            onClick={reset}
            className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl cursor-pointer"
          >
            New Entry
          </button>
        </div>
      )}

      {/* ── STEP: REJECTED ── */}
      {step === "rejected" && lastVisit && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-3 text-center">
          <div className="text-4xl">❌</div>
          <p className="font-extrabold text-red-700 text-lg">Entry Rejected</p>
          <p className="text-sm text-ink">{lastVisit.visitor?.name} → Flat {lastVisit.flat_number}</p>
          <button
            onClick={reset}
            className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl cursor-pointer"
          >
            New Entry
          </button>
        </div>
      )}

      {/* ── PENDING APPROVALS LIVE LIST ── */}
      {pendingVisits.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-widest">
            Pending Approvals ({pendingVisits.length})
          </p>
          {pendingVisits.map((v) => (
            <div
              key={v.id}
              className="bg-white border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-ink truncate">{v.visitor?.name}</p>
                <p className="text-xs text-ink-muted">Flat {v.flat_number}{v.block ? ` · ${v.block}` : ""}</p>
                {v.purpose && <p className="text-xs text-ink-muted">{v.purpose}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <StatusBadge status={v.status} />
                <Countdown timeoutAt={v.timeout_at} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RECENT APPROVED — quick exit buttons ── */}
      {/* Shown only when in search step to avoid clutter */}
      {step === "search" && (
        <RecentApproved societyId={guardInfo.society_id} onMarkExit={handleMarkExit} />
      )}
    </div>
  );
}

// ─── RECENT APPROVED VISITS (for exit marking) ────────────────

function RecentApproved({
  societyId,
  onMarkExit,
}: {
  societyId: string;
  onMarkExit: (id: string) => void;
}) {
  const [visits, setVisits] = useState<VMSVisit[]>([]);

  useEffect(() => {
    import("@/lib/vms-data").then(({ getGuardTodayVisits }) => {
      getGuardTodayVisits(societyId).then((all) => {
        setVisits(all.filter((v) => v.status === "approved" || v.status === "admin_override_approved"));
      });
    });
  }, [societyId]);

  if (visits.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-ink-muted uppercase tracking-widest">Approved Today</p>
      {visits.map((v) => (
        <div
          key={v.id}
          className="bg-white border border-green-200 rounded-xl p-3 flex items-center justify-between gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-ink truncate">{v.visitor?.name}</p>
            <p className="text-xs text-ink-muted">Flat {v.flat_number}</p>
            {v.exit_time && (
              <p className="text-xs text-gray-400">Exited {new Date(v.exit_time).toLocaleTimeString()}</p>
            )}
          </div>
          {!v.exit_time && (
            <button
              onClick={() => onMarkExit(v.id)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Mark Exit
            </button>
          )}
          {v.exit_time && <span className="text-xs text-gray-400 font-semibold">Exited</span>}
        </div>
      ))}
    </div>
  );
}
