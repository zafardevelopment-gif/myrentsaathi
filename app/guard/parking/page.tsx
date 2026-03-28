"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getGuardSocietyId } from "@/lib/vms-data";
import { lookupVehicleByNumber, type Vehicle } from "@/lib/parking-data";

type SearchState = "idle" | "searching" | "found" | "not_found";

export default function GuardParkingPage() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [result, setResult] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    getGuardSocietyId(user.email).then((sid) => { if (sid) setSocietyId(sid); });
  }, [user]);

  const handleSearch = async () => {
    if (!vehicleNumber.trim() || !societyId) return;
    setState("searching");
    setResult(null);
    const vehicle = await lookupVehicleByNumber(societyId, vehicleNumber.trim());
    if (vehicle) { setResult(vehicle); setState("found"); }
    else setState("not_found");
  };

  const reset = () => {
    setVehicleNumber("");
    setState("idle");
    setResult(null);
  };

  const owner = result?.owner as { full_name: string; phone: string | null } | null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink">🚗 Vehicle Check</h1>
        <p className="text-sm text-ink-muted mt-0.5">Verify vehicle authorization at gate</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-border-default p-6 shadow-sm space-y-4">
        <p className="text-sm font-semibold text-ink">Enter vehicle number</p>
        <input
          type="text"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="e.g. MH12AB1234"
          className="w-full border border-border-default rounded-xl px-4 py-3 text-lg font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
          maxLength={20}
        />
        <button
          onClick={handleSearch}
          disabled={state === "searching" || vehicleNumber.trim().length < 4}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl cursor-pointer transition-colors"
        >
          {state === "searching" ? "Searching…" : "Check Vehicle"}
        </button>
      </div>

      {/* ── NOT FOUND ── */}
      {state === "not_found" && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-center space-y-3">
          <div className="text-4xl">⚠️</div>
          <p className="font-extrabold text-red-700 text-lg">Vehicle Not Registered</p>
          <p className="text-sm text-ink">
            <span className="font-mono font-bold">{vehicleNumber}</span> is not registered in this society.
          </p>
          <div className="bg-red-100 rounded-xl p-3">
            <p className="text-sm font-bold text-red-700">🚫 UNAUTHORIZED VEHICLE</p>
            <p className="text-xs text-red-600 mt-1">Do not allow entry. Notify society admin if needed.</p>
          </div>
          <button onClick={reset} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl cursor-pointer">
            Search Again
          </button>
        </div>
      )}

      {/* ── FOUND ── */}
      {state === "found" && result && (
        <div className={`rounded-2xl border-2 p-6 space-y-4 ${
          result.is_authorized
            ? "bg-green-50 border-green-300"
            : "bg-red-50 border-red-300"
        }`}>
          {/* Status banner */}
          <div className="text-center">
            <div className="text-4xl mb-2">{result.is_authorized ? "✅" : "🚫"}</div>
            <p className={`font-extrabold text-xl ${result.is_authorized ? "text-green-700" : "text-red-700"}`}>
              {result.is_authorized ? "AUTHORIZED" : "UNAUTHORIZED"}
            </p>
            {!result.is_authorized && (
              <p className="text-xs text-red-600 font-semibold mt-1">Deny entry — vehicle flagged by admin</p>
            )}
          </div>

          {/* Vehicle details */}
          <div className={`rounded-xl p-4 space-y-2 ${result.is_authorized ? "bg-white" : "bg-red-100"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">
                {result.vehicle_type === "bike" ? "🏍️" : result.vehicle_type === "truck" ? "🚛" : "🚗"}
              </span>
              <span className="font-extrabold text-xl font-mono tracking-wider text-ink">
                {result.vehicle_number}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="font-semibold text-ink-muted block">Type</span>
                <span className="text-ink capitalize">{result.vehicle_type}</span>
              </div>
              {result.vehicle_model && (
                <div>
                  <span className="font-semibold text-ink-muted block">Model</span>
                  <span className="text-ink">{result.vehicle_model}</span>
                </div>
              )}
              {result.color && (
                <div>
                  <span className="font-semibold text-ink-muted block">Color</span>
                  <span className="text-ink">{result.color}</span>
                </div>
              )}
              {result.flat_number && (
                <div>
                  <span className="font-semibold text-ink-muted block">Flat</span>
                  <span className="text-ink">Flat {result.flat_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Owner info */}
          {owner && (
            <div className={`rounded-xl p-3 ${result.is_authorized ? "bg-white" : "bg-red-100"}`}>
              <p className="text-xs font-semibold text-ink-muted mb-1">Owner</p>
              <p className="text-sm font-bold text-ink">{owner.full_name}</p>
              {owner.phone && <p className="text-xs text-ink-muted">{owner.phone}</p>}
            </div>
          )}

          {/* Parking pass */}
          {result.slot ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-1">🅿️ Has Parking Pass</p>
              <div className="flex gap-4 text-xs text-blue-700">
                <div>
                  <span className="font-semibold block">Assigned Slot</span>
                  {result.slot.slot_number}
                </div>
                <div>
                  <span className="font-semibold block">Type</span>
                  <span className="capitalize">{result.slot.slot_type}</span>
                </div>
                {result.slot.level && (
                  <div>
                    <span className="font-semibold block">Level</span>
                    {result.slot.level}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700">⚠️ No parking slot assigned</p>
              <p className="text-xs text-amber-600 mt-0.5">Vehicle is registered but has no parking pass yet.</p>
            </div>
          )}

          <button onClick={reset} className={`w-full font-bold py-2.5 rounded-xl cursor-pointer text-white ${
            result.is_authorized ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
          }`}>
            Check Another Vehicle
          </button>
        </div>
      )}
    </div>
  );
}
