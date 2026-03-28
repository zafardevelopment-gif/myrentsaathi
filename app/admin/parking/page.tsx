"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSocietyId } from "@/lib/admin-data";
import {
  getParkingSlotsAdmin,
  getAllVehicles,
  createSlot,
  deleteSlot,
  assignSlotToVehicle,
  revokeSlotAssignment,
  setVehicleAuthorized,
  getUnassignedVehicles,
  type ParkingSlotFull,
  type Vehicle,
} from "@/lib/parking-data";
import { supabase } from "@/lib/supabase";

// ─── HELPERS ─────────────────────────────────────────────────

function VehicleTypeBadge({ type }: { type: string }) {
  const icons: Record<string, string> = { car: "🚗", bike: "🏍️", truck: "🚛", other: "🚌" };
  return <span className="text-sm">{icons[type] ?? "🚗"}</span>;
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />;
}

type Tab = "slots" | "vehicles" | "assign";

export default function AdminParkingPage() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("slots");

  const [slots, setSlots] = useState<ParkingSlotFull[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [unassigned, setUnassigned] = useState<Vehicle[]>([]);
  const [availableSlots, setAvailableSlots] = useState<ParkingSlotFull[]>([]);
  const [loading, setLoading] = useState(true);

  // Create slot form
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotNum, setSlotNum] = useState("");
  const [slotType, setSlotType] = useState("car");
  const [slotLevel, setSlotLevel] = useState("");
  const [slotSubmitting, setSlotSubmitting] = useState(false);
  const [slotError, setSlotError] = useState("");

  // Assign form
  const [assignVehicleId, setAssignVehicleId] = useState("");
  const [assignSlotId, setAssignSlotId] = useState("");
  const [assignUntil, setAssignUntil] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  const loadAll = useCallback(async (sid: string) => {
    const [s, v] = await Promise.all([getParkingSlotsAdmin(sid), getAllVehicles(sid)]);
    setSlots(s);
    setVehicles(v);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    supabase.from("users").select("id").eq("email", user.email).single().then(({ data: u }) => {
      if (u) setAdminUserId(u.id);
    });
    getAdminSocietyId(user.email).then((sid) => {
      if (sid) { setSocietyId(sid); loadAll(sid); }
      else setLoading(false);
    });
  }, [user, loadAll]);

  // Refresh assign-tab dropdowns when tab switches to assign
  useEffect(() => {
    if (tab !== "assign" || !societyId) return;
    Promise.all([
      getUnassignedVehicles(societyId),
      getParkingSlotsAdmin(societyId),
    ]).then(([uv, sl]) => {
      setUnassigned(uv);
      setAvailableSlots(sl.filter((s) => s.status === "available"));
    });
  }, [tab, societyId]);

  const handleCreateSlot = async () => {
    if (!slotNum.trim() || !societyId) { setSlotError("Slot number is required."); return; }
    setSlotSubmitting(true); setSlotError("");
    const res = await createSlot(societyId, { slot_number: slotNum, slot_type: slotType, level: slotLevel });
    if (!res.success) { setSlotError(res.error ?? "Failed to create slot."); setSlotSubmitting(false); return; }
    setSlotNum(""); setSlotType("car"); setSlotLevel("");
    setShowSlotForm(false);
    await loadAll(societyId);
    setSlotSubmitting(false);
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!societyId) return;
    await deleteSlot(slotId);
    await loadAll(societyId);
  };

  const handleRevoke = async (slotId: string, vehicleId: string) => {
    if (!societyId) return;
    await revokeSlotAssignment(slotId, vehicleId);
    await loadAll(societyId);
  };

  const handleToggleAuth = async (vehicleId: string, current: boolean) => {
    await setVehicleAuthorized(vehicleId, !current);
    if (societyId) await loadAll(societyId);
  };

  const handleAssign = async () => {
    if (!assignVehicleId || !assignSlotId || !societyId || !adminUserId) {
      setAssignError("Select both a vehicle and a slot."); return;
    }
    setAssignSubmitting(true); setAssignError(""); setAssignSuccess("");
    const vehicle = unassigned.find((v) => v.id === assignVehicleId);
    if (!vehicle) { setAssignError("Vehicle not found."); setAssignSubmitting(false); return; }

    const res = await assignSlotToVehicle({
      societyId,
      slotId: assignSlotId,
      vehicleId: assignVehicleId,
      ownerId: vehicle.owner_id,
      issuedBy: adminUserId,
      validUntil: assignUntil || undefined,
    });

    if (!res.success) { setAssignError(res.error ?? "Assignment failed."); setAssignSubmitting(false); return; }
    setAssignSuccess(`Slot assigned and parking pass issued!`);
    setAssignVehicleId(""); setAssignSlotId(""); setAssignUntil("");
    await loadAll(societyId);
    const [uv, sl] = await Promise.all([getUnassignedVehicles(societyId), getParkingSlotsAdmin(societyId)]);
    setUnassigned(uv); setAvailableSlots(sl.filter((s) => s.status === "available"));
    setAssignSubmitting(false);
  };

  const stats = {
    total: slots.length,
    occupied: slots.filter((s) => s.status === "occupied").length,
    available: slots.filter((s) => s.status === "available").length,
    vehicles: vehicles.length,
    unauthorized: vehicles.filter((v) => !v.is_authorized).length,
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink">🅿️ Parking Management</h1>
        <p className="text-sm text-ink-muted mt-0.5">Slots, vehicles, and pass assignments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {[
          { label: "Total Slots", value: stats.total, color: "text-ink" },
          { label: "Occupied", value: stats.occupied, color: "text-red-500" },
          { label: "Available", value: stats.available, color: "text-green-600" },
          { label: "Vehicles", value: stats.vehicles, color: "text-blue-600" },
          { label: "Unauth.", value: stats.unauthorized, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-border-default rounded-xl p-3 text-center">
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-warm-100 rounded-xl p-1 border border-border-default">
        {(["slots", "vehicles", "assign"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
              tab === t ? "bg-amber-600 text-white shadow" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t === "assign" ? "Assign Slot" : t === "slots" ? "Slots" : "Vehicles"}
          </button>
        ))}
      </div>

      {/* ── TAB: SLOTS ── */}
      {tab === "slots" && (
        <div className="space-y-4">
          <button
            onClick={() => { setShowSlotForm(!showSlotForm); setSlotError(""); }}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
          >
            + Add Parking Slot
          </button>

          {showSlotForm && (
            <div className="bg-white border border-amber-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <p className="font-bold text-ink text-sm">New Parking Slot</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Slot Number *</label>
                  <input
                    type="text"
                    value={slotNum}
                    onChange={(e) => setSlotNum(e.target.value)}
                    placeholder="e.g. A1, B-12"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Type</label>
                  <select
                    value={slotType}
                    onChange={(e) => setSlotType(e.target.value)}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  >
                    <option value="car">Car</option>
                    <option value="bike">Bike</option>
                    <option value="truck">Truck</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">Level / Floor</label>
                <input
                  type="text"
                  value={slotLevel}
                  onChange={(e) => setSlotLevel(e.target.value)}
                  placeholder="e.g. Ground, B1, Level 2"
                  className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              {slotError && <p className="text-xs text-red-500">{slotError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleCreateSlot}
                  disabled={slotSubmitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
                >
                  {slotSubmitting ? "Creating…" : "Create Slot"}
                </button>
                <button
                  onClick={() => { setShowSlotForm(false); setSlotError(""); }}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {slots.length === 0 && !showSlotForm && (
            <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
              <p className="text-ink-muted text-sm">No parking slots yet. Add your first slot above.</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {slots.map((slot) => {
              const flat = slot.flat as { flat_number: string; block: string | null } | null;
              const passVehicle = slot.pass?.vehicle as unknown as { vehicle_number: string; vehicle_type: string; vehicle_model: string | null; owner: { full_name: string } | null } | null;
              return (
                <div
                  key={slot.id}
                  className={`bg-white rounded-2xl border border-border-default border-l-4 p-4 relative ${
                    slot.status === "occupied" ? "border-l-red-400" : "border-l-green-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-lg text-ink">{slot.slot_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      slot.status === "occupied" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                      {slot.status === "occupied" ? "Occupied" : "Available"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-ink-muted mb-1">
                    <VehicleTypeBadge type={slot.slot_type} />
                    <span className="capitalize">{slot.slot_type}</span>
                    {slot.level && <span className="ml-1 text-ink-muted">· {slot.level}</span>}
                  </div>
                  {slot.status === "occupied" && passVehicle ? (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs font-bold text-ink font-mono">{passVehicle.vehicle_number}</p>
                      {passVehicle.vehicle_model && <p className="text-[11px] text-ink-muted">{passVehicle.vehicle_model}</p>}
                      {passVehicle.owner && <p className="text-[11px] text-ink-muted">{passVehicle.owner.full_name}</p>}
                      {flat && <p className="text-[11px] text-ink-muted">Flat {flat.flat_number}</p>}
                      <button
                        onClick={() => slot.pass?.vehicle_id && handleRevoke(slot.id, slot.pass.vehicle_id)}
                        className="mt-1.5 text-[11px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        Revoke Pass
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="mt-2 text-[11px] text-red-400 hover:text-red-600 font-semibold cursor-pointer"
                    >
                      Delete Slot
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: VEHICLES ── */}
      {tab === "vehicles" && (
        <div className="space-y-2">
          {vehicles.length === 0 && (
            <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
              <p className="text-ink-muted text-sm">No vehicles registered yet.</p>
            </div>
          )}
          {vehicles.map((v) => {
            const owner = v.owner as { full_name: string; email: string; phone: string | null } | null;
            return (
              <div key={v.id} className="bg-white border border-border-default rounded-xl p-4 flex items-center gap-3">
                <div className="text-2xl flex-shrink-0"><VehicleTypeBadge type={v.vehicle_type} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-ink font-mono">{v.vehicle_number}</p>
                    <StatusDot ok={v.is_authorized} />
                    <span className={`text-[10px] font-semibold ${v.is_authorized ? "text-green-600" : "text-red-500"}`}>
                      {v.is_authorized ? "Authorized" : "Unauthorized"}
                    </span>
                    {v.slot && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                        Slot {v.slot.slot_number}
                      </span>
                    )}
                  </div>
                  {v.vehicle_model && <p className="text-xs text-ink-muted">{v.vehicle_model}{v.color ? ` · ${v.color}` : ""}</p>}
                  {owner && <p className="text-xs text-ink-muted">{owner.full_name} · {v.flat_number ? `Flat ${v.flat_number}` : "No flat"}</p>}
                </div>
                <button
                  onClick={() => handleToggleAuth(v.id, v.is_authorized)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors flex-shrink-0 ${
                    v.is_authorized
                      ? "bg-red-50 hover:bg-red-100 text-red-600"
                      : "bg-green-50 hover:bg-green-100 text-green-700"
                  }`}
                >
                  {v.is_authorized ? "Unauthorize" : "Authorize"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: ASSIGN SLOT ── */}
      {tab === "assign" && (
        <div className="space-y-4">
          {assignSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm font-semibold text-green-700">
              ✅ {assignSuccess}
            </div>
          )}

          <div className="bg-white border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <p className="font-bold text-ink">Assign Parking Slot</p>
            <p className="text-xs text-ink-muted">
              {unassigned.length} unassigned vehicle{unassigned.length !== 1 ? "s" : ""} · {availableSlots.length} available slot{availableSlots.length !== 1 ? "s" : ""}
            </p>

            <div>
              <label className="text-xs font-semibold text-ink-muted block mb-1">Select Vehicle *</label>
              <select
                value={assignVehicleId}
                onChange={(e) => setAssignVehicleId(e.target.value)}
                className="w-full border border-border-default rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="">— Choose a vehicle —</option>
                {unassigned.map((v) => {
                  const owner = v.owner as { full_name: string } | null;
                  return (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_number} {v.vehicle_model ? `· ${v.vehicle_model}` : ""} ({owner?.full_name ?? "Unknown"}{v.flat_number ? ` · Flat ${v.flat_number}` : ""})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-muted block mb-1">Select Slot *</label>
              <select
                value={assignSlotId}
                onChange={(e) => setAssignSlotId(e.target.value)}
                className="w-full border border-border-default rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="">— Choose a slot —</option>
                {availableSlots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.slot_number} · {s.slot_type}{s.level ? ` · ${s.level}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-muted block mb-1">Valid Until (optional)</label>
              <input
                type="date"
                value={assignUntil}
                onChange={(e) => setAssignUntil(e.target.value)}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {assignError && <p className="text-xs text-red-500">{assignError}</p>}

            <button
              onClick={handleAssign}
              disabled={assignSubmitting || !assignVehicleId || !assignSlotId}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl cursor-pointer transition-colors"
            >
              {assignSubmitting ? "Assigning…" : "Assign Slot & Issue Pass"}
            </button>
          </div>

          {/* Current assignments */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-widest">Current Assignments</p>
            {slots.filter((s) => s.status === "occupied").length === 0 && (
              <p className="text-xs text-ink-muted">No assignments yet.</p>
            )}
            {slots.filter((s) => s.status === "occupied").map((s) => {
              const pv = s.pass?.vehicle as unknown as { vehicle_number: string; vehicle_type: string; owner: { full_name: string } | null } | null;
              return (
                <div key={s.id} className="bg-white border border-border-default rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">Slot {s.slot_number}</span>
                      <span className="text-xs text-ink-muted">→</span>
                      <span className="font-mono text-sm text-ink">{pv?.vehicle_number ?? "—"}</span>
                    </div>
                    {pv?.owner && <p className="text-xs text-ink-muted">{pv.owner.full_name}</p>}
                    {s.pass?.valid_until && <p className="text-xs text-ink-muted">Until: {s.pass.valid_until}</p>}
                  </div>
                  <button
                    onClick={() => s.pass?.vehicle_id && handleRevoke(s.id, s.pass.vehicle_id)}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer flex-shrink-0"
                  >
                    Revoke
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
