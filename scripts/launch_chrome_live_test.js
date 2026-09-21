const { execSync, spawn } = require('child_process');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Database = require('./sqlite-compat');
const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const db = new Database(path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db'));

// Admin User
const adminUser = db.prepare("SELECT id, session_version FROM users WHERE role='admin' LIMIT 1").get();
const adminToken = jwt.sign({ id: adminUser.id, role: 'admin', sv: adminUser.session_version }, process.env.JWT_SECRET, { expiresIn: '8h' });

// Advisor User - Rajesh Patel
const advUser = db.prepare("SELECT id, session_version FROM users WHERE email='rajesh.advisor@laxminarayangroup.com' LIMIT 1").get();
const advToken = jwt.sign({ id: advUser.id, role: 'employee', sv: advUser.session_version }, process.env.JWT_SECRET, { expiresIn: '8h' });

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const urls = [
  // 1. Advisor Portal - DS 208 Site Walk-In Preselected
  `http://localhost:5000/advisor.html?token=${advToken}&openWalkIn=1`,
  
  // 2. Advisor Portal - Buyer Cost Sheet for DS 208
  `http://localhost:5000/advisor.html?token=${advToken}&openCostSheet=1`,

  // 3. DS 208 Detail Page with Floor Plan & Gallery
  `http://localhost:5000/project-detail.html?id=1&token=${adminToken}`,

  // 4. Nilkanth Villa Detail Page with Floor Plan & Gallery
  `http://localhost:5000/project-detail.html?id=2&token=${adminToken}`,

  // 5. Admin CRM - Projects Media Manager (Upload Floor Plans & Pictures)
  `http://localhost:5000/admin.html?token=${adminToken}&tab=projectsView`
];

console.log('Launching Google Chrome with live test sessions...');
try {
  // Launch Chrome detached
  const args = urls;
  const child = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  console.log('✓ Google Chrome launched successfully with all 5 live test tabs!');
} catch (err) {
  console.error('Error launching Chrome:', err.message);
}
