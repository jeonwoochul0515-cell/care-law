#!/usr/bin/env node
/**
 * generate-icons.js
 *
 * Generates PWA icon PNGs from SVG templates using the `canvas` npm package.
 * If `canvas` is not installed, falls back to copying the SVG files and
 * printing a reminder to install it.
 *
 * Usage:
 *   node scripts/generate-icons.js
 *
 * Prerequisites (for PNG output):
 *   pnpm add -D canvas
 */

const fs = require('fs');
const path = require('path');

const BRAND_COLOR = '#1E2D4E';
const TEXT = 'CL';
const OUTPUT_DIR = path.resolve(__dirname, '../apps/franchisee/public/icons');

const sizes = [
  { name: 'icon-192.png', size: 192, radius: 32, fontSize: 72 },
  { name: 'icon-512.png', size: 512, radius: 80, fontSize: 192 },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

async function generateWithCanvas() {
  const { createCanvas } = require('canvas');

  for (const { name, size, radius, fontSize } of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background rounded rect
    roundRect(ctx, 0, 0, size, size, radius);
    ctx.fillStyle = BRAND_COLOR;
    ctx.fill();

    // Center text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${fontSize}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(TEXT, size / 2, size / 2 + fontSize * 0.05);

    const buf = canvas.toBuffer('image/png');
    const outPath = path.join(OUTPUT_DIR, name);
    fs.writeFileSync(outPath, buf);
    console.log(`Created ${outPath} (${size}x${size})`);
  }
}

function fallbackSvg() {
  console.log('`canvas` package not found — SVG icons already exist at:');
  for (const { name, size } of sizes) {
    const svgName = name.replace('.png', '.svg');
    const svgPath = path.join(OUTPUT_DIR, svgName);
    if (fs.existsSync(svgPath)) {
      console.log(`  ${svgPath} (${size}x${size})`);
    }
  }
  console.log('\nTo generate PNG files, install canvas:');
  console.log('  pnpm add -D canvas');
  console.log('  node scripts/generate-icons.js');
}

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  try {
    require.resolve('canvas');
    await generateWithCanvas();
    console.log('\nDone! PNG icons generated successfully.');
  } catch {
    fallbackSvg();
  }
})();
