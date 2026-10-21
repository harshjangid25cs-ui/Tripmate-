import 'server-only';

export async function sendWhatsApp(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${process.env.WA_WORKER_URL}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.WA_WORKER_SECRET}` },
      body: JSON.stringify({ to, text }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store'
    });
    const body = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: body?.error || `worker ${res.status}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export const otpMessage = (code: string, name?: string | null) =>
  `🔐 *Verification code*\n\n${name ? `Hello *${name}*! ` : ''}Your one-time login code is: *${code}*\n\n` +
  `⏱ _Valid for 5 minutes. Do not share this code with anyone._`;
