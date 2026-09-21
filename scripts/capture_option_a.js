const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\2b3896b8-cc09-44f8-8a0e-0f24da313bcc';

function takeShot(url, filename, width = 1440, height = 960, delayMs = 3500) {
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

console.log('--- Capturing Fixed Properties Page ---');
takeShot('http://localhost:5000/properties.html', 'properties_fixed_screenshot.png', 1440, 1100, 3500);
console.log('Done!');
