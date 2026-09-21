const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');

function findRoute(keyword) {
  console.log(`\n=== SEARCH: "${keyword}" ===`);
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes(keyword.toLowerCase()) && (line.includes('app.') || line.includes('router.') || line.includes('/api/'))) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  });
}

findRoute('whatsapp');
findRoute('site-visit');
findRoute('attendance');
findRoute('report');
findRoute('export');
