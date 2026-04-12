/**
 * Parking Management System — Data Layer
 * Shared across admin, resident (tenant/landlord), and guard.
 */

import { supabase } from "./supabase";

// ─── TYPES ────────────────────────────────────────────────────

export type Vehicle = {
  id: string;
  society_id: string;
  owner_id: string;
  flat_id: string | null;
  flat_number: string | null;
  vehicle_number: string;
  vehicle_type: string;
  vehicle_model: string | null;
  color: string | null;
  status: string;
  is_authorized: boolean;
  created_at: string;
  owner?: { full_name: string; email: string; phone: string | null } | null;
  slot?: ParkingSlotWithPass | null;
};

export type ParkingSlotFull = {
  id: string;
  society_id: string;
  slot_number: string;
  slot_type: string;
  level: string | null;
  status: string;
  flat_id: string | null;
  vehicle_number: string | null;
  vehicle_model: string | null;
  flat?: { flat_number: string; block: string | null } | null;
  pass?: ParkingPass | null;
};

export type ParkingPass = {
  id: string;
  society_id: string;
  vehicle_id: string;
  slot_id: string;
  owner_id: string;
  issued_by: string | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  vehicle?: Vehicle | null;
  slot?: { slot_number: string; slot_type: string; level: string | null } | null;
};

export type ParkingSlotWithPass = {
  slot_number: string;
  slot_type: string;
  level: string | null;
};

// ─── ADMIN: SLOT MANAGEMENT ───────────────────────────────────

export async function getParkingSlotsAdmin(societyId: string): Promise<ParkingSlotFull[]> {
  const { data: slots } = await supabase
    .from("parking_slots")
    .select("*, flat:flats(flat_number, block)")
    .eq("society_id", societyId)
    .order("slot_number");

  if (!slots || slots.length === 0) return [];

  // Fetch active passes for all slots
  const slotIds = slots.map((s) => s.id);
  const { data: passes } = await supabase
    .from("vehicle_parking_passes")
    .select("*, vehicle:vehicles(vehicle_number, vehicle_type, vehicle_model, owner:owner_id(full_name))")
    .in("slot_id", slotIds)
    .eq("is_active", true);

  const passMap: Record<string, ParkingPass> = {};
  for (const p of passes ?? []) {
    passMap[p.slot_id] = p as ParkingPass;
  }

  return (slots as unknown as ParkingSlotFull[]).map((s) => ({
    ...s,
    pass: passMap[s.id] ?? null,
  }));
}

