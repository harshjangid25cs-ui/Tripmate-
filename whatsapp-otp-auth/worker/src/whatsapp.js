// Ported from youpi-pg apps/payment-api/src/services/whatsapp-berry.service.js
// Enhanced with robust QR awaiting, canonical storage paths, and reliable reconnection.
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { BerryProtocol } from 'berryprotocol';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure DATA_DIR is always canonical and stable regardless of process cwd
const DATA_DIR = process.env.WA_DATA_DIR
  ? path.resolve(process.env.WA_DATA_DIR)
  : path.resolve(__dirname, '../data');

const AUTH_DIR = path.join(DATA_DIR, 'berry_auth');
const DB_PATH = path.join(DATA_DIR, 'berry_store.db');
const META = path.join(DATA_DIR, 'whatsapp_session.json');

/** 10-digit Indian numbers get the 91 prefix; anything longer is used as-is. */
export function toJid(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  else if (d.length === 11 && d.startsWith('0')) d = '91' + d.slice(1);
  return d ? `${d}@s.whatsapp.net` : '';
}

export class WhatsAppLink extends EventEmitter {
  status = 'DISCONNECTED'; // DISCONNECTED | CONNECTING | QR_READY | PAIRING_CODE_READY | CONNECTED
  phone = null;
  qr = null;
  pairing = null;
  client = null;
  sessionId = null;
  #reconnectTimer = null;
  #stopped = false;
  #attempt = 0;

  constructor() {
    super();
    try {
      const m = JSON.parse(fs.readFileSync(META, 'utf8'));
      this.sessionId = m.sessionId || null;
      this.phone = m.phoneNumber || null;
      this.hadSession = m.status === 'CONNECTED';
    } catch {
      this.hadSession = false;
    }
  }

  state() {
    return {
      status: this.status,
      phone: this.phone,
      qrDataUrl: this.qr,
      pairingCode: this.pairing,
    };
  }

