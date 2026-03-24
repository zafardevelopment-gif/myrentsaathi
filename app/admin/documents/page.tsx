"use client";

import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getAdminSocietyId,
  type AdminDocument,
} from "@/lib/admin-data";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  { type: "Society Rules & Bylaws", icon: "📜" },
  { type: "Meeting Minutes", icon: "📝" },
  { type: "Financial Reports", icon: "📊" },
  { type: "Rental Agreements", icon: "📄" },
  { type: "Tenant KYC Documents", icon: "🪪" },
  { type: "Insurance & NOC", icon: "🛡️" },
  { type: "Notices & Circulars", icon: "📢" },
  { type: "Other", icon: "📁" },
];

export default function AdminDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Society Rules & Bylaws");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.email) return;
    async function init() {
      try {
        const sid = await getAdminSocietyId(user!.email);
        setSocietyId(sid);

        // Get user ID
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("email", user!.email)
          .single();
        setUserId(userData?.id ?? null);

        // Load documents from database
        if (sid) {
          const { data: docs, error: loadErr } = await supabase
            .from("documents")
            .select("*")
            .eq("society_id", sid)
            .order("created_at", { ascending: false });

          if (loadErr) {
            console.error("Failed to load documents:", loadErr);
          } else {
            setDocuments((docs ?? []) as AdminDocument[]);
          }
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!societyId || !userId) {
      toast.error("Society or user not found");
      return;
    }

    setUploading(true);
    try {
      // Save document metadata to database
      const { error: dbErr } = await supabase.from("documents").insert({
        society_id: societyId,
        category: selectedCategory,
        file_name: file.name,
        file_url: `https://documents.${societyId}/${file.name}`, // Placeholder URL
        file_size: file.size,
        uploaded_by: userId,
      });

      if (dbErr) {
        console.error("DB error:", dbErr);
        throw new Error(dbErr.message || "Failed to save document");
      }

      // Reload documents from database
      const { data: updated, error: loadErr } = await supabase
        .from("documents")
        .select("*")
        .eq("society_id", societyId)
        .order("created_at", { ascending: false });

      if (loadErr) throw loadErr;

      setDocuments((updated ?? []) as AdminDocument[]);

      toast.success("Document uploaded!");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      toast.error((err as Error).message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Group documents by category
  const docsByCategory = CATEGORIES.map((cat) => ({
    ...cat,
    docs: documents.filter((d) => d.category === cat.type),
  }));

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📁 Document Management</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "+ Upload"}
        </button>
      </div>

      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.png"
      />

      {/* Category selector for upload */}
      <div className="mb-4 p-3 bg-white rounded-[14px] border border-border-default">
        <div className="text-[11px] font-bold text-ink-muted mb-2 uppercase tracking-wide">Upload Category</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.type}
              onClick={() => setSelectedCategory(cat.type)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border transition-all ${
                selectedCategory === cat.type
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-ink-muted border-border-default hover:bg-warm-50"
              }`}
            >
              {cat.icon} {cat.type}
            </button>
          ))}
        </div>
      </div>

      {/* Documents by category */}
      {docsByCategory.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">
          No documents yet. Upload your first document!
        </div>
      ) : (
        docsByCategory.map((cat) => (
          <div key={cat.type}>
            {cat.docs.length > 0 && (
              <>
                <div className="text-[13px] font-bold text-ink mb-2 mt-4">
                  {cat.icon} {cat.type} ({cat.docs.length})
                </div>
                <div className="space-y-2 mb-3">
                  {cat.docs.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-[14px] p-3 border border-border-default flex justify-between items-center hover:bg-warm-50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-ink truncate group-hover:text-brand-500">
                          📄 {doc.file_name}
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          {(doc.file_size ?? 0) / 1024 > 1024
                            ? `${(((doc.file_size ?? 0) / 1024) / 1024).toFixed(1)}MB`
                            : `${((doc.file_size ?? 0) / 1024).toFixed(1)}KB`}{" "}
                          • {new Date(doc.created_at).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                      <button className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer hover:bg-blue-700 flex-shrink-0 ml-2">
                        ⬇️ View
                      </button>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
