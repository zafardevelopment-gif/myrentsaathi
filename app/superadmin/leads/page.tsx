"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import toast, { Toaster } from "react-hot-toast";
import {
  type Lead,
  type LeadStatus,
  type LeadType,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  fetchLeads,
  createLead,
  updateLeadStatus,
  deleteLead,
} from "@/lib/leads-data";

// ── Pre-filled outreach templates (professional Hinglish, no pilot offer) ────
function societyMessage(l: Lead): string {
  const who = l.contactPerson ? l.contactPerson : "Sir/Ma'am";
  const soc = l.name || "your society";
  return `Namaste ${who},

Main Zafar, AIVEXA LLP se. Hum MyRentSaathi banate hain — Indian housing societies ke liye ek WhatsApp-native management platform.

${soc} jaisi societies ise iske liye use karti hain:
• Maintenance collection online (UPI links WhatsApp par, auto reminders + receipts)
• Defaulters ka automatic tracking
• Expense accounting + CA-ready reports
• Online AGM voting, complaints, notices, visitor management

Sabse badi baat: residents ko koi app download nahi karna padta — sab WhatsApp par chalta hai, isliye adoption easy hota hai.

Kya main aapko 10-minute ka ek quick demo dikha sakta hoon? Aap jab free hon bata dijiye.

Dhanyavaad,
Zafar · AIVEXA LLP
https://www.myrentsaathi.com`;
}

function landlordMessage(l: Lead): string {
  const who = l.contactPerson ? l.contactPerson : "Sir/Ma'am";
  return `Namaste ${who},

Main Zafar, AIVEXA LLP se — hum MyRentSaathi banate hain, Indian landlords ke liye rent collection software.

Agar aap rent har mahine WhatsApp par manually chase karte hain, to MyRentSaathi ye automate kar deta hai:
• UPI payment link tenant ko WhatsApp par (due date par auto)
• Payment aate hi receipt auto-generate
• Paid / pending / overdue ek dashboard par
• Tenant ko koi app install nahi karna padta

Rent agreements, tenant documents aur tax-ready income reports bhi ismein hain — NRI landlords bhi ise remotely use karte hain.

Kya main aapko chhota demo dikha doon? Bata dijiye kab convenient hai.

Dhanyavaad,
Zafar · AIVEXA LLP
https://www.myrentsaathi.com`;
}

function messageFor(l: Lead): string {
  return l.type === "landlord" ? landlordMessage(l) : societyMessage(l);
}

function waLink(l: Lead): string {
  const phone = l.phone.replace(/[^0-9]/g, "");
  const withCc = phone.length === 10 ? `91${phone}` : phone;
  return `https://wa.me/${withCc}?text=${encodeURIComponent(messageFor(l))}`;
}

function mailLink(l: Lead): string {
  const subject =
    l.type === "landlord"
      ? "Stop chasing rent manually — MyRentSaathi"
      : "WhatsApp-native society management — MyRentSaathi";
  return `mailto:${l.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageFor(l))}`;
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}

function dueForFollowUp(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() <= Date.now();
}

const EMPTY = {
  name: "", type: "society" as LeadType, contactPerson: "",
  phone: "", email: "", city: "", source: "", notes: "",
};

const DAILY_GOAL = 5;