export async function createSlot(societyId: string, params: {
  slot_number: string;
  slot_type: string;
  level?: string;
}): Promise<{ success: boolean; error?: string }> {
  const row: Record<string, unknown> = {
    society_id: societyId,
    slot_number: params.slot_number.trim().toUpperCase(),
    slot_type: params.slot_type,
    status: "available",
  };
  // Only include level if provided (column may not exist in older DB)
  const levelVal = params.level?.trim() || null;
  if (levelVal !== null) row.level = levelVal;

  const { error } = await supabase.from("parking_slots").insert(row);
  if (error) {
    // If level column missing, retry without it
    if (error.message.includes("level")) {
      delete row.level;
      const { error: err2 } = await supabase.from("parking_slots").insert(row);
      if (err2) return { success: false, error: err2.message };
      return { success: true };
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteSlot(slotId: string): Promise<{ success: boolean; error?: string }> {
  // Deactivate any active passes first
  await supabase
    .from("vehicle_parking_passes")
    .update({ is_active: false })
    .eq("slot_id", slotId)
    .eq("is_active", true);

  const { error } = await supabase.from("parking_slots").delete().eq("id", slotId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── ADMIN: VEHICLE MANAGEMENT ────────────────────────────────

export async function getAllVehicles(societyId: string): Promise<Vehicle[]> {
  const { data } = await supabase
    .from("vehicles")
    .select("*, owner:owner_id(full_name, email, phone)")
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  // Fetch passes for each vehicle
  const vehicleIds = data.map((v) => v.id);
  const { data: passes } = await supabase
    .from("vehicle_parking_passes")
    .select("vehicle_id, slot:slot_id(slot_number, slot_type, level)")
    .in("vehicle_id", vehicleIds)
    .eq("is_active", true);

  const passMap: Record<string, ParkingSlotWithPass> = {};
  for (const p of passes ?? []) {
    passMap[p.vehicle_id] = p.slot as unknown as ParkingSlotWithPass;
  }

  return (data as unknown as Vehicle[]).map((v) => ({
    ...v,
    slot: passMap[v.id] ?? null,
  }));
}

export async function setVehicleAuthorized(vehicleId: string, authorized: boolean): Promise<void> {
  await supabase.from("vehicles").update({ is_authorized: authorized }).eq("id", vehicleId);
}

// ─── ADMIN: ASSIGN SLOT ───────────────────────────────────────

export async function assignSlotToVehicle(params: {
  societyId: string;
  slotId: string;
  vehicleId: string;
  ownerId: string;
  issuedBy: string;
  validUntil?: string;
}): Promise<{ success: boolean; error?: string }> {
  // Ensure slot is available
  const { data: slot } = await supabase
    .from("parking_slots")
    .select("status")
    .eq("id", params.slotId)
    .single();

  if (slot?.status === "occupied") {
    return { success: false, error: "Slot is already occupied." };
  }

  // Deactivate any existing pass for this vehicle
  await supabase
    .from("vehicle_parking_passes")
    .update({ is_active: false })
    .eq("vehicle_id", params.vehicleId)
    .eq("is_active", true);

  // Create new pass
  const { error: passErr } = await supabase.from("vehicle_parking_passes").insert({
    society_id: params.societyId,
    vehicle_id: params.vehicleId,
    slot_id: params.slotId,
    owner_id: params.ownerId,
    issued_by: params.issuedBy,
    valid_until: params.validUntil ?? null,
    is_active: true,
  });
  if (passErr) return { success: false, error: passErr.message };

  // Get vehicle info to update slot
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("vehicle_number, vehicle_model, flat_id")
    .eq("id", params.vehicleId)
    .single();

  // Update slot status
  await supabase.from("parking_slots").update({
    status: "occupied",
    flat_id: vehicle?.flat_id ?? null,
    vehicle_number: vehicle?.vehicle_number ?? null,
    vehicle_model: vehicle?.vehicle_model ?? null,
  }).eq("id", params.slotId);

  return { success: true };
}

export async function revokeSlotAssignment(slotId: string, vehicleId: string): Promise<void> {
  await supabase
    .from("vehicle_parking_passes")
    .update({ is_active: false })
    .eq("slot_id", slotId)
    .eq("vehicle_id", vehicleId)
    .eq("is_active", true);

  await supabase.from("parking_slots").update({
    status: "available",
    flat_id: null,
    vehicle_number: null,
    vehicle_model: null,
  }).eq("id", slotId);
}

// ─── RESIDENT: OWN VEHICLES ───────────────────────────────────

export async function getResidentVehicles(
  userId: string,
  societyId: string
): Promise<Vehicle[]> {
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .eq("owner_id", userId)
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const vehicleIds = data.map((v) => v.id);
  const { data: passes } = await supabase
    .from("vehicle_parking_passes")
    .select("vehicle_id, slot:slot_id(slot_number, slot_type, level)")
    .in("vehicle_id", vehicleIds)
    .eq("is_active", true);

  const passMap: Record<string, ParkingSlotWithPass> = {};
  for (const p of passes ?? []) {
    passMap[p.vehicle_id] = p.slot as unknown as ParkingSlotWithPass;
  }

  return (data as unknown as Vehicle[]).map((v) => ({
    ...v,
    slot: passMap[v.id] ?? null,
  }));
}

export async function registerVehicle(params: {
  societyId: string;
  ownerId: string;
  flatId?: string;
  flatNumber?: string;
  vehicleNumber: string;
  vehicleType: string;
  vehicleModel?: string;
  color?: string;
}): Promise<{ success: boolean; error?: string }> {
  // Check duplicate vehicle number within society
  const { data: existing } = await supabase
    .from("vehicles")
    .select("id")
    .eq("society_id", params.societyId)
    .eq("vehicle_number", params.vehicleNumber.trim().toUpperCase())
    .single();

  if (existing) return { success: false, error: "This vehicle number is already registered in this society." };

  const { error } = await supabase.from("vehicles").insert({
    society_id: params.societyId,
    owner_id: params.ownerId,
    flat_id: params.flatId ?? null,
    flat_number: params.flatNumber ?? null,
    vehicle_number: params.vehicleNumber.trim().toUpperCase(),
    vehicle_type: params.vehicleType,
    vehicle_model: params.vehicleModel?.trim() || null,
    color: params.color?.trim() || null,
    status: "active",
    is_authorized: true,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteVehicle(vehicleId: string): Promise<void> {
  // Deactivate any passes
  await supabase
    .from("vehicle_parking_passes")
    .update({ is_active: false })
    .eq("vehicle_id", vehicleId)
    .eq("is_active", true);

  await supabase.from("vehicles").update({ status: "inactive" }).eq("id", vehicleId);
}

// ─── GUARD: VEHICLE LOOKUP ────────────────────────────────────

export async function lookupVehicleByNumber(
  societyId: string,
  vehicleNumber: string
): Promise<Vehicle | null> {
  const { data } = await supabase
    .from("vehicles")
    .select("*, owner:owner_id(full_name, email, phone)")
    .eq("society_id", societyId)
    .eq("vehicle_number", vehicleNumber.trim().toUpperCase())
    .eq("status", "active")
    .single();

  if (!data) return null;

  // Get assigned slot
  const { data: pass } = await supabase
    .from("vehicle_parking_passes")
    .select("slot:slot_id(slot_number, slot_type, level)")
    .eq("vehicle_id", data.id)
    .eq("is_active", true)
    .single();

  return {
    ...(data as unknown as Vehicle),
    slot: (pass?.slot as unknown as ParkingSlotWithPass) ?? null,
  };
}

// ─── RESIDENT: RESOLVE FLAT INFO ─────────────────────────────

export async function getResidentInfo(
  email: string
): Promise<{ userId: string; flatId: string | null; flatNumber: string | null; societyId: string } | null> {
  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", email.trim().toLowerCase())
    .single();
  if (!user) return null;

  if (user.role === "tenant") {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("flat_id, society_id, flat:flat_id(flat_number)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();
    if (!tenant) return null;
    const flat = tenant.flat as unknown as { flat_number: string } | null;
    return { userId: user.id, flatId: tenant.flat_id, flatNumber: flat?.flat_number ?? null, societyId: tenant.society_id ?? "" };
  }

  // landlord
  const { data: flat } = await supabase
    .from("flats")
    .select("id, flat_number, society_id")
    .eq("owner_id", user.id)
    .limit(1)
    .single();
  if (!flat) return null;
  return { userId: user.id, flatId: flat.id, flatNumber: flat.flat_number, societyId: flat.society_id };
}

// ─── ADMIN: BULK FULL IMPORT (slots + vehicles + assign) ─────

// DB CHECK constraint allows only: car, bike
const VALID_SLOT_TYPES = ["car", "bike"] as const;

export type BulkFullRow = {
  slot_number: string;      // required
  slot_type?: string;       // car | bike  (default: car)
  level?: string;           // e.g. Ground, B1, Level 2
  flat_number?: string;     // needed for vehicle registration + assignment
  vehicle_number?: string;  // if provided, register this vehicle
  vehicle_type?: string;    // car | bike  (default: car)
  vehicle_model?: string;
  color?: string;
};

export type BulkImportResult = {
  slotsCreated: number;
  vehiclesRegistered: number;
  assigned: number;
  skipped: number;
  errors: string[];
};

export type BulkSlotRow = BulkFullRow; // keep old alias for compatibility

export async function bulkCreateSlots(
  societyId: string,
  rows: BulkFullRow[],
  adminUserId?: string
): Promise<BulkImportResult> {
  return bulkFullImport(societyId, rows, adminUserId);
}

export async function bulkFullImport(
  societyId: string,
  rows: BulkFullRow[],
  adminUserId?: string
): Promise<BulkImportResult> {
  let slotsCreated = 0, vehiclesRegistered = 0, assigned = 0, skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const slotNum = row.slot_number?.trim().toUpperCase();
    if (!slotNum) { skipped++; continue; }

    // ── 1. Create slot ──────────────────────────────────────
    const rawSlotType = row.slot_type?.toLowerCase().trim() ?? "";
    const slotType = (VALID_SLOT_TYPES as readonly string[]).includes(rawSlotType) ? rawSlotType : "car";
    const levelVal = row.level?.trim() || null;

    const slotData: Record<string, unknown> = {
      society_id: societyId,
      slot_number: slotNum,
      slot_type: slotType,
      status: "available",
    };
    if (levelVal) slotData.level = levelVal;

    const { data: newSlot, error: slotErr } = await supabase
      .from("parking_slots")
      .insert(slotData)
      .select("id")
      .single();

    if (slotErr) {
      if (slotErr.code === "23505") { skipped++; } // duplicate slot
      else errors.push(`Slot ${slotNum}: ${slotErr.message}`);
      continue;
    }
    slotsCreated++;

    const flatNum = row.flat_number?.trim().toUpperCase();
    const vehicleNum = row.vehicle_number?.trim().toUpperCase();
    if (!flatNum || !newSlot?.id) continue; // no flat = no vehicle/assign needed

    // ── 2. Find flat owner/tenant ───────────────────────────
    const { data: flat } = await supabase
      .from("flats")
      .select("id, current_tenant_id, owner_id")
      .eq("society_id", societyId)
      .eq("flat_number", flatNum)
      .single();

    const ownerId = flat?.current_tenant_id ?? flat?.owner_id ?? null;
    const flatId = flat?.id ?? null;
    if (!ownerId) continue; // flat not found or no resident

    // ── 3. Register vehicle (if vehicle_number provided) ────
    let vehicleId: string | null = null;

    if (vehicleNum) {
      // Check if already exists
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("society_id", societyId)
        .eq("vehicle_number", vehicleNum)
        .single();

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        const rawVType = row.vehicle_type?.toLowerCase().trim() ?? "";
        const vType = (VALID_SLOT_TYPES as readonly string[]).includes(rawVType) ? rawVType : "car";

        const { data: newVehicle, error: vErr } = await supabase
          .from("vehicles")
          .insert({
            society_id: societyId,
            owner_id: ownerId,
            flat_id: flatId,
            flat_number: flatNum,
            vehicle_number: vehicleNum,
            vehicle_type: vType,
            vehicle_model: row.vehicle_model?.trim() || null,
            color: row.color?.trim() || null,
            status: "active",
            is_authorized: true,
          })
          .select("id")
          .single();

        if (vErr) {
          errors.push(`Vehicle ${vehicleNum}: ${vErr.message}`);
        } else {
          vehicleId = newVehicle.id;
          vehiclesRegistered++;
        }
      }
    } else {
      // No vehicle number — try to find an existing unassigned vehicle for this flat
      const { data: existingVehicles } = await supabase
        .from("vehicles")
        .select("id")
        .eq("society_id", societyId)
        .eq("flat_number", flatNum)
        .eq("status", "active")
        .limit(1);
      vehicleId = existingVehicles?.[0]?.id ?? null;
    }

    if (!vehicleId || !adminUserId) continue;

    // ── 4. Assign slot to vehicle ────────────────────────────
    const { data: existingPass } = await supabase
      .from("vehicle_parking_passes")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .eq("is_active", true)
      .single();

    if (existingPass) continue; // already has a pass

    const { error: passErr } = await supabase.from("vehicle_parking_passes").insert({
      society_id: societyId,
      vehicle_id: vehicleId,
      slot_id: newSlot.id,
      owner_id: ownerId,
      issued_by: adminUserId,
      is_active: true,
    });

    if (!passErr) {
      // Update slot status — only use columns that exist in parking_slots
      const slotUpdate: Record<string, unknown> = { status: "occupied" };
      if (flatId) slotUpdate.flat_id = flatId;
      // vehicle_number and vehicle_model exist per create-new-society.sql
      if (vehicleNum) slotUpdate.vehicle_number = vehicleNum;
      if (row.vehicle_model?.trim()) slotUpdate.vehicle_model = row.vehicle_model.trim();

      await supabase.from("parking_slots").update(slotUpdate).eq("id", newSlot.id);
      assigned++;
    } else {
      errors.push(`Assign ${slotNum}→${vehicleNum ?? flatNum}: ${passErr.message}`);
    }
  }

  return { slotsCreated, vehiclesRegistered, assigned, skipped, errors };
}

// ─── ADMIN: GET FLAT RESIDENTS (for vehicle registration) ────

export async function getFlatResidents(
  societyId: string,
  flatNumber: string
): Promise<{ id: string; full_name: string; role: string; flat_id: string | null }[]> {
  const { data: flat } = await supabase
    .from("flats")
    .select("id, current_tenant_id, owner_id")
    .eq("society_id", societyId)
    .eq("flat_number", flatNumber.trim())
    .single();

  if (!flat) return [];

  const ids = [flat.current_tenant_id, flat.owner_id].filter(Boolean) as string[];
  if (ids.length === 0) return [];

  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, role")
    .in("id", ids)
    .eq("is_active", true);

  return (users ?? []).map((u) => ({ ...u, flat_id: flat.id }));
}

// Admin registers a vehicle on behalf of a resident
export async function adminRegisterVehicle(params: {
  societyId: string;
  ownerId: string;
  flatId: string | null;
  flatNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  vehicleModel?: string;
  color?: string;
}): Promise<{ success: boolean; vehicleId?: string; error?: string }> {
  const num = params.vehicleNumber.trim().toUpperCase();

  const { data: existing } = await supabase
    .from("vehicles")
    .select("id")
    .eq("society_id", params.societyId)
    .eq("vehicle_number", num)
    .single();

  if (existing) return { success: false, error: "Vehicle already registered in this society." };

  const validTypes = ["car", "bike"] as const;
  const type = (validTypes as readonly string[]).includes(params.vehicleType) ? params.vehicleType : "car";

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      society_id: params.societyId,
      owner_id: params.ownerId,
      flat_id: params.flatId ?? null,
      flat_number: params.flatNumber,
      vehicle_number: num,
      vehicle_type: type,
      vehicle_model: params.vehicleModel?.trim() || null,
      color: params.color?.trim() || null,
      status: "active",
      is_authorized: true,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, vehicleId: data.id };
}

// ─── ADMIN: GET AVAILABLE VEHICLES (for assignment dropdown) ──

export async function getUnassignedVehicles(societyId: string): Promise<Vehicle[]> {
  const { data: all } = await supabase
    .from("vehicles")
    .select("*, owner:owner_id(full_name)")
    .eq("society_id", societyId)
    .eq("status", "active");

  if (!all || all.length === 0) return [];

  // Find vehicles that already have an active pass
  const vehicleIds = all.map((v) => v.id);
  const { data: passes } = await supabase
    .from("vehicle_parking_passes")
    .select("vehicle_id")
    .in("vehicle_id", vehicleIds)
    .eq("is_active", true);

  const assignedIds = new Set((passes ?? []).map((p) => p.vehicle_id));
  return (all as unknown as Vehicle[]).filter((v) => !assignedIds.has(v.id));
}
