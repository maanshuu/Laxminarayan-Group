const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\2b3896b8-cc09-44f8-8a0e-0f24da313bcc';

const Database = require('./sqlite-compat');
const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const db = new Database(path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db'));

// Get admin and advisor user records
const adminUser = db.prepare("SELECT id, session_version FROM users WHERE role='admin' LIMIT 1").get();
const adminToken = jwt.sign({ id: adminUser.id, role: 'admin', sv: adminUser.session_version }, process.env.JWT_SECRET, { expiresIn: '1h' });

const adv1User = db.prepare("SELECT id, session_version FROM users WHERE email='rajesh.advisor@laxminarayangroup.com' LIMIT 1").get();
const adv1Token = jwt.sign({ id: adv1User.id, role: 'employee', sv: adv1User.session_version }, process.env.JWT_SECRET, { expiresIn: '1h' });

function takeShot(url, filename, width = 1280, height = 850, delayMs = 2500) {
  const outPath = path.join(artifactDir, filename);
  try {
    const cmd = `"${chromePath}" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=${delayMs} --window-size=${width},${height} --screenshot="${outPath}" "${url}"`;
    execSync(cmd, { timeout: 20000 });
    const stat = fs.statSync(outPath);
    console.log(`✓ Captured ${filename} (${stat.size} bytes)`);
    return outPath;
  } catch (err) {
    console.error(`Failed ${filename}:`, err.message);
    return null;
  }
}

console.log('--- Capturing Comprehensive Live Chrome Screenshots ---');

// 1. Advisor Portal - Main Dashboard
takeShot(`http://127.0.0.1:5000/advisor.html?token=${adv1Token}`, 'chrome_live_advisor_portal.png', 1280, 850, 2000);

// 2. Advisor Portal - Site Walk-In Modal (Signature Homes preselected for Rajesh Patel)
takeShot(`http://127.0.0.1:5000/advisor.html?token=${adv1Token}&openWalkIn=1`, 'chrome_live_walkin_modal.png', 1280, 850, 2500);

// 3. Buyer Cost Sheet & Quotation Generator Modal
takeShot(`http://127.0.0.1:5000/advisor.html?token=${adv1Token}&openCostSheet=1`, 'chrome_live_cost_sheet_modal.png', 1280, 950, 2500);

// 4. Admin Command Center - 2 Active Construction Sites
takeShot(`http://127.0.0.1:5000/admin.html?token=${adminToken}&tab=projectsView`, 'chrome_live_admin_projects.png', 1280, 850, 2500);

// 5. Admin CRM - Enquiries with Site Walk-In badge & Cost Sheet triggers
takeShot(`http://127.0.0.1:5000/admin.html?token=${adminToken}&tab=leadsView`, 'chrome_live_admin_leads.png', 1280, 850, 2500);

// 6. Public Property Catalog - Showing only 2 Live Sites (Signature Homes & Signature Villas)
takeShot('http://127.0.0.1:5000/project-category.html?type=all', 'chrome_live_public_catalog.png', 1280, 850, 2500);

console.log('Finished capturing all comprehensive live testing screenshots!');
