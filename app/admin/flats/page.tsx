"use client";

import { useEffect, useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getAdminSociety, getAdminSocietyId, getSocietyFlats, createFlat, updateFlat, deleteFlat,
  getSocietyLandlordStats, getLandlordTenantStats,
  type AdminSociety, type AdminFlat,
} from "@/lib/admin-data";
import { addLandlordBySocietyAdmin, addTenant } from "@/lib/auth-db";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

function normalizePhone(phone: string): string {
  // Remove spaces, dashes, dots, brackets
  let d = phone.replace(/[\s\-\.\(\)]/g, "");
  // Strip leading +91, 91 (12-digit), or 0
  if (d.startsWith("+91")) d = d.slice(3);
  else if (d.startsWith("91") && d.length === 12) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return d;
}

function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return /^\d{10}$/.test(digits);
}

type FormData = {
  flat_number: string; block: string; floor_number: string; flat_type: string; area_sqft: string;
  owner_name: string; owner_phone: string; owner_email: string;
  tenant_name: string; tenant_phone: string; tenant_email: string; monthly_rent: string;
};

type CredResult = {
  role: "landlord" | "tenant";
  name: string;
  userId: string;
  password: string;
  loginEmail: string;
  flatLabel: string;
};

type BulkRowResult = {
  flat_number: string;
  block: string;
  owner_name: string;
  owner_user_id: string;
  owner_password: string;
  owner_login_email: string;
  tenant_name: string;
  tenant_user_id: string;
  tenant_password: string;
  tenant_login_email: string;
  status: string;
};

// ─── CREDENTIALS MODAL ───────────────────────────────────────

function CredentialsModal({ creds, onClose }: { creds: CredResult[]; onClose: () => void }) {
  function copyAll() {
    const text = creds.map(c =>
      `${c.role === "landlord" ? "Landlord" : "Tenant"}: ${c.name}\nFlat: ${c.flatLabel}\nUser ID: ${c.userId}\nPassword: ${c.password}\nEmail: ${c.loginEmail}`
    ).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("All credentials copied!");
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-green-50 rounded-t-[20px] px-5 pt-5 pb-4 border-b border-green-100 text-center">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-base font-extrabold text-green-700">
            {creds.length === 1 ? "User Created!" : `${creds.length} Users Created!`}
          </div>
          <div className="text-xs text-ink-muted mt-1">Share these login credentials immediately</div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {creds.map((c, i) => (
            <div key={i} className={`rounded-xl p-4 border space-y-2 ${c.role === "landlord" ? "bg-brand-50 border-brand-200" : "bg-indigo-50 border-indigo-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.role === "landlord" ? "bg-brand-100 text-brand-700" : "bg-indigo-100 text-indigo-700"}`}>
                  {c.role === "landlord" ? "🏠 LANDLORD" : "👤 TENANT"}
                </span>
                <span className="text-xs font-extrabold text-ink">{c.name}</span>
              </div>
              <div className="text-[10px] text-ink-muted">Flat {c.flatLabel}</div>

              <div>
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">User ID</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-extrabold text-center py-1.5 rounded-lg bg-white border border-border-default tracking-wider">
                    {c.userId}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(c.userId); toast.success("Copied!"); }}
                    className="text-[10px] font-bold text-brand-500 border border-brand-200 px-2 py-1.5 rounded-lg cursor-pointer"
                  >Copy</button>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Password</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-extrabold text-center py-1.5 rounded-lg bg-white border border-border-default tracking-wider">
                    {c.password}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(c.password); toast.success("Copied!"); }}
                    className="text-[10px] font-bold text-brand-500 border border-brand-200 px-2 py-1.5 rounded-lg cursor-pointer"
                  >Copy</button>
                </div>
              </div>

              <div className="text-[10px] text-ink-muted">Login: {c.loginEmail} or {c.userId}</div>
            </div>
          ))}

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-[11px] text-yellow-700 text-center">
            Screenshot these credentials — they won&apos;t be shown again.
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={copyAll} className="flex-1 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">
            📋 Copy All
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BULK RESULTS MODAL ───────────────────────────────────────

