const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\2b3896b8-cc09-44f8-8a0e-0f24da313bcc';

function takeShot(url, filename, width = 1366, height = 900, delayMs = 3000) {
  const outPath = path.join(artifactDir, filename);
  try {
    const cmd = `"${chromePath}" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=${delayMs} --window-size=${width},${height} --screenshot="${outPath}" "${url}"`;
    execSync(cmd, { timeout: 25000 });
    const stat = fs.statSync(outPath);
    console.log(`✓ Captured ${filename} (${stat.size} bytes)`);
    return outPath;
  } catch (err) {
    console.error(`Failed ${filename}:`, err.message);
    return null;
  }
}

console.log('--- Capturing Luxury Portfolio & Dynamic Tabs Screenshots ---');
takeShot('http://127.0.0.1:5000/index.html', 'luxury_homepage_tabs.png', 1366, 3200, 3500);
takeShot('http://127.0.0.1:5000/properties.html', 'luxury_properties_catalog.png', 1366, 1200, 3000);
takeShot('http://127.0.0.1:5000/project-detail.html?id=1', 'luxury_project_detail_ds208.png', 1366, 950, 3000);
takeShot('http://127.0.0.1:5000/project-detail.html?id=2', 'luxury_project_detail_nilkanth.png', 1366, 950, 3000);
