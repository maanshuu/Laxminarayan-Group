const path = require('path');
const os = require('os');
const Database = require('./sqlite-compat');

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const DB_FILE = path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db');

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

console.log('--- UPDATING PROJECT LOCATIONS IN SQLITE DATABASE ---');

// 1. DS 208 (Vastral, Ahmedabad, Gujarat)
db.prepare(`
  UPDATE projects
  SET location = 'Opp. Shreedhar Sparsh, Near Royal Restaurant, S.P. Ring Road, Vastral, Ahmedabad, Gujarat - 382415 (RERA: PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/MAA11899/030623)',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = 1
`).run();
console.log('✓ DS 208 location set to: Vastral, Ahmedabad, Gujarat');

// 2. Nilkanth Villa (Kanbha, Ahmedabad, Gujarat)
db.prepare(`
  UPDATE projects
  SET location = 'Near Kunj Mall / Raspan Corridor, Kanbha, Ahmedabad, Gujarat - 382430',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = 2
`).run();
console.log('✓ Nilkanth Villa location set to: Kanbha, Ahmedabad, Gujarat');

const rows = db.prepare('SELECT id, name, location FROM projects').all();
console.log('\nVerified Database Records:');
console.table(rows);
