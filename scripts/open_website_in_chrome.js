const { spawn } = require('child_process');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Database = require('./sqlite-compat');
const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const db = new Database(path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db'));

// Generate fresh 24h tokens for seamless testing
const adminUser = db.prepare("SELECT id, session_version FROM users WHERE role='admin' LIMIT 1").get();
const adminToken = jwt.sign({ id: adminUser.id, role: 'admin', sv: adminUser.session_version }, process.env.JWT_SECRET, { expiresIn: '24h' });

const advUser = db.prepare("SELECT id, session_version FROM users WHERE email='rajesh.advisor@laxminarayangroup.com' LIMIT 1").get();
const advToken = jwt.sign({ id: advUser.id, role: 'employee', sv: advUser.session_version }, process.env.JWT_SECRET, { expiresIn: '24h' });

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const urls = [
  // 1. Main Public Website Homepage
  'http://localhost:5000/index.html',

  // 2. Dedicated Luxury Property Catalog & Dynamic Filter Page
  'http://localhost:5000/properties.html',

  // 3. DS 208 Project Details (Real CAD Floor Plans, 3D Renders, Brochure)
  `http://localhost:5000/project-detail.html?id=1&token=${adminToken}`,

  // 3. Executive Admin CRM
  `http://localhost:5000/admin.html?token=${adminToken}`,

  // 4. Sales Advisor Portal & Cost Sheet
  `http://localhost:5000/advisor.html?token=${advToken}`
];

console.log('Opening website in Google Chrome...');
try {
  const child = spawn(chromePath, urls, {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  console.log('✓ Successfully opened Google Chrome with:');
  urls.forEach(u => console.log('  -> ' + u));
} catch (err) {
  console.error('Error opening Chrome:', err.message);
}
