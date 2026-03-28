"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getResidentInfo,
  getResidentVehicles,
  registerVehicle,
  deleteVehicle,
  type Vehicle,
} from "@/lib/parking-data";

function VehicleTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = { car: "🚗", bike: "🏍️", truck: "🚛", other: "🚌" };
  return <span className="text-2xl">{icons[type] ?? "🚗"}</span>;
}

export default function ResidentParkingPage() {
  const { user } = useAuth();

  const [residentInfo, setResidentInfo] = useState<{
    userId: string; flatId: string | null; flatNumber: string | null; societyId: string;
  } | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Add vehicle form
  const [showForm, setShowForm] = useState(false);
  const [vNumber, setVNumber] = useState("");
  const [vType, setVType] = useState("car");
  const [vModel, setVModel] = useState("");
  const [vColor, setVColor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadVehicles = useCallback(async (ri: { userId: string; societyId: string }) => {
    const data = await getResidentVehicles(ri.userId, ri.societyId);
    setVehicles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    getResidentInfo(user.email).then((ri) => {
      if (ri) { setResidentInfo(ri); loadVehicles(ri); }
      else setLoading(false);
    });
  }, [user, loadVehicles]);

  const handleAddVehicle = async () => {
    if (!vNumber.trim() || !residentInfo) { setError("Vehicle number is required."); return; }
    setSubmitting(true); setError(""); setSuccess("");

    const res = await registerVehicle({
      societyId: residentInfo.societyId,
      ownerId: residentInfo.userId,
      flatId: residentInfo.flatId ?? undefined,
      flatNumber: residentInfo.flatNumber ?? undefined,
      vehicleNumber: vNumber,
      vehicleType: vType,
      vehicleModel: vModel || undefined,
      color: vColor || undefined,
    });

    if (!res.success) { setError(res.error ?? "Registration failed."); setSubmitting(false); return; }

    setSuccess("Vehicle registered successfully!");
    setVNumber(""); setVType("car"); setVModel(""); setVColor("");
    setShowForm(false);
    await loadVehicles(residentInfo);
    setSubmitting(false);
  };

  const handleRemove = async (vehicleId: string) => {
    await deleteVehicle(vehicleId);
    setVehicles((v) => v.filter((veh) => veh.id !== vehicleId));
  };

  if (loading) {
    return <div className="text-amber-600 font-bold animate-pulse text-sm py-12 text-center">Loading…</div>;
  }

  if (!residentInfo) {
    return <div className="py-12 text-center text-ink-muted text-sm">No flat assigned to your account.</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink">🅿️ My Parking</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Flat {residentInfo.flatNumber ?? "—"}
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm font-semibold text-green-700">
          ✅ {success}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-border-default rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-ink">{vehicles.length}</p>
          <p className="text-xs text-ink-muted mt-0.5">Registered Vehicles</p>
        </div>
        <div className="bg-white border border-border-default rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-blue-600">{vehicles.filter((v) => v.slot).length}</p>
          <p className="text-xs text-ink-muted mt-0.5">Slots Assigned</p>
        </div>
      </div>

      {/* Add vehicle */}
      <button
        onClick={() => { setShowForm(!showForm); setError(""); }}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
      >
        + Add Vehicle
      </button>

      {showForm && (
        <div className="bg-white border border-amber-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <p className="font-bold text-ink text-sm">Register Vehicle</p>

          <div>
            <label className="text-xs font-semibold text-ink-muted block mb-1">Vehicle Number *</label>
            <input
              type="text"
              value={vNumber}
              onChange={(e) => setVNumber(e.target.value.toUpperCase())}
              placeholder="e.g. MH12AB1234"
              className="w-full border border-border-default rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted block mb-1">Type</label>
              <select
                value={vType}
                onChange={(e) => setVType(e.target.value)}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="car">🚗 Car</option>
                <option value="bike">🏍️ Bike</option>
                <option value="truck">🚛 Truck</option>
                <option value="other">🚌 Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted block mb-1">Color</label>
              <input
                type="text"
                value={vColor}
                onChange={(e) => setVColor(e.target.value)}
                placeholder="e.g. White"
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-muted block mb-1">Model</label>
            <input
              type="text"
              value={vModel}
              onChange={(e) => setVModel(e.target.value)}
              placeholder="e.g. Honda City, Activa"
              className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleAddVehicle}
              disabled={submitting}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
            >
              {submitting ? "Registering…" : "Register Vehicle"}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(""); }}
              className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vehicle list */}
      {vehicles.length === 0 && !showForm && (
        <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
          <div className="text-4xl mb-3">🚗</div>
          <p className="font-semibold text-ink">No vehicles registered</p>
          <p className="text-xs text-ink-muted mt-1">Add your vehicle to get a parking slot assigned by admin.</p>
        </div>
      )}

      <div className="space-y-3">
        {vehicles.map((v) => (
          <div key={v.id} className="bg-white border border-border-default rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <VehicleTypeIcon type={v.vehicle_type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-extrabold text-ink font-mono tracking-wider">{v.vehicle_number}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    v.is_authorized ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}>
                    {v.is_authorized ? "Authorized" : "Unauthorized"}
                  </span>
                </div>
                <p className="text-xs text-ink-muted capitalize">
                  {v.vehicle_type}{v.vehicle_model ? ` · ${v.vehicle_model}` : ""}{v.color ? ` · ${v.color}` : ""}
                </p>

                {/* Parking pass */}
                {v.slot ? (
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-blue-700 mb-1">🅿️ Parking Pass Issued</p>
                    <div className="flex gap-4 text-xs text-blue-700">
                      <div>
                        <span className="font-semibold block">Slot</span>
                        {v.slot.slot_number}
                      </div>
                      <div>
                        <span className="font-semibold block">Type</span>
                        <span className="capitalize">{v.slot.slot_type}</span>
                      </div>
                      {v.slot.level && (
                        <div>
                          <span className="font-semibold block">Level</span>
                          {v.slot.level}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 mt-1.5 font-semibold">
                    ⏳ Awaiting slot assignment by admin
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRemove(v.id)}
                className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer flex-shrink-0 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
