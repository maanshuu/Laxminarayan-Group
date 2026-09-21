const fs = require('fs');

['project-detail.html', 'index.html', 'properties.html'].forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  console.log('=== ' + file + ' ===');
  
  // Check for scroll listeners
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('scroll') && (l.includes('addEventListener') || l.includes('onscroll') || l.includes('scrollIntoView') || l.includes('requestAnimationFrame'))) {
      console.log(`Line ${idx + 1}: ${l.trim().slice(0, 120)}`);
    }
    if (l.includes('setInterval') || l.includes('requestAnimationFrame') || l.includes('MutationObserver')) {
      console.log(`Async Timer Line ${idx + 1}: ${l.trim().slice(0, 120)}`);
    }
  });

  // Check CSS performance killers:
  // 1. backdrop-filter
  // 2. filter: blur()
  // 3. background-attachment: fixed
  // 4. box-shadow on many elements
  // 5. mix-blend-mode
  const bdf = content.match(/backdrop-filter:[^;]+/gi) || [];
  const blurs = content.match(/filter:\s*blur[^;]+/gi) || [];
  const fixedBg = content.match(/background-attachment:\s*fixed/gi) || [];
  const blend = content.match(/mix-blend-mode:[^;]+/gi) || [];
  console.log(`CSS check -> backdrop-filter: ${bdf.length}, filter blur: ${blurs.length}, fixed bg: ${fixedBg.length}, blend-mode: ${blend.length}`);

  // Check image file sizes linked
  const imgMatches = content.match(/src=["']([^"']+\.(?:png|jpg|jpeg|webp))["']/gi) || [];
  console.log(`Images linked count: ${imgMatches.length}`);
});
