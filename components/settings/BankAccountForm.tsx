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
  razorpay_contact_id: string | null;
  razorpay_fund_account_id: string | null;
  is_verified: boolean;
  updated_at: string;
};

type Props = {
  entityType: "society" | "landlord";
  entityId: string;
  userId: string;
};

export default function BankAccountForm({ entityType, entityId, userId }: Props) {
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    account_holder_name: "",
    account_number: "",
    confirm_account_number: "",
    ifsc_code: "",
    account_type: "savings" as "savings" | "current",
    pan_number: "",
    gst_number: "",
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
    if (form.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_number.toUpperCase())) {
      toast.error("Invalid PAN format (e.g. ABCDE1234F)"); return;
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
            pan_number: form.pan_number.toUpperCase() || undefined,
            gst_number: form.gst_number || undefined,
          },
        }),
      });

      const data = await res.json() as { success: boolean; error?: string };
      if (!data.success) throw new Error(data.error ?? "Save failed");

      toast.success("Bank account linked successfully! Payments will be auto-transferred.");
      // Refresh
      const refreshed = await fetch(`/api/razorpay-route?entityType=${entityType}&entityId=${entityId}`).then(r => r.json()) as { success: boolean; account: BankAccount | null };
      if (refreshed.success && refreshed.account) setAccount(refreshed.account);
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link bank account");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-4 text-center text-[11px] text-ink-muted">Loading bank account...</div>;
  }

  // Linked account view
  if (account && !editing) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <span className="text-green-500 text-lg mt-0.5">✓</span>
          <div className="flex-1">
            <div className="text-[12px] font-bold text-green-700">Bank Account Linked</div>
            <div className="text-[11px] text-green-600 mt-0.5">
              Payments automatically transfer ho jaate hain is account mein.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Row label="Account Holder" value={account.account_holder_name} />
          <Row label="Account Number" value={account.account_number_masked} mono />
          <Row label="IFSC" value={account.ifsc_code} mono />
          <Row label="Account Type" value={account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)} />
          {account.pan_number && <Row label="PAN" value={account.pan_number} mono />}
          {account.razorpay_fund_account_id && (
            <Row label="Razorpay Fund A/C" value={account.razorpay_fund_account_id} mono small />
          )}
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-700">
          <strong>Note:</strong> Account change karne se pehle Razorpay verification process hoti hai.
          Galat details se payments fail ho sakti hain.
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
          <strong>Ek baar setup karein:</strong> Aapka bank account Razorpay Route se link ho jaayega.
          Jab bhi tenant payment kare, amount automatically aapke account mein transfer ho jaayega.
          Aapko khud Razorpay account nahi chahiye.
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">
          Account Holder Name <span className="text-red-400">*</span>
        </label>
        <input
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
          <p className="text-[9px] text-red-500 mt-1">Account numbers don't match</p>
        )}
      </div>

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">
          IFSC Code <span className="text-red-400">*</span>
        </label>
        <input
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
          PAN Number <span className="text-ink-muted font-normal">(optional, recommended)</span>
        </label>
        <input
          value={form.pan_number}
          onChange={e => setForm(f => ({ ...f, pan_number: e.target.value.toUpperCase().slice(0, 10) }))}
          placeholder="ABCDE1234F"
          className="w-full px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-white focus:outline-none focus:border-amber-400 font-mono uppercase"
        />
        <p className="text-[9px] text-ink-muted mt-1">TDS compliance ke liye required hai ₹50,000+ transfers pe</p>
      </div>

      <div>
        <label className="text-[10px] font-bold text-ink-muted block mb-1">
          GST Number <span className="text-ink-muted font-normal">(optional)</span>
        </label>
        <input
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
