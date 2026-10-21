import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const workerEntry = path.resolve(rootDir, 'whatsapp-otp-auth/worker/src/server.js');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  🚀 TripMate Full-Stack Dev Runner (Next.js + WhatsApp Worker)  ');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════\n');

// 1. Spawn Next.js Dev Server
const nextProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

// 2. Spawn WhatsApp Background Worker
const workerProc = spawn(process.execPath, [workerEntry], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
  env: { ...process.env },
});

const cleanup = (code = 0) => {
  console.log('\n[dev-all] Shutting down services cleanly...');
  try {
    if (nextProc && !nextProc.killed) {
      if (isWindows && nextProc.pid) {
        spawn('taskkill', ['/pid', String(nextProc.pid), '/f', '/t']);
      } else {
        nextProc.kill('SIGINT');
      }
    }
  } catch {}

  try {
    if (workerProc && !workerProc.killed) {
      if (isWindows && workerProc.pid) {
        spawn('taskkill', ['/pid', String(workerProc.pid), '/f', '/t']);
      } else {
        workerProc.kill('SIGINT');
      }
    }
  } catch {}

  process.exit(code);
};

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));
process.on('exit', () => cleanup(0));

nextProc.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[next] Next.js exited with code ${code}`);
  }
});

workerProc.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[wa-worker] WhatsApp worker exited with code ${code}`);
  }
});
