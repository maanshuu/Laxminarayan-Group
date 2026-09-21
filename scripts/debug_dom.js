const { execSync } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

try {
  const dom = execSync(`"${chromePath}" --headless=new --disable-gpu --virtual-time-budget=3000 --dump-dom "http://localhost:5000/index.html"`, { maxBuffer: 10 * 1024 * 1024 }).toString();
  const idx = dom.indexOf('id="projectGrid"');
  if (idx !== -1) {
    console.log('--- FOUND projectGrid ---');
    console.log(dom.substring(idx - 50, idx + 1000));
  } else {
    console.log('projectGrid not found in DOM');
  }
} catch (e) {
  console.error(e);
}
