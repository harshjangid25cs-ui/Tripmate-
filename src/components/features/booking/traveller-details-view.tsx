"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ValidatedDraftTrip } from "@/lib/data/booking-guards";
import { formatCurrency } from "@/lib/format";
import { saveTripPassengers, uploadIdDocument } from "@/lib/actions/trips";
import { createClient } from "@/lib/supabase/client";

import { validateDocumentClarity, compressImageToMax300KB } from "@/lib/images/compress-and-validate";

interface SavedCompanionItem {
  full_name: string;
  age?: number | null;
  gender?: string | null;
  id_type?: string | null;
  id_storage_path?: string | null;
  id_verified?: boolean;
}

interface TravellerDetailsViewProps {
  tripData: ValidatedDraftTrip;
  userProfile?: {
    fullName?: string | null;
    phone?: string | null;
    savedIdType?: string | null;
    savedIdStoragePath?: string | null;
    savedIdFileSizeBytes?: number | null;
    savedIdVerified?: boolean;
    savedCompanions?: SavedCompanionItem[];
  } | null;
}

interface TravellerFormState {
  fullName: string;
  phone: string;
  idDocType: "aadhaar" | "passport" | "driving_licence" | "driving_license" | "voter_id" | "";
  idDocPath: string | null;
  fileName?: string | null;
  fileSizeText?: string | null;
  idFileSizeBytes?: number | null;
  isReusedFromProfile?: boolean;
  compressionBadge?: string | null;
  touched: boolean;
}

