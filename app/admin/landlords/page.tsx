"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSocietyId, getSocietyFlats, getSocietyLandlordStats, type AdminFlat } from "@/lib/admin-data";
import { addLandlordBySocietyAdmin } from "@/lib/auth-db";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

type LandlordRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
  admin_user_id: string | null;
  flat?: { flat_number: string; block: string | null } | null;
};

type Credentials = {
  name: string;
  userId: string;
  password: string;
  loginEmail: string;
  flatLabel: string | null;
};

export default function AdminLandlords() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [landlords, setLandlords] = useState<LandlordRow[]>([]);
  const [vacantFlats, setVacantFlats] = useState<AdminFlat[]>([]);
  const [landlordStats, setLandlordStats] = useState<{ count: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    flat_id: "",
  });

  async function loadData(sid: string) {
    // Fetch landlords in this society
    const { data: members } = await supabase
      .from("society_members")
      .select("user_id")
      .eq("society_id", sid)
      .eq("role", "landlord");

    if (members && members.length > 0) {
      const userIds = members.map((m) => m.user_id);
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, phone, email, admin_user_id")
        .in("id", userIds)
        .eq("is_active", true);

      if (users) {
        // Attach their flat info
        const { data: flats } = await supabase
          .from("flats")
          .select("owner_id, flat_number, block")
          .eq("society_id", sid)
          .in("owner_id", userIds);

        const flatMap = new Map<string, { flat_number: string; block: string | null }>();
        (flats ?? []).forEach((f) => {
          if (f.owner_id) flatMap.set(f.owner_id, { flat_number: f.flat_number, block: f.block });
        });

        setLandlords(
          users.map((u) => ({ ...u, flat: flatMap.get(u.id) ?? null }))
        );
      }
    } else {
      setLandlords([]);
    }

    // Fetch vacant flats + landlord stats
    const [allFlats, stats] = await Promise.all([
      getSocietyFlats(sid),
      getSocietyLandlordStats(sid),
    ]);
    setVacantFlats(allFlats.filter((f) => !f.owner_id));
    setLandlordStats(stats);
  }

  useEffect(() => {
    if (!user?.email) return;
    async function init() {
      const sid = await getAdminSocietyId(user!.email);
      setSocietyId(sid);
      if (sid) await loadData(sid);
      setLoading(false);
    }
    init().catch(() => setLoading(false));
  }, [user]);

  async function handleAddLandlord(e: React.FormEvent) {
    e.preventDefault();
    if (!societyId) return;

    // Enforce landlord limit
    if (landlordStats && landlordStats.count >= landlordStats.limit) {
      const need = landlordStats.count - landlordStats.limit + 1;
      toast.error(
        `Your plan allows ${landlordStats.limit} landlords. ${need} more require upgrade. Contact admin to purchase more slots.`,
        { duration: 5000 }
      );
      return;
    }

    setSaving(true);

    const result = await addLandlordBySocietyAdmin({
      full_name: form.full_name,
      phone: form.phone,
      email: form.email || undefined,
      society_id: societyId,
      flat_id: form.flat_id || undefined,
    });

    setSaving(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to add landlord.");
      return;
    }

    const selectedFlat = vacantFlats.find((f) => f.id === form.flat_id);
    const flatLabel = selectedFlat
      ? `${selectedFlat.flat_number}${selectedFlat.block ? ` (${selectedFlat.block})` : ""}`
      : null;

    setCredentials({
      name: form.full_name,
      userId: result.generatedUserId!,
      password: result.generatedPassword!,
      loginEmail: result.loginEmail!,
      flatLabel,
    });

    setForm({ full_name: "", phone: "", email: "", flat_id: "" });
    setShowForm(false);
    await loadData(societyId);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-center" />

      {/* Credentials Modal */}
      {credentials && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setCredentials(null)}
        >
          <div
            className="bg-white rounded-[20px] w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-green-50 rounded-t-[20px] px-5 pt-5 pb-4 border-b border-green-100 text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-base font-extrabold text-green-700">Landlord Created!</div>
              <div className="text-xs text-ink-muted mt-1">Share these login credentials with the landlord</div>
            </div>

            {/* Credentials */}
            <div className="px-5 py-4 space-y-3">
              <div className="bg-warm-50 rounded-xl p-3 border border-border-default">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Name</div>
                <div className="text-sm font-extrabold text-ink">{credentials.name}</div>
              </div>

              {credentials.flatLabel && (
                <div className="bg-warm-50 rounded-xl p-3 border border-border-default">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Flat Assigned</div>
                  <div className="text-sm font-extrabold text-ink">Flat {credentials.flatLabel}</div>
                </div>
              )}

              <div className="bg-brand-50 rounded-xl p-4 border border-brand-200 space-y-3">
                <div className="text-[11px] font-bold text-brand-600 uppercase tracking-widest text-center mb-1">
                  Login Credentials
                </div>

                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">User ID</div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-base font-extrabold text-brand-600 bg-brand-100 px-3 py-1.5 rounded-lg flex-1 text-center tracking-wider">
                      {credentials.userId}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(credentials.userId); toast.success("Copied!"); }}
                      className="text-[10px] text-brand-500 font-bold border border-brand-200 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-brand-50"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Password</div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-base font-extrabold text-ink bg-warm-100 px-3 py-1.5 rounded-lg flex-1 text-center tracking-wider">
                      {credentials.password}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(credentials.password); toast.success("Copied!"); }}
                      className="text-[10px] text-brand-500 font-bold border border-brand-200 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-brand-50"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Login Email</div>
                  <div className="text-xs text-ink-muted text-center break-all">{credentials.loginEmail}</div>
                  <div className="text-[10px] text-ink-muted text-center mt-0.5">
                    Can also login with User ID above
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-[11px] text-yellow-700 text-center">
                Screenshot or note these credentials — they won&apos;t be shown again.
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setCredentials(null)}
                className="w-full py-3 rounded-xl bg-brand-500 text-white text-sm font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">🏠 Landlords</h2>
          {landlordStats && (
            <div className="text-[11px] text-ink-muted mt-0.5">
              <span className={landlordStats.count >= landlordStats.limit ? "text-red-500 font-bold" : ""}>
                {landlordStats.count}
              </span>
              /{landlordStats.limit} slots used
              {landlordStats.count >= landlordStats.limit && (
                <span className="ml-2 text-orange-500 font-semibold">· Plan limit reached</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={!!(landlordStats && landlordStats.count >= landlordStats.limit)}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showForm ? "Cancel" : "+ Add Landlord"}
        </button>
      </div>

      {/* Limit warning */}
      {landlordStats && landlordStats.count >= landlordStats.limit && (
        <div className="bg-orange-50 border border-orange-200 rounded-[14px] p-4 mb-4">
          <div className="text-sm font-bold text-orange-700">Plan limit reached</div>
          <div className="text-xs text-orange-600 mt-1">
            Your plan allows {landlordStats.limit} landlords.{" "}
            <b>Contact admin to purchase more slots.</b>
          </div>
        </div>
      )}

      {/* Add Landlord Form */}
      {showForm && (
        <form
          onSubmit={handleAddLandlord}
          className="bg-white rounded-[14px] p-4 border border-brand-200 mb-4 space-y-3"
        >
          <div className="text-sm font-bold text-ink mb-1">New Landlord</div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Full Name *</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Rajesh Kumar"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Phone *</label>
              <input
                required
                className={inputClass}
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Email (optional)</label>
              <input
                type="email"
                className={inputClass}
                placeholder="landlord@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Assign Flat (optional)</label>
            <select
              className={inputClass}
              value={form.flat_id}
              onChange={(e) => setForm((f) => ({ ...f, flat_id: e.target.value }))}
            >
              <option value="">— Select a vacant flat —</option>
              {vacantFlats.map((flat) => (
                <option key={flat.id} value={flat.id}>
                  Flat {flat.flat_number}
                  {flat.block ? ` (Block ${flat.block})` : ""}
                  {flat.flat_type ? ` · ${flat.flat_type}` : ""}
                </option>
              ))}
            </select>
            {vacantFlats.length === 0 && (
              <div className="text-[10px] text-ink-muted mt-1">
                No vacant flats available. Add flats first.
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-700">
            A User ID and password will be auto-generated and shown after creation.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Landlord & Get Credentials"}
          </button>
        </form>
      )}

      {/* Landlord List */}
      {landlords.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm bg-white rounded-[14px] border border-dashed border-border-default">
          <div className="text-3xl mb-2">🏠</div>
          <div className="font-semibold">No landlords yet</div>
          <div className="text-xs mt-1">Add landlords using the button above</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {landlords.map((landlord) => (
            <div
              key={landlord.id}
              className="bg-white rounded-[14px] border border-border-default p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-sm font-extrabold text-brand-600 flex-shrink-0">
                  {landlord.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-extrabold text-ink">{landlord.full_name}</div>
                  {landlord.phone && (
                    <div className="text-xs text-ink-muted mt-0.5">📞 {landlord.phone}</div>
                  )}
                  {landlord.admin_user_id && (
                    <div className="text-[10px] text-brand-500 font-semibold mt-1">
                      ID: {landlord.admin_user_id}
                    </div>
                  )}
                  {landlord.flat && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-green-50 border border-green-100 rounded-full px-2.5 py-0.5">
                      <span className="text-[10px] text-green-700 font-semibold">
                        Flat {landlord.flat.flat_number}
                        {landlord.flat.block ? ` · Block ${landlord.flat.block}` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
