"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordFlats, getLandlordUserId, type LandlordFlat } from "@/lib/landlord-data";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { sendRentHikeNotice } from "@/lib/whatsapp";
import { emailRentHikeNotice } from "@/lib/email";
import toast, { Toaster } from "react-hot-toast";

type HikeHistory = {
  id: string;
  flat_id: string;
  old_rent: number;
  new_rent: number;
  hike_type: string;
  hike_value: number;
  effective_date: string;
  created_at: string;
  status: "scheduled" | "applied" | "cancelled";
  recurrence_frequency: "monthly" | "quarterly" | "half_yearly" | "yearly" | null;
};

const FREQUENCY_LABEL: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly", half_yearly: "Half-Yearly", yearly: "Yearly",
};

const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

export default function RentHikePage() {
  const { user } = useAuth();
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [history, setHistory] = useState<HikeHistory[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [hikeType, setHikeType] = useState<"percentage" | "fixed">("percentage");
  const [hikeValue, setHikeValue] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "half_yearly" | "yearly">("yearly");

  const occupiedFlats = flats.filter(f => f.current_tenant_id && f.monthly_rent);
  const selectedFlat = occupiedFlats.find(f => f.id === selectedFlatId);
  const currentRent = selectedFlat?.monthly_rent ?? 0;
  const newRent = hikeType === "percentage"
    ? Math.round(currentRent * (1 + Number(hikeValue) / 100))
    : Math.round(currentRent + Number(hikeValue));

  async function loadData() {
    if (!user?.email) return;
    const [f, lid] = await Promise.all([
      getLandlordFlats(user.email).catch(() => [] as LandlordFlat[]),
      getLandlordUserId(user.email),
    ]);
    setFlats(f);
    setLandlordId(lid);

    if (f.length > 0) {
      const flatIds = f.map(fl => fl.id);
      const { data } = await supabase
        .from("rent_hike_history")
        .select("*")
        .in("flat_id", flatIds)
        .order("created_at", { ascending: false });
      setHistory(data ?? []);
    }
  }

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [user]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlat || !landlordId || !hikeValue || newRent <= currentRent) {
      toast.error("Please fill all fields. New rent must be higher than current rent.");
      return;
    }
    setSaving(true);
    try {
      // 1. Insert history
      const { data: histRow, error: histErr } = await supabase.from("rent_hike_history").insert({
        flat_id: selectedFlatId,
        old_rent: currentRent,
        new_rent: newRent,
        hike_type: hikeType,
        hike_value: Number(hikeValue),
        effective_date: effectiveDate,
        created_by: landlordId,
        recurrence_frequency: recurring ? frequency : null,
      }).select("id").single();
      if (histErr) throw histErr;

      // 1b. If recurring, schedule the next occurrence off the new rent
      if (recurring && histRow) {
        const monthsToAdd = { monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12 }[frequency];
        const nextDate = new Date(effectiveDate + "T00:00:00Z");
        nextDate.setUTCMonth(nextDate.getUTCMonth() + monthsToAdd);
        const nextNewRent = hikeType === "percentage"
          ? Math.round(newRent * (1 + Number(hikeValue) / 100))
          : Math.round(newRent + Number(hikeValue));
        await supabase.from("rent_hike_history").insert({
          flat_id: selectedFlatId,
          old_rent: newRent,
          new_rent: nextNewRent,
          hike_type: hikeType,
          hike_value: Number(hikeValue),
          effective_date: nextDate.toISOString().slice(0, 10),
          created_by: landlordId,
          status: "scheduled",
          recurrence_frequency: frequency,
          recurrence_parent_id: histRow.id,
        });
      }

      // 2. Update flat rent
      const { error: flatErr } = await supabase
        .from("flats")
        .update({ monthly_rent: newRent })
        .eq("id", selectedFlatId);
      if (flatErr) throw flatErr;

      // 3. Send notice to tenant
      const flatLabel = `${selectedFlat.flat_number}${selectedFlat.block ? ` (${selectedFlat.block})` : ""}`;
      await supabase.from("notices").insert({
        created_by: landlordId,
        ...(selectedFlat.society_id ? { society_id: selectedFlat.society_id } : {}),
        flat_id: selectedFlatId,
        title: `Rent Hike Notice — Flat ${flatLabel}`,
        content: `Dear Tenant, please note that your monthly rent will increase from ${formatCurrency(currentRent)} to ${formatCurrency(newRent)} effective ${new Date(effectiveDate).toLocaleDateString("en-IN")}. Please plan accordingly.`,
        notice_type: "financial",
        target_audience: "tenants",
      });

      // 4. WhatsApp + Email notification to tenant (fire-and-forget)
      const tenantPhone = selectedFlat.tenant?.user?.phone ?? "";
      const tenantEmail = selectedFlat.tenant?.user?.email ?? "";
      const tenantName = selectedFlat.tenant?.user?.full_name ?? "Tenant";
      const flatLabel2 = `${selectedFlat.flat_number}${selectedFlat.block ? ` (${selectedFlat.block})` : ""}`;
      const effectiveDateStr = new Date(effectiveDate).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      });
      if (tenantPhone) {
        sendRentHikeNotice({
          phone: tenantPhone,
          fullName: tenantName,
          flatNumber: flatLabel2,
          currentRent,
          newRent,
          effectiveFrom: effectiveDateStr,
        }).catch(() => {});
      }
      if (tenantEmail) {
        emailRentHikeNotice({
          to: tenantEmail,
          tenantName,
          flatNumber: flatLabel2,
          currentRent,
          newRent,
          effectiveFrom: effectiveDateStr,
        }).catch(() => {});
      }

      toast.success("Rent updated and notice sent to tenant!");
      setHikeValue("");
      setSelectedFlatId("");
      setRecurring(false);
      setFrequency("yearly");
      await loadData();
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to apply rent hike");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelScheduled(id: string) {
    const { error } = await supabase.from("rent_hike_history").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast.error("Failed to cancel scheduled hike"); return; }
    toast.success("Scheduled rent hike cancelled");
    await loadData();
  }

  const flatLabel = (f: LandlordFlat) =>
    `Flat ${f.flat_number}${f.block ? ` (${f.block})` : ""} — ${f.tenant?.user?.full_name ?? "Tenant"}`;

  const historyFlatMap = Object.fromEntries(flats.map(f => [f.id, f]));

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  return (
    <div>
      <Toaster position="top-center" />
      <h2 className="text-[15px] font-extrabold text-ink mb-4">📈 Rent Hike Management</h2>

      {occupiedFlats.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No occupied flats found.</div>
      ) : (
        <form onSubmit={handleApply} className="bg-white rounded-[14px] p-4 border border-border-default mb-5 space-y-4">
          <div className="text-sm font-bold text-ink">Apply Rent Increase</div>

          <div>
            <label className={labelClass}>Select Flat *</label>
            <select required className={inputClass} value={selectedFlatId} onChange={e => setSelectedFlatId(e.target.value)}>
              <option value="">— Choose a flat —</option>
              {occupiedFlats.map(f => <option key={f.id} value={f.id}>{flatLabel(f)}</option>)}
            </select>
          </div>

          {selectedFlat && (
            <div className="bg-warm-50 rounded-xl px-3 py-2 text-xs text-ink-muted flex gap-4">
              <span>Current Rent: <span className="font-bold text-ink">{formatCurrency(currentRent)}</span></span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Hike Type</label>
              <select className={inputClass} value={hikeType} onChange={e => setHikeType(e.target.value as "percentage" | "fixed")}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{hikeType === "percentage" ? "Increase %" : "Increase ₹"} *</label>
              <input required type="number" min="1" className={inputClass} placeholder={hikeType === "percentage" ? "e.g. 10" : "e.g. 500"} value={hikeValue} onChange={e => setHikeValue(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Effective Date *</label>
            <input required type="date" className={inputClass} value={effectiveDate} onClick={e => e.currentTarget.showPicker?.()} onChange={e => setEffectiveDate(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} className="w-4 h-4" />
            <span className="text-[11px] font-semibold text-ink">Repeat this hike automatically</span>
          </label>
          {recurring && (
            <div>
              <label className={labelClass}>Repeat Every *</label>
              <select className={inputClass} value={frequency} onChange={e => setFrequency(e.target.value as typeof frequency)}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (3 months)</option>
                <option value="half_yearly">Half-Yearly (6 months)</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          {selectedFlat && hikeValue && Number(hikeValue) > 0 && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <div className="text-[10px] text-green-700 font-semibold uppercase tracking-wide mb-1">New Rent Preview</div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-ink-muted line-through">{formatCurrency(currentRent)}</span>
                <span className="text-lg font-extrabold text-green-700">{formatCurrency(newRent)}</span>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                  +{hikeType === "percentage" ? `${hikeValue}%` : formatCurrency(Number(hikeValue))}
                </span>
              </div>
              <div className="text-[10px] text-ink-muted mt-1">Effective from {new Date(effectiveDate).toLocaleDateString("en-IN")}</div>
            </div>
          )}

          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {saving ? "Applying..." : "Apply Rent Hike & Notify Tenant"}
          </button>
        </form>
      )}

      {history.filter(h => h.status !== "cancelled").length > 0 && (
        <>
          <h3 className="text-[13px] font-extrabold text-ink mb-3">History</h3>
          {history.filter(h => h.status !== "cancelled").map(h => {
            const f = historyFlatMap[h.flat_id];
            return (
              <div key={h.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-ink">
                      {f ? `Flat ${f.flat_number}${f.block ? ` (${f.block})` : ""}` : "Flat"}
                    </div>
                    {h.status === "scheduled" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        Scheduled — effective {new Date(h.effective_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                    {h.recurrence_frequency && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        🔁 {FREQUENCY_LABEL[h.recurrence_frequency]}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {formatCurrency(h.old_rent)} → {formatCurrency(h.new_rent)}
                    {" · "}
                    <span className="text-green-600 font-semibold">
                      +{h.hike_type === "percentage" ? `${h.hike_value}%` : formatCurrency(h.hike_value)}
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-muted mt-0.5">Effective {new Date(h.effective_date).toLocaleDateString("en-IN")}</div>
                </div>
                {h.status === "scheduled" && (
                  <button onClick={() => handleCancelScheduled(h.id)} className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 text-[10px] font-semibold cursor-pointer hover:bg-red-50 flex-shrink-0">Cancel</button>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
