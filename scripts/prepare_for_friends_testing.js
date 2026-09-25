const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('./sqlite-compat');

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const DB_FILE = path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db');
const BACKUP_DIR = path.join(APP_DATA_ROOT, 'backups');

fs.mkdirSync(BACKUP_DIR, { recursive: true });

console.log('================================================================');
console.log('    PREPARE DATABASE FOR FRIENDS TESTING & USER FEEDBACK        ');
console.log('================================================================\n');

// 1. Safety Backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `pre-friend-test-backup-${timestamp}.db`);
fs.copyFileSync(DB_FILE, backupPath);
console.log(`[1/4] Safety Backup Created:\n  -> ${backupPath}\n`);

// 2. Open Database
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// 3. Check Pre-Clean Counts
const countOf = (tbl) => {
  try {
    return db.prepare(`SELECT COUNT(1) as c FROM ${tbl}`).get().c;
  } catch (_) {
    return 0;
  }
};

console.log('[2/4] Pre-Purge Records:');
console.log(`  • Enquiries:           ${countOf('enquiries')}`);
console.log(`  • Leads:               ${countOf('leads')}`);
console.log(`  • Bookings:            ${countOf('bookings')}`);
console.log(`  • Site Visits:         ${countOf('site_visits')}`);
console.log(`  • Attendance:          ${countOf('employee_attendance')}`);
console.log(`  • Employees:           ${countOf('employees')}`);
console.log(`  • Users (All):         ${countOf('users')}`);
console.log(`  • Non-Admin Users:     ${db.prepare("SELECT COUNT(1) as c FROM users WHERE role != 'admin'").get().c}`);
console.log(`  • Projects (Kept):     ${countOf('projects')}`);
console.log(`  • Units (To Reset):    ${countOf('project_units')}\n`);

// 4. Atomic Purge Transaction
console.log('[3/4] Executing Atomic Wipe Transaction...');
const purgeTx = db.transaction(() => {
  // Clear enquiries, leads, bookings, visits
  db.prepare('DELETE FROM enquiries').run();
  db.prepare('DELETE FROM leads').run();
  db.prepare('DELETE FROM bookings').run();
  db.prepare('DELETE FROM site_visits').run();
  db.prepare('DELETE FROM employee_attendance').run();
  db.prepare('DELETE FROM employees').run();

  // Clear non-admin users (preserve admin account id=1)
  db.prepare("DELETE FROM users WHERE role != 'admin'").run();

  // Clear temporary auth tables
  try { db.prepare('DELETE FROM password_resets').run(); } catch (_) {}
  try { db.prepare('DELETE FROM auth_otps').run(); } catch (_) {}

  // Clear audit logs
  db.prepare('DELETE FROM audit_logs').run();

  // Reset all unit statuses back to 'available' with empty buyer info
  db.prepare("UPDATE project_units SET status = 'available', buyer_name = '', buyer_phone = '', notes = ''").run();

  // Reset sqlite_sequence autoincrement counters
  const tablesToReset = [
    'enquiries', 'leads', 'bookings', 'site_visits',
    'employee_attendance', 'employees', 'audit_logs',
    'password_resets', 'auth_otps'
  ];
  for (const tbl of tablesToReset) {
    try {
      db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(tbl);
    } catch (_) {}
  }

  // Insert single clean initial audit log entry
  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, 'initialize', 'system', 0, 'Clean slate initialized for user feedback testing.', '127.0.0.1', CURRENT_TIMESTAMP)
  `).run(adminUser ? adminUser.id : 1);
});

purgeTx();
console.log('✓ Purge completed successfully.\n');

// 5. Post-Purge Verification
const postEnquiries = countOf('enquiries');
const postLeads = countOf('leads');
const postBookings = countOf('bookings');
const postVisits = countOf('site_visits');
const postAttendance = countOf('employee_attendance');
const postEmployees = countOf('employees');
const postNonAdminUsers = db.prepare("SELECT COUNT(1) as c FROM users WHERE role != 'admin'").get().c;
const postAdminUsers = db.prepare("SELECT COUNT(1) as c FROM users WHERE role = 'admin'").get().c;
const postAvailUnits = db.prepare("SELECT COUNT(1) as c FROM project_units WHERE status = 'available'").get().c;
const postSoldUnits = db.prepare("SELECT COUNT(1) as c FROM project_units WHERE status != 'available'").get().c;
const postTotalUnits = countOf('project_units');
const postProjects = countOf('projects');

console.log('[4/4] Post-Purge Verification:');
console.log(`  ✓ Total Enquiries:     ${postEnquiries} (Target: 0)`);
console.log(`  ✓ Leads in Pipeline:   ${postLeads} (Target: 0)`);
console.log(`  ✓ Bookings:            ${postBookings} (Target: 0)`);
console.log(`  ✓ Site Visits:         ${postVisits} (Target: 0)`);
console.log(`  ✓ Active Team/Staff:   ${postEmployees} (Target: 0)`);
console.log(`  ✓ Test Customers:      ${postNonAdminUsers} (Target: 0)`);
console.log(`  ✓ Admin Account:       ${postAdminUsers} (Active & Preserved)`);
console.log(`  ✓ Available Units:     ${postAvailUnits} / ${postTotalUnits} (100% Available)`);
console.log(`  ✓ Sold / Blocked Units: ${postSoldUnits} (Target: 0)`);
console.log(`  ✓ Active Projects:     ${postProjects} (Preserved)\n`);

const success = (
  postEnquiries === 0 &&
  postLeads === 0 &&
  postBookings === 0 &&
  postVisits === 0 &&
  postEmployees === 0 &&
  postNonAdminUsers === 0 &&
  postAdminUsers >= 1 &&
  postSoldUnits === 0
);

if (success) {
  console.log('================================================================');
  console.log('  SUCCESS! ENQUIRIES, BOOKINGS & TEAM ARE NOW 100% CLEAN!      ');
  console.log('  Your friends can now test the website as fresh users!         ');
  console.log('================================================================');
} else {
  console.error('WARNING: Some counts did not meet expectations. Please review.');
  process.exit(1);
}
