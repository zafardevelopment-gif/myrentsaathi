"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordFlats, getLandlordUserId, type LandlordFlat } from "@/lib/landlord-data";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";

const TEMPLATES = [
  {
    label: "💰 Rent Reminder",
    text: "Dear [Name], this is a friendly reminder that your monthly rent is due. Please make the payment at the earliest to avoid any inconvenience. Thank you.",
  },
  {
    label: "📢 General Notice",
    text: "Dear [Name], we have an important update for all residents. Please check the notice board or contact your landlord for details. Thank you.",
  },
  {
    label: "🔧 Maintenance Alert",
    text: "Dear [Name], please note that maintenance work will be carried out at the property. We apologize for any inconvenience caused. Thank you for your cooperation.",
  },
];

type TenantEntry = {
  flatId: string;
  flatLabel: string;
  name: string;
  phone: string;
  rent: number | null;
};

export default function WhatsAppBroadcastPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantEntry[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function loadData() {
    if (!user?.email) return;
    const [flats, lid] = await Promise.all([
      getLandlordFlats(user.email).catch(() => [] as LandlordFlat[]),
      getLandlordUserId(user.email),
    ]);
    setLandlordId(lid);
    const entries: TenantEntry[] = flats
      .filter(f => f.current_tenant_id && f.tenant?.user?.phone)
      .map(f => ({
        flatId: f.id,
        flatLabel: `Flat ${f.flat_number}${f.block ? ` (${f.block})` : ""}`,
        name: f.tenant!.user!.full_name,
        phone: f.tenant!.user!.phone,
        rent: f.monthly_rent,
      }));
    setTenants(entries);
  }

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [user]);

  function personalizedMessage(name: string) {
    return message.replace(/\[Name\]/g, name);
  }

  function cleanPhone(phone: string) {
    const digits = phone.replace(/[^0-9]/g, "");
    // Add India country code if not present
    return digits.startsWith("91") ? digits : `91${digits}`;
  }

  async function sendToOne(t: TenantEntry) {
    if (!message.trim()) { toast.error("Please write a message first."); return; }
    const msg = personalizedMessage(t.name);
    const url = `https://wa.me/${cleanPhone(t.phone)}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    if (landlordId) {
      await supabase.from("whatsapp_logs").insert({
        sent_by: landlordId,
        recipient_phone: t.phone,
        recipient_name: t.name,
        message: msg,
      });
    }
    toast.success(`WhatsApp opened for ${t.name}`);
  }

  async function sendToAll() {
    if (!message.trim()) { toast.error("Please write a message first."); return; }
    if (tenants.length === 0) { toast.error("No tenants with phone numbers found."); return; }
    setSending(true);
    const logs = tenants.map(t => ({
      sent_by: landlordId!,
      recipient_phone: t.phone,
      recipient_name: t.name,
      message: personalizedMessage(t.name),
    }));
    tenants.forEach((t, i) => {
      setTimeout(() => {
        const msg = personalizedMessage(t.name);
        const url = `https://wa.me/${cleanPhone(t.phone)}?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank");
      }, i * 900);
    });
    if (landlordId) {
      await supabase.from("whatsapp_logs").insert(logs);
    }
    toast.success(`Sending to ${tenants.length} tenants...`);
    setSending(false);
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  return (
    <div>
      <Toaster position="top-center" />
      <h2 className="text-[15px] font-extrabold text-ink mb-4">💬 WhatsApp Broadcast</h2>

      <div className="bg-yellow-50 border border-yellow-200 rounded-[14px] px-4 py-3 mb-4 text-xs text-yellow-800">
        ⚠️ Your browser may block multiple popups. If "Send to All" doesn't work, allow popups for this site in browser settings.
      </div>

      {/* Message composer */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4 space-y-3">
        <div className="text-sm font-bold text-ink">Compose Message</div>
        <div className="flex gap-2 flex-wrap">
          {TEMPLATES.map(t => (
            <button key={t.label} onClick={() => setMessage(t.text)} className="px-3 py-1.5 rounded-xl border border-border-default text-xs font-semibold text-ink hover:bg-warm-50 cursor-pointer">
              {t.label}
            </button>
          ))}
        </div>
        <textarea
          className={inputClass + " resize-none"}
          rows={4}
          placeholder="Type your message here... Use [Name] as placeholder for tenant name."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <div className="text-[10px] text-ink-muted">Tip: Use <span className="font-mono bg-warm-100 px-1 rounded">[Name]</span> — it will be replaced with each tenant's name.</div>
        <button
          onClick={sendToAll}
          disabled={sending || tenants.length === 0}
          className="w-full py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          {sending ? "Opening WhatsApp..." : `📤 Send to All (${tenants.length} tenants)`}
        </button>
      </div>

      {/* Tenant list */}
      {tenants.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No tenants with phone numbers found.</div>
      ) : (
        <>
          <h3 className="text-[13px] font-extrabold text-ink mb-3">Tenants</h3>
          {tenants.map(t => (
            <div key={t.flatId} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
              <div>
                <div className="text-sm font-bold text-ink">{t.name}</div>
                <div className="text-xs text-ink-muted mt-0.5">{t.flatLabel}{t.rent ? ` · ${formatCurrency(t.rent)}/mo` : ""}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">{t.phone}</div>
              </div>
              <button
                onClick={() => sendToOne(t)}
                className="px-3 py-1.5 rounded-xl bg-green-600 text-white text-xs font-bold cursor-pointer flex-shrink-0 flex items-center gap-1"
              >
                <span>💬</span> Send
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
