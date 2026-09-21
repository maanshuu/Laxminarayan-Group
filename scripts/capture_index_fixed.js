const { execSync } = require('child_process');
const path = require('path');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\2b3896b8-cc09-44f8-8a0e-0f24da313bcc';

const outPath = path.join(artifactDir, 'index_projects_section_fixed.png');
try {
  const cmd = `"${chromePath}" --headless=new --disable-gpu --virtual-time-budget=3500 --window-size=1440,3800 --screenshot="${outPath}" "http://localhost:5000/index.html"`;
  execSync(cmd, { timeout: 25000 });
  console.log('✓ Captured index_projects_section_fixed.png');
} catch (e) {
  console.error(e);
}
