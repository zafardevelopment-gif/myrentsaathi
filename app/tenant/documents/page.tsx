"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

type Doc = {
  id: string;
  title: string;
  doc_type: string;
  file_url: string | null;
  file_size: number | null;
  created_at: string;
};

const KYC_REQUIRED = ["Aadhaar Card", "PAN Card", "Rental Agreement", "Police Verification Certificate", "Passport Photo"];

const DOC_ICON: Record<string, string> = {
  pdf: "📄", image: "🪪", photo: "📷", other: "📁",
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
  const [docs, setDocs] = useState<Doc[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadDocs(uid: string) {
    const { data } = await supabase
      .from("documents")
      .select("id, title, doc_type, file_url, file_size, created_at")
      .eq("uploaded_by", uid)
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
  }

  useEffect(() => {
    if (!user?.email) return;
    supabase.from("users").select("id").eq("email", user.email).single().then(({ data }) => {
      if (data?.id) {
        setUserId(data.id);
        loadDocs(data.id).finally(() => setLoading(false));
      } else setLoading(false);
    });
  }, [user]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadName || !userId) return;
    setUploading(true);

    // Upload to Supabase Storage
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

    // Save record to documents table
    const { error } = await supabase.from("documents").insert({
      uploaded_by: userId,
      title: uploadName,
      doc_type: ext ?? "other",
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
    await loadDocs(userId);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    await supabase.from("documents").delete().eq("id", id);
    setDocs(prev => prev.filter(d => d.id !== id));
    toast.success("Document deleted.");
  }

  const uploadedNames = docs.map(d => d.title);

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

  return (
    <div>
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📁 My Documents</h2>
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

      {docs.length === 0 ? (
        <div className="text-center py-8 text-ink-muted text-sm">No documents uploaded yet.</div>
      ) : (
        docs.map(d => (
          <div key={d.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0">
                {getIcon(d.title)}
              </div>
              <div>
                <div className="text-sm font-bold text-ink">{d.title}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {d.doc_type?.toUpperCase()} {d.file_size ? `· ${formatSize(d.file_size)}` : ""} · {new Date(d.created_at).toLocaleDateString("en-IN")}
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
              <button onClick={() => handleDelete(d.id)} className="px-3 py-1.5 rounded-lg border border-red-200 text-[11px] font-semibold text-red-500 cursor-pointer">Delete</button>
            </div>
          </div>
        ))
      )}

      {/* KYC Checklist */}
      <div className="bg-warm-50 rounded-[14px] p-4 border border-border-default mt-3">
        <div className="text-sm font-bold text-ink mb-2">📋 KYC Checklist</div>
        <ul className="text-xs space-y-1.5">
          {KYC_REQUIRED.map(k => {
            const done = uploadedNames.includes(k);
            return (
              <li key={k} className={done ? "text-green-700" : "text-ink-muted"}>
                {done ? "✅" : "○"} {k} {!done && <span className="text-brand-500 font-semibold cursor-pointer" onClick={() => { setUploadName(k); setShowUploadForm(true); }}>— Upload</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
