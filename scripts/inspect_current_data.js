const path = require('path');
const os = require('os');
const Database = require('./sqlite-compat');

const dbFile = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup', 'data', 'laxminarayan.db');
const db = new Database(dbFile);

console.log('Current Database Counts:');
const tables = [
  'enquiries', 'leads', 'bookings', 'site_visits', 'employee_attendance',
  'audit_logs', 'password_resets', 'auth_otps', 'users'
];

for (const t of tables) {
  try {
    const row = db.prepare(`SELECT count(1) as c FROM ${t}`).get();
    console.log(`  ${t}: ${row.c}`);
  } catch (e) {
    console.log(`  ${t}: (not found or error: ${e.message})`);
  }
}

console.log('\nUsers Breakdown:');
const users = db.prepare('SELECT id, name, email, phone, role, status FROM users').all();
console.table(users);