export default function SuperAdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | LeadStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | LeadType>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setLeads(await fetchLeads()); }
    catch { toast.error("Failed to load leads"); }
    finally { setLoading(false); }
  }

  const stats = useMemo(() => {
    const total = leads.length;
    const contactedToday = leads.filter((l) => isToday(l.lastContactedAt)).length;
    const followUpsDue = leads.filter(
      (l) => dueForFollowUp(l.followUpAt) && l.status !== "won" && l.status !== "lost",
    ).length;
    const won = leads.filter((l) => l.status === "won").length;
    return { total, contactedToday, followUpsDue, won };
  }, [leads]);

  const visible = useMemo(
    () =>
      leads.filter(
        (l) =>
          (filter === "all" || l.status === filter) &&
          (typeFilter === "all" || l.type === typeFilter),
      ),
    [leads, filter, typeFilter],
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const lead = await createLead(form);
      setLeads((p) => [lead, ...p]);
      setForm(EMPTY);
      setShowForm(false);
      toast.success("Lead added");
    } catch { toast.error("Could not add lead"); }
    finally { setSaving(false); }
  }

  async function changeStatus(id: string, status: LeadStatus) {
    setLeads((p) =>
      p.map((l) =>
        l.id === id
          ? { ...l, status, lastContactedAt: status !== "new" ? new Date().toISOString() : l.lastContactedAt }
          : l,
      ),
    );
    try { await updateLeadStatus(id, status); }
    catch { toast.error("Status update failed"); load(); }
  }

  async function remove(id: string) {
    setLeads((p) => p.filter((l) => l.id !== id));
    try { await deleteLead(id); toast.success("Lead removed"); }
    catch { toast.error("Delete failed"); load(); }
  }

  function markContacted(l: Lead) {
    if (l.status === "new") changeStatus(l.id, "contacted");
  }

  return (
    <div className="p-5 max-w-[1200px] mx-auto">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-ink">Outreach CRM</h1>
          <p className="text-[13px] text-ink-muted">
            Add leads, message 5 a day, and track every conversation to a customer.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-[14px] hover:bg-brand-600"
        >
          {showForm ? "Close" : "+ Add lead"}
        </button>
      </div>

      {/* Daily goal nudge */}
      <div className="mt-3 mb-4 rounded-[12px] bg-warm-50 border border-border-default px-4 py-2.5 text-[13px]">
        <strong>Today&apos;s goal:</strong> reach out to {DAILY_GOAL} new leads.{" "}
        Contacted today: <strong className={stats.contactedToday >= DAILY_GOAL ? "text-forest-600" : "text-brand-600"}>
          {stats.contactedToday}/{DAILY_GOAL}
        </strong>
        {stats.followUpsDue > 0 && (
          <> · <strong className="text-brand-600">{stats.followUpsDue}</strong> follow-up(s) due</>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-5">
        <StatCard icon="📇" label="Total leads" value={String(stats.total)} />
        <StatCard icon="✅" label="Contacted today" value={`${stats.contactedToday}/${DAILY_GOAL}`} accent="text-forest-600" />
        <StatCard icon="⏰" label="Follow-ups due" value={String(stats.followUpsDue)} accent="text-brand-600" />
        <StatCard icon="🎉" label="Won" value={String(stats.won)} accent="text-forest-600" />
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-[14px] border border-border-default p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input required placeholder="Name (society / landlord)*" className="border border-border-default rounded-lg px-3 py-2 text-[14px]"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="border border-border-default rounded-lg px-3 py-2 text-[14px]"
            value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LeadType })}>
            <option value="society">Society / RWA</option>
            <option value="landlord">Landlord</option>
            <option value="other">Other</option>
          </select>
          <input placeholder="Contact person" className="border border-border-default rounded-lg px-3 py-2 text-[14px]"
            value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <input placeholder="Phone (WhatsApp)" className="border border-border-default rounded-lg px-3 py-2 text-[14px]"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" className="border border-border-default rounded-lg px-3 py-2 text-[14px]"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="City" className="border border-border-default rounded-lg px-3 py-2 text-[14px]"
            value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input placeholder="Source (Justdial, Maps, FB group...)" className="border border-border-default rounded-lg px-3 py-2 text-[14px]"
            value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <input placeholder="Notes" className="border border-border-default rounded-lg px-3 py-2 text-[14px] sm:col-span-2"
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button disabled={saving} type="submit"
            className="px-4 py-2 rounded-lg bg-brand-500 text-white font-bold text-[14px] hover:bg-brand-600 disabled:opacity-60">
            {saving ? "Saving..." : "Save lead"}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3 text-[13px]">
        <select className="border border-border-default rounded-lg px-2 py-1.5" value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | LeadType)}>
          <option value="all">All types</option>
          <option value="society">Societies</option>
          <option value="landlord">Landlords</option>
          <option value="other">Other</option>
        </select>
        <select className="border border-border-default rounded-lg px-2 py-1.5" value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | LeadStatus)}>
          <option value="all">All statuses</option>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-border-default overflow-x-auto">
        <table className="w-full text-[13px] min-w-[820px]">
          <thead>
            <tr className="text-left text-ink-muted border-b border-border-default">
              <th className="px-3 py-2 font-semibold">Lead</th>
              <th className="px-3 py-2 font-semibold">Contact</th>
              <th className="px-3 py-2 font-semibold">Source</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Reach out</th>
              <th className="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-muted">Loading…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-muted">
                No leads yet. Click &quot;+ Add lead&quot; to start. Aim for 5 new outreach messages a day.
              </td></tr>
            ) : visible.map((l) => (
              <tr key={l.id} className="border-b border-border-light align-top">
                <td className="px-3 py-2.5">
                  <div className="font-bold text-ink">{l.name}</div>
                  <div className="text-[11px] text-ink-muted">
                    {l.type} {l.city ? `· ${l.city}` : ""} {l.contactPerson ? `· ${l.contactPerson}` : ""}
                  </div>
                  {l.notes && <div className="text-[11px] text-ink/50 mt-0.5">{l.notes}</div>}
                </td>
                <td className="px-3 py-2.5 text-[12px]">
                  {l.phone && <div>{l.phone}</div>}
                  {l.email && <div className="text-ink-muted">{l.email}</div>}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-ink-muted">{l.source || "—"}</td>
                <td className="px-3 py-2.5">
                  <select
                    className="border border-border-default rounded-lg px-2 py-1 text-[12px]"
                    value={l.status}
                    onChange={(e) => changeStatus(l.id, e.target.value as LeadStatus)}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1.5">
                    {l.phone && (
                      <a href={waLink(l)} target="_blank" rel="noopener noreferrer" onClick={() => markContacted(l)}
                        className="px-2.5 py-1 rounded-lg bg-forest-500 text-white text-[12px] font-bold hover:opacity-90">
                        WhatsApp
                      </a>
                    )}
                    {l.email && (
                      <a href={mailLink(l)} onClick={() => markContacted(l)}
                        className="px-2.5 py-1 rounded-lg bg-brand-500 text-white text-[12px] font-bold hover:bg-brand-600">
                        Email
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => remove(l.id)} className="text-ink-muted hover:text-red-600 text-[12px]">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-ink-muted mt-3">
        Tip: The WhatsApp / Email buttons open a ready-made message tailored to the lead type — just review and send.
        Find leads on Justdial (&quot;housing societies in &lt;city&gt;&quot;), Google Maps, and local landlord/RWA Facebook &amp; WhatsApp groups.
      </p>
    </div>
  );
}
