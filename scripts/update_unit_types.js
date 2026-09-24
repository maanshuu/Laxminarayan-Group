const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'LaxminarayanGroup', 'data', 'laxminarayan.db');
const db = new DatabaseSync(dbPath);

// Nilkanth Villa (project_id = 2)
db.prepare("UPDATE project_units SET unit_type = '4 BHK Luxury Villa (Type A)' WHERE project_id = 2 AND unit_number IN ('Villa 01', 'Villa 02', 'Villa 08')").run();
db.prepare("UPDATE project_units SET unit_type = '4 BHK Corner Villa (Type B)' WHERE project_id = 2 AND unit_number = 'Villa 03'").run();
db.prepare("UPDATE project_units SET unit_type = '5 BHK Presidential Villa (Type B)' WHERE project_id = 2 AND unit_number IN ('Villa 05', 'Villa 07')").run();
db.prepare("UPDATE project_units SET unit_type = '5 BHK Grand Estate Villa (Type C)' WHERE project_id = 2 AND unit_number = 'Villa 10'").run();

// DS 208 (project_id = 1)
db.prepare("UPDATE project_units SET unit_type = 'Commercial High-Street Retail (Shop)' WHERE project_id = 1 AND unit_number LIKE 'Shop%'").run();

console.log('✓ Successfully updated unit types:');
const units = db.prepare('SELECT id, project_id, unit_number, unit_type FROM project_units').all();
console.log(units);