  #saveMeta() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      META,
      JSON.stringify(
        {
          sessionId: this.sessionId,
          phoneNumber: this.phone,
          status: this.status === 'CONNECTED' ? 'CONNECTED' : 'PENDING',
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }

  /** Resume a previously linked session (call on boot). No-op if none was saved. */
  async resume() {
    if (this.hadSession && this.sessionId) {
      await this.#spawn('resume');
    }
  }

  /** Start linking via QR. Awaits the generated QR code or returns existing fresh one. */
  async linkWithQr(forceNew = false) {
    if (!forceNew && this.status === 'QR_READY' && this.qr) {
      return this.qr;
    }

    this.sessionId = `wa_${Date.now()}`;
    await this.#wipe(false);

    return new Promise(async (resolve, reject) => {
      let settled = false;
      const t = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (this.qr) resolve(this.qr);
        else reject(new Error('Timed out waiting for WhatsApp QR code generation (18s)'));
      }, 18000);

      this.once('qr', (qrDataUrl) => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        resolve(qrDataUrl);
      });

      try {
        await this.#spawn('qr');
      } catch (e) {
        if (!settled) {
          settled = true;
          clearTimeout(t);
          reject(e);
        }
      }
    });
  }

  /** Start linking via 8-digit pairing code (enter it in WhatsApp > Linked devices > Link with phone number). */
  async linkWithPairingCode(phone) {
    const jid = toJid(phone);
    if (!jid) throw new Error('Invalid phone number');

    this.sessionId = `wa_${Date.now()}`;
    await this.#wipe(false);

    return new Promise(async (resolve, reject) => {
      let settled = false;
      const t = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('Timed out waiting for WhatsApp pairing code (18s)'));
      }, 18000);

      this.once('pairing_code', ({ code }) => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        resolve(code);
      });

      try {
        await this.#spawn('pairing', jid.split('@')[0]);
      } catch (e) {
        if (!settled) {
          settled = true;
          clearTimeout(t);
          reject(e);
        }
      }
    });
  }

  async #spawn(mode, phoneDigits) {
    await this.#teardown();
    this.#stopped = false;
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    this.status = 'CONNECTING';
    this.#saveMeta();

    const c = new BerryProtocol({
      sessionId: this.sessionId,
      authFolder: AUTH_DIR,
      databasePath: DB_PATH,
      printQrInTerminal: false,
      reconnectDelayMs: 3000,
      reconnectMaxAttempts: 15,
    });
    this.client = c;

    let lastQr = null;
    const onQr = async (v) => {
      let raw = typeof v === 'string' ? v : (v?.value || v?.qr || (v ? String(v) : ''));
      if (!raw || raw === lastQr || this.status === 'CONNECTED') return;
      lastQr = raw;

      // WhatsApp's in-app camera expects the raw token payload from WhatsApp Web.
      this.qr = await QRCode.toDataURL(raw, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      this.status = 'QR_READY';
      this.emit('qr', this.qr);
    };

    c.on('auth.qr', ({ value }) => onQr(value));
    c.on('qr', onQr);
    c.on('auth.link', ({ value }) => onQr(value));

    c.on('auth.pairing_code', ({ code }) => {
      this.pairing = code;
      this.status = 'PAIRING_CODE_READY';
      this.emit('pairing_code', { code });
    });

    c.on('connection.open', () => {
      this.status = 'CONNECTED';
      this.qr = null;
      this.pairing = null;
      this.#attempt = 0;
      try {
        const id = c.socket?.sock?.user?.id || c.socket?.sock?.user?.jid;
        if (id) {
          const num = id.split(':')[0].split('@')[0];
          // Strip 91 prefix if 12-digit Indian number so UI formats smoothly
          this.phone = num.startsWith('91') && num.length === 12 ? num.slice(2) : num;
        }
      } catch {}
      this.hadSession = true;
      this.#saveMeta();
      console.log(`[wa] connected as ${this.phone || 'linked device'}`);
    });

    c.on('connection.close', async ({ reason, statusCode }) => {
      console.warn(`[wa] closed: reason=${reason} status=${statusCode}`);
      if (reason === 'manual_logout' || statusCode === 401) {
        await this.#wipe(true);
        return;
      }
      if (this.status === 'QR_READY' || this.status === 'PAIRING_CODE_READY') return;
      this.status = 'DISCONNECTED';
      if (!this.#stopped && this.hadSession) this.#scheduleReconnect();
    });

    c.on('protocol.error', ({ error }) => console.error('[wa] protocol error:', error));

    const run = mode === 'pairing' ? c.connectWithPairingCode(phoneDigits) : c.connectWithQr();
    run.catch((e) => console.warn(`[wa] connect notice: ${e.message}`));
  }

  #scheduleReconnect() {
    clearTimeout(this.#reconnectTimer);
    const delay = Math.min(60000, 3000 * 2 ** this.#attempt++);
    this.#reconnectTimer = setTimeout(() => this.#spawn('resume').catch(() => {}), delay);
  }

  async #teardown() {
    clearTimeout(this.#reconnectTimer);
    if (this.client) {
      try {
        this.client.removeAllListeners?.();
        await this.client.disconnect();
      } catch {}
      this.client = null;
    }
  }

  async #wipe(emitLoggedOut) {
    this.#stopped = true;
    await this.#teardown();
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch {}
    for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`, META]) {
      try {
        fs.rmSync(f, { force: true });
      } catch {}
    }
    this.status = 'DISCONNECTED';
    this.phone = null;
    this.qr = null;
    this.pairing = null;
    this.hadSession = false;
    if (emitLoggedOut) this.emit('logged_out');
  }

  async logout() {
    await this.#wipe(true);
  }

  async send(to, text) {
    if (!this.client || this.status !== 'CONNECTED') {
      return { ok: false, error: `WhatsApp not connected (${this.status})` };
    }
    const jid = toJid(to);
    if (!jid) return { ok: false, error: 'Invalid recipient' };
    try {
      const r = await this.client.sendText(jid, text);
      return { ok: true, id: r?.id };
    } catch (e) {
      if (/closed|socket/i.test(e.message)) {
        this.status = 'DISCONNECTED';
        this.#scheduleReconnect();
      }
      return { ok: false, error: e.message };
    }
  }
}
