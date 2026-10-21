import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getWorkerConfig() {
  return {
    url: process.env.WA_WORKER_URL || 'http://127.0.0.1:4100',
    secret: process.env.WA_WORKER_SECRET || '',
  };
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (authErr) {
    return NextResponse.json({ error: (authErr as Error).message }, { status: 401 });
  }

  const { url, secret } = getWorkerConfig();

  try {
    const res = await fetch(`${url}/status`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${secret}`,
      },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        workerOnline: true,
        workerUrl: url,
        status: 'AUTH_ERROR',
        error: `Worker rejected authorization (HTTP ${res.status}). Verify WA_WORKER_SECRET matches.`,
      });
    }

    const state = await res.json().catch(() => ({}));
    return NextResponse.json({
      workerOnline: true,
      workerUrl: url,
      ...state,
    });
  } catch (err) {
    return NextResponse.json({
      workerOnline: false,
      workerUrl: url,
      status: 'OFFLINE',
      error: `Worker offline or unreachable at ${url}: ${(err as Error).message}`,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (authErr) {
    return NextResponse.json({ error: (authErr as Error).message }, { status: 401 });
  }

  const { url, secret } = getWorkerConfig();
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  try {
    if (action === 'link_qr') {
      const res = await fetch(`${url}/link/qr`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${secret}`,
        },
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    if (action === 'link_pairing') {
      const phone = String(body.phone || '').trim();
      if (!phone) {
        return NextResponse.json({ error: 'Phone number is required for pairing code.' }, { status: 400 });
      }

      const res = await fetch(`${url}/link/pairing-code`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ phone }),
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    if (action === 'logout') {
      const res = await fetch(`${url}/logout`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${secret}`,
        },
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    if (action === 'test_send') {
      const to = String(body.to || '').trim();
      const text = String(body.text || '').trim();
      if (!to || !text) {
        return NextResponse.json({ error: 'Recipient phone number and message text are required.' }, { status: 400 });
      }

      const res = await fetch(`${url}/send`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ to, text }),
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
