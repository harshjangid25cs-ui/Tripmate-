"use client";

import React, { useState, useRef } from "react";
import { Upload, Link as LinkIcon, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { adminUploadCatalogImageAction } from "@/lib/actions/admin-ops";
import { resolveCatalogImageUrl } from "@/lib/data/images";

interface CatalogImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
}

export function CatalogImageUpload({
  value = "",
  onChange,
  label = "Catalog Image",
  helperText = "Upload high-res JPG, PNG, or WebP (max 5MB) or enter URL.",
}: CatalogImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image file size must be less than 5MB.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await adminUploadCatalogImageAction(formData);

      if (res.ok && res.url) {
        onChange(res.url);
      } else {
        setUploadError(res.error || "Failed to upload image. Please try again or paste a direct URL.");
      }
    } catch {
      setUploadError("Network error uploading image. Please check your connection.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700">{label}</label>
        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
              mode === "upload"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            File Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
              mode === "url"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            URL Input
          </button>
        </div>
      </div>

      {mode === "upload" ? (
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={handleFileSelect}
            className="hidden"
            id={`catalog-file-${label.toLowerCase().replace(/\s+/g, "-")}`}
          />
          <label
            htmlFor={`catalog-file-${label.toLowerCase().replace(/\s+/g, "-")}`}
            className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 cursor-pointer transition-all ${
              isUploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                <span>Uploading to Supabase Storage...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 text-slate-500" />
                <span>Choose Image file (PNG/JPG/WEBP &lt; 5MB)</span>
              </>
            )}
          </label>
        </div>
      ) : (
        <div className="relative">
          <LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="url"
            value={value}
            onChange={(e) => {
              setImageError(false);
              onChange(e.target.value);
            }}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData("text");
              if (pastedText) {
                setImageError(false);
                onChange(pastedText.trim());
              }
            }}
            placeholder="https://example.com/image.jpg"
            className="w-full rounded-xl border border-slate-300 pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          />
        </div>
      )}

      {/* Image Preview & Current Value */}
      {value ? (
        <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300 flex items-center justify-center relative">
            {!imageError ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={value}
                src={resolveCatalogImageUrl(value) || value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            ) : (
              <ImageIcon className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Image Attached</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{value}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setImageError(false);
              onChange("");
            }}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      )}

      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}
