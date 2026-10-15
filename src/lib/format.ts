import { format, parseISO, isValid } from "date-fns";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Format a number or numeric string to INR currency (e.g. ₹27,376).
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "₹0";
  }
  const numericVal = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numericVal)) {
    return "₹0";
  }
  return inrFormatter.format(numericVal);
}

/**
 * Format a date string (YYYY-MM-DD or ISO timestamp) to a readable format (e.g. "Dec 14, 2025").
 */
export function formatDate(dateString: string | null | undefined, dateFormat = "MMM d, yyyy"): string {
  if (!dateString) return "";
  try {
    const parsed = typeof dateString === "string" ? parseISO(dateString) : new Date(dateString);
    if (!isValid(parsed)) return dateString;
    return format(parsed, dateFormat);
  } catch {
    return dateString;
  }
}

/**
 * Format a date range (e.g. "Dec 14 – 17, 2025" or "4 Days / 3 Nights").
 */
export function formatDateRange(
  startDate: string,
  endDate: string,
  options?: { includeDuration?: boolean }
): string {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (!isValid(start) || !isValid(end)) {
      return `${startDate} – ${endDate}`;
    }

    const startFormatted = format(start, "MMM d");
    const endFormatted = format(end, "MMM d, yyyy");

    const rangeText = `${startFormatted} – ${endFormatted}`;
    if (!options?.includeDuration) return rangeText;

    // Days calculation per DECISIONS.md D20: days = end - start + 1
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const nights = Math.max(0, days - 1);

    return `${rangeText} (${days} Days / ${nights} Nights)`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}
