'use client';
import { useEffect, useState } from 'react';

type Customer = { id: string; name: string | null; mobile: string };

export default function WhatsAppLogin({ onSuccess }: { onSuccess?: (c: Customer) => void }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function call(url: string, payload: object) {
    setBusy(true); setErr('');
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Something went wrong');
      return j;
    } catch (e) { setErr((e as Error).message); return null; }
    finally { setBusy(false); }
  }

  async function sendCode() {
    const j = await call('/api/auth/send-otp', { mobile, name: name || undefined });
    if (j) { setStep('code'); setWait(j.resendAfterSeconds ?? 30); }
  }
  async function verify() {
    const j = await call('/api/auth/verify-otp', { mobile, otp });
    if (j) onSuccess?.(j.customer);
  }

  return (
    <div>
      {step === 'phone' ? (
        <>
          <input inputMode="numeric" placeholder="10-digit WhatsApp number" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <input placeholder="Name (optional, for new accounts)" value={name} onChange={(e) => setName(e.target.value)} />
          <button disabled={busy} onClick={sendCode}>Send code on WhatsApp</button>
        </>
      ) : (
        <>
          <input inputMode="numeric" maxLength={6} placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
          <button disabled={busy || otp.length !== 6} onClick={verify}>Verify</button>
          <button disabled={busy || wait > 0} onClick={sendCode}>{wait > 0 ? `Resend in ${wait}s` : 'Resend code'}</button>
        </>
      )}
      {err && <p role="alert">{err}</p>}
    </div>
  );
}