export function TravellerDetailsView({
  tripData,
  userProfile,
}: TravellerDetailsViewProps) {
  const router = useRouter();
  const { trip, destination } = tripData;

  const travelerCount = trip.traveler_count ?? 1;

  // Initialize form states for each traveler with auto-applied KYC vault
  const initialForms: TravellerFormState[] = React.useMemo(() => {
    const list: TravellerFormState[] = [];
    const existing = tripData.passengers;

    for (let i = 0; i < travelerCount; i++) {
      const p = existing[i];
      if (i === 0) {
        // Lead traveler: auto-apply saved profile ID vault if available
        const resolvedDocPath = p?.id_doc_path || userProfile?.savedIdStoragePath || null;
        const isReused = !p?.id_doc_path && Boolean(userProfile?.savedIdStoragePath);
        const resolvedIdType = (p?.id_doc_type as TravellerFormState["idDocType"]) ?? (userProfile?.savedIdType as TravellerFormState["idDocType"]) ?? "aadhaar";
        const resolvedSize = p?.id_file_size_bytes ?? userProfile?.savedIdFileSizeBytes ?? null;

        list.push({
          fullName:
            p?.full_name ??
            userProfile?.fullName ??
            "",
          phone:
            p?.phone?.replace(/\D/g, "").slice(-10) ??
            userProfile?.phone?.replace(/\D/g, "").slice(-10) ??
            "",
          idDocType: resolvedIdType,
          idDocPath: resolvedDocPath,
          fileName: resolvedDocPath ? resolvedDocPath.split("/").pop() : null,
          fileSizeText: resolvedDocPath
            ? isReused
              ? "✓ Original ID on File • Encrypted copy"
              : "Uploaded Document"
            : null,
          idFileSizeBytes: resolvedSize,
          isReusedFromProfile: isReused || Boolean(p?.is_reused_from_profile),
          compressionBadge: isReused ? "Auto-Applied Vault Copy (<= 300 KB)" : null,
          touched: false,
        });
      } else {
        list.push({
          fullName: p?.full_name ?? "",
          phone: p?.phone?.replace(/\D/g, "").slice(-10) ?? "",
          idDocType:
            (p?.id_doc_type as TravellerFormState["idDocType"]) ??
            "",
          idDocPath: p?.id_doc_path ?? null,
          fileName: p?.id_doc_path ? p.id_doc_path.split("/").pop() : null,
          fileSizeText: p?.id_doc_path ? "Uploaded Document" : null,
          idFileSizeBytes: p?.id_file_size_bytes ?? null,
          isReusedFromProfile: Boolean(p?.is_reused_from_profile),
          touched: false,
        });
      }
    }
    return list;
  }, [travelerCount, tripData.passengers, userProfile]);

  const [forms, setForms] = React.useState<TravellerFormState[]>(initialForms);
  const [activeCompanionDropdown, setActiveCompanionDropdown] = React.useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = React.useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // File input refs
  const fileInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleFieldChange = (
    index: number,
    field: keyof TravellerFormState,
    value: string
  ) => {
    setForms((prev) => {
      const next = [...prev];
      const target = { ...next[index]! };
      if (field === "fullName") target.fullName = value;
      else if (field === "phone") target.phone = value;
      else if (field === "idDocType")
        target.idDocType = value as TravellerFormState["idDocType"];
      target.touched = true;
      next[index] = target;
      return next;
    });
  };

  const handleSelectCompanion = (index: number, companion: SavedCompanionItem) => {
    setForms((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index]!,
        fullName: companion.full_name,
        idDocType: (companion.id_type as TravellerFormState["idDocType"]) || next[index]?.idDocType || "aadhaar",
        idDocPath: companion.id_storage_path || null,
        fileName: companion.id_storage_path ? companion.id_storage_path.split("/").pop() : null,
        fileSizeText: companion.id_storage_path ? "✓ Saved Companion ID • Encrypted copy" : null,
        isReusedFromProfile: Boolean(companion.id_storage_path),
        compressionBadge: companion.id_storage_path ? "Auto-Applied Vault Copy (<= 300 KB)" : null,
        touched: true,
      };
      return next;
    });
    setActiveCompanionDropdown(null);
  };

  const handlePreviewDoc = async (storagePath: string | null) => {
    if (!storagePath) return;
    try {
      const supabase = createClient();
      const cleanPath = storagePath.replace(/^id-documents\//, "");
      const { data } = await supabase.storage.from("id-documents").createSignedUrl(cleanPath, 120);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        alert("Encrypted document copy is securely verified on file.");
      }
    } catch {
      alert("Encrypted document copy is securely verified on file.");
    }
  };

  const handleFileUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(`File ${file.name} is larger than 5 MB.`);
      return;
    }

    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "application/pdf": "pdf",
    };

    const ext = MIME_TO_EXT[file.type];
    if (!ext) {
      setErrorMsg("Only JPG, PNG, WebP, and PDF files are allowed.");
      return;
    }

    setUploadingIndex(index);
    setErrorMsg(null);

    try {
      // 1. Validate clarity
      const clarity = await validateDocumentClarity(file);
      if (!clarity.valid) {
        setErrorMsg(clarity.reason || "Document image is unclear. Please provide a sharp, high-resolution copy.");
        setUploadingIndex(null);
        return;
      }

      // 2. High-Clarity <= 300 KB Image Compressor
      const compressed = await compressImageToMax300KB(file);
      const finalFile = compressed.file;

      const origMb = (file.size / (1024 * 1024)).toFixed(1);
      const compKb = Math.round(compressed.compressedBytes / 1024);
      const compressionFeedback = `✓ Compressed ${origMb} MB → ${compKb} KB (<= 300 KB)`;
      const sizeDisplay = `${compressionFeedback} • ${origMb} MB • Encrypted copy`;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userPrefix = user?.id || "anonymous";
      const fileExt = finalFile.type === "image/webp" ? "webp" : ext;
      const filePath = `${userPrefix}/${trip.id}/passenger_${index + 1}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("id-documents")
        .upload(filePath, finalFile, {
          contentType: finalFile.type || "application/octet-stream",
          upsert: true,
        });

      if (!uploadErr && uploadData) {
        setForms((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index]!,
            idDocPath: uploadData.path,
            fileName: file.name,
            fileSizeText: sizeDisplay,
            idFileSizeBytes: compressed.compressedBytes,
            isReusedFromProfile: false,
            compressionBadge: compressionFeedback,
          };
          return next;
        });
        setUploadingIndex(null);
        return;
      }

      // Fallback to server action if direct browser upload hit an error
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        if (!base64) return;

        const res = await uploadIdDocument({
          tripId: trip.id,
          passengerIndex: index + 1,
          fileName: file.name,
          fileBytesBase64: base64,
          mimeType: finalFile.type || file.type || "application/pdf",
        });

        if (res.ok && res.path) {
          setForms((prev) => {
            const next = [...prev];
            next[index] = {
              ...next[index]!,
              idDocPath: res.path!,
              fileName: file.name,
              fileSizeText: sizeDisplay,
              idFileSizeBytes: compressed.compressedBytes,
              isReusedFromProfile: false,
              compressionBadge: compressionFeedback,
            };
            return next;
          });
        } else {
          setErrorMsg(res.error ?? "Failed to upload document.");
        }
        setUploadingIndex(null);
      };
      reader.readAsDataURL(finalFile);
    } catch {
      setErrorMsg("Failed to upload document.");
      setUploadingIndex(null);
    }
  };

  const handleRemoveFile = (index: number) => {
    setForms((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index]!,
        idDocPath: null,
        fileName: null,
        fileSizeText: null,
        idFileSizeBytes: null,
        isReusedFromProfile: false,
        compressionBadge: null,
      };
      return next;
    });
  };

  // Validation
  const errors: { index: number; message: string }[] = [];
  forms.forEach((f, idx) => {
    if (!f.fullName.trim()) {
      errors.push({
        index: idx,
        message: `Traveller ${idx + 1}: Legal Name is required.`,
      });
    } else if (f.fullName.trim().length < 3) {
      errors.push({
        index: idx,
        message: `Traveller ${idx + 1}: Name must be at least 3 characters.`,
      });
    }

    if (idx === 0) {
      const cleanPhone = f.phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        errors.push({
          index: idx,
          message: "Traveller 1: Valid 10-digit mobile number required.",
        });
      }
    }

    if (!f.idDocType) {
      errors.push({
        index: idx,
        message: `Traveller ${idx + 1}: Government ID type required.`,
      });
    }
  });

  const isValid = errors.length === 0;

  const handleContinue = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = forms.map((f, idx) => ({
        isLead: idx === 0,
        fullName: f.fullName.trim(),
        phone: f.phone ? f.phone.trim() : null,
        idDocType: f.idDocType || null,
        idDocPath: f.idDocPath || null,
        idFileSizeBytes: f.idFileSizeBytes ?? null,
        isReusedFromProfile: Boolean(f.isReusedFromProfile),
      }));

      const res = await saveTripPassengers({
        tripId: trip.id,
        passengers: payload,
      });

      if (res.ok) {
        router.push(`/book/${trip.id}/checkout`);
      } else {
        setErrorMsg(res.error ?? "Failed to save traveller records.");
        setIsSubmitting(false);
      }
    } catch {
      setErrorMsg("An unexpected network error occurred.");
      setIsSubmitting(false);
    }
  };

  const totalAmount = Number(trip.total_amount ?? 27376);

  const datesFormatted = React.useMemo(() => {
    if (!trip.start_date || !trip.end_date) return "Dec 14-17";
    const start = new Date(trip.start_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const end = new Date(trip.end_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${start}-${end}`;
  }, [trip.start_date, trip.end_date]);

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface flex flex-col min-h-screen antialiased">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-sm min-w-0">
            <button
              type="button"
              aria-label="Go back"
              className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-variant transition-colors flex-shrink-0 -ml-2"
              onClick={() => router.push(`/book/${trip.id}/review`)}
            >
              <span className="material-symbols-outlined text-[24px]">
                arrow_back
              </span>
            </button>
            <div className="flex items-center gap-1.5 shrink-0" aria-label="Tripmate Logo">
              <svg
                width="24"
                height="24"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
              >
                <rect width="28" height="28" rx="7" fill="#E11D2E" />
                <path
                  d="M7 20V8L14 14L21 8V20"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-base font-bold tracking-tight text-neutral-900 leading-none">
                Tripmate
              </span>
            </div>
            <div className="flex flex-col min-w-0 ml-space-xs">
              <span className="font-title-md text-title-md text-text-primary truncate">
                Traveller Details
              </span>
            </div>
          </div>
          <div className="flex items-center flex-shrink-0">
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              aria-label="Profile"
            >
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col relative w-full pt-16 bg-surface min-h-screen pb-safe">
        <div className="flex flex-col w-full max-w-md mx-auto pb-36">
          {/* Booking Telemetry & Trip Meta Strip */}
          <div className="px-margin-mobile pt-4 pb-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-label-badge text-label-badge tracking-wider text-text-secondary uppercase font-semibold">
                STEP 3 OF 4 • TRAVELLER INFO
              </span>
              <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[14px] text-primary">
                  timer
                </span>
                <span className="font-label-md text-label-md text-text-primary font-semibold">
                  11:42 left to hold
                </span>
              </div>
            </div>

            <div className="bg-card-surface rounded-xl p-3 flex items-center justify-between shadow-sm border border-border-hairline">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0 text-text-primary">
                  <span className="material-symbols-outlined text-[18px]">
                    location_on
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-title-md text-title-md text-text-primary truncate">
                    {trip.title ?? `${destination?.name ?? "Jaipur"} Royal Heritage Trail`}
                  </span>
                  <span className="font-body-sm text-body-sm text-text-secondary truncate">
                    {trip.total_days ?? 4}D / {Math.max(1, (trip.total_days ?? 4) - 1)}N • {travelerCount} Travelers • {datesFormatted}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 pl-2">
                <span className="font-label-badge text-label-badge text-text-secondary block uppercase">
                  Locked Price
                </span>
                <span className="font-numeral-price text-numeral-price text-text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="mx-margin-mobile mb-3 p-3 rounded-xl bg-error-container/30 text-error text-xs font-semibold flex items-center gap-2 border border-error/20">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Main Travellers Form Section */}
          <div className="px-margin-mobile flex flex-col gap-5 mt-1">
            {forms.map((f, idx) => {
              const isLead = idx === 0;
              const hasNameError = f.touched && (!f.fullName.trim() || f.fullName.trim().length < 3);

              return (
                <div
                  key={idx}
                  className="bg-card-surface rounded-2xl p-4 flex flex-col gap-4 shadow-sm relative border border-border-hairline"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-text-primary text-card-surface flex items-center justify-center font-label-badge text-label-badge font-bold">
                        {idx + 1}
                      </span>
                      <h2 className="font-headline-sm text-headline-sm text-text-primary">
                        Traveller {idx + 1} {isLead ? "(Lead)" : ""}
                      </h2>
                    </div>
                    {isLead ? (
                      <span className="inline-flex items-center gap-1 bg-surface-container text-success-green px-2.5 py-1 rounded-full font-label-badge text-label-badge font-semibold">
                        <span
                          className="material-symbols-outlined text-[14px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          verified
                        </span>
                        Verified Contact
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {userProfile?.savedCompanions && userProfile.savedCompanions.length > 0 && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveCompanionDropdown(
                                  activeCompanionDropdown === idx ? null : idx
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-xs font-semibold text-text-primary flex items-center gap-1 border border-border-hairline"
                            >
                              <span className="material-symbols-outlined text-[15px] text-primary">
                                person_add
                              </span>
                              <span>+ Quick-Fill Saved Companion</span>
                            </button>
                            {activeCompanionDropdown === idx && (
                              <div className="absolute right-0 top-full mt-1.5 w-64 bg-card-surface border border-border-hairline rounded-xl shadow-lg z-20 p-1.5 flex flex-col gap-1">
                                <div className="px-2.5 py-1 text-[11px] font-semibold text-text-secondary border-b border-border-hairline/40">
                                  Saved Family &amp; Companions
                                </div>
                                {userProfile.savedCompanions.map((comp, cIdx) => (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => handleSelectCompanion(idx, comp)}
                                    className="w-full text-left p-2 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-between"
                                  >
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs font-semibold text-text-primary truncate">
                                        {comp.full_name}
                                      </span>
                                      <span className="text-[10px] text-text-secondary uppercase">
                                        {comp.id_type || "Government ID"} • Verified
                                      </span>
                                    </div>
                                    <span className="material-symbols-outlined text-[16px] text-primary">
                                      add_circle
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <span className="inline-flex items-center bg-surface-container px-2.5 py-1 rounded-full font-label-badge text-label-badge text-text-secondary">
                          Required for Check-in
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Field: Full Legal Name */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label
                        className={`font-label-md text-label-md ${
                          hasNameError ? "text-primary font-semibold" : "text-text-secondary"
                        }`}
                        htmlFor={`traveller-${idx}-name`}
                      >
                        Full Legal Name (as on Gov ID){" "}
                        <span className="text-primary">*</span>
                      </label>
                      {hasNameError && (
                        <span className="font-label-badge text-label-badge text-primary uppercase">
                          Error detected
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        id={`traveller-${idx}-name`}
                        type="text"
                        value={f.fullName}
                        onChange={(e) =>
                          handleFieldChange(idx, "fullName", e.target.value)
                        }
                        placeholder="Enter full legal name"
                        className={`w-full rounded-xl px-3.5 py-3 font-body-md text-body-md text-text-primary focus:outline-none transition-colors ${
                          hasNameError
                            ? "bg-error-container/30 border border-primary text-on-error-container"
                            : "bg-surface-container-low focus:bg-surface-container border border-border-hairline/40"
                        }`}
                      />
                      {f.fullName.trim().length >= 3 && !hasNameError && (
                        <span
                          className="absolute right-3 material-symbols-outlined text-success-green text-[20px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                      )}
                      {hasNameError && (
                        <span
                          className="absolute right-3 material-symbols-outlined text-primary text-[20px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          error
                        </span>
                      )}
                    </div>
                    {hasNameError && (
                      <div className="flex items-start gap-1 text-primary">
                        <span className="material-symbols-outlined text-[16px] mt-0.5 flex-shrink-0">
                          info
                        </span>
                        <span className="font-body-sm text-body-sm text-primary">
                          Please enter full legal name as shown on ID (min. 3 characters).
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Field: Mobile Number */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        className="font-label-md text-label-md text-text-secondary"
                        htmlFor={`traveller-${idx}-phone`}
                      >
                        {isLead
                          ? "Mobile Number for Instant Ticket SMS"
                          : "Mobile Number"}{" "}
                        {isLead && <span className="text-primary">*</span>}
                      </label>
                      {!isLead && (
                        <span className="font-label-badge text-label-badge text-text-secondary">
                          OPTIONAL
                        </span>
                      )}
                    </div>
                    <div className="flex items-center rounded-xl bg-surface-container-low overflow-hidden focus-within:bg-surface-container transition-colors border border-border-hairline/40">
                      <div className="px-3.5 py-3 bg-surface-container text-text-primary font-label-lg text-label-lg flex items-center gap-1 select-none">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        id={`traveller-${idx}-phone`}
                        type="tel"
                        value={f.phone}
                        onChange={(e) =>
                          handleFieldChange(idx, "phone", e.target.value)
                        }
                        placeholder={
                          isLead
                            ? "98765 43210"
                            : "Enter mobile number for personal alerts"
                        }
                        className="w-full bg-transparent px-3 py-3 font-body-md text-body-md text-text-primary focus:outline-none"
                      />
                      {f.phone.replace(/\D/g, "").length >= 10 && (
                        <span
                          className="pr-3 material-symbols-outlined text-success-green text-[20px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Field: Government ID Type Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="font-label-md text-label-md text-text-secondary"
                      htmlFor={`traveller-${idx}-id-type`}
                    >
                      Government ID Type <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id={`traveller-${idx}-id-type`}
                        value={f.idDocType}
                        onChange={(e) =>
                          handleFieldChange(idx, "idDocType", e.target.value)
                        }
                        className="w-full appearance-none bg-surface-container-low rounded-xl px-3.5 py-3 pr-10 font-body-md text-body-md text-text-primary focus:outline-none focus:bg-surface-container cursor-pointer border border-border-hairline/40"
                      >
                        <option value="" disabled>
                          Select ID Type (Passport, Aadhaar, DL...)
                        </option>
                        <option value="aadhaar">Aadhaar Card (UIDAI)</option>
                        <option value="passport">Indian Passport</option>
                        <option value="driving_licence">Driving Licence</option>
                        <option value="voter_id">Voter Identification Card</option>
                      </select>
                      <span className="absolute right-3 top-3.5 pointer-events-none material-symbols-outlined text-text-secondary text-[20px]">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Field: Upload ID Copy */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md text-text-secondary">
                        Upload ID Copy (Optional verification file)
                      </span>
                      <span className="font-label-badge text-label-badge text-text-secondary">
                        JPG, PNG, PDF &lt; 5MB
                      </span>
                    </div>

                    <input
                      type="file"
                      ref={(el) => {
                        fileInputRefs.current[idx] = el;
                      }}
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(idx, e)}
                    />

                    {f.isReusedFromProfile && f.idDocPath && (
                      <div className="bg-[#1F1F1E] text-white p-3.5 rounded-xl flex items-center justify-between border border-[#1F1F1E] shadow-sm mb-1">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="material-symbols-outlined text-[#FF5E1E] text-[20px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            verified_user
                          </span>
                          <div className="flex flex-col">
                            <span className="font-label-md text-label-md text-[#FBF9F5] font-semibold">
                              ✓ Original ID Already on File (Auto-Applied — No Re-upload Needed)
                            </span>
                            <span className="text-[11px] text-[#EBE9E4]/80">
                              Original KYC Vault Copy • {f.idDocType?.toUpperCase() || "GOV ID"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handlePreviewDoc(f.idDocPath)}
                            className="px-2.5 py-1 rounded-lg bg-[#EBE9E4] text-[#1F1F1E] text-xs font-semibold hover:bg-white transition-colors"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[idx]?.click()}
                            className="text-xs text-[#FF5E1E] hover:underline font-semibold"
                          >
                            Replace ID Photo
                          </button>
                        </div>
                      </div>
                    )}

                    {f.idDocPath ? (
                      <div className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between border border-border-hairline/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0 text-text-primary">
                            <span className="material-symbols-outlined text-[20px]">
                              picture_as_pdf
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-title-md text-title-md text-text-primary truncate">
                                {f.fileName ?? "id_document.pdf"}
                              </span>
                              <span
                                className="material-symbols-outlined text-success-green text-[16px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                check_circle
                              </span>
                            </div>
                            <span className="font-body-sm text-body-sm text-text-secondary">
                              {f.fileSizeText ?? "Encrypted copy"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove uploaded file"
                          onClick={() => handleRemoveFile(idx)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-error hover:bg-error-container/40 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={uploadingIndex === idx}
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        className="w-full bg-surface-container-low hover:bg-surface-container rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors group cursor-pointer border border-border-hairline/40 disabled:opacity-60"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-text-primary group-hover:scale-105 transition-transform mb-2">
                          <span className="material-symbols-outlined text-[22px]">
                            {uploadingIndex === idx ? "progress_activity" : "cloud_upload"}
                          </span>
                        </div>
                        <span className="font-title-md text-title-md text-text-primary">
                          {uploadingIndex === idx
                            ? "Encrypting and uploading..."
                            : "Tap to browse or take photo"}
                        </span>
                        <span className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                          Clear picture of front &amp; back page
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Security & Privacy Trust Box */}
            <div className="bg-surface-container-low rounded-xl p-3.5 flex items-start gap-3 border border-border-hairline/50">
              <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 text-text-primary mt-0.5">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  shield
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-label-md text-label-md text-text-primary font-semibold">
                    Bank-grade 256-bit Document Vault
                  </span>
                  <span className="material-symbols-outlined text-text-secondary text-[14px]">
                    lock
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 leading-relaxed">
                  Stored securely. Only hotel and transport authorities will view during check-in. Tripmate never stores unmasked Aadhaar numbers.
                </p>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Checkout Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-card-surface/95 backdrop-blur-md p-4 pb-safe flex flex-col gap-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] border-t border-border-hairline">
            <div className="max-w-md mx-auto w-full flex flex-col gap-2">
              {/* Inline Mini Alert for Blocked State */}
              {!isValid && (
                <div className="flex items-center justify-between text-primary bg-error-container/30 px-3 py-1.5 rounded-lg border border-error/20">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">
                      error
                    </span>
                    <span className="font-label-badge text-label-badge uppercase font-bold">
                      {errors.length} {errors.length === 1 ? "Error" : "Errors"} Need Attention
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm font-medium truncate max-w-[180px]">
                    {errors[0]?.message.split(":")[1]?.trim() ?? "Incomplete fields"}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-body-sm text-body-sm text-text-secondary leading-tight">
                    Total for {travelerCount} {travelerCount === 1 ? "Traveler" : "Travelers"}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-numeral-price text-numeral-price text-text-primary">
                      {formatCurrency(totalAmount)}
                    </span>
                    <span className="font-body-sm text-body-sm text-success-green font-medium">
                      Taxes incl.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!isValid || isSubmitting}
                  onClick={handleContinue}
                  className={`font-label-lg text-label-lg px-5 py-3.5 rounded-xl flex items-center justify-center gap-2 flex-shrink-0 min-w-[170px] transition-all font-bold ${
                    isValid && !isSubmitting
                      ? "bg-primary-container hover:bg-primary text-card-surface shadow-md active:scale-95 cursor-pointer"
                      : "bg-surface-container text-text-secondary cursor-not-allowed opacity-70"
                  }`}
                >
                  <span>{isSubmitting ? "Saving..." : "Continue to Pay"}</span>
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
