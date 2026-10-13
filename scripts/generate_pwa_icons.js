const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

async function createIcons() {
  const logoPath = path.join(__dirname, '..', 'assets', 'logo-mark.png');
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  for (const size of sizes) {
    const innerPadding = Math.round(size * 0.16);
    const innerSize = Math.max(16, size - innerPadding * 2);

    const resizedLogo = await sharp(logoPath)
      .resize(innerSize, innerSize, { fit: 'inside' })
      .toBuffer();

    const svgBg = Buffer.from(
      '<svg width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="100%" height="100%" fill="#0B1528"/>' +
      '</svg>'
    );

    await sharp(svgBg)
      .composite([{ input: resizedLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(iconsDir, 'icon-' + size + 'x' + size + '.png'));

    console.log('Generated icon-' + size + 'x' + size + '.png');
  }

  // Maskable icon: 512x512 with safe zone margin (60% inner logo)
  const maskSize = 512;
  const innerMaskSize = Math.round(maskSize * 0.60);
  const resizedMaskLogo = await sharp(logoPath)
    .resize(innerMaskSize, innerMaskSize, { fit: 'inside' })
    .toBuffer();

  const maskSvgBg = Buffer.from(
    '<svg width="' + maskSize + '" height="' + maskSize + '" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="100%" height="100%" fill="#0B1528"/>' +
    '</svg>'
  );

  await sharp(maskSvgBg)
    .composite([{ input: resizedMaskLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'maskable-icon-512x512.png'));
  console.log('Generated maskable-icon-512x512.png');

  // Apple touch icon 180x180
  const appleSize = 180;
  const appleInner = Math.round(appleSize * 0.70);
  const resizedAppleLogo = await sharp(logoPath)
    .resize(appleInner, appleInner, { fit: 'inside' })
    .toBuffer();

  const appleSvgBg = Buffer.from(
    '<svg width="' + appleSize + '" height="' + appleSize + '" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="100%" height="100%" fill="#0B1528"/>' +
    '</svg>'
  );

  await sharp(appleSvgBg)
    .composite([{ input: resizedAppleLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');
}

createIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
