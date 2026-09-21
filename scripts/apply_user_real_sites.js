const path = require('path');
const Database = require('./sqlite-compat');
require('dotenv').config();

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const db = new Database(path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db'));

console.log('--- Configuring User Real Sites: DS 208 & Nilkanth Villa ---');

// 1. Update Project 1 -> DS 208 (Developed by Akshar Group)
db.prepare(`
  UPDATE projects SET 
    name = 'DS 208 (Developed by Akshar Group)',
    category = 'RESIDENTIAL',
    description = 'High-end architectural development by Akshar Group featuring premium modern residences, signature elevation, landscaped lifestyle amenities, and prime connectivity.',
    location = 'Vadodara, Gujarat',
    price = '₹65 Lakh - ₹98 Lakh',
    status = 'active',
    updated_at = datetime('now')
  WHERE id = 1
`).run();
console.log('✓ Project 1 updated: DS 208 (Developed by Akshar Group)');

// 2. Update Project 2 -> Nilkanth Villa
db.prepare(`
  UPDATE projects SET 
    name = 'Nilkanth Villa',
    category = 'RESIDENTIAL',
    description = 'Exclusive private luxury villas crafted with spacious private gardens, contemporary architecture, generous multi-level layouts, and gated community security.',
    location = 'Vadodara, Gujarat',
    price = '₹1.20 Cr - ₹2.25 Cr',
    status = 'active',
    updated_at = datetime('now')
  WHERE id = 2
`).run();
console.log('✓ Project 2 updated: Nilkanth Villa');

// Ensure all other 14 demo projects remain inactive
db.prepare("UPDATE projects SET status = 'inactive' WHERE id NOT IN (1, 2)").run();
console.log('✓ Verified other projects remain inactive');

// 3. Update Employee Department / Project assignments
db.prepare(`
  UPDATE employees 
  SET department = 'Site Sales - DS 208 (Developed by Akshar Group)',
      updated_at = datetime('now')
  WHERE employee_code = 'EMP-0002'
`).run();
console.log('✓ Assigned Rajesh Patel (EMP-0002) to DS 208 (Developed by Akshar Group)');

db.prepare(`
  UPDATE employees 
  SET department = 'Site Sales - Nilkanth Villa',
      updated_at = datetime('now')
  WHERE employee_code = 'EMP-0003'
`).run();
console.log('✓ Assigned Priya Sharma (EMP-0003) to Nilkanth Villa');

// 4. Update existing sample lead notes/project
db.prepare(`
  UPDATE leads 
  SET notes = 'Met Rajesh on-site at DS 208. Interested in 3BHK high-efficiency layout with covered parking.'
  WHERE enquiry_id = 7
`).run();
console.log('✓ Lead #7 notes updated to reflect DS 208 site visit');

// 5. Update unit numbers in project_units for clarity
db.prepare(`
  UPDATE project_units 
  SET unit_type = '3 BHK Luxury Flat', notes = 'DS 208 Luxury Residence'
  WHERE project_id = 1
`).run();

db.prepare(`
  UPDATE project_units 
  SET unit_type = '4 BHK Independent Villa', notes = 'Nilkanth Villa Exclusive Residence'
  WHERE project_id = 2
`).run();
console.log('✓ Updated project units taxonomy for DS 208 & Nilkanth Villa');

console.log('\n--- Active Projects Verification ---');
const activeProjects = db.prepare("SELECT id, name, category, status, location, price FROM projects WHERE status = 'active'").all();
console.log(JSON.stringify(activeProjects, null, 2));

console.log('\n--- Active Team Verification ---');
const team = db.prepare(`
  SELECT e.employee_code, u.name, u.email, e.department, e.designation 
  FROM employees e 
  JOIN users u ON e.user_id = u.id 
  WHERE e.status = 'active'
`).all();
console.log(JSON.stringify(team, null, 2));
