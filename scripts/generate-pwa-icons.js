const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

async function generateIcons() {
  const svgPath = path.resolve(__dirname, '../public/icons/icon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
          svg { width: 100%; height: 100%; display: block; }
        </style>
      </head>
      <body>${svgContent}</body>
    </html>
  `;

  console.log('🚀 Launching headless browser to render crisp PWA icons...');
  const browser = await chromium.launch({ headless: true });

  const targets = [
    { size: 192, filename: 'icon-192x192.png' },
    { size: 512, filename: 'icon-512x512.png' },
    { size: 180, filename: 'apple-touch-icon.png' },
  ];

  for (const target of targets) {
    const page = await browser.newPage({
      viewport: { width: target.size, height: target.size },
      deviceScaleFactor: 1,
    });

    await page.setContent(htmlContent, { waitUntil: 'load' });
    const outputPath = path.resolve(__dirname, `../public/icons/${target.filename}`);
    await page.screenshot({ path: outputPath, omitBackground: false });
    await page.close();
    console.log(`✅ Generated ${target.filename} (${target.size}x${target.size})`);
  }

  await browser.close();
  console.log('🎉 All PWA icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Failed to generate PWA icons:', err);
  process.exit(1);
});
