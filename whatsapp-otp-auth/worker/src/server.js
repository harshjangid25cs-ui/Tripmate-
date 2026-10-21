import http from 'node:http';
import crypto from 'node:crypto';
import { WhatsAppLink } from './whatsapp.js';

if (process.loadEnvFile) {
  try { process.loadEnvFile(); } catch {}
}

const SECRET = process.env.WORKER_SECRET || '';
if (SECRET.length < 32) { console.error('WORKER_SECRET must be set (32+ chars).'); process.exit(1); }
const PORT = Number(process.env.PORT || 4100);
const HOST = process.env.HOST || '127.0.0.1';

const wa = new WhatsAppLink();
wa.resume().catch((e) => console.warn('resume failed:', e.message));

const authed = (req) => {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!m) return false;
  const a = crypto.createHash('sha256').update(m[1].trim()).digest();
  const b = crypto.createHash('sha256').update(SECRET).digest();
  return crypto.timingSafeEqual(a, b);
};
const readJson = (req) => new Promise((resolve, reject) => {
  let n = 0; const chunks = [];
  req.on('data', (c) => { n += c.length; if (n > 8192) { reject(new Error('Body too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}); } catch { reject(new Error('Bad JSON')); } });
  req.on('error', reject);
});
const send = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };

http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x');
    if (req.method === 'GET' && pathname === '/health') return send(res, 200, { ok: true });
    if (!authed(req)) return send(res, 401, { error: 'Unauthorized' });

    if (req.method === 'GET' && pathname === '/status') return send(res, 200, wa.state());
    if (req.method === 'POST' && pathname === '/link/qr') { await wa.linkWithQr(); return send(res, 202, wa.state()); }
    if (req.method === 'POST' && pathname === '/link/pairing-code') {
      const { phone } = await readJson(req);
      return send(res, 200, { code: await wa.linkWithPairingCode(phone) });
    }
    if (req.method === 'POST' && pathname === '/logout') { await wa.logout(); return send(res, 200, { ok: true }); }
    if (req.method === 'POST' && pathname === '/send') {
      const { to, text } = await readJson(req);
      if (!to || !text) return send(res, 400, { error: '`to` and `text` required' });
      const r = await wa.send(to, text);
      return send(res, r.ok ? 200 : 502, r);
    }
    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, 400, { error: e.message });
  }
}).listen(PORT, HOST, () => console.log(`[worker] listening on ${HOST}:${PORT}`));
