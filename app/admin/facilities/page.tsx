"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSocietyId } from "@/lib/admin-data";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import {
  getFacilities,
  getAllBookings,
  getPendingBookings,
  getBookingsByMonth,
  createFacility,
  toggleFacilityActive,
  deleteFacility,
  reviewBooking,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type Facility,
  type Booking,
} from "@/lib/facilities-data";

// ─── STATUS BADGE ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-700",
    approved:  "bg-green-100 text-green-700",
    rejected:  "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

type Tab = "facilities" | "approvals" | "calendar" | "all_bookings";

export default function AdminFacilitiesPage() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("approvals");
  const [loading, setLoading] = useState(true);

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [pending, setPending] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [calBookings, setCalBookings] = useState<Booking[]>([]);
  const [calMonth, setCalMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Add facility form
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [fForm, setFForm] = useState({
    name: "", category: "hall", description: "", capacity: "",
    price_per_slot: "0", slot_duration_hrs: "2",
    open_time: "08:00", close_time: "22:00", advance_days: "30", rules: "",
  });
  const [fSubmitting, setFSubmitting] = useState(false);

  // Review modal
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadAll = useCallback(async (sid: string) => {
    const [f, p, ab] = await Promise.all([
      getFacilities(sid),
      getPendingBookings(sid),
      getAllBookings(sid),
    ]);
    setFacilities(f);
    setPending(p);
    setAllBookings(ab);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    supabase.from("users").select("id").eq("email", user.email).single().then(({ data: u }) => {
      if (u) setAdminId(u.id);
    });
    getAdminSocietyId(user.email).then((sid) => {
      if (sid) { setSocietyId(sid); loadAll(sid); }
      else setLoading(false);
    });
  }, [user, loadAll]);

  useEffect(() => {
    if (societyId && tab === "calendar") {
      getBookingsByMonth(societyId, calMonth).then(setCalBookings);
    }
  }, [societyId, tab, calMonth]);

  const handleCreateFacility = async () => {
    if (!fForm.name.trim() || !societyId) { toast.error("Facility name is required."); return; }
    setFSubmitting(true);
    const res = await createFacility({
      societyId,
      name: fForm.name, category: fForm.category, description: fForm.description,
      capacity: parseInt(fForm.capacity) || undefined,
      price_per_slot: parseFloat(fForm.price_per_slot) || 0,
      slot_duration_hrs: parseInt(fForm.slot_duration_hrs) || 2,
      open_time: fForm.open_time, close_time: fForm.close_time,
      advance_days: parseInt(fForm.advance_days) || 30,
      rules: fForm.rules,
    });
    if (!res.success) { toast.error(res.error ?? "Failed."); setFSubmitting(false); return; }
    toast.success("Facility created!");
    setShowFacilityForm(false);
    setFForm({ name: "", category: "hall", description: "", capacity: "", price_per_slot: "0", slot_duration_hrs: "2", open_time: "08:00", close_time: "22:00", advance_days: "30", rules: "" });
    await loadAll(societyId);
    setFSubmitting(false);
  };

  const handleToggle = async (id: string, current: boolean) => {
    await toggleFacilityActive(id, !current);
    setFacilities((f) => f.map((x) => x.id === id ? { ...x, is_active: !current } : x));
    toast.success(current ? "Facility disabled." : "Facility enabled.");
  };

  const handleDelete = async (id: string) => {
    await deleteFacility(id);
    setFacilities((f) => f.filter((x) => x.id !== id));
    toast.success("Facility deleted.");
  };

  const handleReview = async (approve: boolean) => {
    if (!reviewingId || !adminId || !societyId) return;
    setReviewSubmitting(true);
    const res = await reviewBooking(reviewingId, adminId, approve, reviewNote);
    if (!res.success) { toast.error(res.error ?? "Failed."); setReviewSubmitting(false); return; }
    toast.success(approve ? "Booking approved!" : "Booking rejected.");
    setReviewingId(null); setReviewNote("");
    await loadAll(societyId);
    setReviewSubmitting(false);
  };

  // Calendar: build day grid for the month
  const calDays = (() => {
    const [year, month] = calMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const lastDate = new Date(year, month, 0).getDate();
    return { firstDay, lastDate, year, month };
  })();

  const bookingsByDate = calBookings.reduce((acc, b) => {
    const d = b.booking_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(b);
    return acc;
  }, {} as Record<string, Booking[]>);

  const stats = {
    facilities: facilities.filter((f) => f.is_active).length,
    pending: pending.length,
    thisMonth: allBookings.filter((b) => b.booking_date.startsWith(new Date().toISOString().slice(0, 7))).length,
    approved: allBookings.filter((b) => b.status === "approved").length,
  };

  if (loading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-2xl animate-pulse" />)}</div>;
  }

  const reviewingBooking = pending.find((b) => b.id === reviewingId) ?? allBookings.find((b) => b.id === reviewingId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink">🏛️ Facility Booking</h1>
        <p className="text-sm text-ink-muted mt-0.5">Manage facilities and resident booking requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Facilities", value: stats.facilities, color: "text-ink" },
          { label: "Pending", value: stats.pending, color: "text-amber-600" },
          { label: "This Month", value: stats.thisMonth, color: "text-blue-600" },
          { label: "Total Approved", value: stats.approved, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-border-default rounded-xl p-3 text-center">
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-warm-100 rounded-xl p-1 border border-border-default">
        {([
          { key: "approvals", label: `Approvals${pending.length > 0 ? ` (${pending.length})` : ""}` },
          { key: "calendar",  label: "Calendar" },
          { key: "facilities",label: "Facilities" },
          { key: "all_bookings", label: "All Bookings" },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === key ? "bg-amber-600 text-white shadow" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══ TAB: APPROVALS ══════════════════════════════════════ */}
      {tab === "approvals" && (
        <div className="space-y-4">
          {pending.length === 0 && (
            <div className="bg-white rounded-2xl border border-border-default p-10 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-ink">No pending bookings</p>
              <p className="text-xs text-ink-muted mt-1">All requests have been reviewed.</p>
            </div>
          )}

          {/* Review note panel */}
          {reviewingId && reviewingBooking && (
            <div className="bg-white border border-amber-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <p className="font-bold text-sm text-ink">
                Reviewing: {(reviewingBooking.facility as { name: string } | null)?.name ?? "—"} · {reviewingBooking.booking_date}
              </p>
              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">Note to resident (optional)</label>
                <input
                  type="text"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="e.g. Approved. Please return keys by 11pm."
                  className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(true)}
                  disabled={reviewSubmitting}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer text-sm"
                >
                  {reviewSubmitting ? "…" : "✓ Approve"}
                </button>
                <button
                  onClick={() => handleReview(false)}
                  disabled={reviewSubmitting}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer text-sm"
                >
                  {reviewSubmitting ? "…" : "✗ Reject"}
                </button>
                <button
                  onClick={() => { setReviewingId(null); setReviewNote(""); }}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {pending.map((b) => {
            const fac = b.facility as { name: string; category: string } | null;
            const res = b.resident as { full_name: string; phone: string | null } | null;
            return (
              <div key={b.id} className="bg-white border border-border-default rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl">{CATEGORY_ICONS[fac?.category ?? "other"] ?? "🏢"}</span>
                      <p className="font-bold text-ink">{fac?.name ?? "—"}</p>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Requested by {res?.full_name ?? "—"}{b.flat_number ? ` · Flat ${b.flat_number}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-ink-muted flex-shrink-0">{new Date(b.created_at).toLocaleDateString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-warm-50 rounded-xl p-3 text-xs text-ink-muted">
                  <div><span className="font-semibold text-ink block">Date</span>{b.booking_date}</div>
                  <div><span className="font-semibold text-ink block">Time</span>{b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}</div>
                  {b.purpose && <div><span className="font-semibold text-ink block">Purpose</span>{b.purpose}</div>}
                  {b.guest_count && <div><span className="font-semibold text-ink block">Guests</span>{b.guest_count}</div>}
                  {b.amount > 0 && <div><span className="font-semibold text-ink block">Amount</span>{formatCurrency(b.amount)}</div>}
                </div>

                {reviewingId !== b.id && (
                  <button
                    onClick={() => { setReviewingId(b.id); setReviewNote(""); }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl cursor-pointer text-sm transition-colors"
                  >
                    Review Booking
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ TAB: CALENDAR ═══════════════════════════════════════ */}
      {tab === "calendar" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-ink-muted">Month:</label>
            <input
              type="month"
              value={calMonth}
              onChange={(e) => setCalMonth(e.target.value)}
              className="border border-border-default rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <span className="text-xs text-ink-muted">{calBookings.length} booking{calBookings.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Day-of-week headers */}
          <div className="bg-white border border-border-default rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-7 bg-amber-50 border-b border-border-default">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} className="text-center py-2 text-xs font-bold text-ink-muted">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {/* Blank cells before first day */}
              {Array.from({ length: calDays.firstDay }).map((_, i) => (
                <div key={`blank-${i}`} className="h-16 border-r border-b border-border-light" />
              ))}
              {/* Day cells */}
              {Array.from({ length: calDays.lastDate }, (_, i) => i + 1).map((day) => {
                const dateStr = `${calDays.year}-${String(calDays.month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const dayBookings = bookingsByDate[dateStr] ?? [];
                const isToday = dateStr === new Date().toISOString().slice(0,10);
                return (
                  <div
                    key={day}
                    className={`h-16 border-r border-b border-border-light p-1 overflow-hidden ${
                      isToday ? "bg-amber-50" : ""
                    }`}
                  >
                    <p className={`text-xs font-bold mb-0.5 ${isToday ? "text-amber-600" : "text-ink-muted"}`}>{day}</p>
                    {dayBookings.slice(0, 2).map((b) => {
                      const fac = b.facility as { name: string; category: string } | null;
                      const color = b.status === "approved" ? "bg-green-200 text-green-800" : b.status === "rejected" ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800";
                      return (
                        <div key={b.id} className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate mb-0.5 ${color}`}>
                          {b.start_time.slice(0,5)} {fac?.name ?? "—"}
                        </div>
                      );
                    })}
                    {dayBookings.length > 2 && (
                      <p className="text-[9px] text-ink-muted">+{dayBookings.length - 2} more</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* List below calendar */}
          {calBookings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-widest">All bookings this month</p>
              {calBookings.map((b) => {
                const fac = b.facility as { name: string } | null;
                const res = b.resident as { full_name: string } | null;
                return (
                  <div key={b.id} className="bg-white border border-border-default rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-ink">{fac?.name}</p>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="text-xs text-ink-muted">
                        {b.booking_date} · {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)} · {res?.full_name ?? "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: FACILITIES ═════════════════════════════════════ */}
      {tab === "facilities" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowFacilityForm(!showFacilityForm)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
          >
            + Add Facility
          </button>

          {showFacilityForm && (
            <div className="bg-white border border-amber-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <p className="font-bold text-ink text-sm">New Facility</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Facility Name *</label>
                  <input
                    type="text"
                    value={fForm.name}
                    onChange={(e) => setFForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Banquet Hall, Guest Room 1"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Category</label>
                  <select
                    value={fForm.category}
                    onChange={(e) => setFForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Capacity</label>
                  <input
                    type="number"
                    value={fForm.capacity}
                    onChange={(e) => setFForm((f) => ({ ...f, capacity: e.target.value }))}
                    placeholder="e.g. 100"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Price / Slot (₹)</label>
                  <input
                    type="number"
                    value={fForm.price_per_slot}
                    onChange={(e) => setFForm((f) => ({ ...f, price_per_slot: e.target.value }))}
                    placeholder="0 = free"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Slot Duration (hrs)</label>
                  <input
                    type="number"
                    value={fForm.slot_duration_hrs}
                    onChange={(e) => setFForm((f) => ({ ...f, slot_duration_hrs: e.target.value }))}
                    min="1" max="12"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Opens</label>
                  <input
                    type="time"
                    value={fForm.open_time}
                    onChange={(e) => setFForm((f) => ({ ...f, open_time: e.target.value }))}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Closes</label>
                  <input
                    type="time"
                    value={fForm.close_time}
                    onChange={(e) => setFForm((f) => ({ ...f, close_time: e.target.value }))}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Description</label>
                  <input
                    type="text"
                    value={fForm.description}
                    onChange={(e) => setFForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description"
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Booking Rules</label>
                  <textarea
                    value={fForm.rules}
                    onChange={(e) => setFForm((f) => ({ ...f, rules: e.target.value }))}
                    placeholder="e.g. No loud music after 10pm. Return key to security."
                    rows={2}
                    className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateFacility}
                  disabled={fSubmitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer text-sm"
                >
                  {fSubmitting ? "Creating…" : "Create Facility"}
                </button>
                <button onClick={() => setShowFacilityForm(false)} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer text-sm">Cancel</button>
              </div>
            </div>
          )}

          {facilities.length === 0 && !showFacilityForm && (
            <div className="bg-white rounded-2xl border border-border-default p-10 text-center">
              <div className="text-4xl mb-3">🏛️</div>
              <p className="text-ink-muted text-sm">No facilities added yet.</p>
            </div>
          )}

          {facilities.map((f) => (
            <div key={f.id} className={`bg-white border border-border-default rounded-2xl p-4 shadow-sm ${!f.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {CATEGORY_ICONS[f.category] ?? "🏢"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-ink">{f.name}</p>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{CATEGORY_LABELS[f.category] ?? f.category}</span>
                    {!f.is_active && <span className="text-[10px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Disabled</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-ink-muted">
                    {f.capacity && <span>👥 {f.capacity} max</span>}
                    <span>🕐 {f.open_time.slice(0,5)}–{f.close_time.slice(0,5)}</span>
                    <span>⏱ {f.slot_duration_hrs}h slots</span>
                    <span className={f.price_per_slot > 0 ? "text-green-700 font-semibold" : "text-ink-muted"}>
                      {f.price_per_slot > 0 ? formatCurrency(f.price_per_slot) + "/slot" : "Free"}
                    </span>
                  </div>
                  {f.description && <p className="text-xs text-ink-muted mt-0.5">{f.description}</p>}
                  {f.rules && <p className="text-xs text-amber-700 mt-0.5">📋 {f.rules}</p>}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(f.id, f.is_active)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer ${
                      f.is_active ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-green-50 hover:bg-green-100 text-green-700"
                    }`}
                  >
                    {f.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ TAB: ALL BOOKINGS ═══════════════════════════════════ */}
      {tab === "all_bookings" && (
        <div className="space-y-2">
          {allBookings.length === 0 && (
            <div className="bg-white rounded-2xl border border-border-default p-10 text-center">
              <p className="text-ink-muted text-sm">No bookings yet.</p>
            </div>
          )}
          {allBookings.map((b) => {
            const fac = b.facility as { name: string; category: string } | null;
            const res = b.resident as { full_name: string } | null;
            return (
              <div key={b.id} className="bg-white border border-border-default rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{CATEGORY_ICONS[fac?.category ?? "other"]}</span>
                      <p className="font-semibold text-sm text-ink">{fac?.name}</p>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-xs text-ink-muted">
                      {b.booking_date} · {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {res?.full_name ?? "—"}{b.flat_number ? ` · Flat ${b.flat_number}` : ""}
                      {b.purpose ? ` · ${b.purpose}` : ""}
                    </p>
                    {b.admin_note && <p className="text-xs text-blue-600 mt-0.5">Admin: {b.admin_note}</p>}
                  </div>
                  {b.amount > 0 && <span className="font-bold text-sm text-ink flex-shrink-0">{formatCurrency(b.amount)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
