"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import QRCode from "qrcode";
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
  bulkFullImport,
  getFlatResidents,
  adminRegisterVehicle,
  type ParkingSlotFull,
  type Vehicle,
  type BulkFullRow,
  type BulkImportResult,
} from "@/lib/parking-data";
import { supabase } from "@/lib/supabase";

// ─── CSV HELPERS ─────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]): void {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    const cells: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        cells.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

// ─── PARKING PASS STICKER ─────────────────────────────────────

type PassStickerData = {
  slotNumber: string;
  slotType: string;
  level: string | null;
  vehicleNumber: string;
  vehicleModel: string | null;
  vehicleType: string;
  ownerName: string;
  flatNumber: string | null;
  color: string | null;
  validUntil: string | null;
  passId?: string;
};

async function printParkingPass(data: PassStickerData): Promise<void> {
  // QR code encodes: vehicle number, slot, flat, owner
  const qrPayload = [
    `VEHICLE:${data.vehicleNumber}`,
    `SLOT:${data.slotNumber}`,
    data.flatNumber ? `FLAT:${data.flatNumber}` : null,
    `OWNER:${data.ownerName}`,
    data.validUntil ? `VALID_UNTIL:${data.validUntil}` : null,
  ].filter(Boolean).join("\n");

  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 200,
      margin: 1,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    });
  } catch (_) {
    // ignore QR errors
  }

  const typeIcon = data.vehicleType === "bike" ? "🏍️" : "🚗";
  const levelText = data.level ? ` · ${data.level}` : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Parking Pass — ${data.vehicleNumber}</title>
  <style>
    @page { size: 4in 2.5in; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    body { width: 4in; height: 2.5in; background: #fff; display: flex; align-items: stretch; }
    .card {
      width: 100%; display: flex; border: 2.5px solid #b45309;
      border-radius: 12px; overflow: hidden;
    }
    .left {
      background: linear-gradient(160deg, #b45309 0%, #d97706 100%);
      color: #fff; padding: 14px 12px; display: flex;
      flex-direction: column; justify-content: space-between; width: 130px; flex-shrink: 0;
    }
    .left .badge { font-size: 10px; font-weight: 700; letter-spacing: 1px; opacity: 0.85; text-transform: uppercase; }
    .left .slot-num { font-size: 36px; font-weight: 900; letter-spacing: -1px; line-height: 1; margin: 6px 0 2px; }
    .left .slot-sub { font-size: 10px; opacity: 0.85; }
    .left .type-row { font-size: 11px; font-weight: 600; margin-top: 6px; }
    .right { flex: 1; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; }
    .vehicle-num { font-size: 20px; font-weight: 900; font-family: 'Courier New', monospace; letter-spacing: 1px; color: #1a1a1a; }
    .model { font-size: 11px; color: #555; margin-top: 2px; }
    .owner-section { margin-top: 8px; }
    .owner-name { font-size: 12px; font-weight: 700; color: #1a1a1a; }
    .flat-text { font-size: 10px; color: #666; }
    .valid-row { font-size: 9px; color: #888; margin-top: 4px; }
    .qr-section { display: flex; align-items: flex-end; justify-content: flex-end; }
    .qr-section img { width: 64px; height: 64px; border: 1px solid #e5e7eb; border-radius: 4px; }
    .footer { font-size: 8px; color: #aaa; margin-top: 4px; letter-spacing: 0.5px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="left">
      <div>
        <div class="badge">🅿️ Parking Pass</div>
        <div class="slot-num">${data.slotNumber}</div>
        <div class="slot-sub">${data.slotType.charAt(0).toUpperCase() + data.slotType.slice(1)} Slot${levelText}</div>
      </div>
      <div class="type-row">${typeIcon} ${data.vehicleType.charAt(0).toUpperCase() + data.vehicleType.slice(1)}</div>
    </div>
    <div class="right">
      <div>
        <div class="vehicle-num">${data.vehicleNumber}</div>
        <div class="model">${[data.vehicleModel, data.color].filter(Boolean).join(" · ") || "—"}</div>
        <div class="owner-section">
          <div class="owner-name">${data.ownerName}</div>
          ${data.flatNumber ? `<div class="flat-text">Flat ${data.flatNumber}</div>` : ""}
        </div>
        ${data.validUntil ? `<div class="valid-row">Valid until: ${data.validUntil}</div>` : '<div class="valid-row">No expiry</div>'}
      </div>
      <div style="display:flex; align-items:flex-end; justify-content:space-between;">
        <div class="footer">MyRentSaathi</div>
        ${qrDataUrl ? `<div class="qr-section"><img src="${qrDataUrl}" alt="QR" /></div>` : ""}
      </div>
    </div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=500,height=350");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

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

  // Register vehicle (admin) — used in both Assign tab and Vehicles tab
  type FlatResident = { id: string; full_name: string; role: string; flat_id: string | null };
  const [regFlat, setRegFlat] = useState("");
  const [regFlatResidents, setRegFlatResidents] = useState<FlatResident[]>([]);
  const [regFlatLoading, setRegFlatLoading] = useState(false);
  const [regOwnerId, setRegOwnerId] = useState("");
  const [regVNum, setRegVNum] = useState("");
  const [regVType, setRegVType] = useState("car");
  const [regVModel, setRegVModel] = useState("");
  const [regVColor, setRegVColor] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState<{ vehicleId: string; vehicleNumber: string } | null>(null);
  const [showRegForm, setShowRegForm] = useState(false); // for vehicles tab

  // Search + pagination
  const [slotSearch, setSlotSearch] = useState("");
  const [slotPage, setSlotPage] = useState(1);
  const [slotStatusFilter, setSlotStatusFilter] = useState("all");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehiclePage, setVehiclePage] = useState(1);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignPage, setAssignPage] = useState(1);
  const PAGE_SIZE = 12;

  // Import state
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

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

  const handleAuthorizeAll = async () => {
    if (!societyId) return;
    const unauthorized = vehicles.filter((v) => !v.is_authorized);
    await Promise.all(unauthorized.map((v) => setVehicleAuthorized(v.id, true)));
    await loadAll(societyId);
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

  // ── REGISTER VEHICLE (admin) ─────────────────────────────────

  const handleFlatLookup = async (flat: string) => {
    setRegFlat(flat);
    setRegFlatResidents([]);
    setRegOwnerId("");
    setRegSuccess(null);
    if (!flat.trim() || !societyId) return;
    setRegFlatLoading(true);
    const residents = await getFlatResidents(societyId, flat.trim());
    setRegFlatResidents(residents);
    if (residents.length === 1) setRegOwnerId(residents[0].id);
    setRegFlatLoading(false);
  };

  const handleRegisterVehicle = async () => {
    if (!regFlat.trim() || !regOwnerId || !regVNum.trim() || !societyId) {
      setRegError("Flat, resident, and vehicle number are required."); return;
    }
    setRegSubmitting(true); setRegError("");
    const resident = regFlatResidents.find((r) => r.id === regOwnerId);
    const res = await adminRegisterVehicle({
      societyId,
      ownerId: regOwnerId,
      flatId: resident?.flat_id ?? null,
      flatNumber: regFlat.trim().toUpperCase(),
      vehicleNumber: regVNum,
      vehicleType: regVType,
      vehicleModel: regVModel || undefined,
      color: regVColor || undefined,
    });
    if (!res.success) { setRegError(res.error ?? "Registration failed."); setRegSubmitting(false); return; }

    setRegSuccess({ vehicleId: res.vehicleId!, vehicleNumber: regVNum.toUpperCase() });
    // Pre-select in assign dropdown
    setAssignVehicleId(res.vehicleId!);
    // Refresh data
    await loadAll(societyId);
    const [uv, sl] = await Promise.all([getUnassignedVehicles(societyId), getParkingSlotsAdmin(societyId)]);
    setUnassigned(uv); setAvailableSlots(sl.filter((s) => s.status === "available"));
    setRegSubmitting(false);
  };

  const resetRegForm = () => {
    setRegFlat(""); setRegFlatResidents([]); setRegOwnerId("");
    setRegVNum(""); setRegVType("car"); setRegVModel(""); setRegVColor("");
    setRegError(""); setRegSuccess(null);
  };

  // ── EXPORT ───────────────────────────────────────────────────

  const exportSlots = () => {
    const rows: string[][] = [
      ["Slot Number", "Type", "Level", "Status", "Assigned Vehicle", "Assigned To", "Flat"],
    ];
    for (const s of slots) {
      const pv = s.pass?.vehicle as unknown as { vehicle_number: string; owner: { full_name: string } | null } | null;
      const flat = s.flat as { flat_number: string } | null;
      rows.push([
        s.slot_number,
        s.slot_type,
        s.level ?? "",
        s.status,
        pv?.vehicle_number ?? "",
        pv?.owner?.full_name ?? "",
        flat?.flat_number ?? "",
      ]);
    }
    downloadCSV("parking_slots.csv", rows);
  };

  const exportVehicles = () => {
    const rows: string[][] = [
      ["Vehicle Number", "Type", "Model", "Color", "Owner", "Flat", "Authorized", "Assigned Slot"],
    ];
    for (const v of vehicles) {
      const owner = v.owner as { full_name: string } | null;
      rows.push([
        v.vehicle_number,
        v.vehicle_type,
        v.vehicle_model ?? "",
        v.color ?? "",
        owner?.full_name ?? "",
        v.flat_number ?? "",
        v.is_authorized ? "Yes" : "No",
        v.slot?.slot_number ?? "",
      ]);
    }
    downloadCSV("parking_vehicles.csv", rows);
  };

  const downloadSlotsTemplate = () => {
    downloadCSV("parking_import_template.csv", [
      ["slot_number", "slot_type", "level", "flat_number", "vehicle_number", "vehicle_type", "vehicle_model", "color"],
      ["A1", "car", "Ground", "101", "MH12AB1234", "car", "Honda City", "White"],
      ["A2", "car", "Ground", "102", "MH12CD5678", "car", "Maruti Swift", "Silver"],
      ["B1", "bike", "Basement", "103", "MH12EF9012", "bike", "Activa 6G", "Blue"],
      ["B2", "bike", "Basement", "", "", "", "", ""],
      ["C1", "car", "Level 2", "", "", "", "", ""],
    ]);
  };

  // ── IMPORT ───────────────────────────────────────────────────

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !societyId) return;
    setImportLoading(true);
    setImportResult(null);

    const text = await file.text();
    const cleanText = text.replace(/^\uFEFF/, ""); // strip BOM
    const allRows = parseCSV(cleanText);

    if (allRows.length < 2) {
      setImportResult({ slotsCreated: 0, vehiclesRegistered: 0, assigned: 0, skipped: 0, errors: ["File is empty or has only headers."] });
      setImportLoading(false);
      if (importFileRef.current) importFileRef.current.value = "";
      return;
    }

    // Map header names → column indexes
    // Use exact match first, then partial — avoids slot_type matching slot_number
    const rawHeader = allRows[0].map((h) => h.toLowerCase().replace(/[\s\-]/g, "_"));
    const exactCol = (name: string) => rawHeader.findIndex((h) => h === name);
    const partialCol = (keywords: string[], exclude: string[] = []) =>
      rawHeader.findIndex((h) => keywords.some((k) => h.includes(k)) && !exclude.some((e) => h.includes(e)));

    const idxSlotNum   = exactCol("slot_number") !== -1 ? exactCol("slot_number") : partialCol(["slot_number"]);
    const idxSlotType  = exactCol("slot_type")   !== -1 ? exactCol("slot_type")   : partialCol(["slot_type"], ["vehicle"]);
    const idxLevel     = exactCol("level")        !== -1 ? exactCol("level")       : partialCol(["level", "floor"]);
    const idxFlat      = exactCol("flat_number")  !== -1 ? exactCol("flat_number") : partialCol(["flat_number", "flat"]);
    const idxVNum      = exactCol("vehicle_number") !== -1 ? exactCol("vehicle_number") : partialCol(["vehicle_number"], ["type", "model"]);
    const idxVType     = exactCol("vehicle_type") !== -1 ? exactCol("vehicle_type") : partialCol(["vehicle_type"]);
    const idxVModel    = exactCol("vehicle_model") !== -1 ? exactCol("vehicle_model") : partialCol(["vehicle_model", "model"]);
    const idxColor     = exactCol("color")        !== -1 ? exactCol("color")       : partialCol(["color", "colour"]);

    if (idxSlotNum === -1) {
      setImportResult({ slotsCreated: 0, vehiclesRegistered: 0, assigned: 0, skipped: 0, errors: ["Column 'slot_number' not found in header row."] });
      setImportLoading(false);
      if (importFileRef.current) importFileRef.current.value = "";
      return;
    }

    // Fetch adminUserId fresh — state may not be set yet if page just loaded
    let currentAdminId = adminUserId;
    if (!currentAdminId && user?.email) {
      const { data: u } = await supabase.from("users").select("id").eq("email", user.email).single();
      if (u) currentAdminId = u.id;
    }

    const get = (row: string[], idx: number) => (idx >= 0 ? row[idx]?.trim() ?? "" : "");

    const bulkRows: BulkFullRow[] = allRows.slice(1)
      .filter((row) => row[idxSlotNum]?.trim())
      .map((row) => ({
        slot_number:    get(row, idxSlotNum),
        slot_type:      get(row, idxSlotType) || "car",
        level:          get(row, idxLevel),
        flat_number:    get(row, idxFlat),
        vehicle_number: get(row, idxVNum),
        vehicle_type:   get(row, idxVType) || "car",
        vehicle_model:  get(row, idxVModel),
        color:          get(row, idxColor),
      }));

    const result = await bulkFullImport(societyId, bulkRows, currentAdminId ?? undefined);
    setImportResult(result);
    // Reset filter so imported (occupied) slots are visible
    if (result.slotsCreated > 0) setSlotStatusFilter("all");
    await loadAll(societyId);
    // Refresh assign-tab dropdowns too
    if (tab === "assign") {
      const [uv, sl] = await Promise.all([getUnassignedVehicles(societyId), getParkingSlotsAdmin(societyId)]);
      setUnassigned(uv); setAvailableSlots(sl.filter((s) => s.status === "available"));
    }
    setImportLoading(false);
    if (importFileRef.current) importFileRef.current.value = "";
  };

  // ── DERIVED ──────────────────────────────────────────────────

  const stats = {
    total: slots.length,
    occupied: slots.filter((s) => s.status === "occupied").length,
    available: slots.filter((s) => s.status === "available").length,
    vehicles: vehicles.length,
    unauthorized: vehicles.filter((v) => !v.is_authorized).length,
  };

  const filteredSlots = slots.filter((s) => {
    const matchStatus = slotStatusFilter === "all" || s.status === slotStatusFilter;
    if (!matchStatus) return false;
    if (!slotSearch.trim()) return true;
    const q = slotSearch.toLowerCase();
    const pv = s.pass?.vehicle as unknown as { vehicle_number: string; owner: { full_name: string } | null } | null;
    return (
      s.slot_number.toLowerCase().includes(q) ||
      s.slot_type.toLowerCase().includes(q) ||
      (s.level ?? "").toLowerCase().includes(q) ||
      (pv?.vehicle_number ?? "").toLowerCase().includes(q) ||
      (pv?.owner?.full_name ?? "").toLowerCase().includes(q)
    );
  });
  const totalSlotPages = Math.max(1, Math.ceil(filteredSlots.length / PAGE_SIZE));
  const pagedSlots = filteredSlots.slice((slotPage - 1) * PAGE_SIZE, slotPage * PAGE_SIZE);

  const filteredVehicles = vehicles.filter((v) => {
    if (!vehicleSearch.trim()) return true;
    const q = vehicleSearch.toLowerCase();
    const owner = v.owner as { full_name: string } | null;
    return (
      v.vehicle_number.toLowerCase().includes(q) ||
      (v.vehicle_model ?? "").toLowerCase().includes(q) ||
      v.vehicle_type.toLowerCase().includes(q) ||
      (owner?.full_name ?? "").toLowerCase().includes(q) ||
      (v.flat_number ?? "").toLowerCase().includes(q) ||
      (v.color ?? "").toLowerCase().includes(q)
    );
  });
  const totalVehiclePages = Math.max(1, Math.ceil(filteredVehicles.length / PAGE_SIZE));
  const pagedVehicles = filteredVehicles.slice((vehiclePage - 1) * PAGE_SIZE, vehiclePage * PAGE_SIZE);

  const occupiedSlots = slots.filter((s) => s.status === "occupied");
  const filteredAssign = occupiedSlots.filter((s) => {
    if (!assignSearch.trim()) return true;
    const q = assignSearch.toLowerCase();
    const pv = s.pass?.vehicle as unknown as { vehicle_number: string; owner: { full_name: string } | null } | null;
    return (
      s.slot_number.toLowerCase().includes(q) ||
      (pv?.vehicle_number ?? "").toLowerCase().includes(q) ||
      (pv?.owner?.full_name ?? "").toLowerCase().includes(q)
    );
  });
  const totalAssignPages = Math.max(1, Math.ceil(filteredAssign.length / PAGE_SIZE));
  const pagedAssign = filteredAssign.slice((assignPage - 1) * PAGE_SIZE, assignPage * PAGE_SIZE);

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">🅿️ Parking Management</h1>
          <p className="text-sm text-ink-muted mt-0.5">Slots, vehicles, and pass assignments</p>
        </div>
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
          {/* Action bar */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setShowSlotForm(!showSlotForm); setSlotError(""); setImportResult(null); }}
              className="flex-1 min-w-[140px] bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
            >
              + Add Slot
            </button>
            <button
              onClick={() => { setShowSlotForm(false); importFileRef.current?.click(); }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl cursor-pointer border border-blue-200 text-sm transition-colors"
            >
              ⬆ Import CSV
            </button>
            <button
              onClick={downloadSlotsTemplate}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold rounded-xl cursor-pointer border border-gray-200 text-sm transition-colors"
            >
              ⬇ Template
            </button>
            {slots.length > 0 && (
              <button
                onClick={exportSlots}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-xl cursor-pointer border border-green-200 text-sm transition-colors"
              >
                ⬇ Export CSV
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={importFileRef}
            type="file"
            accept=".csv"
            onChange={handleImportFile}
            className="hidden"
          />

          {/* Import loading */}
          {importLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 font-semibold animate-pulse">
              Importing slots…
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className={`rounded-xl p-4 border space-y-2 ${
              importResult.errors.length > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
            }`}>
              <p className="text-sm font-bold text-ink">Import Complete</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-green-700 font-semibold">🅿️ {importResult.slotsCreated} slots created</span>
                <span className="text-blue-700 font-semibold">🚗 {importResult.vehiclesRegistered} vehicles registered</span>
                <span className="text-purple-700 font-semibold">✓ {importResult.assigned} slots assigned</span>
                {importResult.skipped > 0 && (
                  <span className="text-amber-700 font-semibold">⊘ {importResult.skipped} skipped (duplicates)</span>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="space-y-0.5 border-t border-amber-200 pt-2">
                  <p className="text-xs font-semibold text-red-600">Errors:</p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">· {e}</p>
                  ))}
                </div>
              )}
              <button onClick={() => setImportResult(null)} className="text-xs text-ink-muted underline cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Add slot form */}
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
                    <option value="car">🚗 Car</option>
                    <option value="bike">🏍️ Bike</option>
                    <option value="truck">🚛 Truck</option>
                    <option value="other">🚌 Other</option>
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

          {/* CSV hint */}
          {!showSlotForm && slots.length === 0 && !importResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1.5">
              <p className="font-bold">One CSV — slots, vehicles, and assignments together</p>
              <p>Download the <strong>Template</strong>, fill in Excel, click <strong>Import CSV</strong>. Each row can do all three steps at once.</p>
              <div className="bg-white rounded-lg p-2 font-mono text-[10px] text-gray-600 overflow-x-auto">
                slot_number | slot_type | level | flat_number | vehicle_number | vehicle_type | vehicle_model | color
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                <li><strong>slot_type</strong>: <code>car</code> or <code>bike</code></li>
                <li><strong>flat_number</strong> + <strong>vehicle_number</strong>: registers vehicle &amp; assigns slot automatically</li>
                <li>Leave vehicle columns blank for unassigned slots</li>
                <li>If vehicle already exists, it will be reused (not duplicated)</li>
              </ul>
            </div>
          )}

          {/* Search + filter */}
          {slots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={slotSearch}
                onChange={(e) => { setSlotSearch(e.target.value); setSlotPage(1); }}
                placeholder="Search slot, type, vehicle…"
                className="flex-1 min-w-[160px] border border-border-default rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <select
                value={slotStatusFilter}
                onChange={(e) => { setSlotStatusFilter(e.target.value); setSlotPage(1); }}
                className="border border-border-default rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
          )}

          {slots.length > 0 && filteredSlots.length === 0 && (
            <div className="bg-white rounded-2xl border border-border-default p-6 text-center">
              <p className="text-ink-muted text-sm">No slots match your search.</p>
            </div>
          )}

          {slots.length === 0 && !showSlotForm && (
            <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
              <p className="text-4xl mb-3">🅿️</p>
              <p className="font-semibold text-ink">No parking slots yet</p>
              <p className="text-xs text-ink-muted mt-1">Add slots manually or import a CSV file.</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {pagedSlots.map((slot) => {
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
                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          onClick={() => printParkingPass({
                            slotNumber: slot.slot_number,
                            slotType: slot.slot_type,
                            level: slot.level ?? null,
                            vehicleNumber: passVehicle.vehicle_number,
                            vehicleModel: passVehicle.vehicle_model ?? null,
                            vehicleType: passVehicle.vehicle_type,
                            ownerName: passVehicle.owner?.full_name ?? "—",
                            flatNumber: flat?.flat_number ?? null,
                            color: null,
                            validUntil: slot.pass?.valid_until ?? null,
                            passId: slot.pass?.id,
                          })}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                        >
                          🖨 Print Pass
                        </button>
                        <span className="text-[11px] text-ink-muted">·</span>
                        <button
                          onClick={() => slot.pass?.vehicle_id && handleRevoke(slot.id, slot.pass.vehicle_id)}
                          className="text-[11px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                        >
                          Revoke
                        </button>
                      </div>
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
          {totalSlotPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setSlotPage((p) => Math.max(1, p - 1))} disabled={slotPage === 1} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 cursor-pointer">← Prev</button>
              <span className="text-xs text-ink-muted">Page {slotPage} of {totalSlotPages} · {filteredSlots.length} slots</span>
              <button onClick={() => setSlotPage((p) => Math.min(totalSlotPages, p + 1))} disabled={slotPage === totalSlotPages} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 cursor-pointer">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: VEHICLES ── */}
      {tab === "vehicles" && (
        <div className="space-y-3">
          {/* Action bar */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setShowRegForm(!showRegForm); resetRegForm(); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl cursor-pointer text-sm transition-colors"
            >
              + Add Vehicle
            </button>
            {vehicles.some((v) => !v.is_authorized) && (
              <button
                onClick={handleAuthorizeAll}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl cursor-pointer text-sm transition-colors"
              >
                ✓ Authorize All ({vehicles.filter((v) => !v.is_authorized).length})
              </button>
            )}
            {vehicles.length > 0 && (
              <button
                onClick={exportVehicles}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-xl cursor-pointer border border-green-200 text-sm transition-colors"
              >
                ⬇ Export CSV
              </button>
            )}
            <div className="flex-1" />
            <span className="text-xs text-ink-muted self-center">{vehicles.length} registered</span>
          </div>

          {/* Inline add vehicle form */}
          {showRegForm && (
            <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
              <p className="font-bold text-ink text-sm">Register Vehicle</p>
              {regSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-green-600 text-sm font-bold">✓ {regSuccess.vehicleNumber} registered</span>
                  <button onClick={() => { resetRegForm(); }} className="text-xs text-ink-muted underline cursor-pointer ml-auto">Add another</button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-ink-muted block mb-1">Flat Number *</label>
                    <input
                      type="text"
                      value={regFlat}
                      onChange={(e) => handleFlatLookup(e.target.value)}
                      placeholder="e.g. 101, 4B"
                      className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase"
                    />
                    {regFlatLoading && <p className="text-xs text-amber-600 mt-1 animate-pulse">Searching…</p>}
                  </div>
                  {regFlatResidents.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-ink-muted block mb-1">Resident *</label>
                      <select
                        value={regOwnerId}
                        onChange={(e) => setRegOwnerId(e.target.value)}
                        className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <option value="">— Select —</option>
                        {regFlatResidents.map((r) => (
                          <option key={r.id} value={r.id}>{r.full_name} ({r.role})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {regFlat.trim() && !regFlatLoading && regFlatResidents.length === 0 && (
                    <p className="text-xs text-red-500">No residents found for this flat.</p>
                  )}
                  {regOwnerId && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-ink-muted block mb-1">Vehicle Number *</label>
                          <input type="text" value={regVNum} onChange={(e) => setRegVNum(e.target.value.toUpperCase())}
                            placeholder="MH12AB1234"
                            className="w-full border border-border-default rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-ink-muted block mb-1">Type</label>
                          <select value={regVType} onChange={(e) => setRegVType(e.target.value)}
                            className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                            <option value="car">🚗 Car</option>
                            <option value="bike">🏍️ Bike</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-ink-muted block mb-1">Model</label>
                          <input type="text" value={regVModel} onChange={(e) => setRegVModel(e.target.value)}
                            placeholder="Honda City"
                            className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-ink-muted block mb-1">Color</label>
                          <input type="text" value={regVColor} onChange={(e) => setRegVColor(e.target.value)}
                            placeholder="White"
                            className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        </div>
                      </div>
                      {regError && <p className="text-xs text-red-500">{regError}</p>}
                      <div className="flex gap-2">
                        <button onClick={handleRegisterVehicle} disabled={regSubmitting || !regVNum.trim()}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer text-sm">
                          {regSubmitting ? "Registering…" : "Register Vehicle"}
                        </button>
                        <button onClick={() => { setShowRegForm(false); resetRegForm(); }}
                          className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer text-sm">
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          <input
            type="text"
            value={vehicleSearch}
            onChange={(e) => { setVehicleSearch(e.target.value); setVehiclePage(1); }}
            placeholder="Search by number, model, owner, flat…"
            className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {vehicles.length === 0 && !showRegForm && (
            <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
              <p className="text-4xl mb-3">🚗</p>
              <p className="font-semibold text-ink">No vehicles registered yet</p>
              <p className="text-xs text-ink-muted mt-1">Click &ldquo;+ Add Vehicle&rdquo; to register one, or tenants/landlords can register from their dashboard.</p>
            </div>
          )}
          {vehicles.length > 0 && filteredVehicles.length === 0 && (
            <div className="bg-white rounded-2xl border border-border-default p-6 text-center">
              <p className="text-ink-muted text-sm">No vehicles match &ldquo;{vehicleSearch}&rdquo;.</p>
            </div>
          )}
          {pagedVehicles.map((v) => {
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
          {totalVehiclePages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setVehiclePage((p) => Math.max(1, p - 1))} disabled={vehiclePage === 1} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 cursor-pointer">← Prev</button>
              <span className="text-xs text-ink-muted">Page {vehiclePage} of {totalVehiclePages} · {filteredVehicles.length} vehicles</span>
              <button onClick={() => setVehiclePage((p) => Math.min(totalVehiclePages, p + 1))} disabled={vehiclePage === totalVehiclePages} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 cursor-pointer">Next →</button>
            </div>
          )}
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

          {/* STEP 1 — Register vehicle (if none exist or user wants to add) */}
          <div className="bg-white border border-border-default rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-ink text-sm">Step 1 — Register Vehicle</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {unassigned.length > 0
                    ? `${unassigned.length} vehicle${unassigned.length !== 1 ? "s" : ""} ready to assign — or register a new one below`
                    : "No vehicles yet — register one first"}
                </p>
              </div>
            </div>

            {regSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                <span className="text-green-600 text-sm font-bold">✓ {regSuccess.vehicleNumber} registered</span>
                <button onClick={resetRegForm} className="text-xs text-ink-muted underline cursor-pointer ml-auto">Register another</button>
              </div>
            )}

            {!regSuccess && (
              <div className="space-y-3">
                {/* Flat lookup */}
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Flat Number *</label>
                  <input
                    type="text"
                    value={regFlat}
                    onChange={(e) => handleFlatLookup(e.target.value)}
                    placeholder="e.g. 101, 4B"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase"
                  />
                  {regFlatLoading && <p className="text-xs text-amber-600 mt-1 animate-pulse">Searching residents…</p>}
                </div>

                {/* Resident select */}
                {regFlatResidents.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-ink-muted block mb-1">Resident *</label>
                    <select
                      value={regOwnerId}
                      onChange={(e) => setRegOwnerId(e.target.value)}
                      className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="">— Select resident —</option>
                      {regFlatResidents.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.full_name} ({r.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {regFlat.trim() && !regFlatLoading && regFlatResidents.length === 0 && (
                  <p className="text-xs text-red-500">No residents found for flat &ldquo;{regFlat}&rdquo;.</p>
                )}

                {/* Vehicle details — only shown when resident selected */}
                {regOwnerId && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-ink-muted block mb-1">Vehicle Number *</label>
                        <input
                          type="text"
                          value={regVNum}
                          onChange={(e) => setRegVNum(e.target.value.toUpperCase())}
                          placeholder="e.g. MH12AB1234"
                          className="w-full border border-border-default rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-ink-muted block mb-1">Type</label>
                        <select
                          value={regVType}
                          onChange={(e) => setRegVType(e.target.value)}
                          className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="car">🚗 Car</option>
                          <option value="bike">🏍️ Bike</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-ink-muted block mb-1">Model</label>
                        <input
                          type="text"
                          value={regVModel}
                          onChange={(e) => setRegVModel(e.target.value)}
                          placeholder="e.g. Honda City"
                          className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-ink-muted block mb-1">Color</label>
                        <input
                          type="text"
                          value={regVColor}
                          onChange={(e) => setRegVColor(e.target.value)}
                          placeholder="e.g. White"
                          className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    </div>
                    {regError && <p className="text-xs text-red-500">{regError}</p>}
                    <button
                      onClick={handleRegisterVehicle}
                      disabled={regSubmitting || !regVNum.trim()}
                      className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
                    >
                      {regSubmitting ? "Registering…" : "Register Vehicle"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* STEP 2 — Assign slot */}
          <div className="bg-white border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <div>
              <p className="font-bold text-ink text-sm">Step 2 — Assign Slot</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {unassigned.length} unassigned vehicle{unassigned.length !== 1 ? "s" : ""} · {availableSlots.length} available slot{availableSlots.length !== 1 ? "s" : ""}
              </p>
            </div>

            {availableSlots.length === 0 && unassigned.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                All slots are currently assigned. Go to <strong>Slots</strong> tab and click &ldquo;Revoke Pass&rdquo; on a slot to free it up.
              </p>
            )}
            {unassigned.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                No unassigned vehicles — register a vehicle above first.
              </p>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Current assignments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-widest">Current Assignments</p>
              <span className="text-xs text-ink-muted">{occupiedSlots.length} assigned</span>
            </div>
            {occupiedSlots.length > 0 && (
              <input
                type="text"
                value={assignSearch}
                onChange={(e) => { setAssignSearch(e.target.value); setAssignPage(1); }}
                placeholder="Search slot, vehicle, owner…"
                className="w-full border border-border-default rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            )}
            {occupiedSlots.length === 0 && (
              <p className="text-xs text-ink-muted">No assignments yet.</p>
            )}
            {occupiedSlots.length > 0 && filteredAssign.length === 0 && (
              <p className="text-xs text-ink-muted">No assignments match &ldquo;{assignSearch}&rdquo;.</p>
            )}
            {pagedAssign.map((s) => {
              const pv = s.pass?.vehicle as unknown as {
                vehicle_number: string; vehicle_type: string; vehicle_model: string | null;
                owner: { full_name: string } | null;
              } | null;
              const flat = s.flat as { flat_number: string } | null;
              return (
                <div key={s.id} className="bg-white border border-border-default rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-ink">Slot {s.slot_number}</span>
                      {s.level && <span className="text-[10px] text-ink-muted">{s.level}</span>}
                      <span className="text-xs text-ink-muted">→</span>
                      <span className="font-mono text-sm text-ink">{pv?.vehicle_number ?? "—"}</span>
                    </div>
                    {pv?.owner && <p className="text-xs text-ink-muted">{pv.owner.full_name}{flat ? ` · Flat ${flat.flat_number}` : ""}</p>}
                    {s.pass?.valid_until && <p className="text-xs text-ink-muted">Until: {s.pass.valid_until}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {pv && (
                      <button
                        onClick={() => printParkingPass({
                          slotNumber: s.slot_number,
                          slotType: s.slot_type,
                          level: s.level ?? null,
                          vehicleNumber: pv.vehicle_number,
                          vehicleModel: pv.vehicle_model ?? null,
                          vehicleType: pv.vehicle_type,
                          ownerName: pv.owner?.full_name ?? "—",
                          flatNumber: flat?.flat_number ?? null,
                          color: null,
                          validUntil: s.pass?.valid_until ?? null,
                          passId: s.pass?.id,
                        })}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer"
                        title="Print / Save Parking Pass"
                      >
                        🖨
                      </button>
                    )}
                    <button
                      onClick={() => s.pass?.vehicle_id && handleRevoke(s.id, s.pass.vehicle_id)}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              );
            })}
            {totalAssignPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button onClick={() => setAssignPage((p) => Math.max(1, p - 1))} disabled={assignPage === 1} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 cursor-pointer">← Prev</button>
                <span className="text-xs text-ink-muted">Page {assignPage} of {totalAssignPages}</span>
                <button onClick={() => setAssignPage((p) => Math.min(totalAssignPages, p + 1))} disabled={assignPage === totalAssignPages} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 cursor-pointer">Next →</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
