import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WhatsAppLink } from './whatsapp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load environment files from multiple potential roots (worker dir or project root)
if (process.loadEnvFile) {
  const candidateFiles = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../../.env.local'),
  ];
  for (const envPath of candidateFiles) {
    if (fs.existsSync(envPath)) {
      try {
        process.loadEnvFile(envPath);
      } catch {}
    }
  }
}

const SECRET = process.env.WORKER_SECRET || process.env.WA_WORKER_SECRET || '';
if (SECRET.length < 32) {
  console.error('[worker] ERROR: WORKER_SECRET or WA_WORKER_SECRET must be set (32+ chars).');
  console.error('[worker] Checked worker directory, current working directory, and parent .env/.env.local files.');
  process.exit(1);
}

const PORT = Number(process.env.PORT || process.env.WA_WORKER_PORT || 4100);
const HOST = process.env.HOST || '127.0.0.1';

const wa = new WhatsAppLink();
wa.resume().catch((e) => console.warn('[worker] resume notice:', e.message));

const authed = (req) => {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!m) return false;
  const a = crypto.createHash('sha256').update(m[1].trim()).digest();
  const b = crypto.createHash('sha256').update(SECRET).digest();
  return crypto.timingSafeEqual(a, b);
};

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let n = 0;
    const chunks = [];
    req.on('data', (c) => {
      n += c.length;
      if (n > 16384) {
        reject(new Error('Body too large'));
        req.destroy();
      } else {
        chunks.push(c);
      }
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {});
      } catch {
        reject(new Error('Bad JSON payload'));
      }
    });
    req.on('error', reject);
  });

const send = (res, code, body) => {
  res.writeHead(code, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
  });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x');

    if (req.method === 'GET' && pathname === '/health') {
      return send(res, 200, {
        ok: true,
        worker: 'online',
        status: wa.state().status,
        timestamp: new Date().toISOString(),
      });
    }

    if (!authed(req)) {
      return send(res, 401, { error: 'Unauthorized: invalid or missing bearer token' });
    }

    if (req.method === 'GET' && pathname === '/status') {
      return send(res, 200, wa.state());
    }

    if (req.method === 'POST' && pathname === '/link/qr') {
      const body = await readJson(req).catch(() => ({}));
      const forceNew = Boolean(body.forceNew);
      const qrDataUrl = await wa.linkWithQr(forceNew);
      return send(res, 200, {
        ok: true,
        ...wa.state(),
        qrDataUrl,
      });
    }

    if (req.method === 'POST' && pathname === '/link/pairing-code') {
      const { phone } = await readJson(req);
      if (!phone) {
        return send(res, 400, { error: '`phone` is required for pairing code' });
      }
      const code = await wa.linkWithPairingCode(phone);
      return send(res, 200, {
        ok: true,
        code,
        ...wa.state(),
      });
    }

    if (req.method === 'POST' && pathname === '/logout') {
      await wa.logout();
      return send(res, 200, { ok: true, status: 'DISCONNECTED' });
    }

    if (req.method === 'POST' && pathname === '/send') {
      const { to, text } = await readJson(req);
      if (!to || !text) {
        return send(res, 400, { error: '`to` and `text` are required' });
      }
      const r = await wa.send(to, text);
      return send(res, r.ok ? 200 : 502, r);
    }

    send(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error('[worker] request error:', e.message);
    send(res, 400, { error: e.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[worker] listening on ${HOST}:${PORT}`);
});
