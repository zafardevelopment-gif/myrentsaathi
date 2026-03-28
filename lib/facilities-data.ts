/**
 * Facility Booking System — Data Layer
 */

import { supabase } from "./supabase";

// ─── TYPES ────────────────────────────────────────────────────

export type Facility = {
  id: string;
  society_id: string;
  name: string;
  category: string;
  description: string | null;
  capacity: number | null;
  price_per_slot: number;
  slot_duration_hrs: number;
  open_time: string;
  close_time: string;
  advance_days: number;
  rules: string | null;
  is_active: boolean;
  created_at: string;
};

export type Booking = {
  id: string;
  society_id: string;
  facility_id: string;
  resident_id: string;
  flat_number: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose: string | null;
  guest_count: number | null;
  amount: number;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  facility?: { name: string; category: string } | null;
  resident?: { full_name: string; phone: string | null } | null;
};

export const CATEGORY_LABELS: Record<string, string> = {
  hall: "Banquet Hall",
  guest_room: "Guest Room",
  gym: "Gym",
  pool: "Swimming Pool",
  terrace: "Terrace",
  court: "Sports Court",
  other: "Other",
};

export const CATEGORY_ICONS: Record<string, string> = {
  hall: "🏛️",
  guest_room: "🛏️",
  gym: "🏋️",
  pool: "🏊",
  terrace: "🌇",
  court: "🏸",
  other: "🏢",
};

// ─── ADMIN: FACILITY CRUD ─────────────────────────────────────

export async function getFacilities(societyId: string): Promise<Facility[]> {
  const { data } = await supabase
    .from("facilities")
    .select("*")
    .eq("society_id", societyId)
    .order("name");
  return (data ?? []) as Facility[];
}

