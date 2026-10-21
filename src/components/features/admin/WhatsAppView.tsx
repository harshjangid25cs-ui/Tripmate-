"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  MessageSquare,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Send,
  Radio,
  Copy,
  Check,
  Terminal,
} from "lucide-react";
import { useAdmin } from "@/lib/admin/admin-context";

interface WorkerStatus {
  workerOnline: boolean;
  workerUrl: string;
  status: "CONNECTED" | "CONNECTING" | "QR_READY" | "PAIRING_CODE_READY" | "DISCONNECTED" | "OFFLINE" | string;
  phone?: string | null;
  qrDataUrl?: string | null;
  pairingCode?: string | null;
  error?: string;
}

export function WhatsAppView() {
  const { toast } = useAdmin();
  const [data, setData] = useState<WorkerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Link form states
  const [linkTab, setLinkTab] = useState<"pairing" | "qr">("pairing");
  const [inputPhone, setInputPhone] = useState("");
  const [generatedPairingCode, setGeneratedPairingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Test send state
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Hello from TripMate! Your WhatsApp OTP sender is linked and operational. 🚀"
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchStatus = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const res = await fetch("/api/admin/whatsapp", { cache: "no-store" });
      const json: WorkerStatus = await res.json();
      setData(json);
      if (json.pairingCode) {
        setGeneratedPairingCode(json.pairingCode);
      }
    } catch (err) {
      setData({
        workerOnline: false,
        workerUrl: "http://127.0.0.1:4100",
        status: "OFFLINE",
        error: (err as Error).message,
      });
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Auto-poll status: 3s if connecting/pairing/qr, else 10s
    const isTransitional =
      data?.status === "QR_READY" ||
      data?.status === "PAIRING_CODE_READY" ||
      data?.status === "CONNECTING";
    const intervalTime = isTransitional ? 2500 : 10000;
    const timer = setInterval(() => fetchStatus(true), intervalTime);
    return () => clearInterval(timer);
  }, [fetchStatus, data?.status]);

  const handleLinkQr = async (forceNew = false) => {
    if (data && !data.workerOnline) {
      toast("WhatsApp background worker is offline. Start it first using `npm run worker`.", "error");
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link_qr", forceNew }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate QR code");

      // Instantly apply state if QR is returned in response
      if (json.qrDataUrl) {
        setData((prev) => ({
          ...(prev || { workerUrl: "http://127.0.0.1:4100" }),
          workerOnline: true,
          status: "QR_READY",
          qrDataUrl: json.qrDataUrl,
        }));
      }

      toast("WhatsApp QR Code ready! Scan with your phone.", "success");
      await fetchStatus(true);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLinkPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (data && !data.workerOnline) {
      toast("WhatsApp background worker is offline. Start it first using `npm run worker`.", "error");
      return;
    }

    const clean = inputPhone.replace(/\D/g, "").slice(-10);
    if (clean.length !== 10) {
      toast("Please enter a valid 10-digit Indian WhatsApp phone number.", "error");
      return;
    }

    setIsActionLoading(true);
    setGeneratedPairingCode(null);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link_pairing", phone: clean }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate pairing code");

      setGeneratedPairingCode(json.code);
      setData((prev) => ({
        ...(prev || { workerUrl: "http://127.0.0.1:4100" }),
        workerOnline: true,
        status: "PAIRING_CODE_READY",
        pairingCode: json.code,
      }));

      toast(`Pairing code generated: ${json.code}`, "success");
      await fetchStatus(true);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect this WhatsApp number? Message delivery will pause until a new number is linked."
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to disconnect WhatsApp number");
      setGeneratedPairingCode(null);
      toast("WhatsApp number unlinked successfully. You can now link a new phone number.", "success");
      await fetchStatus(true);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast("Pairing code copied to clipboard!", "success");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    toast("Command copied to clipboard!", "success");
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = testPhone.replace(/\D/g, "").slice(-10);
    if (clean.length !== 10) {
      toast("Please enter a valid 10-digit phone number for the test message.", "error");
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_send",
          to: clean,
          text: testMessage,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setTestResult({ ok: true, msg: `Message dispatched successfully to +91 ${clean}!` });
        toast("Test message dispatched successfully!", "success");
      } else {
        setTestResult({ ok: false, msg: json.error || `Send failed (HTTP ${res.status})` });
        toast(json.error || "Delivery failed", "error");
      }
    } catch (err) {
      setTestResult({ ok: false, msg: (err as Error).message });
      toast((err as Error).message, "error");
    } finally {
      setIsSendingTest(false);
    }
  };

  const isConnected = data?.status === "CONNECTED";
  const isWorkerOffline = data ? !data.workerOnline : false;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-text-primary tracking-tight">
              WhatsApp OTP Sender &amp; Device Link
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Connect and switch the WhatsApp Business phone number used to dispatch real-time login codes to users.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchStatus(false)}
            disabled={isLoading || isActionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-hairline bg-surface hover:bg-surface-container-high text-xs font-semibold text-text-primary transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* Worker Offline Alert Banner */}
      {isWorkerOffline && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-bold text-amber-950">
                WhatsApp Background Worker is Offline
              </h3>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                The device linking service and OTP sender require the Node.js worker running on{" "}
                <code className="px-1.5 py-0.5 rounded bg-white text-amber-950 font-mono text-[11px] border border-amber-200">
                  http://127.0.0.1:4100
                </code>
                . Start it in a terminal to enable pairing or QR scanning.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-200/80">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-800 shrink-0" />
              <span className="text-xs font-medium text-amber-950">Run either command:</span>
              <div className="flex items-center gap-2">
                <code className="px-2.5 py-1 rounded-lg bg-amber-900 text-white font-mono text-xs font-bold shadow-xs flex items-center gap-1.5">
                  npm run worker
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyCommand("npm run worker")}
                  className="p-1 rounded-md hover:bg-amber-200 text-amber-900 transition-colors"
                  title="Copy command"
                >
                  {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchStatus(false)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Check Connection</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Status Hero Card */}
      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
                isConnected
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : data?.workerOnline
                  ? "bg-amber-50 text-amber-600 border-amber-200"
                  : "bg-red-50 text-red-600 border-red-200"
              }`}
            >
              {isConnected ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : data?.workerOnline ? (
                <Radio className="w-6 h-6 animate-pulse" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-text-primary">
                  {isConnected
                    ? `Linked Sender: +91 ${data.phone || ""}`
                    : data?.workerOnline
                    ? `Worker Ready: ${data?.status || "STANDBY"}`
                    : "WhatsApp Worker Offline"}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    isConnected
                      ? "bg-emerald-100 text-emerald-800"
                      : data?.workerOnline
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected
                        ? "bg-emerald-600"
                        : data?.workerOnline
                        ? "bg-amber-600 animate-ping"
                        : "bg-red-600"
                    }`}
                  />
                  {data?.status || "OFFLINE"}
                </span>
              </div>

              <p className="text-xs text-text-secondary mt-1">
                {isConnected ? (
                  <span>
                    All user authentication OTP codes are being dispatched through this WhatsApp account in real time.
                  </span>
                ) : data?.workerOnline ? (
                  <span>
                    Worker is running at{" "}
                    <code className="px-1.5 py-0.5 rounded bg-surface text-text-primary text-[11px] font-mono">
                      {data.workerUrl}
                    </code>
                    . Choose a linking method below to connect your WhatsApp Business account.
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">
                    The background worker service is offline. Start the worker using <code>npm run worker</code>.
                  </span>
                )}
              </p>
            </div>
          </div>

          {isConnected && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isActionLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Unlink / Change Number</span>
            </button>
          )}
        </div>
      </div>

      {/* Linking Interface: Rendered when not connected */}
      {!isConnected && (
        <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs space-y-6">
          <div className="border-b border-border-hairline pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Link or Change Sender Number
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Choose your preferred linking method to attach your WhatsApp Business phone.
              </p>
            </div>

            {/* Method Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-surface-container-low border border-border-hairline text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLinkTab("pairing")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  linkTab === "pairing"
                    ? "bg-surface text-text-primary shadow-xs font-bold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pairing Code (Recommended)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLinkTab("qr");
                  if (data?.workerOnline && !data?.qrDataUrl) {
                    handleLinkQr(false);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  linkTab === "qr"
                    ? "bg-surface text-text-primary shadow-xs font-bold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Pairing Code */}
          {linkTab === "pairing" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <form onSubmit={handleLinkPairing} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label htmlFor="wa-admin-phone" className="text-xs font-bold text-text-primary">
                    Sender Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 px-2 py-1 rounded bg-surface-container text-xs font-bold border border-border-hairline flex items-center gap-1">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      id="wa-admin-phone"
                      type="tel"
                      value={inputPhone}
                      onChange={(e) => setInputPhone(e.target.value)}
                      placeholder="98765 43210"
                      maxLength={10}
                      disabled={isActionLoading || isWorkerOffline}
                      className="w-full h-11 pl-20 pr-4 rounded-xl bg-surface-container-low text-text-primary placeholder:text-text-secondary text-sm font-medium border border-border-hairline focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-60"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Enter the 10-digit Indian WhatsApp Business number you want to send verification messages from.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={
                    isActionLoading ||
                    isWorkerOffline ||
                    inputPhone.replace(/\D/g, "").length !== 10
                  }
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isActionLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Requesting 8-Digit Pairing Code...</span>
                    </span>
                  ) : isWorkerOffline ? (
                    <span>Worker Offline — Start Worker to Link</span>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      <span>Request 8-Digit Pairing Code</span>
                    </>
                  )}
                </button>
              </form>

              {/* Instructions & Code Display */}
              <div className="rounded-xl p-5 bg-surface-container-low border border-border-hairline space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  How to link on your phone:
                </h3>

                {generatedPairingCode ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <p className="text-xs text-emerald-800 font-semibold">
                      Enter this code in WhatsApp on your phone:
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl font-mono font-black tracking-widest text-emerald-900 bg-white px-4 py-2 rounded-lg border border-emerald-300 shadow-xs">
                        {generatedPairingCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(generatedPairingCode)}
                        className="p-2.5 rounded-lg bg-emerald-200 hover:bg-emerald-300 text-emerald-950 transition-colors cursor-pointer"
                        title="Copy code"
                      >
                        {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-700">Code is valid for ~60 seconds.</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-surface border border-dashed border-border-hairline text-center text-xs text-text-secondary">
                    Enter your phone number and click &quot;Request 8-Digit Pairing Code&quot; to begin.
                  </div>
                )}

                <ol className="text-xs text-text-primary space-y-2 list-decimal list-inside leading-relaxed font-medium">
                  <li>Open <strong>WhatsApp</strong> on your phone.</li>
                  <li>Tap <strong>Settings</strong> (iOS) or <strong>⋮ More options</strong> (Android) &gt; <strong>Linked Devices</strong>.</li>
                  <li>Tap <strong>Link a Device</strong>.</li>
                  <li>Tap <strong>&quot;Link with phone number instead&quot;</strong> at the bottom.</li>
                  <li>Enter the 8-character pairing code shown above.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Tab 2: QR Code */}
          {linkTab === "qr" && (
            <div className="flex flex-col items-center justify-center p-6 space-y-5 text-center">
              {isWorkerOffline ? (
                <div className="w-64 h-64 rounded-2xl bg-amber-50/50 border border-dashed border-amber-300 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-amber-600" />
                  <p className="text-xs text-amber-900 font-semibold">
                    Worker service is offline
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Start the background worker with <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">npm run worker</code> to generate the WhatsApp Web QR code.
                  </p>
                </div>
              ) : isActionLoading ? (
                <div className="w-64 h-64 rounded-2xl bg-surface-container-low border border-border-hairline flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="w-8 h-8 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin" />
                  <p className="text-xs text-text-primary font-bold">
                    Connecting to WhatsApp Web...
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    Generating fresh QR handshake code.
                  </p>
                </div>
              ) : data?.qrDataUrl ? (
                <div className="space-y-3">
                  <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500/20 shadow-md inline-block">
                    <Image
                      src={data.qrDataUrl}
                      alt="WhatsApp QR Code"
                      width={240}
                      height={240}
                      unoptimized
                      priority
                      className="rounded-lg"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live QR Code Active</span>
                  </div>
                </div>
              ) : (
                <div className="w-64 h-64 rounded-2xl bg-surface-container-low border border-dashed border-border-hairline flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <QrCode className="w-12 h-12 text-text-secondary" />
                  <p className="text-xs text-text-primary font-bold">
                    Ready to generate QR Code
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    Click the button below to initialize WhatsApp Web handshake.
                  </p>
                </div>
              )}

              <div className="max-w-md space-y-1.5 text-center">
                <p className="text-xs font-bold text-text-primary">
                  Scan this QR code with WhatsApp on your phone:
                </p>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Open WhatsApp &gt; <strong>Settings</strong> (or ⋮) &gt; <strong>Linked Devices</strong> &gt; <strong>Link a Device</strong> and point your camera here.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLinkQr(true)}
                  disabled={isActionLoading || isWorkerOffline}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isActionLoading ? "animate-spin" : ""}`} />
                  <span>{data?.qrDataUrl ? "Refresh QR Code" : "Generate QR Code"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Message Dispatch Test Card */}
      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs space-y-4 max-w-2xl">
        <div className="flex items-center gap-2 text-text-primary">
          <Send className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Live Delivery Smoke Test
          </h2>
        </div>
        <p className="text-xs text-text-secondary">
          Send an immediate WhatsApp message to any mobile number to verify the connection end to end.
        </p>

        <form onSubmit={handleTestSend} className="space-y-3.5">
          <div className="space-y-1 text-left">
            <label htmlFor="test-dest-mobile" className="text-xs font-bold text-text-primary">
              Recipient WhatsApp Mobile
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 px-2 py-0.5 rounded bg-surface-container text-xs font-bold border border-border-hairline flex items-center gap-1">
                <span>🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                id="test-dest-mobile"
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="98765 43210"
                maxLength={10}
                disabled={isSendingTest || !isConnected}
                className="w-full h-10 pl-20 pr-4 rounded-xl bg-surface-container-low text-text-primary placeholder:text-text-secondary text-xs font-medium border border-border-hairline focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-60"
                required
              />
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="test-dest-text" className="text-xs font-bold text-text-primary">
              Message Content
            </label>
            <textarea
              id="test-dest-text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={2}
              disabled={isSendingTest || !isConnected}
              className="w-full p-3 rounded-xl bg-surface-container-low text-text-primary text-xs font-medium border border-border-hairline focus:border-emerald-500 focus:outline-none resize-none disabled:opacity-60"
              required
            />
          </div>

          <button
            type="submit"
            disabled={
              isSendingTest ||
              !isConnected ||
              testPhone.replace(/\D/g, "").length !== 10
            }
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSendingTest ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Sending...</span>
              </span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Test Message</span>
              </>
            )}
          </button>
        </form>

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              testResult.ok
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium leading-relaxed">{testResult.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
