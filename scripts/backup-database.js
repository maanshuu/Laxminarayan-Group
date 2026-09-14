const fs = require('fs');
const path = require('path');
const os = require('os');
const { DatabaseSync, backup } = require('node:sqlite');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');
const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const PERSISTENT_DATA_DIR = path.join(APP_DATA_ROOT, 'data');
const CONFIGURED_DB = process.env.DB_FILE || './data/laxminarayan.db';
const LEGACY_DB_FILE = path.resolve(ROOT, CONFIGURED_DB);
const DB_FILE = path.isAbsolute(CONFIGURED_DB) ? CONFIGURED_DB : path.join(PERSISTENT_DATA_DIR, 'laxminarayan.db');
const BACKUP_DIR = path.join(APP_DATA_ROOT, 'backups');

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
if (!path.isAbsolute(CONFIGURED_DB) && !fs.existsSync(DB_FILE) && fs.existsSync(LEGACY_DB_FILE)) {
  fs.copyFileSync(LEGACY_DB_FILE, DB_FILE);
}
if (!fs.existsSync(DB_FILE)) throw new Error(`Database not found: ${DB_FILE}`);
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE, { readOnly: true });
const destination = path.join(BACKUP_DIR, `manual-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
(async () => {
  try {
    await backup(db, destination);
    console.log(`Backup created: ${destination}`);
  } finally {
    db.close();
  }
})().catch(err => { console.error(err.message); process.exitCode = 1; });
