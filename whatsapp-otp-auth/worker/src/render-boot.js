import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

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

// Canonical DATA_DIR across OS and process paths
const DATA_DIR = process.env.WA_DATA_DIR
  ? path.resolve(process.env.WA_DATA_DIR)
  : path.resolve(__dirname, '../data');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })
  : null;

/**
 * Restores WhatsApp Baileys session files from Supabase before the server boots.
 */
async function restoreSessionFromSupabase() {
  if (!supabase) {
    console.warn(
      '⚠️ [render-boot] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Skipping session restore from Supabase.'
    );
    return;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  try {
    const { data, error } = await supabase
      .from('wa_session_files')
      .select('filename, content');

    if (error) {
      console.error('⚠️ [render-boot] Failed to fetch session from Supabase:', error.message);
      return;
    }

    if (data && data.length > 0) {
      for (const row of data) {
        // Normalize POSIX path into platform-specific path
        const normalizedRelPath = row.filename.split('/').join(path.sep);
        const filePath = path.join(DATA_DIR, normalizedRelPath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, Buffer.from(row.content, 'base64'));
      }
      console.log(`✅ [render-boot] Restored ${data.length} WhatsApp session files from Supabase.`);
    } else {
      console.log('ℹ️ [render-boot] No existing session in Supabase. Fresh QR/Pairing link required.');
    }
  } catch (err) {
    console.error('⚠️ [render-boot] Unexpected error during session restore:', err.message);
  }
}

/**
 * Recursively scans directory and returns all relative file paths normalized to POSIX.
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      // Normalize to POSIX path for cross-OS compatibility
      const relPath = path.relative(DATA_DIR, fullPath).split(path.sep).join('/');
      arrayOfFiles.push(relPath);
    }
  }
  return arrayOfFiles;
}

/**
 * Lightweight DB touch to prevent Supabase 7-day free tier pause
 */
async function touchSupabaseKeepAlive() {
  if (!supabase) return;
  try {
    await supabase.from('wa_session_files').select('filename').limit(1);
  } catch {}
}

let isSyncing = false;

/**
 * Periodically backs up all active session files to Supabase and prunes rotated/deleted keys.
 */
async function syncSessionToSupabase() {
  if (!supabase || isSyncing || !fs.existsSync(DATA_DIR)) return;
  isSyncing = true;

  try {
    const relativeFiles = getAllFiles(DATA_DIR);
    if (relativeFiles.length === 0) {
      await touchSupabaseKeepAlive();
      return;
    }

    const rows = relativeFiles.map((filename) => {
      const localFilePath = path.join(DATA_DIR, filename.split('/').join(path.sep));
      return {
        filename,
        content: fs.readFileSync(localFilePath).toString('base64'),
        updated_at: new Date().toISOString(),
      };
    });

    // Upsert in batches of 50 to maintain fast execution and avoid size limits
    const CHUNK_SIZE = 50;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('wa_session_files')
        .upsert(chunk, { onConflict: 'filename' });

      if (error) {
        console.error('⚠️ [render-boot] Supabase session sync error:', error.message);
        return;
      }
    }

    // Prune stale/deleted keys from Supabase (WhatsApp Baileys rotates and drops old pre-keys)
    const { data: existingRows, error: fetchErr } = await supabase
      .from('wa_session_files')
      .select('filename');

    if (!fetchErr && existingRows) {
      const localSet = new Set(relativeFiles);
      const staleFiles = existingRows
        .map((r) => r.filename)
        .filter((f) => !localSet.has(f));

      if (staleFiles.length > 0) {
        for (let i = 0; i < staleFiles.length; i += CHUNK_SIZE) {
          const deleteChunk = staleFiles.slice(i, i + CHUNK_SIZE);
          await supabase.from('wa_session_files').delete().in('filename', deleteChunk);
        }
        console.log(`🧹 [render-boot] Pruned ${staleFiles.length} rotated/stale session files from Supabase.`);
      }
    }
  } catch (err) {
    console.error('⚠️ [render-boot] Unexpected error during Supabase session sync:', err.message);
  } finally {
    isSyncing = false;
  }
}

async function boot() {
  console.log('🚀 [render-boot] Initializing WhatsApp worker with Supabase Session Sync...');

  // 1. Restore previous session from Supabase before server starts
  await restoreSessionFromSupabase();

  // 2. Start periodic background sync (every 20s) - also keeps Supabase active
  const syncTimer = setInterval(syncSessionToSupabase, 20000);

  // 3. Graceful shutdown handler: sync final state before Render terminates instance
  let shuttingDown = false;
  const handleShutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(syncTimer);
    console.log(`\n🔄 [render-boot] ${signal} received. Persisting final WhatsApp state to Supabase...`);
    await syncSessionToSupabase();
    console.log('✅ [render-boot] Final state persisted. Exiting process.');
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  // 4. Launch the core worker server (ES Module import)
  await import('./server.js');
}

boot().catch((err) => {
  console.error('❌ [render-boot] Fatal error during boot:', err);
  process.exit(1);
});
