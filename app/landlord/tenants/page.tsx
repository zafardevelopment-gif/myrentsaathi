"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordFlats, getLandlordAgreements, getLandlordUserId, type LandlordFlat, type LandlordAgreement } from "@/lib/landlord-data";
import { getLandlordTenantStats } from "@/lib/admin-data";
import { addTenant, updateTenant } from "@/lib/auth-db";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import ReceiptModal from "@/components/tenant/ReceiptModal";
import { sendWelcomeMessage } from "@/lib/whatsapp";
import {
  TIER_LABEL as TIER_LABEL_AG, fmtDate as fmtDateAg, durationMonths as durationMonthsAg,
  printAgreementPdf,
} from "@/lib/agreement-pdf";

type TenantDetail = {
  id: string;
  user_id: string;
  flat_id: string;
  landlord_id: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  status: string;
  aadhaar_encrypted: string | null;
  pan_number: string | null;
  emergency_contact: string | null;
  emergency_name: string | null;
  late_fee_type?: "percentage" | "fixed" | null;
  late_fee_value?: number | null;
};

function lateFeeLabel(type?: "percentage" | "fixed" | null, value?: number | null): string {
  if (!type || !value) return "—";
  return type === "percentage" ? `${value}% / day` : `${formatCurrency(value)} / day`;
}

type TenantModalTab = "payments" | "agreement" | "documents" | "complaints";
type RentPayment = { id: string; amount: number; month_year: string; status: string; payment_date: string | null; payment_method: string | null };
type Document = { id: string; title?: string; file_name: string; file_url: string; file_size?: number | null; category?: string; created_at: string };
type Complaint = { id: string; subject: string; category: string; priority: string; status: string; created_at: string };

type BulkTenantRowResult = { flat_number: string; block: string; tenant_name: string; status: "created" | "updated" | "error"; error?: string };

function parseTenantCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const cells: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cells.push(cur.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (cells[i] ?? "").replace(/^"|"$/g, ""); });
    return row;
  });
}

