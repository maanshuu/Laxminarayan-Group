const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Launching headless browser...');
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 950 });

    console.log('Navigating to DS 208 (id=1)...');
    await page.goto('http://localhost:5000/project-detail.html?id=1', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.hero-mosaic-container', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: 'mosaic_bento_desktop.png' });
    console.log('✓ Captured mosaic_bento_desktop.png');

    console.log('Clicking View All Photos button...');
    await page.click('#btnViewAllMosaic');
    await page.waitForSelector('#luxuryLightbox', { visible: true, timeout: 5000 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: 'lightbox_open_desktop.png' });
    console.log('✓ Captured lightbox_open_desktop.png');

    console.log('Pressing ArrowRight to navigate lightbox...');
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'lightbox_slide2.png' });
    console.log('✓ Captured lightbox_slide2.png');

    console.log('Pressing Escape to close lightbox...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    console.log('Testing mobile responsive layout...');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'mosaic_mobile.png' });
    console.log('✓ Captured mosaic_mobile.png');

    console.log('Navigating to Nilkanth Villa (id=2 - 1 photo)...');
    await page.setViewport({ width: 1400, height: 950 });
    await page.goto('http://localhost:5000/project-detail.html?id=2', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.hero-mosaic-container', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: 'nilkanth_mosaic.png' });
    console.log('✓ Captured nilkanth_mosaic.png');

    await browser.close();
    console.log('ALL VERIFICATIONS SUCCESSFUL!');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
})();
