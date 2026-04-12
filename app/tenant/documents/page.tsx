"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

type Doc = {
  id: string;
  title: string;
  category: string | null;
  file_name: string | null;
  file_url: string | null;
  file_size: number | null;
  created_at: string;
};

const KYC_REQUIRED = ["Aadhaar Card", "PAN Card", "Rental Agreement", "Police Verification Certificate", "Passport Photo"];

const SOCIETY_CAT_ICON: Record<string, string> = {
  "Society Rules & Bylaws": "📜",
  "Meeting Minutes": "📝",
  "Financial Reports": "📊",
  "Rental Agreements": "📄",
  "Tenant KYC Documents": "🪪",
  "Insurance & NOC": "🛡️",
  "Notices & Circulars": "📢",
  "Other": "📁",
};

function getIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("aadhaar") || n.includes("pan")) return "🪪";
  if (n.includes("agreement")) return "📄";
  if (n.includes("police") || n.includes("verification")) return "🛡️";
  if (n.includes("photo") || n.includes("passport")) return "📷";
  return "📁";
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TenantDocuments() {
  const { user } = useAuth();
  const [myDocs, setMyDocs] = useState<Doc[]>([]);
  const [societyDocs, setSocietyDocs] = useState<Doc[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"society" | "mine">("society");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadMyDocs(uid: string) {
    const { data } = await supabase
      .from("documents")
      .select("id, title, category, file_name, file_url, file_size, created_at")
      .eq("uploaded_by", uid)
      .order("created_at", { ascending: false });
    setMyDocs((data ?? []) as Doc[]);
  }

  async function loadSocietyDocs(sid: string, uid: string) {
    const { data } = await supabase
      .from("documents")
      .select("id, title, category, file_name, file_url, file_size, created_at")
      .eq("society_id", sid)
      .neq("uploaded_by", uid)
      .order("created_at", { ascending: false });
    setSocietyDocs((data ?? []) as Doc[]);
  }

  useEffect(() => {
    if (!user?.email) return;
    supabase.from("users").select("id").eq("email", user.email).single().then(async ({ data }) => {
      if (!data?.id) { setLoading(false); return; }
      const uid = data.id;
      setUserId(uid);

      const { data: tenant } = await supabase
        .from("tenants")
        .select("society_id")
        .eq("user_id", uid)
        .eq("status", "active")
        .maybeSingle();
      const sid = tenant?.society_id ?? null;
      setSocietyId(sid);

      await Promise.all([
        loadMyDocs(uid),
        sid ? loadSocietyDocs(sid, uid) : Promise.resolve(),
      ]);
      setLoading(false);
    });
  }, [user]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadName || !userId) return;
    setUploading(true);

    const ext = uploadFile.name.split(".").pop();
    const path = `documents/${userId}/${Date.now()}.${ext}`;
    const { error: storageErr } = await supabase.storage
      .from("documents")
      .upload(path, uploadFile, { upsert: false });

    let fileUrl: string | null = null;
    if (!storageErr) {
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      fileUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("documents").insert({
      uploaded_by: userId,
      ...(societyId ? { society_id: societyId } : {}),
      title: uploadName,
      file_name: uploadFile.name,
      file_url: fileUrl,
      file_size: uploadFile.size,
    });

    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Document uploaded!");
    setUploadName("");
    setUploadFile(null);
    setShowUploadForm(false);
    if (fileRef.current) fileRef.current.value = "";
    await loadMyDocs(userId);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    await supabase.from("documents").delete().eq("id", id);
    setMyDocs(prev => prev.filter(d => d.id !== id));
    toast.success("Document deleted.");
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";
  const uploadedNames = myDocs.map(d => d.title);

  // Group society docs by category
  const societyByCategory = Object.entries(
    societyDocs.reduce<Record<string, Doc[]>>((acc, doc) => {
      const cat = doc.category ?? "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    }, {})
  );

  return (
    <div>
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📁 Documents</h2>
        <button onClick={() => setShowUploadForm(!showUploadForm)}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
          {showUploadForm ? "Cancel" : "+ Upload"}
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <form onSubmit={handleUpload} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-4 space-y-3">
          <div className="text-sm font-bold text-ink">Upload Document</div>
          <div>
            <label className={labelClass}>Document Name *</label>
            <select className={inputClass} value={uploadName} onChange={e => setUploadName(e.target.value)} required>
              <option value="">— Select document type —</option>
              {KYC_REQUIRED.map(k => <option key={k} value={k}>{k}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>
          {uploadName === "Other" && (
            <div>
              <label className={labelClass}>Custom Name *</label>
              <input className={inputClass} placeholder="Document name" required
                onChange={e => setUploadName(e.target.value)} />
            </div>
          )}
          <div>
            <label className={labelClass}>File *</label>
            <input ref={fileRef} required type="file" accept=".pdf,.jpg,.jpeg,.png"
              className={inputClass + " py-1.5"}
              onChange={e => setUploadFile(e.target.files?.[0] ?? null)} />
            <div className="text-[10px] text-ink-muted mt-1">Accepted: PDF, JPG, PNG · Max 5MB</div>
          </div>
          <button type="submit" disabled={uploading}
            className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-warm-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setActiveTab("society")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "society" ? "bg-white text-brand-500 shadow-sm" : "text-ink-muted"}`}
        >
          🏢 Society Documents {societyDocs.length > 0 && `(${societyDocs.length})`}
        </button>
        <button
          onClick={() => setActiveTab("mine")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "mine" ? "bg-white text-brand-500 shadow-sm" : "text-ink-muted"}`}
        >
          👤 My Documents {myDocs.length > 0 && `(${myDocs.length})`}
        </button>
      </div>

      {/* Society Documents Tab */}
      {activeTab === "society" && (
        <>
          {!societyId ? (
            <div className="text-center py-10 text-ink-muted text-sm">
              <div className="text-3xl mb-2">🏢</div>
              You are not linked to any society yet.
            </div>
          ) : societyDocs.length === 0 ? (
            <div className="text-center py-10 text-ink-muted text-sm">
              <div className="text-3xl mb-2">📭</div>
              No society documents uploaded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {societyByCategory.map(([cat, docs]) => (
                <div key={cat}>
                  <div className="text-[13px] font-bold text-ink mb-2">
                    {SOCIETY_CAT_ICON[cat] ?? "📁"} {cat} <span className="text-ink-muted font-normal">({docs.length})</span>
                  </div>
                  <div className="space-y-2">
                    {docs.map(doc => (
                      <a
                        key={doc.id}
                        href={doc.file_url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-[14px] p-3 border border-border-default flex justify-between items-center hover:bg-warm-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-lg flex-shrink-0">
                            {SOCIETY_CAT_ICON[cat] ?? "📁"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-bold text-ink truncate group-hover:text-brand-500">
                              {doc.file_name ?? doc.title}
                            </div>
                            <div className="text-[11px] text-ink-muted">
                              {formatSize(doc.file_size)}{doc.file_size ? " · " : ""}
                              {new Date(doc.created_at).toLocaleDateString("en-IN")}
                            </div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex-shrink-0 ml-2">
                          ⬇️ View
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* My Documents Tab */}
      {activeTab === "mine" && (
        <>
          {myDocs.length === 0 ? (
            <div className="text-center py-8 text-ink-muted text-sm">
              <div className="text-3xl mb-2">📭</div>
              No documents uploaded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {myDocs.map(d => (
                <div key={d.id} className="bg-white rounded-[14px] p-4 border border-border-default flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0">
                      {getIcon(d.title)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-ink">{d.title}</div>
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        {d.file_name?.split(".").pop()?.toUpperCase()}{" "}
                        {d.file_size ? `· ${formatSize(d.file_size)}` : ""} · {new Date(d.created_at).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {d.file_url ? (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">View</a>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-red-400">No file</span>
                    )}
                    <button onClick={() => handleDelete(d.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-[11px] font-semibold text-red-500 cursor-pointer">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* KYC Checklist */}
          <div className="bg-warm-50 rounded-[14px] p-4 border border-border-default mt-4">
            <div className="text-sm font-bold text-ink mb-2">📋 KYC Checklist</div>
            <ul className="text-xs space-y-1.5">
              {KYC_REQUIRED.map(k => {
                const done = uploadedNames.includes(k);
                return (
                  <li key={k} className={done ? "text-green-700" : "text-ink-muted"}>
                    {done ? "✅" : "○"} {k}{!done && (
                      <span className="text-brand-500 font-semibold cursor-pointer ml-1"
                        onClick={() => { setUploadName(k); setShowUploadForm(true); }}>
                        — Upload
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
