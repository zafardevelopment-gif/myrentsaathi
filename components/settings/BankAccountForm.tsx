"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

type BankAccount = {
  account_holder_name: string;
  account_number_masked: string;
  ifsc_code: string;
  account_type: string;
  pan_number: string | null;
  gst_number: string | null;
  business_type?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  razorpay_linked_account_id: string | null;
  route_status?: string | null;
  route_error?: string | null;
  is_verified: boolean;
  updated_at: string;
};

type Props = {
  entityType: "society" | "landlord";
  entityId: string;
  userId: string;
  defaultEmail?: string;
  defaultPhone?: string;
};

const INDIAN_STATES = [
  "ANDHRA PRADESH", "ARUNACHAL PRADESH", "ASSAM", "BIHAR", "CHHATTISGARH", "GOA", "GUJARAT",
  "HARYANA", "HIMACHAL PRADESH", "JHARKHAND", "KARNATAKA", "KERALA", "MADHYA PRADESH",
  "MAHARASHTRA", "MANIPUR", "MEGHALAYA", "MIZORAM", "NAGALAND", "ODISHA", "PUNJAB",
  "RAJASTHAN", "SIKKIM", "TAMIL NADU", "TELANGANA", "TRIPURA", "UTTAR PRADESH",
  "UTTARAKHAND", "WEST BENGAL", "DELHI", "JAMMU AND KASHMIR", "LADAKH", "PUDUCHERRY",
  "CHANDIGARH", "ANDAMAN AND NICOBAR ISLANDS", "DADRA AND NAGAR HAVELI AND DAMAN AND DIU", "LAKSHADWEEP",
];

const LANDLORD_BIZ_TYPES = [
  { v: "individual", l: "Individual" },
  { v: "proprietorship", l: "Proprietorship" },
];
const SOCIETY_BIZ_TYPES = [
  { v: "society", l: "Society" },
  { v: "trust", l: "Trust" },
  { v: "ngo", l: "NGO" },
  { v: "partnership", l: "Partnership" },
  { v: "private_limited", l: "Private Limited" },
];

