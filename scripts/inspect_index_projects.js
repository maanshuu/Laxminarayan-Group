const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.toLowerCase().includes('landmark construction') || l.includes('projects') || l.includes('All Developments')) {
    console.log((i+1) + ': ' + l.trim().substring(0, 100));
  }
});
