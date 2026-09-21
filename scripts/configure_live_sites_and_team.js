const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');
const Database = require('./sqlite-compat');

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const dbFile = path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db');
const db = new Database(dbFile);

console.log('--- 1. CONFIGURING 2 LIVE CONSTRUCTION SITES ---');

// Project 1: Signature Homes (Active)
db.prepare(`
  UPDATE projects 
  SET name = ?,
      category = 'RESIDENTIAL',
      location = ?,
      price = ?,
      description = ?,
      amenities = ?,
      status = 'active'
  WHERE id = 1
`).run(
  'Signature Homes',
  'Bhayli Canal Road, Vadodara',
  '₹58 Lakh - ₹85 Lakh',
  'Premium 2 & 3 BHK contemporary residences with designer landscaped gardens, rooftop amenities, and 24/7 biometric security.',
  'Clubhouse, Rooftop Sky Lounge, Swimming Pool, Gymnasium, 24/7 Security, Children Play Area, EV Charging Station'
);

// Project 2: Signature Villas (Active)
db.prepare(`
  UPDATE projects 
  SET name = ?,
      category = 'RESIDENTIAL',
      location = ?,
      price = ?,
      description = ?,
      amenities = ?,
      status = 'active'
  WHERE id = 2
`).run(
  'Signature Villas',
  'Gotri-Sevasi Road, Vadodara',
  '₹1.25 Cr - ₹1.95 Cr',
  'Ultra-luxury 4 & 5 BHK independent private villas with landscaped personal lawns, double-height ceilings, and Italian marble finishes.',
  'Private Garden, Gated Community, Luxury Club, Dedicated Concierge, Smart Home Automation, 3 Covered Car Parks'
);

// Set all other demo projects (id > 2) to inactive so only 2 live sites appear
db.prepare("UPDATE projects SET status = 'inactive' WHERE id > 2").run();

const activeProjects = db.prepare("SELECT id, name, category, status, location, price FROM projects WHERE status = 'active'").all();
console.log('Active Construction Sites (' + activeProjects.length + '):');
activeProjects.forEach(p => console.log(`  [#${p.id}] ${p.name} (${p.category}) - ${p.location} | ${p.price}`));

console.log('\n--- 2. CLEANING ORPHANED PLACEHOLDER EMPLOYEES & CONFIGURING ADVISORS ---');

// Clean up orphaned placeholder employees where user_id is null
db.prepare('DELETE FROM employees WHERE user_id IS NULL').run();

const passwordHash = bcrypt.hashSync('Advisor@123', 10);

function upsertAdvisor({ name, email, phone, code, dept, designation, assignedProjectId }) {
  let user = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(email, phone);
  if (!user) {
    const r = db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'employee', 'active')
    `).run(name, email, phone, passwordHash);
    user = { id: Number(r.lastInsertRowid) };
    console.log(`Created user account for ${name} (ID: ${user.id})`);
  } else {
    db.prepare(`
      UPDATE users 
      SET name = ?, password_hash = ?, role = 'employee', status = 'active', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(name, passwordHash, user.id);
    console.log(`Updated user account for ${name} (ID: ${user.id})`);
  }

  let emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(user.id);
  if (!emp) {
    const er = db.prepare(`
      INSERT INTO employees (user_id, employee_code, department, designation, joined_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(user.id, code, dept, designation);
    emp = { id: Number(er.lastInsertRowid) };
    console.log(`Created employee profile ${code} for ${name}`);
  } else {
    db.prepare(`
      UPDATE employees 
      SET employee_code = ?, department = ?, designation = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(code, dept, designation, emp.id);
    console.log(`Updated employee profile ${code} for ${name}`);
  }
}

// Advisor 1: Assigned to Signature Homes (Project 1)
upsertAdvisor({
  name: 'Rajesh Patel',
  email: 'rajesh.advisor@laxminarayangroup.com',
  phone: '9876500001',
  code: 'EMP-0002',
  dept: 'Site Sales - Signature Homes',
  designation: 'Senior On-Site Sales Advisor',
  assignedProjectId: 1
});

// Advisor 2: Assigned to Signature Villas (Project 2)
upsertAdvisor({
  name: 'Priya Sharma',
  email: 'priya.advisor@laxminarayangroup.com',
  phone: '9876500002',
  code: 'EMP-0003',
  dept: 'Site Sales - Signature Villas',
  designation: 'Senior On-Site Sales Advisor',
  assignedProjectId: 2
});

console.log('\n--- 3. VERIFYING ALL ADVISORS IN DB ---');
const advisors = db.prepare(`
  SELECT e.id, e.employee_code, e.department, e.designation, u.name, u.email, u.phone
  FROM employees e
  JOIN users u ON u.id = e.user_id
  WHERE u.role = 'employee' AND e.status = 'active'
`).all();

advisors.forEach(a => {
  console.log(`  Advisor: ${a.name} (${a.employee_code}) | Phone: ${a.phone} | Email: ${a.email} | Dept: ${a.department}`);
});

console.log('\nData setup completed successfully!');
