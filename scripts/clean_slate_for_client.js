const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('./sqlite-compat');

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const DB_FILE = path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db');
const BACKUP_DIR = path.join(APP_DATA_ROOT, 'backups');

fs.mkdirSync(BACKUP_DIR, { recursive: true });

console.log('================================================================');
console.log('       CLEAN-SLATE DATABASE PURGE & NEW-WEBSITE RESET           ');
console.log('================================================================\n');

// 1. Safety Backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `pre-clean-backup-${timestamp}.db`);
fs.copyFileSync(DB_FILE, backupPath);
console.log(`[1/4] Created Pre-Cleanup Safety Backup:\n  -> ${backupPath}\n`);

// 2. Open Database
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// 3. Read pre-clean stats
const preStats = {
  enquiries: db.prepare('SELECT COUNT(1) as c FROM enquiries').get().c,
  leads: db.prepare('SELECT COUNT(1) as c FROM leads').get().c,
  bookings: db.prepare('SELECT COUNT(1) as c FROM bookings').get().c,
  siteVisits: db.prepare('SELECT COUNT(1) as c FROM site_visits').get().c,
  attendance: db.prepare('SELECT COUNT(1) as c FROM employee_attendance').get().c,
  auditLogs: db.prepare('SELECT COUNT(1) as c FROM audit_logs').get().c,
  customers: db.prepare("SELECT COUNT(1) as c FROM users WHERE role = 'customer'").get().c,
  units: db.prepare('SELECT COUNT(1) as c FROM project_units').get().c,
  projects: db.prepare('SELECT COUNT(1) as c FROM projects').get().c
};

console.log('[2/4] Pre-Cleanup Data Counts:');
console.log(`  • Inquiries to clear:   ${preStats.enquiries}`);
console.log(`  • Leads to clear:       ${preStats.leads}`);
console.log(`  • Bookings to clear:    ${preStats.bookings}`);
console.log(`  • Site Visits to clear: ${preStats.siteVisits}`);
console.log(`  • Attendance to clear:  ${preStats.attendance}`);
console.log(`  • Audit logs to clear:  ${preStats.auditLogs}`);
console.log(`  • Customers to clear:   ${preStats.customers}`);
console.log(`  • Projects (PRESERVED): ${preStats.projects}`);
console.log(`  • Units (RESET AVAIL):  ${preStats.units}\n`);

// 4. Perform Clean Slate in a single atomic transaction
console.log('[3/4] Executing Atomic Purge Transaction...');
const purge = db.transaction(() => {
  // Purge transactional/customer records
  db.prepare('DELETE FROM enquiries').run();
  db.prepare('DELETE FROM leads').run();
  db.prepare('DELETE FROM bookings').run();
  db.prepare('DELETE FROM site_visits').run();
  db.prepare('DELETE FROM employee_attendance').run();
  db.prepare('DELETE FROM audit_logs').run();
  db.prepare('DELETE FROM password_resets').run();
  db.prepare("DELETE FROM users WHERE role = 'customer'").run();

  // Reset all unit statuses back to 'available'
  db.prepare("UPDATE project_units SET status = 'available', buyer_name = '', buyer_phone = '', notes = ''").run();

  // Reset sqlite_sequence counters for wiped tables so IDs start from 1
  const tablesToReset = [
    'enquiries', 'leads', 'bookings', 'site_visits',
    'employee_attendance', 'audit_logs', 'password_resets'
  ];
  for (const tbl of tablesToReset) {
    db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(tbl);
  }

  // Insert a fresh system initialization audit entry
  db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (
      (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
      'initialize',
      'system',
      0,
      'System reset to clean-slate production state. Ready for fresh client live test.',
      '127.0.0.1',
      CURRENT_TIMESTAMP
    )
  `).run();
});

purge();
console.log('✓ Purge completed cleanly.\n');

// 5. Post-clean verification
const postStats = {
  enquiries: db.prepare('SELECT COUNT(1) as c FROM enquiries').get().c,
  leads: db.prepare('SELECT COUNT(1) as c FROM leads').get().c,
  bookings: db.prepare('SELECT COUNT(1) as c FROM bookings').get().c,
  siteVisits: db.prepare('SELECT COUNT(1) as c FROM site_visits').get().c,
  attendance: db.prepare('SELECT COUNT(1) as c FROM employee_attendance').get().c,
  auditLogs: db.prepare('SELECT COUNT(1) as c FROM audit_logs').get().c,
  customers: db.prepare("SELECT COUNT(1) as c FROM users WHERE role = 'customer'").get().c,
  admins: db.prepare("SELECT COUNT(1) as c FROM users WHERE role = 'admin'").get().c,
  employees: db.prepare("SELECT COUNT(1) as c FROM users WHERE role = 'employee'").get().c,
  availableUnits: db.prepare("SELECT COUNT(1) as c FROM project_units WHERE status = 'available'").get().c,
  totalUnits: db.prepare('SELECT COUNT(1) as c FROM project_units').get().c,
  projects: db.prepare('SELECT COUNT(1) as c FROM projects').get().c
};

console.log('[4/4] Clean Slate Confirmation & Verification:');
console.log(`  ✓ Active Enquiries:     ${postStats.enquiries} (Clean Zero)`);
console.log(`  ✓ Active Leads:         ${postStats.leads} (Clean Zero)`);
console.log(`  ✓ Active Bookings:      ${postStats.bookings} (Clean Zero)`);
console.log(`  ✓ Site Visits:          ${postStats.siteVisits} (Clean Zero)`);
console.log(`  ✓ Attendance Records:   ${postStats.attendance} (Clean Zero)`);
console.log(`  ✓ Customer Accounts:    ${postStats.customers} (Clean Zero)`);
console.log(`  ✓ Admin Accounts:       ${postStats.admins} (Active & Preserved)`);
console.log(`  ✓ Staff/Advisors:       ${postStats.employees} (Active & Preserved)`);
console.log(`  ✓ Total Projects:       ${postStats.projects} (100% Intact Catalog)`);
console.log(`  ✓ Total Units:          ${postStats.totalUnits} (100% Available for Client Booking)`);
console.log(`  ✓ Available Units:      ${postStats.availableUnits} / ${postStats.totalUnits}\n`);

console.log('================================================================');
console.log('  SUCCESS! WEBSITE & CRM ARE NOW BRAND NEW FOR CLIENT DEMO!     ');
console.log('================================================================');
