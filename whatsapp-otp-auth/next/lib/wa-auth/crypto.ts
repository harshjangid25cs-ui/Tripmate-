import { createHmac, randomBytes, randomInt } from 'node:crypto';

function secret(): string {
  const s = process.env.WA_AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('WA_AUTH_SECRET must be set (32+ chars)');
  return s;
}
export const newOtp = () => randomInt(100000, 1000000).toString();
/** Keyed hash: a leaked DB row can't be brute-forced offline without the server secret. */
export const hashOtp = (mobile: string, code: string) =>
  createHmac('sha256', secret()).update(`otp:${mobile}:${code}`).digest('hex');
export const newSessionToken = () => `wsess_${randomBytes(32).toString('hex')}`;
export const hashToken = (t: string) => createHmac('sha256', secret()).update(`sess:${t}`).digest('hex');
