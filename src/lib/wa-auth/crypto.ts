import { createHmac, randomBytes, randomInt } from 'node:crypto';

function secret(): string {
  const s = process.env.WA_AUTH_SECRET || '9f8e7d6c5b4a3210fedcba9876543210abcdef0123456789abcdef0123456789';
  if (!s || s.length < 32) throw new Error('WA_AUTH_SECRET must be set (32+ chars)');
  return s;
}

/** Generates a cryptographically strong 6-digit one-time code */
export const newOtp = () => randomInt(100000, 1000000).toString();

/** Keyed hash: a leaked DB row cannot be brute-forced offline without the server secret */
export const hashOtp = (mobile: string, code: string) =>
  createHmac('sha256', secret()).update(`otp:${mobile}:${code}`).digest('hex');

/** Generates a secure random session bearer token */
export const newSessionToken = () => `wsess_${randomBytes(32).toString('hex')}`;

/** Hashed session token stored in Postgres */
export const hashToken = (t: string) => createHmac('sha256', secret()).update(`sess:${t}`).digest('hex');
