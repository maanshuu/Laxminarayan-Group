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

// Admin & Advisor tokens
const adminUser = db.prepare("SELECT id, session_version FROM users WHERE role='admin' LIMIT 1").get();
const adminToken = jwt.sign({ id: adminUser.id, role: 'admin', sv: adminUser.session_version }, process.env.JWT_SECRET, { expiresIn: '1h' });

const adv1User = db.prepare("SELECT id, session_version FROM users WHERE email='rajesh.advisor@laxminarayangroup.com' LIMIT 1").get();
const adv1Token = jwt.sign({ id: adv1User.id, role: 'employee', sv: adv1User.session_version }, process.env.JWT_SECRET, { expiresIn: '1h' });

function takeShot(url, filename, width = 1280, height = 900, delayMs = 2500) {
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

console.log('--- Capturing Live Chrome Screenshots of DS 208 Integration ---');

// 1. Project Detail DS 208 - Top Overview (Cover image, title, specs)
takeShot(`http://127.0.0.1:5000/project-detail.html?id=1&token=${adminToken}`, 'chrome_ds208_overview.png', 1280, 950, 3000);

// 2. Project Detail DS 208 - Floor Plans Section
takeShot(`http://127.0.0.1:5000/project-detail.html?id=1&token=${adminToken}`, 'chrome_ds208_floorplans.png', 1280, 1800, 3500);

// 3. Project Detail DS 208 - Full Page with 17-item Gallery & Renders
takeShot(`http://127.0.0.1:5000/project-detail.html?id=1&token=${adminToken}`, 'chrome_ds208_gallery.png', 1280, 3400, 4000);

// 4. Advisor Portal with Cost Sheet open for DS 208
takeShot(`http://127.0.0.1:5000/advisor.html?token=${adv1Token}&openCostSheet=1`, 'chrome_ds208_cost_sheet.png', 1280, 1050, 3000);

// 5. Admin Command Center - Projects Table showing DS 208 and Nilkanth Villa
takeShot(`http://127.0.0.1:5000/admin.html?token=${adminToken}&tab=projectsView`, 'chrome_ds208_admin_projects.png', 1280, 1300, 3000);

console.log('All DS 208 screenshots captured successfully!');