function BulkResultsModal({
  results, skipped, onDownload, onClose
}: {
  results: BulkRowResult[];
  skipped: number;
  onDownload: () => void;
  onClose: () => void;
}) {
  const created = results.filter(r => r.status === "created").length;
  const duplicates = results.filter(r => r.status === "duplicate").length;

  function statusLabel(s: string) {
    if (s === "created") return { label: "OK", cls: "bg-green-100 text-green-700" };
    if (s === "duplicate") return { label: "Duplicate", cls: "bg-yellow-100 text-yellow-700" };
    if (s === "skipped_limit") return { label: "Plan limit", cls: "bg-red-100 text-red-600" };
    if (s === "invalid_phone") return { label: "Bad phone", cls: "bg-orange-100 text-orange-700" };
    return { label: "Error", cls: "bg-gray-100 text-gray-600" };
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4 border-b border-border-default">
          <div className="text-base font-extrabold text-ink">📊 Import Results</div>
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            <span className="text-green-700 font-bold">✅ {created} created</span>
            {duplicates > 0 && <span className="text-yellow-700 font-bold">⚠ {duplicates} duplicate</span>}
            {skipped > 0 && <span className="text-red-600 font-bold">❌ {skipped} skipped (plan limit)</span>}
          </div>
        </div>

        <div className="px-5 py-3 max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-warm-50">
              <tr>
                <th className="py-1 text-left font-bold text-ink-muted">Flat</th>
                <th className="py-1 text-left font-bold text-ink-muted">Owner ID</th>
                <th className="py-1 text-left font-bold text-ink-muted">Tenant ID</th>
                <th className="py-1 text-left font-bold text-ink-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const { label, cls } = statusLabel(r.status);
                return (
                  <tr key={i} className="border-b border-border-light">
                    <td className="py-1 font-semibold">{r.flat_number}{r.block ? ` (${r.block})` : ""}</td>
                    <td className="py-1 font-mono text-brand-600">{r.owner_user_id || "—"}</td>
                    <td className="py-1 font-mono text-indigo-600">{r.tenant_user_id || "—"}</td>
                    <td className="py-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cls}`}>{label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {skipped > 0 && (
          <div className="mx-5 mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 text-[11px] text-orange-700">
            <b>Only {results.filter(r => r.status === "created").length} allowed slots used. {skipped} record{skipped > 1 ? "s" : ""} not inserted due to plan limit.</b>
            <br />Contact admin to purchase more slots.
          </div>
        )}
        {duplicates > 0 && (
          <div className="mx-5 mt-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-[11px] text-yellow-700">
            <b>{duplicates} duplicate flat{duplicates > 1 ? "s" : ""} skipped</b> — already exist in this society.
          </div>
        )}

        <div className="px-5 py-4 flex gap-2">
          <button onClick={onDownload} className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-xs font-bold cursor-pointer">
            ⬇ Download CSV with Credentials
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AdminFlats() {
  const { user } = useAuth();
  const [society, setSociety] = useState<AdminSociety | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [flats, setFlats] = useState<AdminFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedFlat, setExpandedFlat] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<string>("info");
  const [editingFlat, setEditingFlat] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<AdminFlat>>({});
  const [landlordStats, setLandlordStats] = useState<{ count: number; limit: number } | null>(null);

  // Search / filter / pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "occupied" | "vacant">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Bulk preview: checkboxes + search
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [previewSearch, setPreviewSearch] = useState("");

  // Credential display state
  const [credentials, setCredentials] = useState<CredResult[] | null>(null);
  const [bulkResults, setBulkResults] = useState<{ results: BulkRowResult[]; skipped: number } | null>(null);

  const [form, setForm] = useState<FormData>({
    flat_number: "", block: "", floor_number: "", flat_type: "", area_sqft: "",
    owner_name: "", owner_phone: "", owner_email: "",
    tenant_name: "", tenant_phone: "", tenant_email: "", monthly_rent: "",
  });

  async function loadData() {
    if (!user?.email) return;
    try {
      const [soc, sid] = await Promise.all([
        getAdminSociety(user.email),
        getAdminSocietyId(user.email),
      ]);
      setSociety(soc);
      setSocietyId(sid);
      if (sid) {
        const [f, stats] = await Promise.all([
          getSocietyFlats(sid),
          getSocietyLandlordStats(sid),
        ]);
        setFlats(f);
        setLandlordStats(stats);
      }
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to load");
    }
  }

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [user]);

  // ─── FILTERED + PAGINATED FLATS ──────────────────────────

  const filteredFlats = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return flats.filter(flat => {
      if (filterStatus === "occupied" && flat.status !== "occupied") return false;
      if (filterStatus === "vacant" && flat.status === "occupied") return false;
      if (!q) return true;
      const owner = (flat.owner as { full_name: string } | null);
      const tenant = (flat.tenant as { user?: { full_name: string } | null } | null)?.user;
      return (
        flat.flat_number.toLowerCase().includes(q) ||
        (flat.block ?? "").toLowerCase().includes(q) ||
        (owner?.full_name ?? flat.owner_name ?? "").toLowerCase().includes(q) ||
        (tenant?.full_name ?? flat.tenant_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [flats, searchQuery, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredFlats.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedFlats = filteredFlats.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset to page 1 when search/filter changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterStatus, pageSize]);

  // ─── DUPLICATE CHECK ─────────────────────────────────────

  async function checkFlatDuplicate(sid: string, flatNumber: string, block: string | null) {
    let query = supabase
      .from("flats")
      .select("id", { count: "exact", head: true })
      .eq("society_id", sid)
      .eq("flat_number", flatNumber);

    if (block) {
      query = query.eq("block", block);
    } else {
      query = query.is("block", null);
    }

    const { count } = await query;
    return (count ?? 0) > 0;
  }

  // ─── ADD FLAT (with optional user creation) ───────────────

  async function handleAddFlat(e: React.FormEvent) {
    e.preventDefault();
    if (!societyId) return;
    setSaving(true);

    const flatLabel = `${form.flat_number}${form.block ? ` (${form.block})` : ""}`;
    const newCreds: CredResult[] = [];

    try {
      // 1. Phone validation
      if (form.owner_phone && !isValidPhone(form.owner_phone)) {
        toast.error("Enter valid 10-digit mobile number for owner");
        setSaving(false);
        return;
      }
      if (form.tenant_phone && !isValidPhone(form.tenant_phone)) {
        toast.error("Enter valid 10-digit mobile number for tenant");
        setSaving(false);
        return;
      }

      // 2. Duplicate check
      const isDup = await checkFlatDuplicate(societyId, form.flat_number, form.block || null);
      if (isDup) {
        toast.error(`Flat ${form.flat_number}${form.block ? ` in Block ${form.block}` : ""} already exists.`);
        setSaving(false);
        return;
      }

      // 3. Check landlord limit — always fetch fresh count (don't rely on cached state)
      const wantsLandlord = !!(form.owner_name && form.owner_phone);
      if (wantsLandlord) {
        const freshStats = await getSocietyLandlordStats(societyId);
        setLandlordStats(freshStats);
        if (freshStats.count >= freshStats.limit) {
          toast.error(
            `Plan limit reached: only ${freshStats.limit} landlord${freshStats.limit !== 1 ? "s" : ""} allowed. Contact admin to purchase more slots.`,
            { duration: 5000 }
          );
          setSaving(false);
          return;
        }
      }

      // 3. Create flat
      const newFlat = await createFlat(societyId, {
        flat_number: form.flat_number,
        block: form.block || null,
        floor_number: form.floor_number ? Number(form.floor_number) : null,
        flat_type: form.flat_type || null,
        area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
        owner_name: wantsLandlord ? form.owner_name : (form.owner_name || null),
        owner_phone: wantsLandlord ? form.owner_phone : (form.owner_phone || null),
        owner_email: form.owner_email || null,
        tenant_name: form.tenant_name || null,
        tenant_phone: form.tenant_phone || null,
        tenant_email: form.tenant_email || null,
      });

      // 4. Create landlord user (if owner details provided)
      let landlordUserId: string | null = null;
      if (wantsLandlord) {
        const lResult = await addLandlordBySocietyAdmin({
          full_name: form.owner_name,
          phone: form.owner_phone,
          email: form.owner_email || undefined,
          society_id: societyId,
          flat_id: newFlat.id,
        });
        if (lResult.success && lResult.generatedUserId) {
          landlordUserId = lResult.userId!;
          newCreds.push({
            role: "landlord",
            name: form.owner_name,
            userId: lResult.generatedUserId,
            password: lResult.generatedPassword!,
            loginEmail: lResult.loginEmail!,
            flatLabel,
          });
          setLandlordStats(prev => prev ? { ...prev, count: prev.count + 1 } : prev);
        } else {
          toast.error(lResult.error ?? "Failed to create landlord user.");
        }
      }

      // 5. Create tenant user (if tenant details + landlord known)
      const wantsTenant = !!(form.tenant_name && form.tenant_phone);
      if (wantsTenant && landlordUserId) {
        const tenantStats = await getLandlordTenantStats(landlordUserId);
        if (tenantStats.count >= tenantStats.limit) {
          toast.error(
            `Landlord's plan allows ${tenantStats.limit} tenants. Contact admin to purchase more slots.`,
            { duration: 5000 }
          );
        } else {
          const today = new Date().toISOString().split("T")[0];
          const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];
          const tResult = await addTenant({
            full_name: form.tenant_name,
            email: form.tenant_email || "",
            phone: form.tenant_phone,
            flat_id: newFlat.id,
            society_id: societyId,
            landlord_id: landlordUserId,
            monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : 0,
            security_deposit: 0,
            lease_start: today,
            lease_end: nextYear,
          });
          if (tResult.success && tResult.generatedUserId) {
            newCreds.push({
              role: "tenant",
              name: form.tenant_name,
              userId: tResult.generatedUserId,
              password: tResult.generatedPassword!,
              loginEmail: tResult.loginEmail!,
              flatLabel,
            });
          } else if (!tResult.success) {
            toast.error(tResult.error ?? "Failed to create tenant user.");
          }
        }
      } else if (wantsTenant && !landlordUserId) {
        toast("Tenant details saved. Create landlord first to generate tenant login.", { icon: "ℹ️" });
      }

      setFlats(prev => [...prev, newFlat as AdminFlat]);
      setForm({
        flat_number: "", block: "", floor_number: "", flat_type: "", area_sqft: "",
        owner_name: "", owner_phone: "", owner_email: "",
        tenant_name: "", tenant_phone: "", tenant_email: "", monthly_rent: "",
      });
      setShowForm(false);

      if (newCreds.length > 0) {
        setCredentials(newCreds);
      } else {
        toast.success("Flat added!");
      }
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to add flat");
    } finally {
      setSaving(false);
    }
  }

  // ─── SAVE FLAT DETAILS (edit) ─────────────────────────────

  async function handleSaveFlatDetails(flatId: string) {
    try {
      const updated = await updateFlat(flatId, editFormData);
      setFlats(prev => prev.map(f => f.id === flatId ? updated as AdminFlat : f));
      setEditingFlat(null);
      setEditFormData({});
      toast.success("Flat updated!");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to save flat");
    }
  }

  // ─── CSV HELPERS ──────────────────────────────────────────

  function downloadSampleCSV() {
    const headers = ["flat_number", "block", "floor_number", "flat_type", "area_sqft", "monthly_rent",
      "owner_name", "owner_phone", "owner_email", "tenant_name", "tenant_phone", "tenant_email"];
    const sampleRow = ["101", "A", "1", "2BHK", "900", "15000",
      "Rajesh Kumar", "9876511111", "rajesh@example.com", "Amit Singh", "9876522222", "amit@example.com"];
    const csv = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "flats_sample.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function parseCSV(text: string): Record<string, string>[] {
    // Normalise line endings (Windows \r\n, old Mac \r, Unix \n)
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map(line => {
      // Simple quoted-field-aware split
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

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = ""; // reset immediately so same file can re-trigger
    if (!file) return;
    try {
      const text = await file.text();
      const data = parseCSV(text);
      if (data.length === 0) {
        toast.error("Invalid CSV format. Download the sample CSV for the correct format.");
        return;
      }
      setPreviewData(data);
      setSelectedRows(new Set(data.map((_, i) => i)));
      setPreviewSearch("");
      setShowPreview(true);
    } catch {
      toast.error("Could not read the file. Please try again.");
    }
  }

  async function confirmBulkImport() {
    if (!societyId) return;
    setUploadingBulk(true);

    const resultsArr: BulkRowResult[] = [];
    let totalSkipped = 0;

    try {
      const stats = await getSocietyLandlordStats(societyId);
      let availableLandlordSlots = Math.max(0, stats.limit - stats.count);

      // Only import selected rows
      const rowsToImport = previewData.filter((_, i) => selectedRows.has(i));

      for (const row of rowsToImport) {
        const result: BulkRowResult = {
          flat_number: row.flat_number || "(unknown)",
          block: row.block || "",
          owner_name: row.owner_name || "",
          owner_user_id: "",
          owner_password: "",
          owner_login_email: "",
          tenant_name: row.tenant_name || "",
          tenant_user_id: "",
          tenant_password: "",
          tenant_login_email: "",
          status: "created",
        };

        try {
          // Validate flat_number is present
          if (!row.flat_number?.trim()) {
            result.status = "error";
            resultsArr.push(result);
            continue;
          }

          const ownerPhone = normalizePhone(row.owner_phone || "");
          const tenantPhone = normalizePhone(row.tenant_phone || "");
          const wantsLandlord = !!(row.owner_name && row.owner_phone);
          const wantsTenant = !!(row.tenant_name && row.tenant_phone);

          // Phone validation — skip row if phone is invalid
          if (wantsLandlord && !isValidPhone(row.owner_phone)) {
            result.status = "invalid_phone";
            resultsArr.push(result);
            continue;
          }
          if (wantsTenant && !isValidPhone(row.tenant_phone)) {
            result.status = "invalid_phone";
            resultsArr.push(result);
            continue;
          }

          // Enforce subscription limit BEFORE inserting anything
          if (wantsLandlord && availableLandlordSlots <= 0) {
            result.status = "skipped_limit";
            totalSkipped++;
            resultsArr.push(result);
            continue;
          }

          // Duplicate check
          const isDup = await checkFlatDuplicate(societyId, row.flat_number, row.block || null);
          if (isDup) {
            result.status = "duplicate";
            resultsArr.push(result);
            continue;
          }

          // Create flat (use normalized phones)
          let newFlatId: string | null = null;
          const newFlat = await createFlat(societyId, {
            flat_number: row.flat_number,
            block: row.block || null,
            floor_number: row.floor_number ? Number(row.floor_number) : null,
            flat_type: row.flat_type || null,
            area_sqft: row.area_sqft ? Number(row.area_sqft) : null,
            owner_name: row.owner_name || null,
            owner_phone: wantsLandlord ? ownerPhone : null,
            owner_email: row.owner_email || null,
            tenant_name: row.tenant_name || null,
            tenant_phone: wantsTenant ? tenantPhone : null,
            tenant_email: row.tenant_email || null,
          });
          newFlatId = newFlat.id;

          // Create landlord user
          let landlordUserId: string | null = null;
          if (wantsLandlord) {
            const lResult = await addLandlordBySocietyAdmin({
              full_name: row.owner_name,
              phone: ownerPhone,
              email: row.owner_email || undefined,
              society_id: societyId,
              flat_id: newFlatId ?? undefined,
            });
            if (lResult.success) {
              landlordUserId = lResult.userId!;
              result.owner_user_id = lResult.generatedUserId ?? "";
              result.owner_password = lResult.generatedPassword ?? "";
              result.owner_login_email = lResult.loginEmail ?? "";
              availableLandlordSlots--;
            }
          }

          // Create tenant if landlord known
          if (wantsTenant && landlordUserId && newFlatId) {
            const tenantStats = await getLandlordTenantStats(landlordUserId);
            if (tenantStats.count < tenantStats.limit) {
              const today = new Date().toISOString().split("T")[0];
              const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];
              const tResult = await addTenant({
                full_name: row.tenant_name,
                email: row.tenant_email || "",
                phone: tenantPhone,
                flat_id: newFlatId,
                society_id: societyId,
                landlord_id: landlordUserId,
                monthly_rent: row.monthly_rent ? Number(row.monthly_rent) : 0,
                security_deposit: 0,
                lease_start: today,
                lease_end: nextYear,
              });
              if (tResult.success) {
                result.tenant_user_id = tResult.generatedUserId ?? "";
                result.tenant_password = tResult.generatedPassword ?? "";
                result.tenant_login_email = tResult.loginEmail ?? "";
              }
            }
          }
        } catch {
          result.status = "error";
        }

        resultsArr.push(result);
      }
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to import flats");
    }

    // Always show results modal and refresh stats — even if some error occurred
    setShowPreview(false);
    setPreviewData([]);
    setSelectedRows(new Set());
    if (resultsArr.length > 0) {
      setBulkResults({ results: resultsArr, skipped: totalSkipped });
    }

    // Refresh flats list + landlord count
    try {
      const [f, newStats] = await Promise.all([
        getSocietyFlats(societyId),
        getSocietyLandlordStats(societyId),
      ]);
      setFlats(f);
      setLandlordStats(newStats);
    } catch {
      // non-critical — page data will refresh on next load
    }

    setUploadingBulk(false);
  }

  function downloadResultsCSV() {
    if (!bulkResults) return;
    const headers = [
      "flat_number", "block", "status",
      "owner_name", "owner_user_id", "owner_password", "owner_login_email",
      "tenant_name", "tenant_user_id", "tenant_password", "tenant_login_email",
    ];
    const rows = bulkResults.results.map(r =>
      [
        r.flat_number, r.block, r.status,
        r.owner_name, r.owner_user_id, r.owner_password, r.owner_login_email,
        r.tenant_name, r.tenant_user_id, r.tenant_password, r.tenant_login_email,
      ].map(v => `"${(v ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "import_results_with_credentials.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  async function handleDeleteFlat(flatId: string) {
    if (!confirm("Delete this flat?")) return;
    try {
      await deleteFlat(flatId);
      setFlats(prev => prev.filter(f => f.id !== flatId));
      toast.success("Flat deleted.");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to delete flat");
    }
  }

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const slotsLeft = landlordStats ? Math.max(0, landlordStats.limit - landlordStats.count) : null;

  // Bulk preview filtered rows
  const filteredPreview = previewSearch.trim()
    ? previewData.filter(r =>
        r.flat_number?.toLowerCase().includes(previewSearch.toLowerCase()) ||
        r.block?.toLowerCase().includes(previewSearch.toLowerCase()) ||
        r.owner_name?.toLowerCase().includes(previewSearch.toLowerCase()) ||
        r.tenant_name?.toLowerCase().includes(previewSearch.toLowerCase())
      )
    : previewData;

  const allFilteredSelected = filteredPreview.length > 0 &&
    filteredPreview.every((_, i) => {
      const globalIdx = previewData.indexOf(filteredPreview[i]);
      return selectedRows.has(globalIdx);
    });

  function toggleSelectAll() {
    const globalIndices = filteredPreview.map(r => previewData.indexOf(r));
    if (allFilteredSelected) {
      setSelectedRows(prev => {
        const next = new Set(prev);
        globalIndices.forEach(i => next.delete(i));
        return next;
      });
    } else {
      setSelectedRows(prev => {
        const next = new Set(prev);
        globalIndices.forEach(i => next.add(i));
        return next;
      });
    }
  }

  return (
    <div>
      <Toaster position="top-center" />

      {/* Credentials modal */}
      {credentials && <CredentialsModal creds={credentials} onClose={() => setCredentials(null)} />}

      {/* Bulk results modal */}
      {bulkResults && (
        <BulkResultsModal
          results={bulkResults.results}
          skipped={bulkResults.skipped}
          onDownload={downloadResultsCSV}
          onClose={() => setBulkResults(null)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">🏢 All Flats — {society?.name ?? "—"}</h2>
          {landlordStats && (
            <div className="text-[11px] text-ink-muted mt-0.5">
              Landlords: <b>{landlordStats.count}/{landlordStats.limit}</b>
              {slotsLeft === 0 && (
                <span className="ml-2 text-red-500 font-semibold">Plan limit reached</span>
              )}
              {slotsLeft !== null && slotsLeft > 0 && slotsLeft <= 2 && (
                <span className="ml-2 text-orange-500 font-semibold">{slotsLeft} slot{slotsLeft > 1 ? "s" : ""} left</span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadSampleCSV} className="px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-bold cursor-pointer">
            📥 Sample CSV
          </button>
          <label className="px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold cursor-pointer">
            📤 Bulk Upload
            <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
          </label>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
            {showForm ? "Cancel" : "+ Add Flat"}
          </button>
        </div>
      </div>

      {/* Limit warning banner */}
      {slotsLeft === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-[14px] p-4 mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-orange-700">Landlord limit reached</div>
            <div className="text-xs text-orange-600 mt-0.5">
              Your plan allows {landlordStats?.limit} landlords. Contact admin to purchase more slots.
            </div>
          </div>
          <span className="text-2xl">📊</span>
        </div>
      )}

      {/* Bulk import preview */}
      {showPreview && (
        <div className="bg-white rounded-[14px] p-4 border border-yellow-300 mb-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="text-sm font-bold text-ink">
              📋 Import Preview ({previewData.length} rows · {selectedRows.size} selected)
            </div>
            {landlordStats && (
              <div className="text-xs text-ink-muted">
                Landlord slots: <b className={slotsLeft === 0 ? "text-red-500" : "text-green-600"}>{slotsLeft}</b>
                {slotsLeft !== null && previewData.filter(r => r.owner_name).length > slotsLeft && (
                  <span className="ml-1 text-red-500">
                    — {previewData.filter(r => r.owner_name).length - slotsLeft!} will be skipped
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Preview search */}
          <input
            className="w-full border border-border-default rounded-xl px-3 py-1.5 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 mb-2"
            placeholder="Search preview rows..."
            value={previewSearch}
            onChange={e => setPreviewSearch(e.target.value)}
          />

          <div className="overflow-x-auto max-h-72 overflow-y-auto mb-3 border border-border-light rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-warm-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-center w-8">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold w-6">#</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Flat</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Block</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Floor</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Type</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Area</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Owner Name</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Owner Phone</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Owner Email</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Tenant Name</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Tenant Phone</th>
                  <th className="px-2 py-1.5 text-left text-ink-muted font-bold">Tenant Email</th>
                </tr>
              </thead>
              <tbody>
                {filteredPreview.map((row, idx) => {
                  const globalIdx = previewData.indexOf(row);
                  const isSelected = selectedRows.has(globalIdx);
                  return (
                    <tr
                      key={globalIdx}
                      className={`border-b border-border-light cursor-pointer ${isSelected ? "bg-brand-50" : "hover:bg-warm-50"}`}
                      onClick={() => {
                        setSelectedRows(prev => {
                          const next = new Set(prev);
                          if (next.has(globalIdx)) next.delete(globalIdx); else next.add(globalIdx);
                          return next;
                        });
                      }}
                    >
                      <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedRows(prev => {
                              const next = new Set(prev);
                              if (next.has(globalIdx)) next.delete(globalIdx); else next.add(globalIdx);
                              return next;
                            });
                          }}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-ink-muted">{globalIdx + 1}</td>
                      <td className="px-2 py-1.5 font-semibold">{row.flat_number || "—"}</td>
                      <td className="px-2 py-1.5">{row.block || "—"}</td>
                      <td className="px-2 py-1.5">{row.floor_number || "—"}</td>
                      <td className="px-2 py-1.5">{row.flat_type || "—"}</td>
                      <td className="px-2 py-1.5">{row.area_sqft ? `${row.area_sqft} sqft` : "—"}</td>
                      <td className="px-2 py-1.5 text-ink-muted">{row.owner_name || "—"}</td>
                      <td className="px-2 py-1.5 text-ink-muted">{row.owner_phone || "—"}</td>
                      <td className="px-2 py-1.5 text-ink-muted">{row.owner_email || "—"}</td>
                      <td className="px-2 py-1.5 text-ink-muted">{row.tenant_name || "—"}</td>
                      <td className="px-2 py-1.5 text-ink-muted">{row.tenant_phone || "—"}</td>
                      <td className="px-2 py-1.5 text-ink-muted">{row.tenant_email || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              onClick={confirmBulkImport}
              disabled={uploadingBulk || selectedRows.size === 0}
              className="flex-1 py-2 rounded-xl bg-green-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {uploadingBulk ? "Importing..." : `✓ Import ${selectedRows.size} Selected`}
            </button>
            <button
              onClick={() => { setShowPreview(false); setPreviewData([]); setSelectedRows(new Set()); }}
              className="flex-1 py-2 rounded-xl bg-gray-300 text-ink text-xs font-bold cursor-pointer"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add flat form */}
      {showForm && (
        <form onSubmit={handleAddFlat} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="text-sm font-bold text-ink">Add New Flat</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Flat Number *</label>
              <input required className={inputClass} placeholder="e.g. 101" value={form.flat_number} onChange={e => setForm(f => ({ ...f, flat_number: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Block</label>
              <input className={inputClass} placeholder="e.g. A" value={form.block} onChange={e => setForm(f => ({ ...f, block: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Floor</label>
              <input type="number" className={inputClass} placeholder="1" value={form.floor_number} onChange={e => setForm(f => ({ ...f, floor_number: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <input className={inputClass} placeholder="2BHK" value={form.flat_type} onChange={e => setForm(f => ({ ...f, flat_type: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Area (sqft)</label>
              <input type="number" className={inputClass} placeholder="900" value={form.area_sqft} onChange={e => setForm(f => ({ ...f, area_sqft: e.target.value }))} />
            </div>
          </div>

          <div className="border-t border-border-light pt-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-xs font-bold text-ink-muted">Owner / Landlord (optional)</div>
              {slotsLeft === 0 && (
                <span className="text-[10px] text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded-full">Limit reached</span>
              )}
              {slotsLeft !== null && slotsLeft > 0 && (
                <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                  {slotsLeft} slot{slotsLeft > 1 ? "s" : ""} left
                </span>
              )}
            </div>
            {slotsLeft === 0 ? (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-700">
                Landlord limit reached ({landlordStats?.limit}). Contact admin to upgrade plan.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>Name</label>
                  <input className={inputClass} placeholder="Owner name" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Phone *</label>
                  <input className={inputClass} placeholder="10-digit mobile" maxLength={10} inputMode="numeric" value={form.owner_phone} onChange={e => setForm(f => ({ ...f, owner_phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} />
                </div>
                <div>
                  <label className={labelClass}>Email (optional)</label>
                  <input className={inputClass} placeholder="Email" value={form.owner_email} onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))} />
                </div>
              </div>
            )}
            {form.owner_name && form.owner_phone && (
              <div className="text-[10px] text-brand-600 mt-1.5">
                ✓ Landlord account will be created with auto User ID + password
              </div>
            )}
          </div>

          <div className="border-t border-border-light pt-3">
            <div className="text-xs font-bold text-ink-muted mb-2">Tenant (optional)</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className={labelClass}>Name</label>
                <input className={inputClass} placeholder="Tenant name" value={form.tenant_name} onChange={e => setForm(f => ({ ...f, tenant_name: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Phone *</label>
                <input className={inputClass} placeholder="10-digit mobile" maxLength={10} inputMode="numeric" value={form.tenant_phone} onChange={e => setForm(f => ({ ...f, tenant_phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} />
              </div>
              <div>
                <label className={labelClass}>Email (optional)</label>
                <input className={inputClass} placeholder="Email" value={form.tenant_email} onChange={e => setForm(f => ({ ...f, tenant_email: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Monthly Rent (₹)</label>
                <input type="number" className={inputClass} placeholder="e.g. 15000" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} />
              </div>
            </div>
            {form.tenant_name && form.tenant_phone && !form.owner_phone && (
              <div className="text-[10px] text-orange-500">
                ⚠ Tenant account requires a landlord. Add owner details above.
              </div>
            )}
            {form.tenant_name && form.tenant_phone && form.owner_phone && (
              <div className="text-[10px] text-brand-600">
                ✓ Tenant account will be created with auto User ID + password
              </div>
            )}
          </div>

          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60 mt-2">
            {saving ? "Creating..." : "Add Flat"}
          </button>
        </form>
      )}

      {/* Search + Filter + Pagination Controls */}
      {flats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <input
            className="flex-1 min-w-[160px] border border-border-default rounded-xl px-3 py-1.5 text-xs text-ink bg-white focus:outline-none focus:border-brand-500"
            placeholder="Search flat, block, owner, tenant..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select
            className="border border-border-default rounded-xl px-2 py-1.5 text-xs text-ink bg-white focus:outline-none"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as "all" | "occupied" | "vacant")}
          >
            <option value="all">All</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
          </select>
          <select
            className="border border-border-default rounded-xl px-2 py-1.5 text-xs text-ink bg-white focus:outline-none"
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map(s => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>
          <span className="text-[11px] text-ink-muted whitespace-nowrap">
            {filteredFlats.length === 0 ? "0" : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredFlats.length)}`} of {filteredFlats.length}
          </span>
        </div>
      )}

      {/* Flat list */}
      {flats.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No flats yet. Add one above.</div>
      ) : filteredFlats.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm bg-white rounded-[14px] border border-dashed border-border-default">
          No flats match your search.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {paginatedFlats.map(flat => {
              const isExpanded = expandedFlat === flat.id;
              const isEditing = editingFlat === flat.id;
              const linkedOwner = (flat.owner as { full_name: string; phone: string; email: string } | null);
              const linkedTenant = (flat.tenant as { user?: { full_name: string; phone: string; email: string } | null } | null)?.user;
              const ownerDisplay = linkedOwner?.full_name || flat.owner_name || "Not set";
              const tenantDisplay = linkedTenant?.full_name || flat.tenant_name || "Not set";
              const currentTab = isExpanded ? detailTab : "info";

              return (
                <div key={flat.id} className={`bg-white rounded-[14px] border border-border-default border-l-4 ${flat.status === "occupied" ? "border-l-green-500" : "border-l-gray-400"} overflow-hidden`}>
                  <div className="p-4">
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <span className="text-base font-extrabold text-ink">{flat.flat_number}{flat.block ? ` (${flat.block})` : ""}</span>
                      <div className="flex gap-1 items-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${flat.status === "occupied" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {flat.status}
                        </span>
                        <button onClick={() => handleDeleteFlat(flat.id)} className="text-[10px] text-red-400 font-semibold cursor-pointer">Delete</button>
                      </div>
                    </div>
                    <div className="text-xs text-ink-muted">
                      {flat.flat_type ?? "—"}{flat.area_sqft ? ` • ${flat.area_sqft} sqft` : ""}
                      {flat.floor_number != null ? ` • Floor ${flat.floor_number}` : ""}
                    </div>
                    <div className="text-xs text-ink mt-2">
                      👤 Owner: <b>{ownerDisplay}</b>
                      {linkedOwner && <span className="ml-1 text-[9px] text-green-600 font-semibold">✓</span>}
                    </div>
                    <div className="text-xs text-ink">
                      🏡 Tenant: <b>{tenantDisplay}</b>
                      {linkedTenant && <span className="ml-1 text-[9px] text-green-600 font-semibold">✓</span>}
                    </div>
                    {flat.maintenance_amount != null && <div className="text-[11px] text-ink-muted mt-1">💰 Maintenance: {formatCurrency(flat.maintenance_amount)}/mo</div>}
                    <button
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedFlat(null);
                        } else {
                          setExpandedFlat(flat.id);
                          setDetailTab("info");
                        }
                      }}
                      className="text-[10px] text-brand-500 font-semibold cursor-pointer mt-2"
                    >
                      {isExpanded ? "▼ Hide Details" : "▶ Show Details"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border-light">
                      {/* Tabs */}
                      <div className="flex border-b border-border-light bg-warm-50">
                        {(["info", "documents", "agreement", "complaints"] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setDetailTab(tab)}
                            className={`flex-1 py-2 text-[10px] font-bold capitalize cursor-pointer transition-colors ${
                              currentTab === tab
                                ? "text-brand-600 border-b-2 border-brand-500 bg-white"
                                : "text-ink-muted hover:text-ink"
                            }`}
                          >
                            {tab === "info" ? "📋 Info" : tab === "documents" ? "📄 Docs" : tab === "agreement" ? "📝 Agreement" : "🔔 Complaints"}
                          </button>
                        ))}
                      </div>

                      <div className="bg-warm-50 p-4 space-y-4">
                        {/* Info Tab */}
                        {currentTab === "info" && (
                          isEditing ? (
                            <>
                              <div>
                                <div className="text-xs font-bold text-ink-muted mb-2">Owner Details {linkedOwner && "(Linked User)"}</div>
                                <div className="space-y-2">
                                  <input className={inputClass} placeholder="Name" value={(editFormData.owner_name ?? flat.owner_name) || ""} onChange={e => setEditFormData(prev => ({ ...prev, owner_name: e.target.value }))} disabled={!!linkedOwner} />
                                  <input className={inputClass} placeholder="10-digit mobile" maxLength={10} inputMode="numeric" value={(editFormData.owner_phone ?? flat.owner_phone) || ""} onChange={e => setEditFormData(prev => ({ ...prev, owner_phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} disabled={!!linkedOwner} />
                                  <input className={inputClass} placeholder="Email" value={(editFormData.owner_email ?? flat.owner_email) || ""} onChange={e => setEditFormData(prev => ({ ...prev, owner_email: e.target.value }))} disabled={!!linkedOwner} />
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-ink-muted mb-2">Tenant Details {linkedTenant && "(Linked User)"}</div>
                                <div className="space-y-2">
                                  <input className={inputClass} placeholder="Name" value={(editFormData.tenant_name ?? flat.tenant_name) || ""} onChange={e => setEditFormData(prev => ({ ...prev, tenant_name: e.target.value }))} disabled={!!linkedTenant} />
                                  <input className={inputClass} placeholder="10-digit mobile" maxLength={10} inputMode="numeric" value={(editFormData.tenant_phone ?? flat.tenant_phone) || ""} onChange={e => setEditFormData(prev => ({ ...prev, tenant_phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} disabled={!!linkedTenant} />
                                  <input className={inputClass} placeholder="Email" value={(editFormData.tenant_email ?? flat.tenant_email) || ""} onChange={e => setEditFormData(prev => ({ ...prev, tenant_email: e.target.value }))} disabled={!!linkedTenant} />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveFlatDetails(flat.id)} className="flex-1 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-bold cursor-pointer">✓ Save</button>
                                <button onClick={() => { setEditingFlat(null); setEditFormData({}); }} className="flex-1 py-1.5 rounded-lg bg-gray-300 text-ink text-[10px] font-bold cursor-pointer">✕ Cancel</button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <div className="text-xs font-bold text-ink-muted mb-1">Owner</div>
                                {linkedOwner ? (
                                  <div className="text-xs text-ink">
                                    <b>{linkedOwner.full_name}</b>
                                    <div className="text-[10px] text-ink-muted">{linkedOwner.phone} · {linkedOwner.email}</div>
                                    <span className="text-[9px] text-green-600 font-semibold">✓ Linked User Account</span>
                                  </div>
                                ) : flat.owner_name ? (
                                  <div className="text-xs text-ink">
                                    <b>{flat.owner_name}</b>
                                    <div className="text-[10px] text-ink-muted">{flat.owner_phone} · {flat.owner_email}</div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-ink-muted">Not set</div>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-ink-muted mb-1">Tenant</div>
                                {linkedTenant ? (
                                  <div className="text-xs text-ink">
                                    <b>{linkedTenant.full_name}</b>
                                    <div className="text-[10px] text-ink-muted">{linkedTenant.phone} · {linkedTenant.email}</div>
                                    <span className="text-[9px] text-green-600 font-semibold">✓ Linked User Account</span>
                                  </div>
                                ) : flat.tenant_name ? (
                                  <div className="text-xs text-ink">
                                    <b>{flat.tenant_name}</b>
                                    <div className="text-[10px] text-ink-muted">{flat.tenant_phone} · {flat.tenant_email}</div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-ink-muted">Not set</div>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setEditingFlat(flat.id);
                                  setEditFormData({
                                    owner_name: flat.owner_name || "", owner_phone: flat.owner_phone || "", owner_email: flat.owner_email || "",
                                    tenant_name: flat.tenant_name || "", tenant_phone: flat.tenant_phone || "", tenant_email: flat.tenant_email || "",
                                  });
                                }}
                                className="w-full py-1.5 rounded-lg bg-brand-500 text-white text-[10px] font-bold cursor-pointer"
                              >
                                ✏️ Edit Details
                              </button>
                            </>
                          )
                        )}

                        {/* Documents Tab */}
                        {currentTab === "documents" && (
                          <div className="text-center py-6">
                            <div className="text-2xl mb-2">📄</div>
                            <div className="text-xs font-semibold text-ink-muted">No documents uploaded</div>
                            <div className="text-[10px] text-ink-muted mt-1">Documents feature coming soon</div>
                          </div>
                        )}

                        {/* Agreement Tab */}
                        {currentTab === "agreement" && (
                          <div className="text-center py-6">
                            <div className="text-2xl mb-2">📝</div>
                            <div className="text-xs font-semibold text-ink-muted">No agreement on file</div>
                            <div className="text-[10px] text-ink-muted mt-1">Lease agreement management coming soon</div>
                          </div>
                        )}

                        {/* Complaints Tab */}
                        {currentTab === "complaints" && (
                          <div className="text-center py-6">
                            <div className="text-2xl mb-2">🔔</div>
                            <div className="text-xs font-semibold text-ink-muted">No complaints</div>
                            <div className="text-[10px] text-ink-muted mt-1">Complaint tracking coming soon</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-xl border border-border-default text-xs font-semibold text-ink disabled:opacity-40 cursor-pointer"
              >
                ‹ Prev
              </button>
              <span className="text-xs text-ink-muted">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-xl border border-border-default text-xs font-semibold text-ink disabled:opacity-40 cursor-pointer"
              >
                Next ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