function BulkTenantResultsModal({ results, onClose }: { results: BulkTenantRowResult[]; onClose: () => void }) {
  const created = results.filter(r => r.status === "created").length;
  const updated = results.filter(r => r.status === "updated").length;
  const errors = results.filter(r => r.status === "error").length;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4 border-b border-border-default">
          <div className="text-base font-extrabold text-ink">📊 Import Results</div>
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            <span className="text-green-700 font-bold">✅ {created} created</span>
            {updated > 0 && <span className="text-blue-700 font-bold">🔄 {updated} updated</span>}
            {errors > 0 && <span className="text-red-600 font-bold">❌ {errors} errors</span>}
          </div>
        </div>
        <div className="px-5 py-3 max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-warm-50">
              <tr>
                <th className="py-1 text-left font-bold text-ink-muted">Flat</th>
                <th className="py-1 text-left font-bold text-ink-muted">Tenant</th>
                <th className="py-1 text-left font-bold text-ink-muted">Status</th>
                <th className="py-1 text-left font-bold text-ink-muted">Detail</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-border-light">
                  <td className="py-1 font-semibold">{r.flat_number}{r.block ? ` (${r.block})` : ""}</td>
                  <td className="py-1">{r.tenant_name || "—"}</td>
                  <td className="py-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.status === "created" ? "bg-green-100 text-green-700" : r.status === "updated" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-600"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-1 text-ink-muted">{r.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── helpers shared with agreements page ────────────────────

const STATUS_BADGE_AG: Record<string, string> = {
  active:     "bg-green-100 text-green-700 border-green-200",
  expired:    "bg-gray-100 text-gray-500 border-gray-200",
  pending:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  terminated: "bg-red-100 text-red-600 border-red-200",
};

function printAgreementDoc(ag: LandlordAgreement) {
  const flat = ag.flat as { flat_number: string; block: string | null; floor_number?: number | null; flat_type?: string | null; area_sqft?: number | null } | null;
  const society = ag.society as { name: string; city: string; address?: string | null } | null;
  const tenant = ag.tenant?.user as { full_name: string; phone?: string | null; email?: string | null } | null;
  const landlord = ag.landlord as { full_name?: string; phone?: string; email?: string } | null;

  try {
    printAgreementPdf({
      ...ag,
      flat,
      society,
      tenantContact: tenant,
      landlordContact: landlord,
    });
  } catch {
    alert("Pop-up blocked. Allow pop-ups and try again.");
  }
}

function AgreementModal({ flat, agreement, onClose }: { flat: LandlordFlat; agreement: LandlordAgreement | null; onClose: () => void }) {
  if (!agreement) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-[18px] w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <div className="text-base font-extrabold text-ink">📄 Agreement</div>
            <button onClick={onClose} className="text-ink-muted text-lg cursor-pointer">✕</button>
          </div>
          <div className="text-center py-8 text-ink-muted text-sm">No agreement found for this tenant.</div>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Close</button>
        </div>
      </div>
    );
  }

  const agFlat     = agreement.flat as { flat_number: string; block: string | null; floor_number?: number | null; flat_type?: string | null; area_sqft?: number | null } | null;
  const society    = agreement.society as { name: string; city: string; address?: string | null } | null;
  const tenant     = agreement.tenant?.user as { full_name: string; phone?: string | null; email?: string | null } | null;
  const landlord   = agreement.landlord as { full_name?: string; phone?: string; email?: string } | null;
  const months     = agreement.start_date && agreement.end_date ? durationMonthsAg(agreement.start_date, agreement.end_date) : null;
  const flatLabel  = agFlat ? `${agFlat.flat_number}${agFlat.block ? ` (${agFlat.block})` : ""}` : flat.flat_number;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-3 md:p-6" onClick={onClose}>
      <div className="bg-white rounded-[20px] w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-[20px] border-b border-border-default px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-lg">📄</div>
            <div>
              <div className="text-sm font-extrabold text-ink">Rental Agreement</div>
              <div className="text-[10px] text-ink-muted">#{agreement.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_BADGE_AG[agreement.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
              {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
            </span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-ink-muted hover:bg-warm-50 cursor-pointer text-lg">✕</button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Parties */}
          <div>
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Parties</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-100 rounded-[14px] p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-xs font-extrabold text-green-800">
                    {landlord?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "L"}
                  </div>
                  <div className="text-[9px] font-bold text-green-700 uppercase tracking-wider">Landlord</div>
                </div>
                <div className="text-sm font-extrabold text-ink">{landlord?.full_name ?? "—"}</div>
                {landlord?.phone && <div className="text-[10px] text-ink-muted mt-0.5">📞 {landlord.phone}</div>}
                {landlord?.email && <div className="text-[10px] text-ink-muted truncate">✉️ {landlord.email}</div>}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-[14px] p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-xs font-extrabold text-blue-800">
                    {tenant?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "T"}
                  </div>
                  <div className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Tenant</div>
                </div>
                <div className="text-sm font-extrabold text-ink">{tenant?.full_name ?? "—"}</div>
                {tenant?.phone && <div className="text-[10px] text-ink-muted mt-0.5">📞 {tenant.phone}</div>}
                {tenant?.email && <div className="text-[10px] text-ink-muted truncate">✉️ {tenant.email}</div>}
              </div>
            </div>
          </div>

          {/* Property */}
          <div>
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Property</div>
            <div className="bg-warm-50 rounded-[14px] border border-border-default p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-xl">🏠</div>
                <div>
                  <div className="text-sm font-extrabold text-ink">Flat {flatLabel}</div>
                  <div className="text-[11px] text-ink-muted">
                    {society ? `${society.name}, ${society.city}` : "Independent Property"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Type",  value: agFlat?.flat_type ?? "—" },
                  { label: "Floor", value: agFlat?.floor_number != null ? `Floor ${agFlat.floor_number}` : "—" },
                  { label: "Area",  value: agFlat?.area_sqft ? `${agFlat.area_sqft} sq.ft` : "—" },
                ].map(d => (
                  <div key={d.label} className="bg-white rounded-xl p-2 text-center border border-border-default">
                    <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                    <div className="text-xs font-bold text-ink mt-0.5">{d.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Financial Terms */}
          <div>
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Financial Terms</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Monthly Rent",     value: formatCurrency(agreement.monthly_rent),                           highlight: true },
                { label: "Security Deposit", value: agreement.security_deposit ? formatCurrency(agreement.security_deposit) : "—", highlight: false },
                { label: "Start Date",       value: fmtDateAg(agreement.start_date),                                  highlight: false },
                { label: "End Date",         value: fmtDateAg(agreement.end_date),                                    highlight: false },
                { label: "Duration",         value: months ? `${months} months` : "—",                                highlight: false },
                { label: "Total Value",      value: months ? formatCurrency(agreement.monthly_rent * months) : "—",   highlight: false },
                { label: "Late Fee",         value: lateFeeLabel(agreement.late_fee_type, agreement.late_fee_value), highlight: false },
              ].map(d => (
                <div key={d.label} className={`rounded-[12px] p-3 border ${d.highlight ? "bg-brand-50 border-brand-200" : "bg-warm-50 border-border-default"}`}>
                  <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                  <div className={`text-sm font-extrabold mt-0.5 ${d.highlight ? "text-brand-600" : "text-ink"}`}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-xl bg-warm-100 border border-border-default text-[11px] font-semibold text-ink-muted">
              Type: {TIER_LABEL_AG[agreement.tier] ?? agreement.tier}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-warm-100 border border-border-default text-[11px] font-semibold text-ink-muted">
              Created: {fmtDateAg(agreement.created_at)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white rounded-b-[20px] border-t border-border-default px-5 py-3.5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer hover:bg-warm-200 transition-colors">
            Close
          </button>
          <button onClick={() => printAgreementDoc(agreement)}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer hover:bg-brand-600 transition-colors flex items-center justify-center gap-1.5">
            ⬇ Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LandlordTenants() {
  const { user } = useAuth();
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [agreements, setAgreements] = useState<LandlordAgreement[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Add tenant form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    flat_id: "", monthly_rent: "", security_deposit: "",
    lease_start: "", lease_end: "",
    late_fee_type: "percentage" as "percentage" | "fixed",
    late_fee_value: "",
  });

  // Edit tenant
  const [editFlat, setEditFlat] = useState<LandlordFlat | null>(null);
  const [editTenantRecordId, setEditTenantRecordId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "", email: "", phone: "",
    monthly_rent: "", security_deposit: "",
    lease_start: "", lease_end: "",
    late_fee_type: "percentage" as "percentage" | "fixed",
    late_fee_value: "",
    notifications_enabled: true,
  });
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Optional scheduled rent hike at tenant creation
  const [scheduleHike, setScheduleHike] = useState(false);
  const [notifyTenant, setNotifyTenant] = useState(true);
  const [showNotifyReport, setShowNotifyReport] = useState(false);
  const [hikeForm, setHikeForm] = useState({
    hike_type: "percentage" as "percentage" | "fixed", hike_value: "", effective_date: "",
    recurring: false, frequency: "yearly" as "monthly" | "quarterly" | "half_yearly" | "yearly",
  });

  // Tenant credentials modal (shown after creation, or on-demand via 🔑 Credentials button)
  type TenantCreds = { userRecordId: string; name: string; userId: string; password: string; loginEmail: string; flatLabel: string };
  const [tenantCreds, setTenantCreds] = useState<TenantCreds | null>(null);
  const [credsMode, setCredsMode] = useState<"created" | "view">("created");
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // KYC modal
  const [kycFlat, setKycFlat] = useState<LandlordFlat | null>(null);
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [tenantDocs, setTenantDocs] = useState<{ id: string; title: string; file_name: string | null; file_url: string | null; file_size: number | null; created_at: string }[]>([]);
  const [loadingKyc, setLoadingKyc] = useState(false);

  // Agreement modal
  const [agreementFlat, setAgreementFlat] = useState<LandlordFlat | null>(null);

  // Tab modal (Payments / Docs / Complaints)
  const [tabFlat, setTabFlat] = useState<LandlordFlat | null>(null);
  const [tabActive, setTabActive] = useState<TenantModalTab>("payments");
  const [tabPayments, setTabPayments] = useState<RentPayment[]>([]);
  const [tabDocuments, setTabDocuments] = useState<Document[]>([]);
  const [tabComplaints, setTabComplaints] = useState<Complaint[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Receipt
  const [receiptPayment, setReceiptPayment] = useState<RentPayment | null>(null);
  const [receiptFlat, setReceiptFlat] = useState<LandlordFlat | null>(null);

  // Remove tenant confirm
  const [removeFlat, setRemoveFlat] = useState<LandlordFlat | null>(null);
  const [removing, setRemoving] = useState(false);

  // Bulk upload
  const [bulkPreviewData, setBulkPreviewData] = useState<Record<string, string>[]>([]);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [bulkSelectedRows, setBulkSelectedRows] = useState<Set<number>>(new Set());
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkTenantRowResult[] | null>(null);

  // Filters
  const [filterName, setFilterName] = useState("");
  const [filterFlat, setFilterFlat] = useState("");
  const [filterSociety, setFilterSociety] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function loadData() {
    if (!user?.email) return;
    const lid = await getLandlordUserId(user.email);
    setLandlordId(lid);
    const [f, a] = await Promise.all([
      getLandlordFlats(user.email).catch(() => [] as LandlordFlat[]),
      getLandlordAgreements(user.email).catch(() => [] as LandlordAgreement[]),
    ]);
    setFlats(f);
    setAgreements(a);
    setLoading(false);
  }

  useEffect(() => { loadData().catch(() => setLoading(false)); }, [user]);

  // Deep-link from Properties page: /landlord/tenants?flat=<id> → open the add form preselected.
  useEffect(() => {
    if (typeof window === "undefined" || flats.length === 0) return;
    const flatId = new URLSearchParams(window.location.search).get("flat");
    if (!flatId) return;
    const flat = flats.find((f) => f.id === flatId);
    if (!flat || flat.current_tenant_id) return; // skip if not found or already occupied
    setShowForm(true);
    setForm((f) => ({
      ...f,
      flat_id: flatId,
      monthly_rent: flat.monthly_rent ? String(flat.monthly_rent) : f.monthly_rent,
      security_deposit: flat.security_deposit ? String(flat.security_deposit) : f.security_deposit,
    }));
  }, [flats]);

  async function openCredentials(flat: LandlordFlat) {
    const tenantUser = (flat.tenant as { user?: { full_name: string } | null } | null)?.user;
    if (!flat.current_tenant_id) return;
    setCredsMode("view");
    setEditingPassword(false);
    setNewPassword("");
    setLoadingCreds(true);
    setTenantCreds({
      userRecordId: flat.current_tenant_id,
      name: tenantUser?.full_name ?? "Tenant",
      userId: "",
      password: "",
      loginEmail: "",
      flatLabel: `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}`,
    });
    const { data } = await supabase
      .from("users")
      .select("admin_user_id, password, email")
      .eq("id", flat.current_tenant_id)
      .maybeSingle();

    let userId = data?.admin_user_id ?? null;
    if (!userId) {
      // Legacy row missing admin_user_id — generate and persist one now instead of showing "—" forever.
      const suffix = Math.floor(1000 + Math.random() * 9000).toString();
      userId = `TNT-${suffix}`;
      await supabase.from("users").update({ admin_user_id: userId }).eq("id", flat.current_tenant_id);
    }
    setTenantCreds(c => c ? { ...c, userId: userId ?? "—", password: data?.password ?? "—", loginEmail: data?.email ?? "—" } : c);
    setLoadingCreds(false);
  }

  async function handleChangePassword() {
    if (!tenantCreds || !newPassword.trim()) return;
    setSavingPassword(true);
    const { error } = await supabase.from("users").update({ password: newPassword.trim() }).eq("id", tenantCreds.userRecordId);
    setSavingPassword(false);
    if (error) { toast.error("Failed to update password."); return; }
    setTenantCreds(c => c ? { ...c, password: newPassword.trim() } : c);
    setEditingPassword(false);
    setNewPassword("");
    toast.success("Password updated.");
  }

  async function openKyc(flat: LandlordFlat) {
    setKycFlat(flat);
    setTenantDetail(null);
    setTenantDocs([]);
    setLoadingKyc(true);
    const { data: tenantRec } = await supabase
      .from("tenants")
      .select("id, user_id, flat_id, landlord_id, lease_start, lease_end, monthly_rent, security_deposit, status, aadhaar_encrypted, pan_number, emergency_contact, emergency_name, late_fee_type, late_fee_value")
      .eq("flat_id", flat.id)
      .eq("status", "active")
      .maybeSingle();
    setTenantDetail(tenantRec as TenantDetail | null);
    if (tenantRec?.user_id) {
      const { data: docs } = await supabase
        .from("documents")
        .select("id, title, file_name, file_url, file_size, created_at")
        .eq("uploaded_by", tenantRec.user_id)
        .order("created_at", { ascending: false });
      setTenantDocs(docs ?? []);
    }
    setLoadingKyc(false);
  }

  async function openEdit(flat: LandlordFlat) {
    setEditFlat(flat);
    setEditTenantRecordId(null);
    setLoadingEdit(true);
    const tenantUser = (flat.tenant as { user?: { full_name: string; phone: string; email: string; notifications_enabled?: boolean } | null } | null)?.user;
    const { data: tenantRec } = await supabase
      .from("tenants")
      .select("id, lease_start, lease_end, monthly_rent, security_deposit, late_fee_type, late_fee_value")
      .eq("flat_id", flat.id)
      .eq("status", "active")
      .maybeSingle();
    setEditTenantRecordId(tenantRec?.id ?? null);
    setEditForm({
      full_name: tenantUser?.full_name ?? "",
      email: tenantUser?.email ?? "",
      phone: tenantUser?.phone ?? "",
      monthly_rent: tenantRec?.monthly_rent != null ? String(tenantRec.monthly_rent) : "",
      security_deposit: tenantRec?.security_deposit != null ? String(tenantRec.security_deposit) : "",
      lease_start: tenantRec?.lease_start ?? "",
      lease_end: tenantRec?.lease_end ?? "",
      late_fee_type: (tenantRec?.late_fee_type as "percentage" | "fixed") ?? "percentage",
      late_fee_value: tenantRec?.late_fee_value != null ? String(tenantRec.late_fee_value) : "",
      notifications_enabled: tenantUser?.notifications_enabled ?? true,
    });
    setLoadingEdit(false);
  }

  async function handleUpdateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!editFlat || !editFlat.current_tenant_id || !editTenantRecordId) return;

    if (!isValidPhone(editForm.phone)) {
      toast.error("Enter valid 10-digit mobile number");
      return;
    }

    setSavingEdit(true);
    const result = await updateTenant({
      tenantRecordId: editTenantRecordId,
      userRecordId: editFlat.current_tenant_id,
      full_name: editForm.full_name,
      email: editForm.email,
      phone: editForm.phone,
      monthly_rent: Number(editForm.monthly_rent),
      security_deposit: Number(editForm.security_deposit),
      lease_start: editForm.lease_start,
      lease_end: editForm.lease_end,
      late_fee_type: editForm.late_fee_value ? editForm.late_fee_type : null,
      late_fee_value: editForm.late_fee_value ? Number(editForm.late_fee_value) : null,
      notifications_enabled: editForm.notifications_enabled,
    });
    setSavingEdit(false);
    if (!result.success) { toast.error(result.error ?? "Failed to update tenant."); return; }

    toast.success("Tenant updated.");
    setEditFlat(null);
    setLoading(true);
    await loadData();
  }

  async function openTabModal(flat: LandlordFlat, tab: TenantModalTab) {
    setTabFlat(flat);
    setTabActive(tab);
    setTabLoading(true);
    setTabPayments([]); setTabDocuments([]); setTabComplaints([]);

    const tenantUserId = flat.current_tenant_id;
    let tenantId: string | null = null;
    if (tenantUserId) {
      const { data: tr } = await supabase.from("tenants").select("id").eq("user_id", tenantUserId).eq("flat_id", flat.id).maybeSingle();
      tenantId = tr?.id ?? null;
    }

    const [payments, docs, complaints] = await Promise.all([
      tenantId
        ? supabase.from("rent_payments").select("id, amount, month_year, status, payment_date, payment_method").eq("tenant_id", tenantId).order("month_year", { ascending: false }).limit(12)
        : Promise.resolve({ data: [] }),
      tenantUserId
        ? supabase.from("documents").select("id, title, file_name, file_url, file_size, created_at").eq("uploaded_by", tenantUserId).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("tickets").select("id, subject, category, priority, status, created_at").eq("flat_id", flat.id).order("created_at", { ascending: false }),
    ]);

    setTabPayments((payments.data ?? []) as RentPayment[]);
    setTabDocuments((docs.data ?? []) as Document[]);
    setTabComplaints((complaints.data ?? []) as Complaint[]);
    setTabLoading(false);
  }

  async function handleRemoveTenant() {
    if (!removeFlat || !removeFlat.current_tenant_id) return;
    setRemoving(true);
    await supabase.from("tenants").update({ status: "inactive" }).eq("flat_id", removeFlat.id).eq("status", "active");
    await supabase.from("flats").update({ current_tenant_id: null, status: "vacant" }).eq("id", removeFlat.id);
    setRemoving(false);
    toast.success("Tenant removed.");
    setRemoveFlat(null);
    setLoading(true);
    await loadData();
  }

  function isValidPhone(phone: string): boolean {
    return /^\d{10}$/.test(phone.replace(/\D/g, "").slice(0, 10));
  }

  // ─── BULK UPLOAD ──────────────────────────────────────────

  function downloadTenantSampleCSV() {
    const headers = ["flat_number", "block", "full_name", "email", "phone", "monthly_rent", "security_deposit", "lease_start", "lease_end", "late_fee_type", "late_fee_value"];
    const sampleRows = [
      ["101", "A", "Rajesh Sharma", "rajesh@example.com", "9876511111", "20000", "50000", "2026-01-01", "2026-12-31", "percentage", "1"],
      ["102", "B", "Amit Singh", "amit@example.com", "9876522222", "28000", "60000", "2026-02-01", "2027-01-31", "fixed", "100"],
    ];
    const csv = [headers.join(","), ...sampleRows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tenants_sample.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadPrefilledTenantCSV() {
    if (flats.length === 0) {
      toast.error("Add properties first — there's nothing to prefill.");
      return;
    }
    const headers = ["flat_number", "block", "full_name", "email", "phone", "monthly_rent", "security_deposit", "lease_start", "lease_end", "late_fee_type", "late_fee_value"];
    const rows = flats.map(f => {
      const tenantUser = (f.tenant as { user?: { full_name: string; phone: string; email: string } | null } | null)?.user;
      return [
        f.flat_number,
        f.block ?? "",
        tenantUser?.full_name ?? "",
        tenantUser?.email ?? "",
        tenantUser?.phone ?? "",
        f.monthly_rent != null ? String(f.monthly_rent) : "",
        f.security_deposit != null ? String(f.security_deposit) : "",
        "", "", "", "",
      ];
    });
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tenants_prefilled_by_property.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleBulkTenantUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    file.text().then(text => {
      const data = parseTenantCSV(text);
      if (data.length === 0) {
        toast.error("Invalid CSV format. Download the sample CSV for the correct format.");
        return;
      }
      setBulkPreviewData(data);
      setBulkSelectedRows(new Set(data.map((_, i) => i)));
      setShowBulkPreview(true);
    }).catch(() => toast.error("Could not read the file. Please try again."));
  }

  async function confirmBulkTenantImport() {
    if (!landlordId) return;
    setUploadingBulk(true);
    const results: BulkTenantRowResult[] = [];
    const rowsToImport = bulkPreviewData.filter((_, i) => bulkSelectedRows.has(i));

    for (const row of rowsToImport) {
      const flat_number = row.flat_number?.trim();
      const block = row.block?.trim() || "";
      const full_name = row.full_name?.trim() || "";
      if (!flat_number || !full_name) {
        results.push({ flat_number: flat_number || "(unknown)", block, tenant_name: full_name, status: "error", error: "Missing flat_number or full_name" });
        continue;
      }
      if (!isValidPhone(row.phone || "")) {
        results.push({ flat_number, block, tenant_name: full_name, status: "error", error: "Invalid 10-digit phone" });
        continue;
      }
      try {
        const flat = flats.find(f => f.flat_number.trim().toLowerCase() === flat_number.toLowerCase() && (f.block ?? "").trim().toLowerCase() === block.toLowerCase());
        if (!flat) {
          results.push({ flat_number, block, tenant_name: full_name, status: "error", error: "No matching property found" });
          continue;
        }

        const late_fee_type = (row.late_fee_type === "fixed" ? "fixed" : row.late_fee_type === "percentage" ? "percentage" : null) as "percentage" | "fixed" | null;
        const late_fee_value = row.late_fee_value ? Number(row.late_fee_value) : null;

        if (flat.current_tenant_id) {
          // Update existing active tenant on this flat
          const { data: tenantRec } = await supabase
            .from("tenants")
            .select("id")
            .eq("flat_id", flat.id)
            .eq("status", "active")
            .maybeSingle();
          if (!tenantRec) {
            results.push({ flat_number, block, tenant_name: full_name, status: "error", error: "Occupied flat has no active tenant record" });
            continue;
          }
          const upd = await updateTenant({
            tenantRecordId: tenantRec.id,
            userRecordId: flat.current_tenant_id,
            full_name,
            email: row.email || "",
            phone: row.phone,
            monthly_rent: row.monthly_rent ? Number(row.monthly_rent) : 0,
            security_deposit: row.security_deposit ? Number(row.security_deposit) : 0,
            lease_start: row.lease_start || "",
            lease_end: row.lease_end || "",
            late_fee_type,
            late_fee_value,
          });
          if (!upd.success) { results.push({ flat_number, block, tenant_name: full_name, status: "error", error: upd.error }); continue; }
          results.push({ flat_number, block, tenant_name: full_name, status: "updated" });
        } else {
          if (!row.lease_start || !row.lease_end) {
            results.push({ flat_number, block, tenant_name: full_name, status: "error", error: "Missing lease_start or lease_end" });
            continue;
          }
          const add = await addTenant({
            full_name,
            email: row.email || "",
            phone: row.phone,
            flat_id: flat.id,
            society_id: flat.society_id || undefined,
            landlord_id: landlordId,
            monthly_rent: row.monthly_rent ? Number(row.monthly_rent) : 0,
            security_deposit: row.security_deposit ? Number(row.security_deposit) : 0,
            lease_start: row.lease_start,
            lease_end: row.lease_end,
            late_fee_type,
            late_fee_value,
          });
          if (!add.success) { results.push({ flat_number, block, tenant_name: full_name, status: "error", error: add.error }); continue; }
          results.push({ flat_number, block, tenant_name: full_name, status: "created" });
        }
      } catch (err) {
        results.push({ flat_number, block, tenant_name: full_name, status: "error", error: (err as Error).message });
      }
    }

    setShowBulkPreview(false);
    setBulkPreviewData([]);
    setBulkSelectedRows(new Set());
    setUploadingBulk(false);
    if (results.length > 0) setBulkResults(results);
    setLoading(true);
    await loadData();
  }

  async function handleAddTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!landlordId || !form.flat_id) return;
    const selectedFlat = flats.find(f => f.id === form.flat_id);
    if (!selectedFlat) return;

    // Phone validation
    if (!isValidPhone(form.phone)) {
      toast.error("Enter valid 10-digit mobile number");
      return;
    }

    // Check tenant limit
    const tenantStats = await getLandlordTenantStats(landlordId);
    if (tenantStats.count >= tenantStats.limit) {
      toast.error(
        `Your plan allows ${tenantStats.limit} tenants. Contact admin to purchase more slots.`,
        { duration: 5000 }
      );
      return;
    }

    setSaving(true);
    const result = await addTenant({
      full_name: form.full_name, email: form.email, phone: form.phone,
      flat_id: form.flat_id,
      society_id: selectedFlat.society_id || undefined,
      landlord_id: landlordId,
      monthly_rent: Number(form.monthly_rent),
      security_deposit: Number(form.security_deposit),
      lease_start: form.lease_start, lease_end: form.lease_end,
      late_fee_type: form.late_fee_value ? form.late_fee_type : null,
      late_fee_value: form.late_fee_value ? Number(form.late_fee_value) : null,
    });
    setSaving(false);
    if (!result.success) { toast.error(result.error ?? "Failed to add tenant."); return; }

    // Optional scheduled rent hike
    if (scheduleHike && hikeForm.hike_value && hikeForm.effective_date) {
      const currentRent = Number(form.monthly_rent);
      const newRent = hikeForm.hike_type === "percentage"
        ? Math.round(currentRent * (1 + Number(hikeForm.hike_value) / 100))
        : Math.round(currentRent + Number(hikeForm.hike_value));
      await supabase.from("rent_hike_history").insert({
        flat_id: form.flat_id,
        old_rent: currentRent,
        new_rent: newRent,
        hike_type: hikeForm.hike_type,
        hike_value: Number(hikeForm.hike_value),
        effective_date: hikeForm.effective_date,
        created_by: landlordId,
        status: "scheduled",
        recurrence_frequency: hikeForm.recurring ? hikeForm.frequency : null,
      }).then(({ error }) => { if (error) toast.error("Tenant added, but scheduling the rent hike failed."); });
    }

    // Auto-create a draft rental agreement, snapshotting everything just entered —
    // fully editable afterwards from the Agreements page, independent of the live tenant record.
    {
      const { data: landlordUser } = await supabase.from("users").select("full_name, phone, email").eq("id", landlordId).maybeSingle();
      const hikeAmountLabel = hikeForm.hike_type === "percentage" ? `${hikeForm.hike_value}%` : formatCurrency(Number(hikeForm.hike_value || 0));
      const frequencyLabel = { monthly: "month", quarterly: "3 months", half_yearly: "6 months", yearly: "year" }[hikeForm.frequency];
      const rentHikeClause = scheduleHike && hikeForm.hike_value && hikeForm.effective_date
        ? `Rent shall increase by ${hikeAmountLabel} effective ${new Date(hikeForm.effective_date).toLocaleDateString("en-IN")}` +
          (hikeForm.recurring ? `, and shall continue to increase by ${hikeAmountLabel} every ${frequencyLabel} thereafter.` : ".")
        : null;

      await supabase.from("agreements").insert({
        landlord_id: landlordId,
        flat_id: form.flat_id,
        society_id: selectedFlat.society_id || null,
        tenant_id: result.tenantRecordId ?? null,
        tier: "free",
        agreement_type: "free",
        start_date: form.lease_start,
        end_date: form.lease_end,
        monthly_rent: Number(form.monthly_rent),
        security_deposit: Number(form.security_deposit) || null,
        status: "active",
        tenant_name: form.full_name,
        tenant_phone: form.phone,
        tenant_email: form.email,
        landlord_name: landlordUser?.full_name ?? null,
        landlord_phone: landlordUser?.phone ?? null,
        landlord_email: landlordUser?.email ?? null,
        rent_hike_clause: rentHikeClause,
        late_fee_type: form.late_fee_value ? form.late_fee_type : null,
        late_fee_value: form.late_fee_value ? Number(form.late_fee_value) : null,
      }).then(({ error }) => { if (error) toast.error("Tenant added, but agreement draft could not be created."); });
    }

    // Send WhatsApp welcome message (fire-and-forget — never blocks UI)
    const tenantSocietyName = (flats.find(f => f.id === form.flat_id)?.society as { name?: string } | null)?.name ?? "MyRentSaathi";
    if (notifyTenant && form.phone) {
      sendWelcomeMessage({
        phone: form.phone,
        fullName: form.full_name,
        role: "tenant",
        societyName: tenantSocietyName,
        loginEmail: result.loginEmail ?? form.email,
      }).catch(() => {});
    }

    // Send credential email + WhatsApp notification (fire-and-forget)
    const credEmail = result.loginEmail ?? form.email;
    const credPassword = result.generatedPassword;
    if (notifyTenant && credEmail && credPassword) {
      fetch("/api/email/send-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: credEmail,
          name: form.full_name,
          email: credEmail,
          password: credPassword,
          role: "Tenant",
          societyName: tenantSocietyName,
          createdByType: "landlord",
          createdByName: user?.name,
        }),
      }).catch(() => {});

      if (form.phone) {
        fetch("/api/whatsapp/notify-credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: form.phone,
            name: form.full_name,
            email: credEmail,
          }),
        }).catch(() => {});
      }
    }

    // Show credentials if auto-generated
    if (result.generatedUserId && result.generatedPassword) {
      const flat = flats.find(f => f.id === form.flat_id);
      const flatLabel = flat ? `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : form.flat_id;
      setCredsMode("created");
      setTenantCreds({
        userRecordId: result.userRecordId ?? "",
        name: form.full_name,
        userId: result.generatedUserId,
        password: result.generatedPassword,
        loginEmail: result.loginEmail ?? form.email,
        flatLabel,
      });
    } else {
      toast.success("Tenant added successfully.");
    }

    setForm({ full_name: "", email: "", phone: "", flat_id: "", monthly_rent: "", security_deposit: "", lease_start: "", lease_end: "", late_fee_type: "percentage", late_fee_value: "" });
    setScheduleHike(false);
    setNotifyTenant(true);
    setHikeForm({ hike_type: "percentage", hike_value: "", effective_date: "", recurring: false, frequency: "yearly" });
    setShowForm(false);
    setLoading(true);
    await loadData();
  }

  const occupiedFlats = flats.filter(f => f.current_tenant_id);
  const vacantFlats = flats.filter(f => !f.current_tenant_id);

  // Unique society options from occupied flats
  const societyOptions = Array.from(
    new Map(
      occupiedFlats
        .map(f => f.society as { name: string; city: string } | null)
        .filter(Boolean)
        .map(s => [s!.name, s!])
    ).values()
  );

  // Apply filters
  const filteredFlats = occupiedFlats.filter(flat => {
    const tu = (flat.tenant as { user?: { full_name: string; phone: string } | null } | null)?.user;
    const society = flat.society as { name: string } | null;
    const agreement = agreements.find(a => a.flat_id === flat.id) ?? agreements.find(a => (a.flat as { flat_number: string } | null)?.flat_number === flat.flat_number);
    if (filterName && !tu?.full_name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterFlat && !flat.flat_number.toLowerCase().includes(filterFlat.toLowerCase())) return false;
    if (filterSociety && society?.name !== filterSociety) return false;
    if (filterStatus === "active" && !agreement) return false;
    if (filterStatus === "expiring") {
      if (!agreement) return false;
      const daysLeft = Math.ceil((new Date(agreement.end_date).getTime() - Date.now()) / 86400000);
      if (daysLeft > 30 || daysLeft < 0) return false;
    }
    if (filterStatus === "expired") {
      if (!agreement) return false;
      if (new Date(agreement.end_date) >= new Date()) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredFlats.length / pageSize));
  const pagedFlats = filteredFlats.slice((page - 1) * pageSize, page * pageSize);

  const hasFilters = filterName || filterFlat || filterSociety || filterStatus;

  if (loading) {
    return <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

  const getAgreement = (flat: LandlordFlat) => {
    const byId = agreements.find(a => a.flat_id === flat.id);
    if (byId) return byId;
    return agreements.find(a => {
      const af = a.flat as { flat_number: string; block: string | null } | null;
      return af?.flat_number === flat.flat_number && af?.block === flat.block;
    });
  };

  return (
    <div>
      <Toaster position="top-center" />

      {/* Tenant Credentials Modal — shown after creation, or on-demand via 🔑 Credentials */}
      {tenantCreds && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setTenantCreds(null); setEditingPassword(false); setNewPassword(""); }}>
          <div className="bg-white rounded-[20px] w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-green-50 rounded-t-[20px] px-5 pt-5 pb-4 border-b border-green-100 text-center">
              <div className="text-3xl mb-2">{credsMode === "created" ? "✅" : "🔑"}</div>
              <div className="text-base font-extrabold text-green-700">{credsMode === "created" ? "Tenant Added!" : "Login Credentials"}</div>
              <div className="text-xs text-ink-muted mt-1">
                {credsMode === "created" ? "Share these login credentials with the tenant" : "View or change this tenant's login"}
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="bg-warm-50 rounded-xl p-3 border border-border-default">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Name</div>
                <div className="text-sm font-extrabold text-ink">{tenantCreds.name}</div>
                <div className="text-xs text-ink-muted mt-0.5">Flat {tenantCreds.flatLabel}</div>
              </div>
              {loadingCreds ? (
                <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-warm-100 rounded-xl animate-pulse" />)}</div>
              ) : (
                <div className="bg-brand-50 rounded-xl p-4 border border-brand-200 space-y-3">
                  <div className="text-[11px] font-bold text-brand-600 uppercase tracking-widest text-center mb-1">Login Credentials</div>
                  <div>
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">User ID</div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-base font-extrabold text-brand-600 bg-brand-100 px-3 py-1.5 rounded-lg flex-1 text-center tracking-wider">
                        {tenantCreds.userId}
                      </code>
                      <button onClick={() => { navigator.clipboard.writeText(tenantCreds.userId); toast.success("Copied!"); }} className="text-[10px] text-brand-500 font-bold border border-brand-200 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-brand-50">Copy</button>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Password</div>
                    {editingPassword ? (
                      <div className="space-y-2">
                        <input autoFocus className={inputClass} placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingPassword(false); setNewPassword(""); }} className="flex-1 py-1.5 rounded-lg border border-border-default text-[11px] font-bold text-ink-muted cursor-pointer">Cancel</button>
                          <button onClick={handleChangePassword} disabled={savingPassword || !newPassword.trim()} className="flex-1 py-1.5 rounded-lg bg-brand-500 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60">{savingPassword ? "Saving..." : "Save"}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-base font-extrabold text-ink bg-warm-100 px-3 py-1.5 rounded-lg flex-1 text-center tracking-wider">
                          {tenantCreds.password}
                        </code>
                        <button onClick={() => { navigator.clipboard.writeText(tenantCreds.password); toast.success("Copied!"); }} className="text-[10px] text-brand-500 font-bold border border-brand-200 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-brand-50">Copy</button>
                      </div>
                    )}
                  </div>
                  {!editingPassword && (
                    <button onClick={() => setEditingPassword(true)} className="w-full py-1.5 rounded-lg border border-brand-200 text-brand-600 text-[11px] font-bold cursor-pointer hover:bg-brand-100">Change Password</button>
                  )}
                  <div className="text-[10px] text-ink-muted text-center">Login email: {tenantCreds.loginEmail}</div>
                </div>
              )}
              {credsMode === "created" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-[11px] text-yellow-700 text-center">
                  Screenshot these credentials — you can always view or change the password later from the tenant&apos;s 🔑 Credentials button.
                </div>
              )}
            </div>
            <div className="px-5 pb-5">
              <button onClick={() => { setTenantCreds(null); setEditingPassword(false); setNewPassword(""); }} className="w-full py-3 rounded-xl bg-brand-500 text-white text-sm font-bold cursor-pointer">Done</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-[15px] font-extrabold text-ink">👥 Tenants</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadTenantSampleCSV} className="px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-bold cursor-pointer">
            📥 Sample CSV
          </button>
          <button onClick={downloadPrefilledTenantCSV} className="px-3 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold cursor-pointer">
            🏠 Prefill by Property
          </button>
          <label className="px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold cursor-pointer">
            📤 Bulk Upload
            <input type="file" accept=".csv" onChange={handleBulkTenantUpload} className="hidden" />
          </label>
          <button onClick={() => setShowNotifyReport(v => !v)} className="px-3 py-2 rounded-xl bg-gray-600 text-white text-xs font-bold cursor-pointer">
            🔔 Notification Status
          </button>
          {vacantFlats.length > 0 && (
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
              {showForm ? "Cancel" : "+ Add Tenant"}
            </button>
          )}
        </div>
      </div>

      {/* Notification Status Report — one place to see who's on/off */}
      {showNotifyReport && (
        <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-bold text-ink">🔔 Tenant Notification Status</div>
            <button onClick={() => setShowNotifyReport(false)} className="text-ink-muted text-sm cursor-pointer">✕</button>
          </div>
          {occupiedFlats.length === 0 ? (
            <div className="text-center py-6 text-ink-muted text-sm">No tenants yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-warm-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Tenant</th>
                    <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Flat</th>
                    <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Phone / Email</th>
                    <th className="px-2 py-1.5 text-center text-ink-muted font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {occupiedFlats.map(flat => {
                    const tu = (flat.tenant as { user?: { full_name: string; phone: string; email: string; notifications_enabled?: boolean } | null } | null)?.user;
                    if (!tu) return null;
                    const on = tu.notifications_enabled !== false;
                    return (
                      <tr key={flat.id} className="border-b border-border-light hover:bg-warm-50 cursor-pointer" onClick={() => { setShowNotifyReport(false); openEdit(flat); }}>
                        <td className="px-2 py-1.5 font-semibold text-ink">{tu.full_name}</td>
                        <td className="px-2 py-1.5 text-ink-muted">{flat.flat_number}{flat.block ? ` (${flat.block})` : ""}</td>
                        <td className="px-2 py-1.5 text-ink-muted">{tu.phone} · {tu.email}</td>
                        <td className="px-2 py-1.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${on ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{on ? "🔔 On" : "🔕 Off"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bulk Results Modal */}
      {bulkResults && <BulkTenantResultsModal results={bulkResults} onClose={() => setBulkResults(null)} />}

      {/* Bulk Import Preview */}
      {showBulkPreview && (
        <div className="bg-white rounded-[14px] p-4 border border-yellow-300 mb-4">
          <div className="text-sm font-bold text-ink mb-2">
            📋 Import Preview ({bulkPreviewData.length} rows · {bulkSelectedRows.size} selected)
          </div>
          <div className="text-[11px] text-ink-muted mb-2">
            Matched by flat number + block: occupied flats get their tenant <b>updated</b>, vacant flats get a new tenant <b>created</b>.
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto mb-3 border border-border-light rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-warm-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-center w-8">
                    <input
                      type="checkbox"
                      checked={bulkSelectedRows.size === bulkPreviewData.length}
                      onChange={() => setBulkSelectedRows(bulkSelectedRows.size === bulkPreviewData.length ? new Set() : new Set(bulkPreviewData.map((_, i) => i)))}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Flat</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Name</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Phone</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Rent</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Lease Start</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Lease End</th>
                </tr>
              </thead>
              <tbody>
                {bulkPreviewData.map((row, idx) => {
                  const isSelected = bulkSelectedRows.has(idx);
                  const flat = flats.find(f => f.flat_number.trim().toLowerCase() === (row.flat_number ?? "").trim().toLowerCase() && (f.block ?? "").trim().toLowerCase() === (row.block ?? "").trim().toLowerCase());
                  return (
                    <tr key={idx} className={`border-b border-border-light cursor-pointer ${isSelected ? "bg-brand-50" : "hover:bg-warm-50"}`}
                      onClick={() => setBulkSelectedRows(prev => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; })}>
                      <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => setBulkSelectedRows(prev => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; })} className="cursor-pointer" />
                      </td>
                      <td className="px-2 py-1.5 font-semibold">
                        {row.flat_number || "—"}{row.block ? ` (${row.block})` : ""}{" "}
                        {!flat && <span className="text-[9px] text-red-500 font-bold">(no match)</span>}
                        {flat && flat.current_tenant_id && <span className="text-[9px] text-blue-600 font-bold">(update)</span>}
                        {flat && !flat.current_tenant_id && <span className="text-[9px] text-green-600 font-bold">(new)</span>}
                      </td>
                      <td className="px-2 py-1.5">{row.full_name || "—"}</td>
                      <td className="px-2 py-1.5">{row.phone || "—"}</td>
                      <td className="px-2 py-1.5">{row.monthly_rent || "—"}</td>
                      <td className="px-2 py-1.5">{row.lease_start || "—"}</td>
                      <td className="px-2 py-1.5">{row.lease_end || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button onClick={confirmBulkTenantImport} disabled={uploadingBulk || bulkSelectedRows.size === 0} className="flex-1 py-2 rounded-xl bg-green-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
              {uploadingBulk ? "Importing..." : `✓ Import ${bulkSelectedRows.size} Selected`}
            </button>
            <button onClick={() => { setShowBulkPreview(false); setBulkPreviewData([]); setBulkSelectedRows(new Set()); }} className="flex-1 py-2 rounded-xl bg-gray-300 text-ink text-xs font-bold cursor-pointer">
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Tenant Form */}
      {showForm && (
        <form onSubmit={handleAddTenant} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-4 space-y-3">
          <div className="text-sm font-bold text-ink mb-1">Add New Tenant</div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Full Name *</label><input required className={inputClass} placeholder="Rajesh Sharma" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div><label className={labelClass}>Phone *</label><input required className={inputClass} placeholder="10-digit mobile" maxLength={10} inputMode="numeric" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} /></div>
          </div>
          <div><label className={labelClass}>Email *</label><input required type="email" autoComplete="off" className={inputClass} placeholder="rajesh@gmail.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div>
            <label className={labelClass}>Select Flat *</label>
            <select required className={inputClass} value={form.flat_id} onChange={e => {
              const flat = vacantFlats.find(f => f.id === e.target.value);
              setForm(f => ({ ...f, flat_id: e.target.value, monthly_rent: flat?.monthly_rent ? String(flat.monthly_rent) : f.monthly_rent, security_deposit: flat?.security_deposit ? String(flat.security_deposit) : f.security_deposit }));
            }}>
              <option value="">— Choose vacant flat —</option>
              {vacantFlats.map(flat => <option key={flat.id} value={flat.id}>{flat.flat_number}{flat.block ? ` (${flat.block})` : ""} — {flat.flat_type ?? ""}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Monthly Rent (₹) *</label><input required type="number" className={inputClass} placeholder="28000" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
            <div><label className={labelClass}>Security Deposit (₹)</label><input type="number" className={inputClass} placeholder="56000" value={form.security_deposit} onChange={e => setForm(f => ({ ...f, security_deposit: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Lease Start *</label><input required type="date" className={inputClass} value={form.lease_start} onClick={e => e.currentTarget.showPicker?.()} onChange={e => setForm(f => ({ ...f, lease_start: e.target.value }))} /></div>
            <div><label className={labelClass}>Lease End *</label><input required type="date" className={inputClass} value={form.lease_end} onClick={e => e.currentTarget.showPicker?.()} onChange={e => setForm(f => ({ ...f, lease_end: e.target.value }))} /></div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-[11px] text-blue-700">
            📅 Rent is due on the <strong>last day of each month</strong>.
          </div>

          <div className="bg-warm-50 rounded-xl p-3 border border-border-default">
            <div className="text-xs font-bold text-ink mb-2">⏰ Late Payment Fee (optional)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Fee Type</label>
                <select className={inputClass} value={form.late_fee_type} onChange={e => setForm(f => ({ ...f, late_fee_type: e.target.value as "percentage" | "fixed" }))}>
                  <option value="percentage">Percentage (%) of rent</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{form.late_fee_type === "percentage" ? "% per day late" : "₹ per day late"}</label>
                <input type="number" min="0" step="0.01" className={inputClass} placeholder={form.late_fee_type === "percentage" ? "e.g. 1" : "e.g. 100"} value={form.late_fee_value} onChange={e => setForm(f => ({ ...f, late_fee_value: e.target.value }))} />
              </div>
            </div>
            {form.late_fee_value && Number(form.late_fee_value) > 0 && (
              <div className="text-[10px] text-ink-muted mt-2">
                If rent is paid late, the tenant will be charged{" "}
                <strong>
                  {form.late_fee_type === "percentage"
                    ? `${form.late_fee_value}% of rent (${formatCurrency(Math.round(Number(form.monthly_rent || 0) * Number(form.late_fee_value) / 100))})`
                    : formatCurrency(Number(form.late_fee_value))}
                </strong>{" "}
                for every day of delay.
              </div>
            )}
          </div>

          <div className="bg-warm-50 rounded-xl p-3 border border-border-default">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={scheduleHike} onChange={e => setScheduleHike(e.target.checked)} className="w-4 h-4" />
              <span className="text-xs font-bold text-ink">📈 Schedule a rent hike (optional)</span>
            </label>
            {scheduleHike && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Hike Type</label>
                    <select className={inputClass} value={hikeForm.hike_type} onChange={e => setHikeForm(h => ({ ...h, hike_type: e.target.value as "percentage" | "fixed" }))}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{hikeForm.hike_type === "percentage" ? "Increase %" : "Increase ₹"} *</label>
                    <input required={scheduleHike} type="number" min="1" className={inputClass} placeholder={hikeForm.hike_type === "percentage" ? "e.g. 10" : "e.g. 500"} value={hikeForm.hike_value} onChange={e => setHikeForm(h => ({ ...h, hike_value: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Effective Date *</label>
                  <input required={scheduleHike} type="date" min={form.lease_start || undefined} className={inputClass} value={hikeForm.effective_date} onClick={e => e.currentTarget.showPicker?.()} onChange={e => setHikeForm(h => ({ ...h, effective_date: e.target.value }))} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={hikeForm.recurring} onChange={e => setHikeForm(h => ({ ...h, recurring: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-[11px] font-semibold text-ink">Repeat this hike automatically</span>
                </label>
                {hikeForm.recurring && (
                  <div>
                    <label className={labelClass}>Repeat Every *</label>
                    <select className={inputClass} value={hikeForm.frequency} onChange={e => setHikeForm(h => ({ ...h, frequency: e.target.value as typeof h.frequency }))}>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly (3 months)</option>
                      <option value="half_yearly">Half-Yearly (6 months)</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <div className="text-[10px] text-ink-muted mt-1">Rent will keep increasing by this amount every {{ monthly: "month", quarterly: "3 months", half_yearly: "6 months", yearly: "year" }[hikeForm.frequency]}, until you stop it from the Rent Hike page.</div>
                  </div>
                )}
                {form.monthly_rent && hikeForm.hike_value && Number(hikeForm.hike_value) > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-[11px] text-green-700">
                    Rent will increase from <strong>{formatCurrency(Number(form.monthly_rent))}</strong> to{" "}
                    <strong>
                      {formatCurrency(
                        hikeForm.hike_type === "percentage"
                          ? Math.round(Number(form.monthly_rent) * (1 + Number(hikeForm.hike_value) / 100))
                          : Math.round(Number(form.monthly_rent) + Number(hikeForm.hike_value))
                      )}
                    </strong>{" "}
                    on the effective date.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-[11px] text-yellow-700">
            Login will be auto-generated — User ID: <strong>TNT-####</strong>, Password: <strong>{form.full_name ? form.full_name.split(" ")[0] + "@####" : "FirstName@####"}</strong>. You can view or change these anytime from the tenant&apos;s 🔑 Credentials button.
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notifyTenant} onChange={e => setNotifyTenant(e.target.checked)} className="w-4 h-4" />
            <span className="text-[11px] font-semibold text-ink">Send login details to tenant via Email &amp; WhatsApp</span>
          </label>
          {!notifyTenant && (
            <div className="text-[10px] text-ink-muted -mt-2">Tenant won&apos;t be emailed or WhatsApp&apos;d. Share the credentials yourself from the tenant&apos;s 🔑 Credentials button.</div>
          )}
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">{saving ? "Adding Tenant..." : "Add Tenant"}</button>
        </form>
      )}

      {occupiedFlats.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">No tenants yet. {vacantFlats.length > 0 ? "Add a tenant to a vacant flat." : "Add properties first."}</div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="bg-white rounded-[14px] border border-border-default p-3 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wide">Filters</span>
              {hasFilters && (
                <button onClick={() => { setFilterName(""); setFilterFlat(""); setFilterSociety(""); setFilterStatus(""); setPage(1); }}
                  className="text-[10px] text-brand-500 font-semibold cursor-pointer">Clear all</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
                placeholder="Search tenant name..."
                value={filterName}
                onChange={e => { setFilterName(e.target.value); setPage(1); }}
              />
              <input
                className="border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
                placeholder="Flat number..."
                value={filterFlat}
                onChange={e => { setFilterFlat(e.target.value); setPage(1); }}
              />
              <select
                className="border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-ink bg-warm-50 focus:outline-none col-span-1"
                value={filterSociety}
                onChange={e => { setFilterSociety(e.target.value); setPage(1); }}
              >
                <option value="">All Societies</option>
                {societyOptions.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <select
                className="border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-ink bg-warm-50 focus:outline-none col-span-1"
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Lease Status</option>
                <option value="active">Active Agreement</option>
                <option value="expiring">Expiring in 30 days</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            {hasFilters && (
              <div className="text-[10px] text-ink-muted">{filteredFlats.length} of {occupiedFlats.length} tenants match</div>
            )}
          </div>

          {/* Page size + count */}
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <div className="text-xs text-ink-muted">{filteredFlats.length} tenants</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-muted">Show</span>
              <select
                className="border border-border-default rounded-lg px-2 py-1 text-xs text-ink bg-warm-50 focus:outline-none"
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-[11px] text-ink-muted">per page</span>
            </div>
          </div>

          {filteredFlats.length === 0 ? (
            <div className="text-center py-8 text-ink-muted text-sm">No tenants match the current filters.</div>
          ) : (
            pagedFlats.map((flat) => {
              const tenantUser = (flat.tenant as { id: string; user?: { full_name: string; phone: string; email: string; notifications_enabled?: boolean } | null } | null)?.user;
              const society = flat.society as { name: string; city: string } | null;
              const agreement = getAgreement(flat);
              if (!tenantUser) return null;
              const initials = tenantUser.full_name.split(" ").map(n => n[0]).join("").slice(0, 2);

              // Lease status badge
              let leaseBadge: { label: string; cls: string } | null = null;
              if (agreement) {
                const daysLeft = Math.ceil((new Date(agreement.end_date).getTime() - Date.now()) / 86400000);
                if (daysLeft < 0) leaseBadge = { label: "Expired", cls: "bg-red-100 text-red-700" };
                else if (daysLeft <= 30) leaseBadge = { label: `Expires in ${daysLeft}d`, cls: "bg-yellow-100 text-yellow-700" };
              }

              return (
                <div key={flat.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-base font-extrabold text-brand-500">{initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-extrabold text-ink">{tenantUser.full_name}</div>
                        {leaseBadge && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${leaseBadge.cls}`}>{leaseBadge.label}</span>}
                        {tenantUser.notifications_enabled === false && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600" title="Email & WhatsApp notifications are off for this tenant">🔕 Notify Off</span>}
                      </div>
                      <div className="text-[11px] text-ink-muted">{flat.flat_number}{flat.block ? ` (${flat.block})` : ""}{society ? ` · ${society.name}` : ""}</div>
                      <div className="text-[11px] text-ink-muted">{tenantUser.phone} · {tenantUser.email}</div>
                    </div>
                    <button onClick={() => openEdit(flat)} className="p-1.5 rounded-lg border border-border-default text-ink-muted text-[11px] cursor-pointer hover:bg-warm-50 flex-shrink-0" title="Edit tenant">✎</button>
                    <button onClick={() => setRemoveFlat(flat)} className="p-1.5 rounded-lg border border-red-200 text-red-400 text-[11px] cursor-pointer hover:bg-red-50 flex-shrink-0" title="Remove tenant">✕</button>
                  </div>

                  <div className="flex gap-3 bg-warm-50 rounded-xl p-3 mb-3 flex-wrap">
                    {[
                      { label: "Monthly Rent", value: formatCurrency(flat.monthly_rent ?? 0) },
                      { label: "Deposit Held", value: formatCurrency(flat.security_deposit ?? 0) },
                      { label: "Lease End", value: agreement ? new Date(agreement.end_date).toLocaleDateString("en-IN") : "—" },
                    ].map(d => (
                      <div key={d.label} className="flex-1 min-w-[80px]">
                        <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                        <div className="text-sm font-extrabold text-brand-500 mt-0.5">{d.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* All buttons, wrapping onto multiple rows as needed */}
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => openKyc(flat)} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">🪪 KYC</button>
                    <button onClick={() => openCredentials(flat)} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">🔑 Credentials</button>
                    <button onClick={() => { openTabModal(flat, "payments"); }} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">💰 Payments</button>
                    <button onClick={() => setAgreementFlat(flat)} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">📄 Agreement</button>
                    <button onClick={() => { openTabModal(flat, "documents"); }} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">🗂️ Docs</button>
                    <button onClick={() => { openTabModal(flat, "complaints"); }} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">🚩 Complaints</button>
                    <a href={`https://wa.me/${(tenantUser.phone ?? "").replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[10px] font-semibold cursor-pointer whitespace-nowrap flex-shrink-0">📱 Contact</a>
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 mt-4 flex-wrap">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`e-${i}`} className="text-[11px] text-ink-muted px-1">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p as number)} className={`w-7 h-7 rounded-lg text-[11px] font-bold cursor-pointer ${page === p ? "bg-brand-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-50"}`}>{p}</button>
                  )
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">Next ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">»</button>
            </div>
          )}
          {filteredFlats.length > 0 && (
            <div className="text-center text-[10px] text-ink-muted mt-2">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredFlats.length)} of {filteredFlats.length}
            </div>
          )}
        </>
      )}

      {/* Receipt Modal */}
      {receiptPayment && receiptFlat && (
        <ReceiptModal
          payment={receiptPayment}
          tenant={{ full_name: (receiptFlat.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant" }}
          flat={{ flat_number: receiptFlat.flat_number, block: receiptFlat.block }}
          onClose={() => { setReceiptPayment(null); setReceiptFlat(null); }}
        />
      )}

      {/* KYC Modal */}
      {kycFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setKycFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-md p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="text-base font-extrabold text-ink">🪪 Tenant KYC</div>
              <button onClick={() => setKycFlat(null)} className="text-ink-muted text-lg cursor-pointer">✕</button>
            </div>
            {loadingKyc ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-warm-100 rounded-xl animate-pulse" />)}</div>
            ) : tenantDetail ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Lease Start", value: tenantDetail.lease_start ? new Date(tenantDetail.lease_start).toLocaleDateString("en-IN") : "—" },
                    { label: "Lease End", value: tenantDetail.lease_end ? new Date(tenantDetail.lease_end).toLocaleDateString("en-IN") : "—" },
                    { label: "Monthly Rent", value: formatCurrency(tenantDetail.monthly_rent ?? 0) },
                    { label: "Security Deposit", value: formatCurrency(tenantDetail.security_deposit ?? 0) },
                    { label: "Late Fee", value: lateFeeLabel(tenantDetail.late_fee_type, tenantDetail.late_fee_value) },
                  ].map(d => (
                    <div key={d.label} className="bg-warm-50 rounded-xl p-2.5">
                      <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                      <div className="text-sm font-bold text-ink mt-0.5">{d.value}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-warm-50 rounded-xl p-3 space-y-2">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">KYC Documents</div>
                  <div className="flex justify-between text-sm"><span className="text-ink-muted">Aadhaar</span><span className="font-bold text-ink">{tenantDetail.aadhaar_encrypted ? "✅ On file" : "—"}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-ink-muted">PAN</span><span className="font-bold text-ink">{tenantDetail.pan_number ?? "—"}</span></div>
                </div>
                <div className="bg-warm-50 rounded-xl p-3 space-y-2">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">Emergency Contact</div>
                  <div className="flex justify-between text-sm"><span className="text-ink-muted">Name</span><span className="font-bold text-ink">{tenantDetail.emergency_name ?? "—"}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-ink-muted">Phone</span><span className="font-bold text-ink">{tenantDetail.emergency_contact ?? "—"}</span></div>
                </div>
                <div className="bg-warm-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wide mb-2">Uploaded Documents</div>
                  {tenantDocs.length === 0 ? (
                    <div className="text-xs text-ink-muted">No documents uploaded yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {tenantDocs.map(d => (
                        <div key={d.id} className="flex justify-between items-center">
                          <div>
                            <div className="text-xs font-semibold text-ink">{d.title}</div>
                            <div className="text-[10px] text-ink-muted">{d.file_name ? d.file_name.split(".").pop()?.toUpperCase() : "—"} · {new Date(d.created_at).toLocaleDateString("en-IN")}</div>
                          </div>
                          {d.file_url ? (
                            <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg border border-border-default text-[10px] font-semibold text-brand-500 cursor-pointer">View</a>
                          ) : (
                            <span className="text-[10px] text-ink-muted">No file</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-ink-muted text-sm">No KYC details found for this tenant.</div>
            )}
            <button onClick={() => setKycFlat(null)} className="w-full mt-4 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Close</button>
          </div>
        </div>
      )}

      {/* Tab Modal — Payments / Docs / Complaints */}
      {tabFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setTabFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 pb-0">
              <div>
                <div className="text-base font-extrabold text-ink">
                  {tabActive === "payments" ? "💰 Payments" : tabActive === "documents" ? "🗂️ Documents" : "🚩 Complaints"}
                  {" — "}{(tabFlat.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant"}
                </div>
                <div className="text-xs text-ink-muted">Flat {tabFlat.flat_number}{tabFlat.block ? ` (${tabFlat.block})` : ""}</div>
              </div>
              <button onClick={() => setTabFlat(null)} className="text-ink-muted text-lg cursor-pointer p-1">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3">
              {([
                { key: "payments" as TenantModalTab, label: "💰 Payments" },
                { key: "documents" as TenantModalTab, label: "🗂️ Docs" },
                { key: "complaints" as TenantModalTab, label: "🚩 Complaints" },
              ]).map(tab => (
                <button key={tab.key} onClick={() => setTabActive(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap flex-shrink-0 ${tabActive === tab.key ? "bg-brand-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-50"}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tabLoading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-warm-100 rounded-xl animate-pulse" />)}</div>
              ) : (
                <>
                  {tabActive === "payments" && (
                    <div className="space-y-2">
                      {tabPayments.length === 0 ? (
                        <div className="text-center py-8 text-ink-muted text-sm">No payment records found.</div>
                      ) : (
                        tabPayments.map(p => (
                          <div key={p.id} className="flex justify-between items-center bg-warm-50 rounded-xl px-3 py-2.5 gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-ink">{p.month_year}</div>
                              {p.payment_date && <div className="text-[10px] text-ink-muted">{p.payment_method ? `via ${p.payment_method} · ` : ""}{p.payment_date}</div>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <div className="text-sm font-extrabold text-ink">{formatCurrency(p.amount)}</div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${p.status === "paid" ? "bg-green-100 text-green-700" : p.status === "overdue" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{p.status}</span>
                              </div>
                              {p.status === "paid" && (
                                <button onClick={() => { setReceiptPayment(p); setReceiptFlat(tabFlat); }} className="px-2 py-1 rounded-lg border border-border-default text-[9px] font-semibold text-ink-muted hover:bg-white cursor-pointer whitespace-nowrap">🧾 Receipt</button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tabActive === "documents" && (
                    <div className="space-y-2">
                      {tabDocuments.length === 0 ? (
                        <div className="text-center py-8 text-ink-muted text-sm">No documents uploaded for this flat.</div>
                      ) : (
                        tabDocuments.map(doc => (
                          <div key={doc.id} className="flex justify-between items-center bg-warm-50 rounded-xl px-3 py-2.5">
                            <div>
                              <div className="text-xs font-bold text-ink">{doc.file_name}</div>
                              <div className="text-[10px] text-ink-muted capitalize">{doc.category} · {new Date(doc.created_at).toLocaleDateString("en-IN")}</div>
                            </div>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-600 text-[10px] font-semibold">Download</a>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tabActive === "complaints" && (
                    <div className="space-y-2">
                      {tabComplaints.length === 0 ? (
                        <div className="text-center py-8 text-ink-muted text-sm">No complaints raised for this flat.</div>
                      ) : (
                        tabComplaints.map(c => (
                          <div key={c.id} className="bg-warm-50 rounded-xl px-3 py-2.5">
                            <div className="flex justify-between items-start gap-2">
                              <div className="text-xs font-bold text-ink">{c.subject}</div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${c.status === "open" ? "bg-red-100 text-red-700" : c.status === "in_progress" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{c.status.replace("_", " ")}</span>
                            </div>
                            <div className="text-[10px] text-ink-muted mt-0.5">{c.category} · {c.priority} priority · {new Date(c.created_at).toLocaleDateString("en-IN")}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 pt-0">
              <button onClick={() => setTabFlat(null)} className="w-full py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Agreement Modal */}
      {agreementFlat && (
        <AgreementModal flat={agreementFlat} agreement={getAgreement(agreementFlat) ?? null} onClose={() => setAgreementFlat(null)} />
      )}

      {/* Edit Tenant Modal */}
      {editFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setEditFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="text-base font-extrabold text-ink">✎ Edit Tenant</div>
              <button onClick={() => setEditFlat(null)} className="text-ink-muted text-lg cursor-pointer">✕</button>
            </div>
            {loadingEdit ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-warm-100 rounded-xl animate-pulse" />)}</div>
            ) : (
              <form onSubmit={handleUpdateTenant} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelClass}>Full Name *</label><input required className={inputClass} value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                  <div><label className={labelClass}>Phone *</label><input required className={inputClass} maxLength={10} inputMode="numeric" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} /></div>
                </div>
                <div><label className={labelClass}>Email *</label><input required type="email" autoComplete="off" className={inputClass} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelClass}>Monthly Rent (₹) *</label><input required type="number" className={inputClass} value={editForm.monthly_rent} onChange={e => setEditForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
                  <div><label className={labelClass}>Security Deposit (₹)</label><input type="number" className={inputClass} value={editForm.security_deposit} onChange={e => setEditForm(f => ({ ...f, security_deposit: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelClass}>Lease Start *</label><input required type="date" className={inputClass} value={editForm.lease_start} onClick={e => e.currentTarget.showPicker?.()} onChange={e => setEditForm(f => ({ ...f, lease_start: e.target.value }))} /></div>
                  <div><label className={labelClass}>Lease End *</label><input required type="date" className={inputClass} value={editForm.lease_end} onClick={e => e.currentTarget.showPicker?.()} onChange={e => setEditForm(f => ({ ...f, lease_end: e.target.value }))} /></div>
                </div>
                <div className="bg-warm-50 rounded-xl p-3 border border-border-default">
                  <div className="text-xs font-bold text-ink mb-2">⏰ Late Payment Fee (optional)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Fee Type</label>
                      <select className={inputClass} value={editForm.late_fee_type} onChange={e => setEditForm(f => ({ ...f, late_fee_type: e.target.value as "percentage" | "fixed" }))}>
                        <option value="percentage">Percentage (%) of rent</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>{editForm.late_fee_type === "percentage" ? "% per day late" : "₹ per day late"}</label>
                      <input type="number" min="0" step="0.01" className={inputClass} placeholder={editForm.late_fee_type === "percentage" ? "e.g. 1" : "e.g. 100"} value={editForm.late_fee_value} onChange={e => setEditForm(f => ({ ...f, late_fee_value: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-warm-50 rounded-xl p-3 border border-border-default">
                  <input type="checkbox" checked={editForm.notifications_enabled} onChange={e => setEditForm(f => ({ ...f, notifications_enabled: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-[11px] font-semibold text-ink">Notify this tenant (Email &amp; WhatsApp)</span>
                </label>
                {!editForm.notifications_enabled && (
                  <div className="text-[10px] text-ink-muted -mt-2">Rent reminders, receipts, and all other automated messages will not be sent to this tenant until re-enabled.</div>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setEditFlat(null)} className="flex-1 py-2.5 rounded-xl border border-border-default text-sm font-bold cursor-pointer">Cancel</button>
                  <button type="submit" disabled={savingEdit} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold cursor-pointer disabled:opacity-60">{savingEdit ? "Saving..." : "Save Changes"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Remove Tenant Confirm */}
      {removeFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRemoveFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-sm p-5 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3">⚠️</div>
            <div className="text-base font-extrabold text-ink mb-1">Remove Tenant?</div>
            <div className="text-sm text-ink-muted mb-4">This will mark the tenant as inactive and free up the flat.</div>
            <div className="flex gap-2">
              <button onClick={() => setRemoveFlat(null)} className="flex-1 py-2.5 rounded-xl border border-border-default text-sm font-bold cursor-pointer">Cancel</button>
              <button onClick={handleRemoveTenant} disabled={removing} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold cursor-pointer disabled:opacity-60">{removing ? "Removing..." : "Remove"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