export async function createFacility(params: {
  societyId: string;
  name: string;
  category: string;
  description?: string;
  capacity?: number;
  price_per_slot?: number;
  slot_duration_hrs?: number;
  open_time?: string;
  close_time?: string;
  advance_days?: number;
  rules?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("facilities").insert({
    society_id: params.societyId,
    name: params.name.trim(),
    category: params.category,
    description: params.description?.trim() || null,
    capacity: params.capacity || null,
    price_per_slot: params.price_per_slot ?? 0,
    slot_duration_hrs: params.slot_duration_hrs ?? 2,
    open_time: params.open_time ?? "08:00",
    close_time: params.close_time ?? "22:00",
    advance_days: params.advance_days ?? 30,
    rules: params.rules?.trim() || null,
    is_active: true,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function toggleFacilityActive(facilityId: string, active: boolean): Promise<void> {
  await supabase.from("facilities").update({ is_active: active }).eq("id", facilityId);
}

export async function deleteFacility(facilityId: string): Promise<void> {
  await supabase.from("facilities").delete().eq("id", facilityId);
}

// ─── ADMIN: BOOKING MANAGEMENT ────────────────────────────────

export async function getAllBookings(societyId: string): Promise<Booking[]> {
  const { data } = await supabase
    .from("bookings")
    .select("*, facility:facility_id(name, category), resident:resident_id(full_name, phone)")
    .eq("society_id", societyId)
    .order("booking_date", { ascending: false });
  return (data ?? []) as Booking[];
}

export async function getPendingBookings(societyId: string): Promise<Booking[]> {
  const { data } = await supabase
    .from("bookings")
    .select("*, facility:facility_id(name, category), resident:resident_id(full_name, phone)")
    .eq("society_id", societyId)
    .eq("status", "pending")
    .order("booking_date", { ascending: true });
  return (data ?? []) as Booking[];
}

export async function getBookingsByMonth(societyId: string, yearMonth: string): Promise<Booking[]> {
  const from = `${yearMonth}-01`;
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

  const { data } = await supabase
    .from("bookings")
    .select("*, facility:facility_id(name, category), resident:resident_id(full_name)")
    .eq("society_id", societyId)
    .gte("booking_date", from)
    .lte("booking_date", to)
    .order("booking_date", { ascending: true });
  return (data ?? []) as Booking[];
}

export async function reviewBooking(
  bookingId: string,
  adminId: string,
  approve: boolean,
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("bookings")
    .update({
      status: approve ? "approved" : "rejected",
      admin_note: adminNote?.trim() || null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── RESIDENT: BOOKINGS ───────────────────────────────────────

export async function getResidentBookings(residentId: string): Promise<Booking[]> {
  const { data } = await supabase
    .from("bookings")
    .select("*, facility:facility_id(name, category)")
    .eq("resident_id", residentId)
    .order("booking_date", { ascending: false });
  return (data ?? []) as Booking[];
}

/** Check if a slot is available (no approved/pending booking overlaps) */
export async function checkSlotAvailability(
  facilityId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<boolean> {
  let query = supabase
    .from("bookings")
    .select("id")
    .eq("facility_id", facilityId)
    .eq("booking_date", date)
    .in("status", ["pending", "approved"])
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (excludeBookingId) query = query.neq("id", excludeBookingId);

  const { data } = await query;
  return (data ?? []).length === 0;
}

/** Get all booked slots for a facility on a date */
export async function getBookedSlots(
  facilityId: string,
  date: string
): Promise<{ start_time: string; end_time: string; status: string }[]> {
  const { data } = await supabase
    .from("bookings")
    .select("start_time, end_time, status")
    .eq("facility_id", facilityId)
    .eq("booking_date", date)
    .in("status", ["pending", "approved"]);
  return data ?? [];
}

export async function createBooking(params: {
  societyId: string;
  facilityId: string;
  residentId: string;
  flatNumber?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  guestCount?: number;
  amount: number;
}): Promise<{ success: boolean; error?: string }> {
  // Conflict check
  const available = await checkSlotAvailability(
    params.facilityId,
    params.bookingDate,
    params.startTime,
    params.endTime
  );
  if (!available) return { success: false, error: "This slot is already booked. Please choose another time." };

  const { error } = await supabase.from("bookings").insert({
    society_id: params.societyId,
    facility_id: params.facilityId,
    resident_id: params.residentId,
    flat_number: params.flatNumber ?? null,
    booking_date: params.bookingDate,
    start_time: params.startTime,
    end_time: params.endTime,
    purpose: params.purpose?.trim() || null,
    guest_count: params.guestCount || null,
    amount: params.amount,
    status: "pending",
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function cancelBooking(bookingId: string, residentId: string): Promise<void> {
  await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("resident_id", residentId)
    .in("status", ["pending"]);   // can only cancel pending
}

// ─── RESIDENT INFO (reuse from vms-data pattern) ──────────────

export async function getResidentBasicInfo(
  email: string
): Promise<{ userId: string; flatNumber: string | null; societyId: string } | null> {
  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", email.trim().toLowerCase())
    .single();
  if (!user) return null;

  if (user.role === "tenant") {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("society_id, flat:flat_id(flat_number)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();
    if (!tenant) return null;
    const flat = tenant.flat as unknown as { flat_number: string } | null;
    return { userId: user.id, flatNumber: flat?.flat_number ?? null, societyId: tenant.society_id ?? "" };
  }

  const { data: flat } = await supabase
    .from("flats")
    .select("flat_number, society_id")
    .eq("owner_id", user.id)
    .limit(1)
    .single();
  if (!flat) return null;
  return { userId: user.id, flatNumber: flat.flat_number, societyId: flat.society_id };
}

/** Generate time slots for a facility on a given date */
export function generateTimeSlots(
  facility: Facility,
  bookedSlots: { start_time: string; end_time: string; status: string }[]
): { start: string; end: string; available: boolean }[] {
  const slots: { start: string; end: string; available: boolean }[] = [];
  const [openH, openM] = facility.open_time.split(":").map(Number);
  const [closeH, closeM] = facility.close_time.split(":").map(Number);
  const durationMins = facility.slot_duration_hrs * 60;

  let currentMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;

  while (currentMins + durationMins <= closeMins) {
    const startH = Math.floor(currentMins / 60);
    const startM = currentMins % 60;
    const endMins = currentMins + durationMins;
    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;

    const start = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
    const end = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const isBooked = bookedSlots.some(
      (b) => b.start_time < end && b.end_time > start
    );

    slots.push({ start, end, available: !isBooked });
    currentMins += durationMins;
  }

  return slots;
}
