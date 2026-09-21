const fs = require('fs');
const path = require('path');
const Database = require('./sqlite-compat');
require('dotenv').config();

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const db = new Database(path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db'));

console.log('=== Enforcing Strict Two-Project System: DS 208 & Nilkanth Villa ===');

// 1. Permanently delete test projects 17 and 18 if still present
db.prepare("DELETE FROM projects WHERE id IN (17, 18)").run();
db.prepare("UPDATE projects SET status = 'inactive' WHERE id NOT IN (1, 2)").run();

// 2. Configure Project 1: DS 208
db.prepare(`
  UPDATE projects SET 
    name = 'DS 208 (Developed by Akshar Group)',
    category = 'APARTMENTS & SHOPS',
    description = 'Premier residential & commercial landmark situated on S.P. Ring Road, Vastral, Ahmedabad. Developed by Akshar Group. Features 4 grand mid-rise residential towers (Blocks A, B, C, D), ground-level high street retail promenade with 33 shops, thoughtfully crafted 2 & 3 BHK luxury residences, and 20+ world-class lifestyle amenities.',
    image = '/uploads/projects/ds208_bird_eye_view.jpg',
    location = 'Opp. Shreedhar Sparsh, S.P. Ring Road, Vastral, Ahmedabad - 382415 (RERA: PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/MAA11899/030623)',
    price = '₹48 Lakh - ₹78 Lakh',
    amenities = 'Clubhouse, Landscaped Garden, Children Play Area, Indoor Games, Gymnasium, 33 High-Street Retail Shops, Senior Citizen Sit-Outs, Jogging Track with Yoga Deck, 24/7 CCTV & Security Cabin, Automatic Elevators, Vastu Compliant Entry, Solar Power System, Rainwater Harvesting, Fire Hydrant System',
    status = 'active',
    updated_at = datetime('now')
  WHERE id = 1
`).run();
console.log('✓ Project 1 configured: DS 208 (Developed by Akshar Group) [APARTMENTS & SHOPS]');

// 3. Configure Project 2: Nilkanth Villa
db.prepare(`
  UPDATE projects SET 
    name = 'Nilkanth Villa',
    category = 'LUXURY VILLAS',
    description = 'Exclusive private luxury villa estate crafted with expansive landscaped private gardens, contemporary architecture, generous multi-level layouts, gated community security, and private clubhouse.',
    image = '/assets/hero-villa.png',
    location = 'Prime Gated Enclave, Vadodara, Gujarat',
    price = '₹1.20 Cr - ₹2.25 Cr',
    amenities = 'Private Landscaped Garden, Gated Community with 24/7 Security, Exclusive Residents Clubhouse, 3 Covered Car Parks, Vastu Compliant Architecture, Children Play Area, Senior Citizen Sit-Out, Underground Cabling',
    status = 'active',
    updated_at = datetime('now')
  WHERE id = 2
`).run();
console.log('✓ Project 2 configured: Nilkanth Villa [LUXURY VILLAS]');

// 4. Ingest media for Nilkanth Villa if none exists
const nilkanthMediaCount = db.prepare("SELECT COUNT(*) c FROM project_media WHERE project_id = 2").get().c;
if (nilkanthMediaCount === 0) {
  db.prepare(`
    INSERT INTO project_media (project_id, media_type, mime_type, original_name, file_path, file_size, is_cover)
    VALUES (2, 'image', 'image/png', 'Nilkanth Villa - Luxury Private Residence', '/assets/hero-villa.png', 2442455, 1)
  `).run();
  console.log('✓ Ingested primary cover render for Nilkanth Villa');
}

// 5. Setup Project Units for Nilkanth Villa
db.prepare("DELETE FROM project_units WHERE project_id = 2").run();
const villaUnits = [
  { u: 'Villa 01', t: '4 BHK Luxury Villa', f: 0, a: 2850, p: '₹1.25 Cr', s: 'available' },
  { u: 'Villa 02', t: '4 BHK Luxury Villa', f: 0, a: 2850, p: '₹1.25 Cr', s: 'available' },
  { u: 'Villa 03', t: '4 BHK Corner Villa', f: 0, a: 3100, p: '₹1.45 Cr', s: 'available' },
  { u: 'Villa 05', t: '5 BHK Presidential Villa', f: 0, a: 3650, p: '₹1.85 Cr', s: 'available' },
  { u: 'Villa 07', t: '5 BHK Presidential Villa', f: 0, a: 3650, p: '₹1.95 Cr', s: 'available' },
  { u: 'Villa 08', t: '4 BHK Luxury Villa', f: 0, a: 2850, p: '₹1.30 Cr', s: 'available' },
  { u: 'Villa 10', t: '5 BHK Grand Estate Villa', f: 0, a: 4200, p: '₹2.25 Cr', s: 'available' }
];

const insertUnit = db.prepare(`
  INSERT INTO project_units (project_id, unit_number, unit_type, floor_number, area_sqft, price, status, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const v of villaUnits) {
  insertUnit.run(2, v.u, v.t, v.f, v.a, v.p, v.s, `Nilkanth Villa Official Residence (${v.t})`);
}
console.log(`✓ Provisioned ${villaUnits.length} luxury villa inventory units for Nilkanth Villa`);

// 6. Assign Advisors strictly to DS 208 and Nilkanth Villa
db.prepare(`
  UPDATE employees 
  SET department = 'Site Sales - DS 208 (Developed by Akshar Group)',
      updated_at = datetime('now')
  WHERE employee_code = 'EMP-0002'
`).run();

db.prepare(`
  UPDATE employees 
  SET department = 'Site Sales - Nilkanth Villa',
      updated_at = datetime('now')
  WHERE employee_code = 'EMP-0003'
`).run();
console.log('✓ Advisors assigned: Rajesh Patel -> DS 208, Priya Sharma -> Nilkanth Villa');

// 7. Scrub any "Signature Homes" or "Signature Villas" mentions from leads & enquiries
db.prepare(`
  UPDATE enquiries 
  SET message = REPLACE(REPLACE(message, 'Signature Homes', 'DS 208'), 'Signature Villas', 'Nilkanth Villa')
`).run();

db.prepare(`
  UPDATE leads 
  SET notes = REPLACE(REPLACE(notes, 'Signature Homes', 'DS 208'), 'Signature Villas', 'Nilkanth Villa')
`).run();
console.log('✓ Cleaned all text references to Signature Homes/Villas from leads & enquiries');

// Verify
const active = db.prepare("SELECT id, name, category, status, location, price FROM projects WHERE status = 'active' ORDER BY id").all();
console.log('\n--- Active Projects In System ---');
console.log(JSON.stringify(active, null, 2));
