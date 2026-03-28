"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  getFacilities,
  getResidentBookings,
  getBookedSlots,
  createBooking,
  cancelBooking,
  getResidentBasicInfo,
  generateTimeSlots,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
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

type View = "list" | "book";

export default function ResidentFacilitiesPage() {
  const { user } = useAuth();

  const [residentInfo, setResidentInfo] = useState<{
    userId: string; flatNumber: string | null; societyId: string;
  } | null>(null);

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");

  // Booking wizard state
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [bookDate, setBookDate] = useState("");
  const [slots, setSlots] = useState<{ start: string; end: string; available: boolean }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [purpose, setPurpose] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookSubmitting, setBookSubmitting] = useState(false);

  const loadData = useCallback(async (ri: { userId: string; societyId: string }) => {
    const [f, b] = await Promise.all([
      getFacilities(ri.societyId),
      getResidentBookings(ri.userId),
    ]);
    setFacilities(f.filter((x) => x.is_active));
    setMyBookings(b);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    getResidentBasicInfo(user.email).then((ri) => {
      if (ri) { setResidentInfo(ri); loadData(ri); }
      else setLoading(false);
    });
  }, [user, loadData]);

  // Load time slots when facility + date is chosen
  useEffect(() => {
    if (!selectedFacility || !bookDate) { setSlots([]); setSelectedSlot(null); return; }
    setSlotsLoading(true);
    getBookedSlots(selectedFacility.id, bookDate).then((booked) => {
      const generated = generateTimeSlots(selectedFacility, booked);
      setSlots(generated);
      setSelectedSlot(null);
      setSlotsLoading(false);
    });
  }, [selectedFacility, bookDate]);

  const resetBooking = () => {
    setSelectedFacility(null);
    setBookDate("");
    setSlots([]);
    setSelectedSlot(null);
    setPurpose("");
    setGuestCount("");
    setView("list");
  };

  const handleSubmitBooking = async () => {
    if (!selectedFacility || !bookDate || !selectedSlot || !residentInfo) {
      toast.error("Please select a facility, date, and time slot."); return;
    }
    setBookSubmitting(true);
    const res = await createBooking({
      societyId: residentInfo.societyId,
      facilityId: selectedFacility.id,
      residentId: residentInfo.userId,
      flatNumber: residentInfo.flatNumber ?? undefined,
      bookingDate: bookDate,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      purpose: purpose || undefined,
      guestCount: parseInt(guestCount) || undefined,
      amount: selectedFacility.price_per_slot,
    });
    if (!res.success) { toast.error(res.error ?? "Booking failed."); setBookSubmitting(false); return; }
    toast.success("Booking request submitted! Awaiting admin approval.");
    await loadData(residentInfo);
    resetBooking();
    setBookSubmitting(false);
  };

  const handleCancel = async (bookingId: string) => {
    if (!residentInfo) return;
    await cancelBooking(bookingId, residentInfo.userId);
    toast.success("Booking cancelled.");
    setMyBookings((b) => b.map((x) => x.id === bookingId ? { ...x, status: "cancelled" } : x));
  };

  // Min date = today, max = today + advance_days
  const todayStr = new Date().toISOString().slice(0, 10);
  const maxDate = selectedFacility
    ? new Date(Date.now() + selectedFacility.advance_days * 86400000).toISOString().slice(0, 10)
    : "";

  const pendingCount = myBookings.filter((b) => b.status === "pending").length;
  const approvedCount = myBookings.filter((b) => b.status === "approved").length;

  if (loading) {
    return <div className="text-amber-600 font-bold animate-pulse text-sm py-12 text-center">Loading…</div>;
  }

  if (!residentInfo) {
    return <div className="py-12 text-center text-ink-muted text-sm">No flat assigned to your account.</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">🏛️ Facilities</h1>
          <p className="text-sm text-ink-muted mt-0.5">Book society facilities</p>
        </div>
        {view === "list" && (
          <button
            onClick={() => setView("book")}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-xl cursor-pointer transition-colors"
          >
            + Book Now
          </button>
        )}
      </div>

      {/* ══ VIEW: BOOKING WIZARD ════════════════════════════════ */}
      {view === "book" && (
        <div className="space-y-4">
          <button onClick={resetBooking} className="text-xs text-ink-muted underline cursor-pointer">← Back to my bookings</button>

          {/* Step 1: Choose facility */}
          {!selectedFacility && (
            <div className="space-y-3">
              <p className="font-bold text-ink">Step 1: Choose a Facility</p>
              {facilities.length === 0 && (
                <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
                  <p className="text-ink-muted text-sm">No facilities available right now.</p>
                </div>
              )}
              {facilities.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFacility(f)}
                  className="w-full bg-white border border-border-default hover:border-amber-400 rounded-2xl p-4 text-left transition-colors cursor-pointer shadow-sm hover:shadow-md group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                      {CATEGORY_ICONS[f.category] ?? "🏢"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-ink">{f.name}</p>
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                          {CATEGORY_LABELS[f.category] ?? f.category}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-ink-muted">
                        {f.capacity && <span>👥 {f.capacity} max</span>}
                        <span>🕐 {f.open_time.slice(0,5)}–{f.close_time.slice(0,5)}</span>
                        <span>⏱ {f.slot_duration_hrs}h/slot</span>
                        <span className={f.price_per_slot > 0 ? "font-semibold text-green-700" : ""}>
                          {f.price_per_slot > 0 ? formatCurrency(f.price_per_slot) + "/slot" : "Free"}
                        </span>
                      </div>
                      {f.description && <p className="text-xs text-ink-muted mt-0.5">{f.description}</p>}
                    </div>
                    <span className="text-ink-muted text-lg group-hover:text-amber-500 transition-colors">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Choose date + slot */}
          {selectedFacility && (
            <div className="space-y-4">
              {/* Selected facility summary */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">{CATEGORY_ICONS[selectedFacility.category]}</span>
                <div className="flex-1">
                  <p className="font-bold text-ink text-sm">{selectedFacility.name}</p>
                  <p className="text-xs text-ink-muted">
                    {selectedFacility.slot_duration_hrs}h slots · {selectedFacility.open_time.slice(0,5)}–{selectedFacility.close_time.slice(0,5)}
                    {selectedFacility.price_per_slot > 0 ? ` · ${formatCurrency(selectedFacility.price_per_slot)}/slot` : " · Free"}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedFacility(null); setBookDate(""); setSlots([]); setSelectedSlot(null); }}
                  className="text-xs text-ink-muted underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {selectedFacility.rules && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                  <p className="font-semibold mb-0.5">📋 Booking Rules</p>
                  <p>{selectedFacility.rules}</p>
                </div>
              )}

              {/* Date picker */}
              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">Step 2: Choose Date</label>
                <input
                  type="date"
                  value={bookDate}
                  onChange={(e) => setBookDate(e.target.value)}
                  min={todayStr}
                  max={maxDate}
                  className="w-full border border-border-default rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Time slots */}
              {bookDate && (
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-2">Step 3: Choose Time Slot</label>
                  {slotsLoading ? (
                    <div className="text-amber-600 text-xs animate-pulse">Loading slots…</div>
                  ) : slots.length === 0 ? (
                    <p className="text-xs text-ink-muted">No slots available for this facility.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s.start}
                          disabled={!s.available}
                          onClick={() => setSelectedSlot({ start: s.start, end: s.end })}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                            !s.available
                              ? "bg-red-50 border-red-200 text-red-400 line-through"
                              : selectedSlot?.start === s.start
                              ? "bg-amber-500 border-amber-500 text-white"
                              : "bg-white border-border-default text-ink hover:border-amber-400"
                          }`}
                        >
                          {s.start}–{s.end}
                          {!s.available && <span className="block text-[10px]">Booked</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Details */}
              {selectedSlot && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-ink-muted block mb-1">Purpose</label>
                      <input
                        type="text"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="e.g. Birthday party"
                        className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-muted block mb-1">Expected Guests</label>
                      <input
                        type="number"
                        value={guestCount}
                        onChange={(e) => setGuestCount(e.target.value)}
                        placeholder="e.g. 30"
                        max={selectedFacility.capacity ?? 9999}
                        className="w-full border border-border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* Booking summary */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs space-y-1">
                    <p className="font-bold text-green-700">Booking Summary</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-ink-muted">
                      <div><span className="font-semibold text-ink">Facility</span></div><div>{selectedFacility.name}</div>
                      <div><span className="font-semibold text-ink">Date</span></div><div>{bookDate}</div>
                      <div><span className="font-semibold text-ink">Time</span></div><div>{selectedSlot.start} – {selectedSlot.end}</div>
                      <div><span className="font-semibold text-ink">Amount</span></div>
                      <div className={selectedFacility.price_per_slot > 0 ? "font-bold text-green-700" : ""}>
                        {selectedFacility.price_per_slot > 0 ? formatCurrency(selectedFacility.price_per_slot) : "Free"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitBooking}
                    disabled={bookSubmitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl cursor-pointer transition-colors"
                  >
                    {bookSubmitting ? "Submitting…" : "Submit Booking Request"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ VIEW: MY BOOKINGS ═══════════════════════════════════ */}
      {view === "list" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: myBookings.length, color: "text-ink" },
              { label: "Pending", value: pendingCount, color: "text-amber-600" },
              { label: "Approved", value: approvedCount, color: "text-green-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-border-default rounded-xl p-3 text-center">
                <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                <p className="text-[11px] text-ink-muted">{label}</p>
              </div>
            ))}
          </div>

          {/* Available facilities quick view */}
          {facilities.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-widest">Available Facilities</p>
              <div className="flex gap-2 flex-wrap">
                {facilities.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFacility(f); setView("book"); }}
                    className="flex items-center gap-2 bg-white border border-border-default hover:border-amber-400 rounded-xl px-3 py-2 text-xs font-semibold text-ink cursor-pointer transition-colors"
                  >
                    <span>{CATEGORY_ICONS[f.category]}</span>
                    {f.name}
                    {f.price_per_slot > 0 && <span className="text-green-700">{formatCurrency(f.price_per_slot)}</span>}
                    {f.price_per_slot === 0 && <span className="text-ink-muted">Free</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Booking history */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-widest">My Bookings</p>

            {myBookings.length === 0 && (
              <div className="bg-white rounded-2xl border border-border-default p-8 text-center">
                <div className="text-4xl mb-3">📅</div>
                <p className="font-semibold text-ink">No bookings yet</p>
                <p className="text-xs text-ink-muted mt-1">Tap "Book Now" to reserve a facility.</p>
              </div>
            )}

            {myBookings.map((b) => {
              const fac = b.facility as { name: string; category: string } | null;
              const isPast = b.booking_date < todayStr;
              return (
                <div
                  key={b.id}
                  className={`bg-white border border-border-default rounded-2xl p-4 shadow-sm ${isPast ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">
                      {CATEGORY_ICONS[fac?.category ?? "other"] ?? "🏢"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-ink">{fac?.name ?? "—"}</p>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="text-xs text-ink-muted">
                        {b.booking_date} · {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}
                      </p>
                      {b.purpose && <p className="text-xs text-ink-muted">{b.purpose}</p>}
                      {b.amount > 0 && <p className="text-xs font-semibold text-green-700">{formatCurrency(b.amount)}</p>}
                      {b.admin_note && (
                        <p className="text-xs text-blue-600 mt-0.5">📩 Admin: {b.admin_note}</p>
                      )}
                    </div>
                    {b.status === "pending" && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer flex-shrink-0"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