export default function BankAccountForm({ entityType, entityId, userId, defaultEmail, defaultPhone }: Props) {
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const bizTypes = entityType === "landlord" ? LANDLORD_BIZ_TYPES : SOCIETY_BIZ_TYPES;

  const [form, setForm] = useState({
    account_holder_name: "",
    account_number: "",
    confirm_account_number: "",
    ifsc_code: "",
    account_type: "savings" as "savings" | "current",
    pan_number: "",
    gst_number: "",
    business_type: bizTypes[0].v,
    contact_email: defaultEmail ?? "",
    contact_phone: defaultPhone ?? "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_postal_code: "",
  });

  const [ifscInfo, setIfscInfo] = useState<{ bank: string; branch: string } | null>(null);
  const [fetchingIfsc, setFetchingIfsc] = useState(false);

  useEffect(() => {
    fetch(`/api/razorpay-route?entityType=${entityType}&entityId=${entityId}`)
      .then(r => r.json())
      .then((res: { success: boolean; account: BankAccount | null }) => {
        if (res.success && res.account) setAccount(res.account);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [entityType, entityId]);

  async function lookupIfsc(ifsc: string) {
    if (ifsc.length !== 11) { setIfscInfo(null); return; }
    setFetchingIfsc(true);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
      if (res.ok) {
        const data = await res.json() as { BANK: string; BRANCH: string };
        setIfscInfo({ bank: data.BANK, branch: data.BRANCH });
      } else {
        setIfscInfo(null);
      }
    } catch {
      setIfscInfo(null);
    } finally {
      setFetchingIfsc(false);
    }
  }

  async function handleSave() {
    if (!form.account_holder_name.trim()) { toast.error("Account holder name required"); return; }
    if (!form.account_number.trim()) { toast.error("Account number required"); return; }
    if (form.account_number !== form.confirm_account_number) { toast.error("Account numbers don't match"); return; }
    if (form.ifsc_code.length !== 11) { toast.error("Valid 11-character IFSC required"); return; }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_number.toUpperCase())) {
      toast.error("Valid PAN required (e.g. ABCDE1234F)"); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) { toast.error("Valid email required"); return; }
    if (form.contact_phone.replace(/\D/g, "").length < 10) { toast.error("Valid 10-digit phone required"); return; }
    if (!form.address_street.trim() || !form.address_city.trim() || !form.address_state || form.address_postal_code.length !== 6) {
      toast.error("Complete address (street, city, state, 6-digit PIN) required"); return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/razorpay-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          userId,
          bank: {
            account_holder_name: form.account_holder_name,
            account_number: form.account_number,
            ifsc_code: form.ifsc_code.toUpperCase(),
            account_type: form.account_type,
            pan_number: form.pan_number.toUpperCase(),
            gst_number: form.gst_number || undefined,
            business_type: form.business_type,
            contact_email: form.contact_email,
            contact_phone: form.contact_phone,
            address_street: form.address_street,
            address_city: form.address_city,
            address_state: form.address_state,
            address_postal_code: form.address_postal_code,
          },
        }),
      });

      const data = await res.json() as { success: boolean; error?: string; warning?: string; routeStatus?: string };
      if (!data.success) throw new Error(data.error ?? "Save failed");

      if (data.warning) toast(`Linked, but: ${data.warning}`, { icon: "⚠️", duration: 6000 });
      else if (data.routeStatus === "activated") toast.success("Bank account linked & activated!");
      else toast.success("Bank account linked. Razorpay is verifying it.");
      // Refresh
      const refreshed = await fetch(`/api/razorpay-route?entityType=${entityType}&entityId=${entityId}`).then(r => r.json()) as { success: boolean; account: BankAccount | null };
      if (refreshed.success && refreshed.account) setAccount(refreshed.account);
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link bank account", { duration: 6000 });
      // The bank row is still persisted (with a failed/partial status) — refresh
      // so the saved account + retry option shows instead of leaving a blank form.
      try {
        const refreshed = await fetch(`/api/razorpay-route?entityType=${entityType}&entityId=${entityId}`).then(r => r.json()) as { success: boolean; account: BankAccount | null };
        if (refreshed.success && refreshed.account) { setAccount(refreshed.account); setEditing(false); }
      } catch { /* ignore */ }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-4 text-center text-[11px] text-ink-muted">Loading bank account...</div>;
  }

  // Linked account view
  if (account && !editing) {
    const status = account.route_status ?? (account.is_verified ? "created" : "pending");
    const statusUi: Record<string, { bg: string; border: string; text: string; label: string; sub: string }> = {
      activated: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", label: "✓ Bank Account Linked & Active", sub: "Payments are auto-transferred to this account." },
      created: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", label: "⏳ Linked — Razorpay verifying", sub: "Transfers activate once Razorpay completes verification." },
      needs_clarification: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "⚠️ Needs clarification", sub: "Razorpay needs more info. Check your Razorpay dashboard." },
      failed: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "✗ Linking failed", sub: account.route_error ?? "Please update and retry." },
      pending: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", label: "Pending", sub: "Not yet linked." },
    };
    const ui = statusUi[status] ?? statusUi.pending;
    return (
      <div className="space-y-3">
        <div className={`p-3 ${ui.bg} border ${ui.border} rounded-xl`}>
          <div className={`text-[12px] font-bold ${ui.text}`}>{ui.label}</div>
          <div className={`text-[11px] ${ui.text} opacity-80 mt-0.5`}>{ui.sub}</div>
        </div>

        <div className="space-y-2">
          <Row label="Account Holder" value={account.account_holder_name} />
          <Row label="Account Number" value={account.account_number_masked} mono />
          <Row label="IFSC" value={account.ifsc_code} mono />
          <Row label="Account Type" value={account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)} />
          {account.pan_number && <Row label="PAN" value={account.pan_number} mono />}
          {account.razorpay_linked_account_id && (
            <Row label="Razorpay Linked A/C" value={account.razorpay_linked_account_id} mono small />
          )}
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-700">
          <strong>Note:</strong> Changing the account triggers a fresh Razorpay verification.
          Incorrect details can cause payments to fail.
        </div>

        <button
          onClick={() => {
            setForm({
              account_holder_name: account.account_holder_name,
              account_number: "",
              confirm_account_number: "",
              ifsc_code: account.ifsc_code,
              account_type: (account.account_type as "savings" | "current"),
              pan_number: account.pan_number ?? "",
              gst_number: account.gst_number ?? "",
              business_type: account.business_type ?? bizTypes[0].v,
              contact_email: account.contact_email ?? defaultEmail ?? "",
              contact_phone: account.contact_phone ?? defaultPhone ?? "",
              address_street: account.address_street ?? "",
              address_city: account.address_city ?? "",
              address_state: account.address_state ?? "",
              address_postal_code: account.address_postal_code ?? "",
            });
            setEditing(true);
          }}
          className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50"
        >
          Update Account
        </button>
      </div>
    );
  }

  // Form
  return (
    <div className="space-y-3 pt-1">
      {!account && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-700">
          <strong>Set up once:</strong> Your bank account gets linked via Razorpay Route.
          Whenever a tenant pays, the amount is automatically transferred to your account.
          You don&apos;t need your own Razorpay account.
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">
          Account Holder Name <span className="text-red-400">*</span>
        </label>
        <input
          autoComplete="off"
          value={form.account_holder_name}
          onChange={e => setForm(f => ({ ...f, account_holder_name: e.target.value }))}
          placeholder="As per bank records"
          className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">
          Account Type <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          {(["savings", "current"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm(f => ({ ...f, account_type: t }))}
              className={`flex-1 py-2 rounded-xl border text-[11px] font-semibold transition-colors cursor-pointer ${
                form.account_type === t
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-border-default text-ink-muted hover:bg-warm-50"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">
          Account Number <span className="text-red-400">*</span>
        </label>
        <input
          type="password"
          autoComplete="off"
          value={form.account_number}
          onChange={e => setForm(f => ({ ...f, account_number: e.target.value.replace(/\D/g, "") }))}
          placeholder="Enter account number"
          className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400 font-mono"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">
          Confirm Account Number <span className="text-red-400">*</span>
        </label>
        <input
          autoComplete="off"
          value={form.confirm_account_number}
          onChange={e => setForm(f => ({ ...f, confirm_account_number: e.target.value.replace(/\D/g, "") }))}
          placeholder="Re-enter account number"
          className={`w-full px-3 py-2 rounded-xl border text-[12px] text-ink bg-white focus:outline-none font-mono ${
            form.confirm_account_number && form.account_number !== form.confirm_account_number
              ? "border-red-400 focus:border-red-400"
              : "border-border-default focus:border-amber-400"
          }`}
        />
        {form.confirm_account_number && form.account_number !== form.confirm_account_number && (
          <p className="text-[9px] text-red-500 mt-1">Account numbers don&apos;t match</p>
        )}
      </div>

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">
          IFSC Code <span className="text-red-400">*</span>
        </label>
        <input
          autoComplete="off"
          value={form.ifsc_code}
          onChange={e => {
            const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
            setForm(f => ({ ...f, ifsc_code: v }));
            lookupIfsc(v);
          }}
          placeholder="SBIN0001234"
          className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400 font-mono uppercase"
        />
        {fetchingIfsc && <p className="text-[9px] text-ink-muted mt-1">Verifying IFSC...</p>}
        {ifscInfo && (
          <p className="text-[9px] text-green-600 mt-1 font-semibold">
            ✓ {ifscInfo.bank} — {ifscInfo.branch}
          </p>
        )}
        {form.ifsc_code.length === 11 && !fetchingIfsc && !ifscInfo && (
          <p className="text-[9px] text-red-500 mt-1">Invalid IFSC code</p>
        )}
      </div>

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">
          PAN Number <span className="text-red-400">*</span>
        </label>
        <input
          autoComplete="off"
          value={form.pan_number}
          onChange={e => setForm(f => ({ ...f, pan_number: e.target.value.toUpperCase().slice(0, 10) }))}
          placeholder="ABCDE1234F"
          className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400 font-mono uppercase"
        />
        <p className="text-[9px] text-ink-muted mt-1">Required by Razorpay for KYC verification.</p>
      </div>

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">
          {entityType === "landlord" ? "Account Type (KYC)" : "Organization Type"} <span className="text-red-400">*</span>
        </label>
        <select
          autoComplete="off"
          value={form.business_type}
          onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400"
        >
          {bizTypes.map(b => <option key={b.v} value={b.v}>{b.l}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold text-ink-muted block mb-1">Email <span className="text-red-400">*</span></label>
          <input
            type="email"
            autoComplete="off"
            value={form.contact_email}
            onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-ink-muted block mb-1">Phone <span className="text-red-400">*</span></label>
          <input
            autoComplete="off"
            value={form.contact_phone}
            onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
            placeholder="9000090000"
            className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">Address (Street) <span className="text-red-400">*</span></label>
        <input
          autoComplete="off"
          value={form.address_street}
          onChange={e => setForm(f => ({ ...f, address_street: e.target.value }))}
          placeholder="Building, street, area"
          className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold text-ink-muted block mb-1">City <span className="text-red-400">*</span></label>
          <input
            autoComplete="off"
            value={form.address_city}
            onChange={e => setForm(f => ({ ...f, address_city: e.target.value }))}
            placeholder="Bengaluru"
            className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-ink-muted block mb-1">State <span className="text-red-400">*</span></label>
          <select
            autoComplete="off"
            value={form.address_state}
            onChange={e => setForm(f => ({ ...f, address_state: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-border-default text-[11px] text-ink bg-white focus:outline-none focus:border-amber-400"
          >
            <option value="">Select</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-ink-muted block mb-1">PIN <span className="text-red-400">*</span></label>
          <input
            autoComplete="off"
            value={form.address_postal_code}
            onChange={e => setForm(f => ({ ...f, address_postal_code: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
            placeholder="560034"
            className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">
          GST Number <span className="text-ink-muted font-normal">(optional)</span>
        </label>
        <input
          autoComplete="off"
          value={form.gst_number}
          onChange={e => setForm(f => ({ ...f, gst_number: e.target.value.toUpperCase().slice(0, 15) }))}
          placeholder="22AAAAA0000A1Z5"
          className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400 font-mono uppercase"
        />
      </div>

      <div className="p-3 bg-gray-50 border border-border-light rounded-xl text-[9px] text-ink-muted leading-relaxed">
        🔒 Your bank details are securely stored and shared only with Razorpay for payment processing.
        MyRentSaathi never stores your full account number.
      </div>

      <div className="flex gap-2 pt-1">
        <button
          disabled={saving}
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-600 disabled:opacity-60 transition-colors"
        >
          {saving ? "Linking Account..." : "Link Bank Account"}
        </button>
        {account && (
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-ink-muted flex-shrink-0">{label}</span>
      <span className={`text-right ${small ? "text-[9px]" : "text-[11px]"} font-semibold text-ink ${mono ? "font-mono" : ""} truncate`}>
        {value}
      </span>
    </div>
  );
}
