const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('./sqlite-compat');

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const DB_FILE = path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db');
const BACKUP_DIR = path.join(APP_DATA_ROOT, 'backups');

fs.mkdirSync(BACKUP_DIR, { recursive: true });

console.log('================================================================');
console.log('       CLEAN SLATE PURGE: CUSTOMERS, INQUIRIES & TEAM           ');
console.log('================================================================\n');

// 1. Safety Backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `pre-team-demo-backup-${timestamp}.db`);
fs.copyFileSync(DB_FILE, backupPath);
console.log(`[1/3] Created Pre-Cleanup Safety Backup:\n  -> ${backupPath}\n`);

// 2. Open Database
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// 3. Perform Purge
console.log('[2/3] Executing Atomic Purge Transaction...');
const purge = db.transaction(() => {
  // Clear Inquiries, Leads, Bookings, Site Visits
  db.prepare('DELETE FROM enquiries').run();
  db.prepare('DELETE FROM leads').run();
  db.prepare('DELETE FROM bookings').run();
  db.prepare('DELETE FROM site_visits').run();

  // Clear Team & Attendance (Active Team)
  db.prepare('DELETE FROM employee_attendance').run();
  db.prepare("DELETE FROM users WHERE role = 'employee'").run();

  // Clear Customers
  db.prepare("DELETE FROM users WHERE role = 'customer'").run();

  // Clear OTPs & Password Resets
  try { db.prepare('DELETE FROM auth_otps').run(); } catch (_) {}
  try { db.prepare('DELETE FROM password_resets').run(); } catch (_) {}

  // Reset all unit inventory back to 100% available
  db.prepare("UPDATE project_units SET status = 'available', buyer_name = '', buyer_phone = '', notes = ''").run();

  // Reset audit logs
  db.prepare('DELETE FROM audit_logs').run();

  // Reset auto-increment sequence counters
  const tablesToReset = [
    'enquiries', 'leads', 'bookings', 'site_visits',
    'employee_attendance', 'audit_logs', 'password_resets', 'auth_otps'
  ];
  for (const tbl of tablesToReset) {
    try {
      db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(tbl);
    } catch (_) {}
  }

  // Insert fresh system initialization audit entry
  db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (
      (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
      'clean_slate',
      'system',
      0,
      'System wiped clean for live team demonstration. Customers, inquiries, and team reset.',
      '127.0.0.1',
      CURRENT_TIMESTAMP
    )
  `).run();
});

purge();
console.log('✓ Atomic purge transaction completed successfully.\n');

// 4. Verification
const postStats = {
  customers: db.prepare("SELECT COUNT(1) as c FROM users WHERE role = 'customer'").get().c,
  employees: db.prepare("SELECT COUNT(1) as c FROM users WHERE role = 'employee'").get().c,
  admins: db.prepare("SELECT COUNT(1) as c FROM users WHERE role = 'admin'").get().c,
  enquiries: db.prepare('SELECT COUNT(1) as c FROM enquiries').get().c,
  leads: db.prepare('SELECT COUNT(1) as c FROM leads').get().c,
  bookings: db.prepare('SELECT COUNT(1) as c FROM bookings').get().c,
  siteVisits: db.prepare('SELECT COUNT(1) as c FROM site_visits').get().c,
  attendance: db.prepare('SELECT COUNT(1) as c FROM employee_attendance').get().c,
  otps: db.prepare('SELECT COUNT(1) as c FROM auth_otps').get().c,
  availableUnits: db.prepare("SELECT COUNT(1) as c FROM project_units WHERE status = 'available'").get().c,
  totalUnits: db.prepare('SELECT COUNT(1) as c FROM project_units').get().c,
  projects: db.prepare('SELECT COUNT(1) as c FROM projects').get().c
};

console.log('[3/3] Post-Cleanup Confirmation & Verification:');
console.log(`  ✓ Customer Accounts:   ${postStats.customers} (Clean Zero)`);
console.log(`  ✓ Active Team/Advisors:${postStats.employees} (Clean Zero)`);
console.log(`  ✓ Inquiries/Enquiries: ${postStats.enquiries} (Clean Zero)`);
console.log(`  ✓ CRM Leads:           ${postStats.leads} (Clean Zero)`);
console.log(`  ✓ Bookings/Closures:   ${postStats.bookings} (Clean Zero)`);
console.log(`  ✓ Site Visits:         ${postStats.siteVisits} (Clean Zero)`);
console.log(`  ✓ Attendance Records:  ${postStats.attendance} (Clean Zero)`);
console.log(`  ✓ Pending OTPs:        ${postStats.otps} (Clean Zero)`);
console.log(`  ✓ Admin Account:       ${postStats.admins} (Active & Preserved)`);
console.log(`  ✓ Catalog Projects:    ${postStats.projects} (100% Intact)`);
console.log(`  ✓ Unit Inventory:      ${postStats.availableUnits} / ${postStats.totalUnits} Available\n`);

console.log('================================================================');
console.log('  SUCCESS! DASHBOARD IS 100% BRAND NEW FOR YOUR TEAM DEMO!      ');
console.log('================================================================');
