/**
 * upi-qr.ts — Native Direct UPI Intent & Scannable QR Code Utility
 * Generates NPCI-compliant `upi://pay` deep links and crisp flat SVG QR codes
 * for zero-fee direct merchant settlements into Superadmin UPI VPAs.
 */

import QRCode from "qrcode";

export interface UpiPaymentDetails {
  vpa: string;
  payeeName: string;
  amount: number;
  transactionNote?: string;
  transactionRef?: string;
}

/**
 * Builds standard NPCI-compliant UPI Intent URI for mobile app deep-linking
 * Format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...
 */
export function buildUpiPaymentUri(params: UpiPaymentDetails): string {
  const { vpa, payeeName, amount, transactionNote = "TripMate Booking", transactionRef } = params;
  const cleanVpa = (vpa || "tripmate@upi").trim();
  const cleanName = (payeeName || "TripMate Travels").trim();
  const formattedAmount = Number(amount || 0).toFixed(2);

  const queryParts = [
    `pa=${encodeURIComponent(cleanVpa)}`,
    `pn=${encodeURIComponent(cleanName)}`,
    `am=${formattedAmount}`,
    `cu=INR`,
    `tn=${encodeURIComponent(transactionNote)}`,
  ];

  if (transactionRef) {
    queryParts.push(`tr=${encodeURIComponent(transactionRef)}`);
  }

  return `upi://pay?${queryParts.join("&")}`;
}

/**
 * Generates a high-contrast, flat solid SVG QR code string
 * Colors: strictly #1F1F1E dark modules on #FFFFFF surface (0% gradient)
 */
export async function generateUpiQrSvg(
  uri: string,
  options?: { size?: number; margin?: number }
): Promise<string> {
  const { size = 260, margin = 2 } = options || {};
  return QRCode.toString(uri, {
    type: "svg",
    width: size,
    margin,
    color: {
      dark: "#1F1F1E",
      light: "#FFFFFF",
    },
  });
}

/**
 * Generates a PNG Data URL for standard image tag rendering
 */
export async function generateUpiQrDataUrl(
  uri: string,
  options?: { size?: number; margin?: number }
): Promise<string> {
  const { size = 260, margin = 2 } = options || {};
  return QRCode.toDataURL(uri, {
    width: size,
    margin,
    color: {
      dark: "#1F1F1E",
      light: "#FFFFFF",
    },
  });
}

/**
 * Validates strictly 12 numeric digits required for UPI UTR / RRN numbers
 */
export function isValidUtr(utr: string | null | undefined): boolean {
  if (!utr) return false;
  return /^\d{12}$/.test(utr.trim());
}
