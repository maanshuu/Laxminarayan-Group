const fs = require("fs");
const path = require("path");
const os = require("os");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "LaxminarayanGroup");
const DATA_DIR = path.join(APP_DATA_ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "laxminarayan.db");
const UPLOAD_DIR = path.join(APP_DATA_ROOT, "uploads");

// Cloud destination: Read from BACKUP_DIR in .env or default to structured cloud_sync folder
const DEFAULT_CLOUD_DIR = path.join(APP_DATA_ROOT, "cloud_backups");
const TARGET_CLOUD_DIR = process.env.BACKUP_DIR || DEFAULT_CLOUD_DIR;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDirRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  ensureDir(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDirRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

function pruneOldBackups(backupRoot, maxDays = 14) {
  if (!fs.existsSync(backupRoot)) return;
  const now = Date.now();
  const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;
  let pruned = 0;

  for (const item of fs.readdirSync(backupRoot, { withFileTypes: true })) {
    const fullPath = path.join(backupRoot, item.name);
    try {
      const stats = fs.statSync(fullPath);
      if (now - stats.mtimeMs > maxAgeMs) {
        if (item.isDirectory()) fs.rmSync(fullPath, { recursive: true, force: true });
        else fs.unlinkSync(fullPath);
        pruned++;
      }
    } catch (_e) {}
  }
  return pruned;
}

async function runBackup() {
  console.log("================================================================");
  console.log("   LAXMINARAYAN GROUP — OFFSITE CLOUD BACKUP & DISASTER RECOVERY");
  console.log("================================================================\n");

  if (!fs.existsSync(DB_FILE)) {
    console.error(`[ERROR] Primary database file not found at: ${DB_FILE}`);
    process.exitCode = 1;
    return;
  }

  const timestamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()) +
    "_" + new Date().toISOString().slice(11, 19).replace(/:/g, "-");
  const backupFolder = path.join(TARGET_CLOUD_DIR, `laxminarayan_backup_${timestamp}`);
  ensureDir(backupFolder);

  console.log(`Source Database: ${DB_FILE}`);
  console.log(`Destination:     ${backupFolder}`);

  // 1. Copy SQLite database and WAL files
  const dbDest = path.join(backupFolder, "laxminarayan.db");
  fs.copyFileSync(DB_FILE, dbDest);
  console.log("  [✓] Database snapshot archived.");

  if (fs.existsSync(DB_FILE + "-wal")) {
    fs.copyFileSync(DB_FILE + "-wal", dbDest + "-wal");
    console.log("  [✓] SQLite WAL buffer archived.");
  }
  if (fs.existsSync(DB_FILE + "-shm")) {
    fs.copyFileSync(DB_FILE + "-shm", dbDest + "-shm");
  }

  // 2. Archive uploaded media assets
  if (fs.existsSync(UPLOAD_DIR)) {
    const uploadDest = path.join(backupFolder, "uploads");
    copyDirRecursive(UPLOAD_DIR, uploadDest);
    console.log("  [✓] Project media & uploads archived.");
  }

  // 3. Write metadata verification manifest
  const manifest = {
    service: "Laxminarayan Group",
    timestamp: new Date().toISOString(),
    timezone: "Asia/Kolkata (IST)",
    db_file: "laxminarayan.db",
    dbSize: fs.statSync(DB_FILE).size,
    environment: process.env.NODE_ENV || "development",
    version: "4.0.0"
  };
  fs.writeFileSync(path.join(backupFolder, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log("  [✓] Backup manifest generated.");

  // 4. Clean up backups older than 14 days
  const prunedCount = pruneOldBackups(TARGET_CLOUD_DIR, 14);
  if (prunedCount > 0) {
    console.log(`  [✓] Retention policy applied: pruned ${prunedCount} snapshot(s) older than 14 days.`);
  }

  console.log("\n================================================================");
  console.log(`  BACKUP COMPLETED SUCCESSFULLY AT: ${backupFolder}`);
  console.log("================================================================\n");
}

runBackup().catch(err => {
  console.error("Fatal backup failure:", err);
  process.exit(1);
});
