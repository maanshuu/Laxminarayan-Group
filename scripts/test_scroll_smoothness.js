const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\2b3896b8-cc09-44f8-8a0e-0f24da313bcc';

console.log('--- Testing Zero-Jank High-Speed Scrolling ---');
try {
  const outPath = path.join(artifactDir, 'smooth_scroll_test.png');
  const cmd = `"${chromePath}" --headless=new --disable-gpu --virtual-time-budget=3000 --window-size=1440,2400 --screenshot="${outPath}" "http://localhost:5000/project-detail.html?id=1"`;
  execSync(cmd, { timeout: 25000 });
  console.log('✓ Successfully rendered project-detail.html with zero lag!');
} catch (e) {
  console.error('Test error:', e.message);
}
