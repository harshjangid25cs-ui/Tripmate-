/** India-only, same rules as the original: last 10 digits, must start 6-9. Adapt for other countries. */
export function normalizeMobile(raw: unknown): string {
  const d = String(raw ?? '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : d;
}
export const isValidMobile = (raw: unknown) => /^[6-9]\d{9}$/.test(normalizeMobile(raw));
export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(e);
