const { execSync } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

try {
  // Run chrome with console logging
  const output = execSync(`"${chromePath}" --headless=new --disable-gpu --enable-logging=stderr --v=1 --virtual-time-budget=3000 "http://localhost:5000/index.html" 2>&1`, { timeout: 15000 }).toString();
  console.log(output);
} catch (e) {
  console.log(e.stdout ? e.stdout.toString() : e.message);
}
