const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function optimizeFolder(folderPath, maxDim = 1280, quality = 82) {
  if (!fs.existsSync(folderPath)) return;
  const files = fs.readdirSync(folderPath);
  console.log(`Optimizing images in ${folderPath}...`);

  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
    if (f.includes('_thumb') || f.includes('_orig')) continue;

    const fullPath = path.join(folderPath, f);
    const stat = fs.statSync(fullPath);
    // Only optimize images larger than 300KB
    if (stat.size < 300 * 1024) continue;

    const origSizeMB = (stat.size / (1024 * 1024)).toFixed(2);
    try {
      const origBackupPath = path.join(folderPath, path.basename(f, ext) + '_orig' + ext);
      if (!fs.existsSync(origBackupPath)) {
        fs.copyFileSync(fullPath, origBackupPath);
      }

      // Optimize in-place with sharp
      let pipeline = sharp(origBackupPath).resize({
        width: maxDim,
        height: maxDim,
        fit: 'inside',
        withoutEnlargement: true
      });

      if (ext === '.png') {
        pipeline = pipeline.png({ quality, compressionLevel: 8, progressive: true });
      } else {
        pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
      }

      const tempOut = path.join(folderPath, 'temp_' + f);
      await pipeline.toFile(tempOut);
      fs.copyFileSync(tempOut, fullPath);
      fs.unlinkSync(tempOut);

      const newStat = fs.statSync(fullPath);
      const newSizeKB = (newStat.size / 1024).toFixed(0);
      console.log(`✓ ${f}: ${origSizeMB} MB -> ${newSizeKB} KB (${Math.round((1 - newStat.size / stat.size) * 100)}% smaller)`);
    } catch (err) {
      console.warn(`Could not optimize ${f}:`, err.message);
    }
  }
}

(async () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'projects');
  await optimizeFolder(uploadsDir, 1280, 82);

  // Also optimize any heavy assets
  const assetsDir = path.join(__dirname, '..', 'assets');
  await optimizeFolder(assetsDir, 1600, 84);

  const floorPlansDir = path.join(assetsDir, 'projects', 'ds-208', 'floor_plans');
  await optimizeFolder(floorPlansDir, 1400, 84);

  const brochureDir = path.join(assetsDir, 'projects', 'ds-208', 'brochure_pages');
  await optimizeFolder(brochureDir, 1280, 80);

  console.log('All images optimized successfully!');
})();
