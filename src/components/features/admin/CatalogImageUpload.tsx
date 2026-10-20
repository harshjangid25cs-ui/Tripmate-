"use client";

import React, { useState, useRef } from "react";
import { Upload, Link as LinkIcon, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { adminUploadCatalogImageAction } from "@/lib/actions/admin-ops";
import { resolveCatalogImageUrl, optimizeExternalImageUrl } from "@/lib/data/images";

interface CatalogImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
}

/**
 * Client-side WebP compression and dimension downscaling:
 * - Resizes image down to maxWidth = 1280px (maintaining aspect ratio)
 * - Converts to WebP format at 0.82 quality
 * - Reduces multi-MB phone/camera uploads to < 150KB for fast Supabase free-tier storage & edge serving
 */
async function compressImageToWebp(file: File, maxWidth = 1280, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanBaseName = file.name.replace(/\.[^/.]+$/, "");
            const webpFile = new File([blob], `${cleanBaseName}.webp`, {
              type: "image/webp",
              lastModified: Date.now(),
            });
            resolve(webpFile);
          },
          "image/webp",
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function CatalogImageUpload({
  value = "",
  onChange,
  label = "Catalog Image",
  helperText = "Upload high-res JPG, PNG, or WebP (max 15MB) or enter URL.",
}: CatalogImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAndUploadFile = async (rawFile: File) => {
    if (rawFile.size > 15 * 1024 * 1024) {
      setUploadError("Image file size must be less than 15MB.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const compressedFile = await compressImageToWebp(rawFile, 1280, 0.82);

      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await adminUploadCatalogImageAction(formData);

      if (res.ok && res.url) {
        onChange(res.url);
        setImageError(false);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleUrlInput = (inputUrl: string) => {
    const trimmed = inputUrl.trim();
    const optimized = optimizeExternalImageUrl(trimmed);
    setImageError(false);
    onChange(optimized || trimmed);
  };

  const displayUrl = optimizeExternalImageUrl(resolveCatalogImageUrl(value) || value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-text-secondary">{label}</label>
        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
              mode === "upload"
                ? "bg-surface-dark text-white shadow-xs"
                : "bg-surface text-text-secondary border border-border-hairline hover:bg-card-surface"
            }`}
          >
            File Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
              mode === "url"
                ? "bg-surface-dark text-white shadow-xs"
                : "bg-surface text-text-secondary border border-border-hairline hover:bg-card-surface"
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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-3 text-xs font-semibold text-text-primary cursor-pointer transition-all ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border-hairline hover:border-primary-container hover:bg-surface-container-low/40"
            } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                <span>Compressing to WebP &amp; Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 text-text-secondary" />
                <span>Choose or drop image file (auto-compressed to WebP &le; 1280px)</span>
              </>
            )}
          </label>
        </div>
      ) : (
        <div className="relative">
          <LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
          <input
            type="url"
            value={value}
            onChange={(e) => handleUrlInput(e.target.value)}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData("text");
              if (pastedText) {
                e.preventDefault();
                handleUrlInput(pastedText);
              }
            }}
            placeholder="https://images.unsplash.com/photo-..."
            className="w-full rounded-xl border border-border-hairline bg-surface pl-8 pr-3 py-2 text-xs text-text-primary focus:bg-card-surface focus:outline-hidden"
          />
        </div>
      )}

      {/* Image Preview & Current Value */}
      {value ? (
        <div className="flex items-center gap-3 p-2 bg-surface rounded-xl border border-border-hairline">
          <div className="w-12 h-12 rounded-lg bg-[#EBE9E4] overflow-hidden shrink-0 border border-border-hairline flex items-center justify-center relative">
            {!imageError && displayUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={displayUrl}
                src={displayUrl}
                alt="Preview"
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            ) : (
              <ImageIcon className="h-5 w-5 text-text-secondary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Image Attached</span>
            </div>
            <p className="text-[10px] text-text-secondary truncate font-mono mt-0.5">{value}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setImageError(false);
              onChange("");
            }}
            className="text-[11px] font-bold text-rose-700 hover:text-rose-800 px-2 py-1"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-text-secondary">{helperText}</p>
      )}

      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}
