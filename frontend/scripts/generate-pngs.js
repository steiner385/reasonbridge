/* eslint-disable import/no-unresolved, import/order */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [
  { name: 'logo-1024', size: 1024, input: 'reasonbridge-logo.svg' },
  { name: 'logo-512', size: 512, input: 'reasonbridge-logo.svg' },
  { name: 'logo-192', size: 192, input: 'reasonbridge-logo.svg' },
  { name: 'icon-180', size: 180, input: 'reasonbridge-icon.svg' },
  { name: 'icon-32', size: 32, input: 'reasonbridge-icon.svg' },
  { name: 'icon-16', size: 16, input: 'reasonbridge-icon.svg' },
];

const inputDir = path.join(__dirname, '../public/assets/logos');
const outputDir = inputDir;

async function generatePNGs() {
  for (const { name, size, input } of sizes) {
    const inputPath = path.join(inputDir, input);
    const outputPath = path.join(outputDir, `reasonbridge-${name}.png`);

    console.log(`Generating ${name} (${size}×${size})...`);

    await sharp(inputPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`  ✓ ${name}.png (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  console.log('✅ All PNGs generated');
}

generatePNGs().catch(console.error);
