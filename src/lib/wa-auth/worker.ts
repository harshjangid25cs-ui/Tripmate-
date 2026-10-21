import 'server-only';

export async function sendWhatsApp(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const workerUrl = process.env.WA_WORKER_URL || 'http://127.0.0.1:4100';
    const workerSecret = process.env.WA_WORKER_SECRET || '';

    // If simulated mode is enabled in dev/test, bypass external worker
    if (process.env.WA_SIMULATE_WORKER === 'true' && process.env.NODE_ENV !== 'production') {
      console.log(`[wa-auth][simulated] Delivering to ${to}: ${text}`);
      return { ok: true };
    }

    const res = await fetch(`${workerUrl}/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${workerSecret}`,
      },
      body: JSON.stringify({ to, text }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true };
    }

    // In dev, if worker returns error but simulate is on, fallback to simulated
    if (process.env.NODE_ENV !== 'production' && process.env.WA_SIMULATE_WORKER === 'true') {
      console.warn(`[wa-auth] Worker error (${res.status}), fell back to simulated delivery.`);
      return { ok: true };
    }

    return { ok: false, error: body?.error || `worker ${res.status}` };
  } catch (e) {
    if (process.env.NODE_ENV !== 'production' && process.env.WA_SIMULATE_WORKER === 'true') {
      console.warn('[wa-auth] Worker offline, fallback simulated delivery used.');
      return { ok: true };
    }
    return { ok: false, error: (e as Error).message };
  }
}

export const otpMessage = (code: string, name?: string | null) =>
  `🔐 *TripMate Verification Code*\n\n` +
  `${name ? `Hello *${name}*! ` : ''}Your one-time login code is: *${code}*\n\n` +
  `⏱ _Valid for 5 minutes. Do not share this code with anyone._`;
